import { describe, expect, it } from "vitest";
import type { Expense } from "@/data/sample";
import { budgetFor, firstMonth, monthlySpend } from "@/lib/budget";
import { prevMonth } from "@/lib/format";

const exp = (date: string, amount: number, categoryId = "groceries"): Expense => ({
  id: date + amount,
  date,
  shop: "x",
  amount,
  categoryId,
  who: "G",
  labels: [],
});

describe("past months", () => {
  const budgets = { "2026-11": { groceries: 700 }, "2026-12": { groceries: 800 } };

  it("prevMonth wraps the year", () => {
    expect(prevMonth("2026-01")).toBe("2025-12");
    expect(prevMonth("2026-11")).toBe("2026-10");
  });

  it("a month without a budget uses the nearest one", () => {
    expect(budgetFor(budgets, "2026-11")).toEqual({ budget: { groceries: 700 }, own: true });
    expect(budgetFor(budgets, "2026-09")).toEqual({ budget: { groceries: 700 }, own: false });
    expect(budgetFor(budgets, "2027-02").budget).toEqual({ groceries: 800 });
    expect(budgetFor({}, "2026-09")).toEqual({ budget: {}, own: false });
  });

  it("first month is the earliest spending or budget", () => {
    expect(firstMonth(budgets, [exp("2026-08-23", 5)], "2026-11")).toBe("2026-08");
  });

  it("adds up each month, leaving out investments", () => {
    const e = [exp("2026-10-01", 50), exp("2026-10-02", 25), exp("2026-10-03", 1000, "tfsa")];
    expect(monthlySpend(["2026-10", "2026-11"], budgets, e)).toEqual([
      { month: "2026-10", spent: 75, budget: 700 },
      { month: "2026-11", spent: 0, budget: 700 },
    ]);
  });
});

describe("by merchant", () => {
  it("groups the same shop however it's typed, biggest first", async () => {
    const { byMerchant } = await import("@/lib/shops");
    const e = (shop: string, amount: number): Expense => ({
      id: shop + amount,
      date: "2026-09-01",
      shop,
      amount,
      categoryId: "groceries",
      who: "G",
      labels: [],
    });
    const out = byMerchant([e("Loblaws", 10), e("loblaws ", 5), e("Costco", 100)]);
    expect(out.map((m) => [m.name, m.total, m.rows.length])).toEqual([
      ["Costco", 100, 1],
      ["Loblaws", 15, 2],
    ]);
  });
});
