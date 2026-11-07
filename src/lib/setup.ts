import {
  BUDGETS,
  CATEGORIES,
  CURRENT_MONTH,
  type Category,
  type Group,
  type MonthBudget,
} from "@/data/sample";
import type { Household, PersonInfo } from "@/store/store-context";

export type Split = Record<Group, number>; // percentages, should add up to 100

export const DEFAULT_SPLIT: Split = { needs: 50, wants: 30, investments: 15, debt: 5 };

export const splitTotal = (s: Split) => s.needs + s.wants + s.investments + s.debt;

/** Dollar amount for each group from monthly take-home pay. */
export function groupAmounts(income: number, split: Split): Record<Group, number> {
  const out = {} as Record<Group, number>;
  for (const g of Object.keys(split) as Group[]) out[g] = Math.round((income * split[g]) / 100);
  return out;
}

const roundTo10 = (n: number) => Math.round(n / 10) * 10;

/**
 * First budget for a new household. Each group's amount is shared across its
 * categories in the same proportions as the example budget, rounded to $10.
 * The rounding leftover goes on the biggest category, so each group adds up exactly.
 */
export function prefillBudget(
  income: number,
  split: Split,
  categories: Category[] = CATEGORIES,
): MonthBudget {
  const amounts = groupAmounts(income, split);
  const weights = BUDGETS[CURRENT_MONTH]!;
  const out: MonthBudget = {};
  for (const g of Object.keys(amounts) as Group[]) {
    const cats = categories.filter((c) => c.group === g);
    if (cats.length === 0) continue;
    const wsum = cats.reduce((s, c) => s + (weights[c.id] ?? 0), 0);
    let used = 0;
    for (const c of cats) {
      const share = wsum > 0 ? (weights[c.id] ?? 0) / wsum : 1 / cats.length;
      out[c.id] = roundTo10(amounts[g] * share);
      used += out[c.id]!;
    }
    const biggest = cats.reduce((a, c) => ((out[c.id] ?? 0) > (out[a.id] ?? 0) ? c : a), cats[0]!);
    out[biggest.id] = (out[biggest.id] ?? 0) + (amounts[g] - used);
  }
  return out;
}

/** First letter of a name, for the person tags. */
export const initial = (name: string) => (name.trim()[0] ?? "?").toUpperCase();

/** Who can pay: you, your partner and Joint. A household of one only has you. */
export function peopleFor(h: Household): PersonInfo[] {
  const me = h.me.trim() || "You";
  const partner = h.partner.trim();
  if (!partner) return [{ id: "G", name: me, tag: initial(me) }];
  const same = initial(me) === initial(partner);
  return [
    { id: "G", name: me, tag: initial(me) },
    { id: "W", name: partner, tag: same ? partner.slice(0, 2) : initial(partner) },
    { id: "J", name: "Joint", tag: "J" },
  ];
}

/** A new category the family added. */
export function newCategory(group: Group): Category {
  const id = `c-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  return { id, name: "", group, types: [] };
}

/** Every category in the group has a name. */
export const namesFilled = (categories: Category[], group: Group) =>
  categories.filter((c) => c.group === group).every((c) => c.name.trim() !== "");
