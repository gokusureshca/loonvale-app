import { CATEGORIES, type Category, type Expense } from "@/data/sample";

export interface CategoryGuess {
  categoryId: string;
  type?: string | undefined;
  from: "history" | "known";
}

/** Common Canadian shops, so a new family gets good guesses from day one. Keys are lowercase. */
export const KNOWN_SHOPS: Record<string, { categoryId: string; type?: string }> = {
  costco: { categoryId: "groceries", type: "General" },
  "no frills": { categoryId: "groceries", type: "General" },
  loblaws: { categoryId: "groceries", type: "General" },
  "food basics": { categoryId: "groceries", type: "General" },
  freshco: { categoryId: "groceries", type: "General" },
  metro: { categoryId: "groceries", type: "General" },
  sobeys: { categoryId: "groceries", type: "General" },
  "real canadian superstore": { categoryId: "groceries", type: "General" },
  walmart: { categoryId: "groceries", type: "General" },
  "t&t": { categoryId: "groceries", type: "General" },
  "farm boy": { categoryId: "groceries", type: "Produce" },
  lcbo: { categoryId: "groceries", type: "Liquor" },
  "the beer store": { categoryId: "groceries", type: "Liquor" },
  ttc: { categoryId: "transportation", type: "TTC" },
  presto: { categoryId: "transportation", type: "TTC" },
  uber: { categoryId: "transportation", type: "Cab" },
  lyft: { categoryId: "transportation", type: "Cab" },
  "beck taxi": { categoryId: "transportation", type: "Cab" },
  "canadian tire": { categoryId: "household", type: "Household" },
  dollarama: { categoryId: "household", type: "General" },
  ikea: { categoryId: "household", type: "Deco" },
  homesense: { categoryId: "household", type: "Deco" },
  "home depot": { categoryId: "household", type: "Household" },
  shoppers: { categoryId: "health", type: "Health care" },
  "shoppers drug mart": { categoryId: "health", type: "Health care" },
  rexall: { categoryId: "health", type: "Health care" },
  winners: { categoryId: "health", type: "Clothing" },
  "old navy": { categoryId: "health", type: "Clothing" },
  uniqlo: { categoryId: "health", type: "Clothing" },
  rogers: { categoryId: "digital", type: "Mobile plans" },
  bell: { categoryId: "digital", type: "Mobile plans" },
  telus: { categoryId: "digital", type: "Mobile plans" },
  freedom: { categoryId: "digital", type: "Mobile plans" },
  fido: { categoryId: "digital", type: "Mobile plans" },
  koodo: { categoryId: "digital", type: "Mobile plans" },
  "tim hortons": { categoryId: "dining", type: "Cafe" },
  starbucks: { categoryId: "dining", type: "Cafe" },
  "second cup": { categoryId: "dining", type: "Cafe" },
  mcdonald: { categoryId: "dining", type: "Fast food" },
  "a&w": { categoryId: "dining", type: "Fast food" },
  subway: { categoryId: "dining", type: "Fast food" },
  "uber eats": { categoryId: "dining", type: "Delivery" },
  doordash: { categoryId: "dining", type: "Delivery" },
  skipthedishes: { categoryId: "dining", type: "Delivery" },
  "skip the dishes": { categoryId: "dining", type: "Delivery" },
  cineplex: { categoryId: "dining", type: "General" },
  disney: { categoryId: "dining", type: "Disney" },
  "best buy": { categoryId: "hobbies", type: "Tech" },
  apple: { categoryId: "hobbies", type: "Tech" },
  elevenlabs: { categoryId: "hobbies", type: "11Labs" },
  "11labs": { categoryId: "hobbies", type: "11Labs" },
};

/** Shortcut chips before a family has history. */
export const STARTER_SHOPS = ["Costco", "No Frills", "Tim Hortons", "TTC", "Uber Eats", "Shoppers"];

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

/**
 * Guess the category for a shop. The family's own last choice for that shop
 * wins; otherwise a known Canadian shop; otherwise null and we ask.
 */
export function guessCategory(
  shop: string,
  past: Expense[],
  cats: Category[] = CATEGORIES,
): CategoryGuess | null {
  const isReal = (id: string) => cats.some((c) => c.id === id);
  const key = norm(shop);
  if (!key) return null;
  const hit = [...past]
    .sort((a, b) => b.date.localeCompare(a.date))
    .find((e) => norm(e.shop) === key);
  if (hit && isReal(hit.categoryId))
    return { categoryId: hit.categoryId, type: hit.type, from: "history" };
  const known =
    KNOWN_SHOPS[key] ??
    Object.entries(KNOWN_SHOPS).find(
      ([k]) => key.startsWith(k + " ") || key.startsWith(k + "'"),
    )?.[1];
  if (known && isReal(known.categoryId)) return { ...known, from: "known" };
  return null;
}

/** The family's most-used shops, topped up with starters. */
export function topShops(past: Expense[], n = 6): string[] {
  const count = new Map<string, { name: string; n: number }>();
  for (const e of past) {
    const k = norm(e.shop);
    const c = count.get(k);
    count.set(k, { name: c?.name ?? e.shop.trim(), n: (c?.n ?? 0) + 1 });
  }
  const mine = [...count.values()].sort((a, b) => b.n - a.n).map((c) => c.name);
  const out = [...mine];
  for (const s of STARTER_SHOPS)
    if (out.length < n && !out.some((x) => norm(x) === norm(s))) out.push(s);
  return out.slice(0, n);
}

/** Spending categories, most used first. Investments are never expenses. */
export function categoriesByUse(past: Expense[], cats: Category[] = CATEGORIES) {
  const n = new Map<string, number>();
  for (const e of past) n.set(e.categoryId, (n.get(e.categoryId) ?? 0) + 1);
  return cats
    .filter((c) => c.group !== "investments")
    .sort((a, b) => (n.get(b.id) ?? 0) - (n.get(a.id) ?? 0));
}

/** Group expenses by shop, ignoring case and spacing; biggest total first. */
export function byMerchant(list: Expense[]) {
  const map = new Map<string, { key: string; name: string; total: number; rows: Expense[] }>();
  for (const e of list) {
    const key = e.shop.trim().toLowerCase().replace(/\s+/g, " ");
    const m = map.get(key) ?? { key, name: e.shop.trim(), total: 0, rows: [] };
    m.total += e.amount;
    m.rows.push(e);
    map.set(key, m);
  }
  return [...map.values()].sort((a, b) => b.total - a.total);
}
