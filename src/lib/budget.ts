import {
  CATEGORIES,
  type Category,
  type Expense,
  type MonthBudget,
  type MonthKey,
  type ReceiptItem,
} from "@/data/sample";
import { nextMonth } from "./format";

const r2 = (n: number) => Math.round(n * 100) / 100;

/** The tax on one receipt line, in percent: 0, 5 or 13. */
export const taxRate = (i: ReceiptItem): 0 | 5 | 13 => (i.hst ? (i.tax ?? 13) : 0);

/** Next choice when tapping a line's tax button: No tax → HST 13% → GST 5% → No tax. */
export function nextTax(i: ReceiptItem): Pick<ReceiptItem, "hst" | "tax"> {
  const r = taxRate(i);
  return r === 0
    ? { hst: true, tax: 13 }
    : r === 13
      ? { hst: true, tax: 5 }
      : { hst: false, tax: undefined };
}

/** `hst` is all the sales tax on the receipt (HST and GST together). */
export function receiptTotals(items: ReceiptItem[]) {
  const subtotal = r2(items.reduce((s, i) => s + i.qty * i.price, 0));
  const hst = r2(items.reduce((s, i) => s + (i.qty * i.price * taxRate(i)) / 100, 0));
  return { subtotal, hst, total: r2(subtotal + hst) };
}

export const inMonth = (e: Expense, month: MonthKey) => e.date.startsWith(month);

export function spentByCategory(expenses: Expense[], month: MonthKey) {
  const out: Record<string, number> = {};
  for (const e of expenses)
    if (inMonth(e, month)) out[e.categoryId] = (out[e.categoryId] ?? 0) + e.amount;
  return out;
}

/** A category the family still has that isn't an investment. */
const isSpendCat = (id: string, cats: Category[]) => {
  const c = cats.find((x) => x.id === id);
  return !!c && c.group !== "investments";
};

/** Spending budget = Needs + Wants + Debt. Investments never count. */
export function spendingBudget(b: MonthBudget, cats: Category[] = CATEGORIES) {
  return Object.entries(b).reduce((s, [id, v]) => (isSpendCat(id, cats) ? s + v : s), 0);
}

export function leftToSpend(
  b: MonthBudget,
  expenses: Expense[],
  month: MonthKey,
  cats: Category[] = CATEGORIES,
) {
  const budget = spendingBudget(b, cats);
  const spent = expenses
    .filter((e) => inMonth(e, month) && isSpendCat(e.categoryId, cats))
    .reduce((s, e) => s + e.amount, 0);
  return { budget, spent, left: budget - spent };
}

/**
 * Apply edited amounts starting this month or next month. Only the start month
 * and later months change; earlier months are never touched.
 */
export function applyBudgetChange(
  budgets: Record<MonthKey, MonthBudget>,
  month: MonthKey,
  draft: MonthBudget,
  when: "this" | "next",
): Record<MonthKey, MonthBudget> {
  const start = when === "this" ? month : nextMonth(month);
  const out: Record<MonthKey, MonthBudget> = {};
  for (const [k, v] of Object.entries(budgets)) out[k] = k >= start ? { ...draft } : v;
  if (!out[start]) out[start] = { ...draft };
  return out;
}

/** Bar caption, always in words. */
export function usageCaption(spent: number, budget: number, fmt: (n: number) => string) {
  const over = spent - budget;
  if (over > 0) return { text: `${fmt(spent)} of ${fmt(budget)} used`, over: `${fmt(over)} over` };
  return { text: `${fmt(spent)} of ${fmt(budget)} used · ${fmt(budget - spent)} left`, over: null };
}

/** Today on this device, as "YYYY-MM-DD" in local time. */
export function todayISO(d = new Date()) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/**
 * A new month starts with a copy of the latest earlier month's budget, so the
 * family never opens a month with no budget. Months that already exist, and
 * all earlier months, are left alone.
 */
export function startMonth(
  budgets: Record<MonthKey, MonthBudget>,
  month: MonthKey,
): Record<MonthKey, MonthBudget> {
  if (budgets[month]) return budgets;
  const before = Object.keys(budgets)
    .filter((k) => k < month)
    .sort();
  const last = before[before.length - 1];
  if (!last) return budgets;
  return { ...budgets, [month]: { ...budgets[last]! } };
}

/**
 * The budget to compare a month against. A month with no budget of its own
 * (e.g. before the app was set up) uses the nearest earlier month's, or else
 * the first budget there is.
 */
export function budgetFor(budgets: Record<MonthKey, MonthBudget>, month: MonthKey) {
  if (budgets[month]) return { budget: budgets[month], own: true };
  const keys = Object.keys(budgets).sort();
  const earlier = keys.filter((k) => k < month).pop();
  const key = earlier ?? keys[0];
  return { budget: key ? budgets[key]! : {}, own: false };
}

/** The first month with any spending or budget, so you can't scroll into empty years. */
export function firstMonth(
  budgets: Record<MonthKey, MonthBudget>,
  expenses: Expense[],
  month: MonthKey,
) {
  const all = [...Object.keys(budgets), ...expenses.map((e) => e.date.slice(0, 7)), month];
  return all.sort()[0]!;
}

/** Spent and budget for each month in order, for the monthly chart. */
export function monthlySpend(
  months: MonthKey[],
  budgets: Record<MonthKey, MonthBudget>,
  expenses: Expense[],
  cats: Category[] = CATEGORIES,
) {
  return months.map((m) => {
    const { budget, spent } = leftToSpend(budgetFor(budgets, m).budget, expenses, m, cats);
    return { month: m, spent, budget };
  });
}
