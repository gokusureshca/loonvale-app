import { describe, expect, it } from "vitest";
import { CATEGORIES, type Group } from "@/data/sample";
import { spendingBudget } from "@/lib/budget";
import { DEFAULT_SPLIT, groupAmounts, peopleFor, prefillBudget, splitTotal } from "@/lib/setup";

const groupSum = (b: Record<string, number>, g: Group) =>
  CATEGORIES.filter((c) => c.group === g).reduce((s, c) => s + (b[c.id] ?? 0), 0);

describe("First-time setup", () => {
  it("default split adds up to 100%", () => expect(splitTotal(DEFAULT_SPLIT)).toBe(100));

  it("splits $9,200 take-home 50/30/15/5", () => {
    expect(groupAmounts(9200, DEFAULT_SPLIT)).toEqual({
      needs: 4600,
      wants: 2760,
      investments: 1380,
      debt: 460,
    });
  });

  it("prefilled budget adds up exactly to each group's share", () => {
    for (const income of [9200, 6543, 12000]) {
      const b = prefillBudget(income, DEFAULT_SPLIT);
      const a = groupAmounts(income, DEFAULT_SPLIT);
      for (const g of ["needs", "wants", "investments", "debt"] as const)
        expect(groupSum(b, g)).toBe(a[g]);
      expect(Object.values(b).every((v) => v >= 0)).toBe(true);
    }
  });

  it("spending budget leaves investments out", () => {
    const b = prefillBudget(9200, DEFAULT_SPLIT);
    expect(spendingBudget(b)).toBe(9200 - 1380);
  });

  it("a household of one has no partner or joint tag", () => {
    expect(peopleFor({ me: "Priya", partner: "", city: "" }).map((p) => p.tag)).toEqual(["P"]);
  });

  it("partners with the same first letter get different tags", () => {
    const tags = peopleFor({ me: "Goku", partner: "Gita", city: "" }).map((p) => p.tag);
    expect(new Set(tags).size).toBe(3);
  });
});
