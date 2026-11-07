import { describe, expect, it } from "vitest";
import { expenseSource, type Expense } from "@/data/sample";
import { fromRows, toRows } from "@/lib/cloud";
import { toExpense } from "@/lib/statement";

const e: Expense = {
  id: "a",
  date: "2026-11-01",
  shop: "Loblaws",
  amount: 10,
  categoryId: "groceries",
  who: "G",
  labels: [],
};

describe("where an expense came from", () => {
  it("is manual unless it has a receipt photo or says otherwise", () => {
    expect(expenseSource(e)).toBe("manual");
    expect(expenseSource({ ...e, receipt: "h/a.jpg" })).toBe("receipt");
    expect(expenseSource({ ...e, source: "statement" })).toBe("statement");
  });

  it("marks expenses added from a statement", () => {
    const row = {
      txn: {
        date: "2026-11-01",
        description: "",
        merchant: "Uber",
        amount: 5,
        kind: "purchase" as const,
        categoryId: "",
      },
      categoryId: "transportation",
    };
    expect(expenseSource(toExpense(row, "G", "x"))).toBe("statement");
  });

  it("is saved and read back", () => {
    const rows = toRows("h", {
      setupDone: true,
      household: { me: "", partner: "", city: "" },
      income: 0,
      categories: [],
      budgets: {},
      expenses: [{ ...e, source: "statement" }, e],
      incomes: [],
      labels: [],
      plans: [],
      portfolio: null,
      fire: {} as never,
      fireSet: false,
      assumptions: {} as never,
    });
    expect(rows.expenses.map((r) => r["source"])).toEqual(["statement", null]);
    const back = fromRows(rows, {} as never).expenses;
    expect(back.map((x) => x.source)).toEqual(["statement", undefined]);
  });
});
