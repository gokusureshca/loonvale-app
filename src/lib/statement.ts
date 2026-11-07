// Compares a bank or card statement with the expenses already recorded.
// Pure: no network here (reading the statement is in supabase.ts).
import type { Category, Expense, Income } from "@/data/sample";
import { guessCategory } from "./shops";

export type TxnKind = "purchase" | "fee" | "refund" | "payment" | "transfer" | "income";

export interface StatementTxn {
  date: string; // YYYY-MM-DD
  description: string;
  merchant: string;
  amount: number; // always positive
  kind: TxnKind;
  categoryId: string; // the reader's pick, may be ""
}

export interface Statement {
  bank: string;
  periodStart: string;
  periodEnd: string;
  txns: StatementTxn[];
}

const KINDS: TxnKind[] = ["purchase", "fee", "refund", "payment", "transfer", "income"];
const isDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));
const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

/** Check and tidy what the reader sent back. Null when it wasn't a statement. */
export function cleanStatement(raw: unknown): Statement | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (r["is_statement"] === false) return null;
  const txns: StatementTxn[] = (Array.isArray(r["transactions"]) ? r["transactions"] : [])
    .map((x: Record<string, unknown>) => ({
      date: str(x?.["date"]),
      description: str(x?.["description"]),
      merchant: str(x?.["merchant"]) || str(x?.["description"]),
      amount: Math.round(Math.abs(Number(x?.["amount"]) || 0) * 100) / 100,
      kind: (KINDS.includes(x?.["kind"] as TxnKind) ? x?.["kind"] : "purchase") as TxnKind,
      categoryId: str(x?.["category_id"]),
    }))
    .filter((t) => isDate(t.date) && t.amount > 0 && t.merchant !== "");
  if (!txns.length) return null;
  const ps = str(r["period_start"]);
  const pe = str(r["period_end"]);
  return {
    bank: str(r["bank"]),
    periodStart: isDate(ps) ? ps : "",
    periodEnd: isDate(pe) ? pe : "",
    txns,
  };
}

const SKIP_REASON: Record<TxnKind, string> = {
  purchase: "",
  fee: "",
  refund: "Refund",
  payment: "Card payment, already counted on the card",
  transfer: "Transfer, not counted",
  income: "Money in",
};
export const skipReason = (t: StatementTxn) => SKIP_REASON[t.kind];

const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z]/g, "");

/** True when two shop names look like the same place ("LOBLAWS #12" and "Loblaws"). */
export function sameShop(a: string, b: string) {
  const x = norm(a);
  const y = norm(b);
  if (!x || !y) return false;
  return (
    x.includes(y) ||
    y.includes(x) ||
    (x.length >= 4 && y.length >= 4 && x.slice(0, 4) === y.slice(0, 4))
  );
}

const days = (a: string, b: string) => Math.abs(Date.parse(a) - Date.parse(b)) / 86_400_000;

/** How many days apart a card date and the recorded date can be (cards post late). */
export const DATE_SLACK = 4;

export interface NewRow {
  txn: StatementTxn;
  categoryId: string;
  type?: string | undefined;
}

export interface Comparison {
  /** On the statement, not recorded yet. */
  added: NewRow[];
  /** On the statement and already recorded (one or more expenses). */
  matched: { txn: StatementTxn; expenses: Expense[] }[];
  /**
   * On the statement but not spending: card payments, transfers, refunds, money in.
   * None are added unless ticked. Only transfers can be ticked (money sent abroad
   * or an e-Transfer can be a real cost), so they carry a category too.
   */
  skipped: NewRow[];
  /** Money in: pay and deposits, with the income already recorded for it, if any. */
  moneyIn: { txn: StatementTxn; recorded: Income | null }[];
}

/**
 * Match each spending line to recorded expenses: the same amount (to the cent,
 * or within 5 cents), a date up to 4 days apart, and preferably the same shop.
 * A trip saved as several expenses (one per category) matches their total.
 * Each expense is used once.
 */
