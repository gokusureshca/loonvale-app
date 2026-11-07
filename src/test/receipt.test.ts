import { describe, expect, it } from "vitest";
import { CATEGORIES } from "@/data/sample";
import { cleanReceipt, totalsDiffer } from "@/lib/receipt";

const TODAY = "2026-11-04";

describe("cleanReceipt", () => {
  const raw = {
    is_receipt: true,
    shop: " No Frills ",
    date: "2026-11-02",
    category_id: "groceries",
    items: [
      { name: "2% milk 4L", qty: 1, price: 6.49, hst: false, type: "Dairy" },
      { name: "Chips", qty: 2, price: 3.999, hst: true, type: "Not a real type" },
      { name: "", qty: 1, price: 2, hst: false, type: "" },
      { name: "Free bag", qty: 1, price: 0, hst: false, type: "" },
    ],
    total: 16.98,
  };

  it("keeps good lines and tidies them", () => {
    const r = cleanReceipt(raw, CATEGORIES, TODAY)!;
    expect(r.shop).toBe("No Frills");
    expect(r.date).toBe("2026-11-02");
    expect(r.categoryId).toBe("groceries");
    expect(r.items).toHaveLength(2);
    expect(r.items[0]!.type).toBe("Dairy");
    expect(r.items[1]).toEqual({ name: "Chips", qty: 2, price: 4, hst: true });
    expect(r.total).toBe(16.98);
  });

  it("drops a date in the future and an unknown category", () => {
    const r = cleanReceipt({ ...raw, date: "2027-01-01", category_id: "nope" }, CATEGORIES, TODAY)!;
    expect(r.date).toBe("");
    expect(r.categoryId).toBe("");
  });

  it("returns null when it isn't a receipt or nothing is readable", () => {
    expect(cleanReceipt({ ...raw, is_receipt: false }, CATEGORIES, TODAY)).toBeNull();
    expect(cleanReceipt({ ...raw, items: [] }, CATEGORIES, TODAY)).toBeNull();
    expect(cleanReceipt("oops", CATEGORIES, TODAY)).toBeNull();
    expect(cleanReceipt(null, CATEGORIES, TODAY)).toBeNull();
  });
});

describe("totalsDiffer", () => {
  it("ignores rounding and unknown totals", () => {
    expect(totalsDiffer(0, 12)).toBe(false);
    expect(totalsDiffer(12.03, 12)).toBe(false);
    expect(totalsDiffer(14, 12)).toBe(true);
  });
});
