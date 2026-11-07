import { describe, expect, it } from "vitest";
import {
  BUDGETS,
  CATEGORIES,
  EXPENSES,
  FIRE_ANSWERS,
  FIRE_ASSUMPTIONS,
  HOUSEHOLD,
  INCOMES,
  LABELS,
  PLANS,
  PORTFOLIO,
} from "@/data/sample";
import { diff, fromRows, NO_ROWS, toRows, type Saved } from "@/lib/cloud";

const S: Saved = {
  setupDone: true,
  household: HOUSEHOLD,
  income: 9200,
  categories: CATEGORIES,
  budgets: BUDGETS,
  expenses: EXPENSES,
  incomes: INCOMES,
  labels: LABELS,
  plans: PLANS,
  portfolio: PORTFOLIO,
  fire: FIRE_ANSWERS,
  fireSet: true,
  assumptions: FIRE_ASSUMPTIONS,
};
const EMPTY: Saved = { ...S, setupDone: false, expenses: [], incomes: [], plans: [], budgets: {} };
const H = "h1";

describe("saving to Supabase", () => {
  it("reads back exactly what it wrote", () => {
    expect(fromRows(toRows(H, S), EMPTY)).toEqual(S);
  });

  it("a new household writes every row", () => {
    const changes = diff(NO_ROWS, toRows(H, S));
    const n = Object.fromEntries(changes.map((c) => [c.table, c.upsert.length]));
    expect(n["expenses"]).toBe(EXPENSES.length);
    expect(n["categories"]).toBe(CATEGORIES.length);
    expect(changes.every((c) => c.remove.length === 0)).toBe(true);
  });

  it("nothing changed means nothing to write", () => {
    expect(diff(toRows(H, S), toRows(H, S))).toEqual([]);
  });

  it("one new expense writes just that row", () => {
    const e = { ...EXPENSES[0]!, id: "new", shop: "Costco" };
    const changes = diff(toRows(H, S), toRows(H, { ...S, expenses: [e, ...S.expenses] }));
    expect(changes).toHaveLength(1);
    expect(changes[0]).toMatchObject({ table: "expenses", remove: [] });
    expect(changes[0]!.upsert.map((r) => r["id"])).toEqual(["new"]);
  });

  it("money in is saved as its own rows", () => {
    const changes = diff(toRows(H, S), toRows(H, { ...S, incomes: S.incomes.slice(1) }));
    expect(changes).toEqual([{ table: "incomes", upsert: [], remove: [{ id: S.incomes[0]!.id }] }]);
  });

  it("a deleted plan is removed by its id", () => {
    const changes = diff(toRows(H, S), toRows(H, { ...S, plans: S.plans.slice(1) }));
    expect(changes).toEqual([{ table: "plans", upsert: [], remove: [{ id: S.plans[0]!.id }] }]);
  });

  it("a budget change writes only that month and category", () => {
    const budgets = { ...S.budgets, "2026-11": { ...S.budgets["2026-11"]!, groceries: 800 } };
    const changes = diff(toRows(H, S), toRows(H, { ...S, budgets }));
    expect(changes).toHaveLength(1);
    expect(changes[0]!.upsert).toEqual([
      { household_id: H, month: "2026-11", category_id: "groceries", amount: 800 },
    ]);
  });
});
