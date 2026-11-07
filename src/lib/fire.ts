import type { FireAnswers, FireAssumptions } from "@/data/sample";

export interface FireResult {
  years: number;
  goalYear: number;
  need: number;
  monthlyNeeded: number;
  projected: number;
  pct: number;
  short: number;
}

export function computeFire(a: FireAnswers, s: FireAssumptions, startYear = 2026): FireResult {
  const N = Math.max(0, a.goalAge - a.age);
  const { growth: r, growthAfter: rr, inflation: i, tax } = s;
  const W = ((a.spendMonthly * 12) / (1 - tax)) * Math.pow(1 + i, N);
  const n = a.goal === "work_optional" ? 30 : Math.max(30, 90 - a.goalAge);
  const need =
    Math.abs(rr - i) < 1e-9
      ? W * n
      : ((W * (1 - Math.pow((1 + i) / (1 + rr), n))) / (rr - i)) * (1 + rr);

  const invGrown = a.investments * Math.pow(1 + r, N);
  const home = a.sellHome ? a.homeEquity * Math.pow(1.03, N) * 0.9 : 0;
  const existing = invGrown + home;

  const fv =
    Math.abs(r - i) < 1e-9 ? N * Math.pow(1 + r, N - 1) : (Math.pow(1 + r, N) - Math.pow(1 + i, N)) / (r - i);
  const gap = Math.max(0, need - existing);
  const monthlyNeeded = fv > 0 ? gap / fv / 12 : gap;
  const projected = existing + a.saveMonthly * 12 * fv;
  const pct = need > 0 ? Math.min(100, (projected / need) * 100) : 100;

  return {
    years: N,
    goalYear: startYear + N,
    need,
    monthlyNeeded,
    projected,
    pct,
    short: Math.max(0, need - projected),
  };
}
