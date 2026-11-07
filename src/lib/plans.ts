import type { MonthKey, Plan } from "@/data/sample";
import { money, monthLong } from "./format";

/** Whole months from this month until the "by" month (0 when it's this month or past). */
export function monthsLeft(from: MonthKey, by: MonthKey) {
  const n = (k: string) => Number(k.slice(0, 4)) * 12 + Number(k.slice(5, 7));
  return Math.max(0, n(by) - n(from));
}

/**
 * What to put aside each month to reach the plan on time, rounded up to the
 * dollar. null when there's no date; the full amount left when it's due now.
 */
export function perMonth(plan: Plan, month: MonthKey): number | null {
  const left = Math.max(0, plan.target - plan.saved);
  if (left === 0) return 0;
  if (!plan.by) return null;
  const m = monthsLeft(month, plan.by);
  return m === 0 ? left : Math.ceil(left / m);
}

export const newPlanId = () =>
  `p-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

/** "Save $500 a month to get there by June 2027", always in words. */
export function planLine(p: Plan, month: MonthKey) {
  const left = Math.max(0, p.target - p.saved);
  if (left === 0) return "Done. You've saved it all.";
  const each = perMonth(p, month);
  if (each === null) return `${money(left)} to go`;
  if (p.by <= month) return `${money(left)} to go · due this month`;
  return `${money(left)} to go · save ${money(each)} a month to get there by ${monthLong(p.by)}`;
}
