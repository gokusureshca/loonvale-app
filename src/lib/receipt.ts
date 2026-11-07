// What the receipt reader sends back, checked and tidied before the app uses it.
// Pure: no network here (that's in supabase.ts).
import type { Category, ReceiptItem } from "@/data/sample";

export interface ReadReceipt {
  shop: string;
  /** YYYY-MM-DD, or "" when the date couldn't be read or makes no sense. */
  date: string;
  /** One of the family's categories, or "" when nothing fits. */
  categoryId: string;
  items: ReceiptItem[];
  /** The total printed on the receipt, or 0 when it couldn't be read. */
  total: number;
}

const r2 = (n: number) => Math.round(n * 100) / 100;
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : 0);
const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

/** Null when the photo wasn't a receipt or nothing usable came back. */
export function cleanReceipt(
  raw: unknown,
  categories: Category[],
  today: string,
): ReadReceipt | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (r["is_receipt"] === false) return null;
  const types = categories.find((c) => c.id === "groceries")?.types ?? [];
  const items: ReceiptItem[] = (Array.isArray(r["items"]) ? r["items"] : [])
    .map((x: Record<string, unknown>) => {
      const type = str(x?.["type"]);
      const tax = num(x?.["tax"]);
      return {
        name: str(x?.["name"]),
        qty: Math.max(1, Math.round(num(x?.["qty"]))),
        price: r2(Math.max(0, num(x?.["price"]))),
        hst: tax === 5 || tax === 13 || x?.["hst"] === true,
        ...(tax === 5 ? { tax: 5 as const } : tax === 13 ? { tax: 13 as const } : {}),
        ...(types.includes(type) ? { type } : {}),
      };
    })
    .filter((i) => i.name !== "" && i.price > 0);
  if (!items.length) return null;
  const date = str(r["date"]);
  const okDate =
    /^\d{4}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(Date.parse(date)) && date <= today;
  const cat = str(r["category_id"]);
  return {
    shop: str(r["shop"]),
    date: okDate ? date : "",
    categoryId: categories.some((c) => c.id === cat && c.group !== "investments") ? cat : "",
    items,
    total: r2(Math.max(0, num(r["total"]))),
  };
}

/** True when the lines add up to something other than the printed total. */
export const totalsDiffer = (printed: number, lines: number) =>
  printed > 0 && Math.abs(printed - lines) > 0.05;