export function compareStatement(
  st: Statement,
  expenses: Expense[],
  cats: Category[],
  incomes: Income[] = [],
): Comparison {
  const used = new Set<string>();
  // Single expenses, plus same-day same-shop groups added together.
  const groups = new Map<string, Expense[]>();
  for (const e of expenses) {
    const k = `${e.date}|${norm(e.shop)}`;
    groups.set(k, [...(groups.get(k) ?? []), e]);
  }
  const candidates: Expense[][] = [
    ...expenses.map((e) => [e]),
    ...[...groups.values()].filter((g) => g.length > 1),
  ];

  const out: Comparison = { added: [], matched: [], skipped: [], moneyIn: [] };
  const usedIncome = new Set<string>();
  const spendCats = cats.filter((c) => c.group !== "investments");
  const fallback = spendCats.find((c) => c.id === "misc")?.id ?? spendCats[0]?.id ?? "";

  const categoryFor = (t: StatementTxn) => {
    const guess = guessCategory(t.merchant, expenses, cats);
    const fromHistory = guess?.from === "history" ? guess : null;
    const reader = spendCats.some((c) => c.id === t.categoryId) ? t.categoryId : "";
    return {
      categoryId: fromHistory?.categoryId ?? (reader || guess?.categoryId || fallback),
      type: fromHistory?.type ?? (reader ? undefined : guess?.type),
    };
  };

  for (const t of [...st.txns].sort((a, b) => a.date.localeCompare(b.date))) {
    // Card payments and refunds are never spending: the purchases
    // themselves are on the card statement, so counting a payment would double it.
    // Money in is matched to income already recorded (same amount, a few days apart).
    if (t.kind === "income") {
      const recorded =
        incomes
          .filter(
            (i) =>
              !usedIncome.has(i.id) &&
              Math.abs(i.amount - t.amount) <= 0.05 &&
              days(i.date, t.date) <= DATE_SLACK,
          )
          .sort((a, b) => days(a.date, t.date) - days(b.date, t.date))[0] ?? null;
      if (recorded) usedIncome.add(recorded.id);
      out.moneyIn.push({ txn: t, recorded });
      continue;
    }
    if (t.kind === "payment" || t.kind === "refund") {
      out.skipped.push({ txn: t, categoryId: "" });
      continue;
    }
    // A transfer only counts if someone already entered it as an expense
    // (e.g. money sent home for the UK debt). Otherwise it's set aside, unticked.
    const transfer = t.kind === "transfer";
    let best: { g: Expense[]; score: number } | null = null;
    for (const g of candidates) {
      if (g.some((e) => used.has(e.id))) continue;
      const total = Math.round(g.reduce((s, e) => s + e.amount, 0) * 100) / 100;
      if (Math.abs(total - t.amount) > 0.05) continue;
      const d = Math.min(...g.map((e) => days(e.date, t.date)));
      if (d > DATE_SLACK) continue;
      const shop = sameShop(t.merchant, g[0]!.shop) || sameShop(t.description, g[0]!.shop);
      // A different shop only counts on the same day. Transfers rarely carry
      // the shop's name, so for them the amount and dates are enough.
      if (!shop && d > 0 && !transfer) continue;
      const score = (shop ? 0 : 10) + d + (Math.abs(total - t.amount) > 0.005 ? 0.5 : 0);
      if (!best || score < best.score) best = { g, score };
    }
    if (best) {
      best.g.forEach((e) => used.add(e.id));
      out.matched.push({ txn: t, expenses: best.g });
      continue;
    }
    if (transfer) out.skipped.push({ txn: t, ...categoryFor(t) });
    else out.added.push({ txn: t, ...categoryFor(t) });
  }
  return out;
}

/** The expense to save for a new statement line. */
export function toExpense(row: NewRow, who: Expense["who"], id: string): Expense {
  return {
    id,
    date: row.txn.date,
    shop: row.txn.merchant,
    amount: row.txn.amount,
    categoryId: row.categoryId,
    who,
    labels: [],
    source: "statement",
    ...(row.type ? { type: row.type } : {}),
  };
}

/** The income to save for a money-in line. */
export function toIncome(t: StatementTxn, who: Income["who"], id: string): Income {
  return { id, date: t.date, source: t.merchant, amount: t.amount, who };
}
