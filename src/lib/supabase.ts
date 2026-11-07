// The phone app talks to the same Supabase project as the web app
// (firis.lovable.app), so both show the same household.
import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import { AppState } from "react-native";
import { fromBase64 } from "./base64";
import { NO_ROWS, ORDER, type Change, type Tables } from "./cloud";

// Safe to ship in the app: row level security decides what each person can see.
export const SUPABASE_URL = "https://acmpkbblxxcwkdtbbrvv.supabase.co";
export const SUPABASE_KEY = "sb_publishable_J_zuRbmeieKe4zfsQANNDA_2cyGK3-G";

let client: SupabaseClient | null = null;

export function supabase(): SupabaseClient {
  if (!client) {
    client = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: {
        storage: AsyncStorage,
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    });
    // Only refresh the sign-in while the app is open.
    const c = client;
    AppState.addEventListener("change", (st) => {
      if (st === "active") void c.auth.startAutoRefresh();
      else void c.auth.stopAutoRefresh();
    });
  }
  return client;
}

/** The household the signed-in person belongs to, or null. */
export async function myHouseholdId(userId: string): Promise<string | null> {
  const { data, error } = await supabase()
    .from("household_members")
    .select("household_id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data?.household_id as string | undefined) ?? null;
}

/** Everything for one household. */
export async function loadTables(hid: string): Promise<Tables> {
  const db = supabase();
  const out = { ...NO_ROWS };
  await Promise.all(
    ORDER.map(async (t) => {
      const q = db.from(t).select("*");
      const { data, error } = await (t === "households" ? q.eq("id", hid) : q.eq("household_id", hid));
      if (error) throw error;
      out[t] = data ?? [];
    }),
  );
  return out;
}

/** Write a set of changes: deletes children first, then upserts parents first. */
export async function pushChanges(hid: string, changes: Change[]) {
  const db = supabase();
  for (const c of [...changes].reverse()) {
    for (const key of c.remove) {
      let q = db.from(c.table).delete().eq("household_id", hid);
      for (const [k, v] of Object.entries(key)) q = q.eq(k, v as string);
      const { error } = await q;
      if (error) throw error;
    }
  }
  for (const c of changes) {
    if (!c.upsert.length) continue;
    if (c.table === "households") {
      const { id: _id, ...fields } = c.upsert[0]!;
      const { error } = await db.from("households").update(fields).eq("id", hid);
      if (error) throw error;
      continue;
    }
    const { error } = await db.from(c.table).upsert(c.upsert);
    if (error) throw error;
  }
}

/** Shrink a phone photo (long side at most 2000px, JPEG) and return its bytes. */
async function shrinkPhoto(uri: string, width: number, height: number, longSide = 2000) {
  const scale = Math.min(1, longSide / Math.max(width, height));
  const start = ImageManipulator.manipulate(uri);
  const ctx = scale < 1 ? start.resize({ width: Math.round(width * scale) }) : start;
  const img = await ctx.renderAsync();
  const out = await img.saveAsync({ format: SaveFormat.JPEG, compress: 0.85, base64: true });
  if (!out.base64) throw new Error("Couldn't use that photo");
  return fromBase64(out.base64);
}

async function plainError(error: unknown, fallback: string): Promise<Error> {
  // The functions answer with { error: "plain words" } when they can.
  const ctx = (error as { context?: Response }).context;
  const said = ctx ? await ctx.json().catch(() => null) : null;
  return new Error((said as { error?: string } | null)?.error ?? fallback);
}

/**
 * Keep the receipt photo in the household's private folder, then have it read
 * by the same read-receipt function the web app uses.
 */
export async function readReceipt(
  hid: string,
  expenseId: string,
  photo: { uri: string; width: number; height: number },
  categories: { id: string; name: string; types: string[] }[],
): Promise<{ path: string; raw: unknown }> {
  const db = supabase();
  const path = `${hid}/${expenseId}.jpg`;
  const bytes = await shrinkPhoto(photo.uri, photo.width, photo.height);
  const up = await db.storage
    .from("receipts")
    .upload(path, bytes, { contentType: "image/jpeg", upsert: true });
  if (up.error) throw new Error("Couldn't upload the photo. Check your connection");
  const { data, error } = await db.functions.invoke("read-receipt", {
    body: {
      path,
      types: categories.find((c) => c.id === "groceries")?.types ?? [],
      categories: categories.map(({ id, name }) => ({ id, name })),
    },
  });
  if (error) throw await plainError(error, "Couldn't read the receipt. Try again");
  return { path, raw: data };
}
