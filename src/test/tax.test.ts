import { describe, expect, it } from "vitest";
import { CATEGORIES, type ReceiptItem } from "@/data/sample";
import { nextTax, receiptTotals, taxRate } from "@/lib/budget";
import { cleanReceipt } from "@/lib/receipt";

const line = (price: number, p: Partial<ReceiptItem> = {}): ReceiptItem => ({
  name: "x",
  qty: 1,
  price,
  hst: false,
  ...p,
});

describe("tax rates", () => {
  it("old lines marked hst count as 13%", () => {
    expect(taxRate(line(10, { hst: true }))).toBe(13);
    expect(taxRate(line(10))).toBe(0);
  });

  it("adds 13% and 5% lines separately", () => {
    const t = receiptTotals([
      line(100, { hst: true, tax: 13 }),
      line(100, { hst: true, tax: 5 }),
      line(100),
    ]);
    expect(t).toEqual({ subtotal: 300, hst: 18, total: 318 });
  });

  it("tapping cycles No tax → HST 13% → GST 5% → No tax", () => {
    let i = line(1);
    i = { ...i, ...nextTax(i) };
    expect(taxRate(i)).toBe(13);
    i = { ...i, ...nextTax(i) };
    expect(taxRate(i)).toBe(5);
    i = { ...i, ...nextTax(i) };
    expect(taxRate(i)).toBe(0);
  });

  it("reads the rate from the receipt reader", () => {
    const r = cleanReceipt(
      {
        shop: "Clement",
        date: "",
        category_id: "",
        total: 0,
        items: [
          { name: "Kids jacket", qty: 1, price: 40, tax: 5, type: "" },
          { name: "Shampoo", qty: 1, price: 8, tax: 13, type: "" },
          { name: "Bread", qty: 1, price: 4, tax: 0, type: "" },
        ],
      },
      CATEGORIES,
      "2026-11-06",
    )!;
    expect(r.items.map(taxRate)).toEqual([5, 13, 0]);
  });
});
