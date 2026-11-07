import { describe, expect, it } from "vitest";
import type { Plan } from "@/data/sample";
import { monthsLeft, perMonth, planLine } from "@/lib/plans";

const car: Plan = { id: "p", name: "Buy a car", target: 20000, saved: 8000, by: "2027-06" };

describe("plans", () => {
  it("counts months across a new year", () => {
    expect(monthsLeft("2026-11", "2027-06")).toBe(7);
    expect(monthsLeft("2026-11", "2026-10")).toBe(0);
  });

  it("works out the monthly amount, rounded up", () => {
    expect(perMonth(car, "2026-11")).toBe(Math.ceil(12000 / 7));
  });

  it("says it in words", () => {
    expect(planLine(car, "2026-11")).toBe(
      "$12,000 to go · save $1,715 a month to get there by June 2027",
    );
    expect(planLine({ ...car, by: "" }, "2026-11")).toBe("$12,000 to go");
    expect(planLine({ ...car, by: "2026-11" }, "2026-11")).toBe("$12,000 to go · due this month");
    expect(planLine({ ...car, saved: 20000 }, "2026-11")).toBe("Done. You've saved it all.");
  });
});
