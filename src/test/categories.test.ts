import { describe, expect, it } from "vitest";
import { CATEGORIES } from "@/data/sample";
import { spendingBudget } from "@/lib/budget";
import { DEFAULT_SPLIT, namesFilled, newCategory, prefillBudget } from "@/lib/setup";
import { guessCategory } from "@/lib/shops";

describe("family's own categories", () => {
  it("a renamed category keeps its id, so budgets and shops still match", () => {
    const cats = CATEGORIES.map((c) => (c.id === "groceries" ? { ...c, name: "Food" } : c));
    expect(guessCategory("Costco", [], cats)).toMatchObject({ categoryId: "groceries" });
  });

  it("a new category gets a share of the budget and counts as spending", () => {
    const pets = { ...newCategory("needs"), name: "Pets" };
    const cats = [...CATEGORIES, pets];
    const b = prefillBudget(9200, DEFAULT_SPLIT, cats);
    expect(pets.id in b).toBe(true);
    expect(spendingBudget({ [pets.id]: 100 }, cats)).toBe(100);
  });

  it("a new investment category never counts in Left to spend", () => {
    const crypto = { ...newCategory("investments"), name: "Crypto" };
    expect(spendingBudget({ [crypto.id]: 300 }, [...CATEGORIES, crypto])).toBe(0);
  });

  it("a removed category no longer counts or gets guessed", () => {
    const cats = CATEGORIES.filter((c) => c.id !== "groceries");
    expect(spendingBudget({ groceries: 700, housing: 3400 }, cats)).toBe(3400);
    expect(guessCategory("Costco", [], cats)).toBeNull();
  });

  it("a group with every category removed is skipped, not a crash", () => {
    const cats = CATEGORIES.filter((c) => c.group !== "debt");
    expect(() => prefillBudget(9200, DEFAULT_SPLIT, cats)).not.toThrow();
  });

  it("Done waits until every category has a name", () => {
    expect(namesFilled([...CATEGORIES, newCategory("wants")], "wants")).toBe(false);
    expect(namesFilled(CATEGORIES, "wants")).toBe(true);
  });
});
