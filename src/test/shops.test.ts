import { describe, expect, it } from "vitest";
import type { Expense } from "@/data/sample";
import { categoriesByUse, guessCategory, KNOWN_SHOPS, topShops } from "@/lib/shops";
import { CATEGORIES } from "@/data/sample";

const ex = (shop: string, categoryId: string, date = "2026-11-01", type?: string): Expense => ({
  id: shop + date,
  date,
  shop,
  amount: 10,
  categoryId,
  who: "G",
  labels: [],
  ...(type ? { type } : {}),
});

describe("Category guess for a shop", () => {
  it("knows common Canadian shops for a new family", () => {
    expect(guessCategory("Costco", [])).toMatchObject({ categoryId: "groceries", from: "known" });
    expect(guessCategory("  tim hortons ", [])).toMatchObject({
      categoryId: "dining",
      type: "Cafe",
    });
    expect(guessCategory("Costco Wholesale", [])).toMatchObject({ categoryId: "groceries" });
  });

  it("asks when the shop is unknown", () => {
    expect(guessCategory("Raj's Corner Store", [])).toBeNull();
    expect(guessCategory("", [])).toBeNull();
  });

  it("the family's own latest choice wins", () => {
    const past = [
      ex("Costco", "groceries", "2026-10-01"),
      ex("Costco", "household", "2026-11-02", "General"),
    ];
    expect(guessCategory("costco", past)).toMatchObject({
      categoryId: "household",
      type: "General",
      from: "history",
    });
  });

  it("every known shop points at a real spending category and type", () => {
    for (const [shop, g] of Object.entries(KNOWN_SHOPS)) {
      const c = CATEGORIES.find((x) => x.id === g.categoryId);
      expect(c, shop).toBeDefined();
      expect(c!.group, shop).not.toBe("investments");
      if (g.type) expect(c!.types, shop).toContain(g.type);
    }
  });
});

describe("Shortcuts", () => {
  it("shows the family's most-used shops first, then starters", () => {
    const past = [
      ex("Farm Boy", "groceries", "2026-11-01"),
      ex("Farm Boy", "groceries", "2026-11-02"),
      ex("TTC", "transportation"),
    ];
    const s = topShops(past);
    expect(s.slice(0, 2)).toEqual(["Farm Boy", "TTC"]);
    expect(s).toHaveLength(6);
  });

  it("category chips never include investments", () => {
    expect(categoriesByUse([]).some((c) => c.group === "investments")).toBe(false);
  });
});
