const whole = new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 });
const cents = new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", minimumFractionDigits: 2, maximumFractionDigits: 2 });

const clean = (s: string) => s.replace("CA", "").replace(/\s/g, "");

/** Whole dollars, e.g. $1,235 — for cards. */
export const money = (n: number) => clean(whole.format(Math.round(n)));
/** Exact, e.g. $1,234.56 — for transactions. */
export const money2 = (n: number) => clean(cents.format(n));
/** Compact millions, e.g. $7.04M. */
export const moneyShort = (n: number) =>
  Math.abs(n) >= 1_000_000 ? `$${(n / 1_000_000).toFixed(2)}M` : Math.abs(n) >= 10_000 ? `$${Math.round(n / 1000)}K` : money(n);

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export const monthShort = (key: string) => MONTHS[Number(key.slice(5, 7)) - 1];
export const monthLong = (key: string) => `${MONTHS_LONG[Number(key.slice(5, 7)) - 1]} ${key.slice(0, 4)}`;
export const dayLabel = (date: string) => `${MONTHS[Number(date.slice(5, 7)) - 1]} ${Number(date.slice(8, 10))}`;

export function nextMonth(key: string) {
  const y = Number(key.slice(0, 4));
  const m = Number(key.slice(5, 7));
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
}

export function prevMonth(key: string) {
  const y = Number(key.slice(0, 4));
  const m = Number(key.slice(5, 7));
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`;
}
