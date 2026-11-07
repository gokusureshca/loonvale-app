import { describe, expect, it } from "vitest";
import { CATEGORIES, type Expense } from "@/data/sample";
import { cleanStatement, compareStatement, sameShop, toExpense, toIncome } from "@/lib/statement";

const exp = (
  id: string,
  date: string,
  shop: string,
  amount: number,
  categoryId = "groceries",
): Expense => ({
  id,
  date,
  shop,
  amount,
  categoryId,
  who: "G",
  labels: [],
});

const raw = (transactions: object[]) => ({
  is_statement: true,
  bank: "RBC",
  period_start: "2026-10-01",
  period_end: "2026-10-31",
  transactions,
});
const t = (
  date: string,
  merchant: string,
  amount: number,
  kind = "purchase",
  category_id = "",
) => ({
  date,
  description: merchant.toUpperCase() + " #123 TORONTO",
  merchant,
  amount,
  kind,
  category_id,
});

describe("cleanStatement", () => {
  it("keeps good lines and drops broken ones", () => {
    const s = cleanStatement(
      raw([
        t("2026-10-02", "Loblaws", 41.18),
        t("bad", "X", 5),
        t("2026-10-03", "Y", 0),
        t("2026-10-04", "Z", -12),
      ]),
    )!;
    expect(s.txns.map((x) => [x.merchant, x.amount])).toEqual([
      ["Loblaws", 41.18],
      ["Z", 12],
    ]);
    expect(s.bank).toBe("RBC");
  });
  it("returns null when it isn't a statement", () => {
    expect(cleanStatement({ is_statement: false, transactions: [] })).toBeNull();
    expect(cleanStatement(raw([]))).toBeNull();
  });
});

describe("sameShop", () => {
  it("matches messy card names", () => {
    expect(sameShop("LOBLAWS #1234 TORONTO", "Loblaws")).toBe(true);
    expect(sameShop("Clement", "Clément")).toBe(true);
    expect(sameShop("Tim Hortons", "Loblaws")).toBe(false);
  });
});

describe("compareStatement", () => {
  const recorded = [
    exp("a", "2026-10-02", "Loblaws", 41.18),
    exp("b", "2026-10-07", "No Frills", 70.24),
    // One trip saved as two expenses (groceries + household).
    exp("c1", "2026-10-09", "Longo's", 132.0),
    exp("c2", "2026-10-09", "Longo's", 13.55, "household"),
    exp("d", "2026-09-28", "Tim Hortons", 3.35, "dining"),
  ];
  const st = cleanStatement(
    raw([
      t("2026-10-03", "Loblaws", 41.18), // a day later on the card
      t("2026-10-07", "No Frills", 70.25), // a cent different
      t("2026-10-10", "Longos", 145.55), // matches the two together
      t("2026-10-12", "Tim Hortons", 3.35), // new: the recorded one is 14 days earlier
      t("2026-10-15", "Shell", 60, "purchase", "transportation"),
      t("2026-10-20", "Card payment", 500, "payment"),
      t("2026-10-21", "Loblaws", 41.18), // second identical charge: new, not double-matched
    ]),
  )!;
  const c = compareStatement(st, recorded, CATEGORIES);

  it("finds what's already recorded", () => {
    expect(c.matched.map((m) => m.expenses.map((e) => e.id))).toEqual([["a"], ["b"], ["c1", "c2"]]);
  });

  it("flags what's missing, with a category", () => {
    expect(c.added.map((r) => [r.txn.merchant, r.categoryId])).toEqual([
      ["Tim Hortons", "dining"], // from history
      ["Shell", "transportation"], // reader's pick
      ["Loblaws", "groceries"],
    ]);
  });

  it("sets aside payments and transfers", () => {
    expect(c.skipped.map((x) => x.txn.merchant)).toEqual(["Card payment"]);
  });

  it("makes an expense for a new line", () => {
    expect(toExpense(c.added[1]!, "W", "id1")).toMatchObject({
      date: "2026-10-15",
      shop: "Shell",
      amount: 60,
      categoryId: "transportation",
      who: "W",
    });
  });
});

describe("transfers and card payments", () => {
  const recorded = [exp("uk", "2026-10-02", "UK loan", 1000, "uk")];
  const st = cleanStatement(
    raw([
      t("2026-10-01", "Wise", 1000, "transfer"), // RBC to Wise for the UK debt, already entered
      t("2026-10-05", "Wise to UK account", 400, "transfer", "uk"), // sent abroad, not entered
      t("2026-10-06", "Transfer to savings", 250, "transfer"),
      t("2026-10-08", "CIBC card payment", 1000, "payment"), // same amount as the UK entry
      t("2026-10-09", "Payroll", 4200, "income"),
      t("2026-10-10", "Amazon refund", 20, "refund"),
    ]),
  )!;
  const c = compareStatement(st, recorded, CATEGORIES);

  it("matches a transfer someone already entered as an expense", () => {
    expect(c.matched.map((m) => [m.txn.merchant, m.expenses[0]!.id])).toEqual([["Wise", "uk"]]);
  });

  it("never adds transfers, card payments, refunds or income on its own", () => {
    expect(c.added).toEqual([]);
    expect(c.skipped.map((r) => r.txn.merchant)).toEqual([
      "Wise to UK account",
      "Transfer to savings",
      "CIBC card payment",
      "Amazon refund",
    ]);
  });

  it("gives a transfer a category in case it's ticked", () => {
    expect(c.skipped[0]!.categoryId).toBe("uk");
  });

  it("never matches a card payment to an expense", () => {
    const only = compareStatement(
      cleanStatement(raw([t("2026-10-02", "CIBC card payment", 1000, "payment")]))!,
      recorded,
      CATEGORIES,
    );
    expect(only.matched).toEqual([]);
  });
});

describe("money in", () => {
  const paid = [
    { id: "p1", date: "2026-10-15", source: "Payroll", amount: 3600, who: "G" as const },
  ];
  const st = cleanStatement(
    raw([
      t("2026-10-16", "ACME PAYROLL", 3600, "income"), // already entered, a day apart
      t("2026-10-30", "ACME PAYROLL", 3600, "income"), // new
      t("2026-10-20", "Canada child benefit", 620, "income"),
    ]),
  )!;
  const c = compareStatement(st, [], CATEGORIES, paid);

  it("matches pay already entered and offers the rest", () => {
    expect(c.moneyIn.map((m) => [m.txn.date, m.recorded?.id ?? null])).toEqual([
      ["2026-10-16", "p1"],
      ["2026-10-20", null],
      ["2026-10-30", null],
    ]);
    expect(c.added).toEqual([]);
    expect(c.skipped).toEqual([]);
  });

  it("makes an income for a new line", () => {
    expect(toIncome(c.moneyIn[1]!.txn, "J", "x")).toEqual({
      id: "x",
      date: "2026-10-20",
      source: "Canada child benefit",
      amount: 620,
      who: "J",
    });
  });
});
