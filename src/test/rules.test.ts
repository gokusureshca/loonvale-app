import { describe, expect, it } from "vitest";
import { BUDGETS, CATEGORIES, EXPENSES, FIRE_ANSWERS, FIRE_ASSUMPTIONS } from "@/data/sample";
import {
  applyBudgetChange,
  leftToSpend,
  receiptTotals,
  spentByCategory,
  startMonth,
  todayISO,
} from "@/lib/budget";
import { computeFire } from "@/lib/fire";

describe("FIRE maths", () => {
  const r = computeFire(FIRE_ANSWERS, FIRE_ASSUMPTIONS);
  it("needs about $7.04M by 47", () => expect(r.need / 1e6).toBeCloseTo(7.04, 2));
  it("needs about $24,618 a month", () =>
    expect(Math.abs(r.monthlyNeeded - 24618)).toBeLessThan(50));
  it("reaches about $1.46M on current saving (21%)", () => {
    expect(r.projected / 1e6).toBeCloseTo(1.46, 1);
    expect(Math.round(r.pct)).toBe(21);
  });
  it("Retire funds max(30, 90 - goalAge) years", () => {
    const retire = computeFire({ ...FIRE_ANSWERS, goal: "retire" }, FIRE_ASSUMPTIONS);
    expect(retire.need).toBeGreaterThan(r.need);
  });
  it("home equity only counts when selling", () => {
    const keep = computeFire({ ...FIRE_ANSWERS, sellHome: false }, FIRE_ASSUMPTIONS);
    expect(keep.projected).toBeLessThan(r.projected);
  });
});

describe("Budget rules", () => {
  it("investments never count in Left to spend", () => {
    const b = { ...BUDGETS["2026-11"]!, rrsp: 99999 };
    expect(leftToSpend(b, EXPENSES, "2026-11").budget).toBe(7270);
  });
  it("changing Nov never changes Oct", () => {
    const out = applyBudgetChange(
      BUDGETS,
      "2026-11",
      { ...BUDGETS["2026-11"]!, housing: 1 },
      "this",
    );
    expect(out["2026-10"]).toEqual(BUDGETS["2026-10"]);
    expect(out["2026-11"]!["housing"]).toBe(1);
  });
  it("Next month leaves the selected month unchanged", () => {
    const out = applyBudgetChange(
      BUDGETS,
      "2026-11",
      { ...BUDGETS["2026-11"]!, housing: 1 },
      "next",
    );
    expect(out["2026-11"]!["housing"]).toBe(3400);
    expect(out["2026-12"]!["housing"]).toBe(1);
  });
  it("Nov: $3,458 left of a $7,270 spending budget", () => {
    const l = leftToSpend(BUDGETS["2026-11"]!, EXPENSES, "2026-11");
    expect(l.budget).toBe(7270);
    expect(Math.round(l.left * 100) / 100).toBe(3458);
  });
  it("Debt (UK Expense) counts in the spending budget", () => {
    const b = { ...BUDGETS["2026-11"]!, uk: 0 };
    expect(leftToSpend(b, EXPENSES, "2026-11").budget).toBe(6870);
  });
  it("every expense uses a real category and type", () => {
    for (const e of EXPENSES) {
      const c = CATEGORIES.find((x) => x.id === e.categoryId);
      expect(c, e.id).toBeDefined();
      if (e.type) expect(c!.types, e.id).toContain(e.type);
    }
  });
  it("Oct dining went over its own Oct budget", () => {
    expect(spentByCategory(EXPENSES, "2026-10")["dining"]! > BUDGETS["2026-10"]!["dining"]!).toBe(
      true,
    );
  });
  it("Costco receipt with 13% HST totals $186.42", () => {
    expect(receiptTotals(EXPENSES.find((e) => e.id === "e2")!.items!).total).toBe(186.42);
  });
});

describe("real date and new months", () => {
  it("todayISO uses the local date", () => {
    expect(todayISO(new Date(2026, 11, 1, 0, 5))).toBe("2026-12-01");
  });

  it("a new month starts with a copy of the latest budget", () => {
    const out = startMonth(BUDGETS, "2027-01");
    expect(out["2027-01"]).toEqual(BUDGETS["2026-12"]);
    expect(out["2027-01"]).not.toBe(BUDGETS["2026-12"]);
    expect(out["2026-10"]).toBe(BUDGETS["2026-10"]);
  });

  it("an existing month is never overwritten", () => {
    expect(startMonth(BUDGETS, "2026-11")).toBe(BUDGETS);
  });

  it("no earlier budget means nothing to copy", () => {
    expect(startMonth({}, "2026-11")).toEqual({});
  });
});
