// All Loonvale sample data lives here, typed, so it can be swapped for a database later.

export type Person = "G" | "W" | "J";
export const PEOPLE: Record<Person, string> = { G: "Goku", W: "Wife", J: "Joint" };

export type Group = "needs" | "wants" | "investments" | "debt";
export const GROUPS: { id: Group; name: string; note: string }[] = [
  { id: "needs", name: "Needs", note: "50% target" },
  { id: "wants", name: "Wants", note: "30% target" },
  { id: "investments", name: "Investments", note: "15% target · not counted in Left to spend" },
  { id: "debt", name: "Debt", note: "5% target" },
];

export interface Category {
  id: string;
  name: string;
  group: Group;
  types: string[];
}

// Goku's agreed categories and expense types (2 Nov 2026).
export const CATEGORIES: Category[] = [
  { id: "housing", name: "Housing", group: "needs", types: ["Rent"] },
  {
    id: "groceries", name: "Groceries", group: "needs",
    types: ["General", "Produce", "Dairy", "Meat", "Sea Food", "Bakery", "Frozen Food", "Drinks", "Natural Foods", "Baby", "Liquor"],
  },
  { id: "transportation", name: "Transportation", group: "needs", types: ["TTC", "Cab"] },
  { id: "household", name: "Household", group: "needs", types: ["General", "Household", "Deco"] },
  { id: "childcare", name: "Childcare", group: "needs", types: ["General", "Toys"] },
  { id: "health", name: "Health & Personal Care", group: "wants", types: ["General", "Health care", "Body Care", "Clothing"] },
  { id: "digital", name: "AI & Digital Infrastructure", group: "wants", types: ["Mobile plans"] },
  {
    id: "dining", name: "Dining & Entertainment", group: "wants",
    types: ["Cafe", "Restaurant", "Fast food", "Delivery", "Drinks", "Disney", "General"],
  },
  { id: "holiday", name: "Holiday Funds", group: "wants", types: ["General"] },
  { id: "sinking", name: "Sinking Funds", group: "wants", types: ["General"] },
  { id: "hobbies", name: "Hobbies & Creator Tech", group: "wants", types: ["Tech", "11Labs"] },
  { id: "misc", name: "Miscellaneous", group: "wants", types: ["General", "Fees"] },
  { id: "emergency", name: "Emergency Fund", group: "investments", types: [] },
  { id: "fhsa", name: "FHSA", group: "investments", types: [] },
  { id: "rrsp", name: "RRSP", group: "investments", types: [] },
  { id: "tfsa", name: "TFSA", group: "investments", types: [] },
  { id: "resp", name: "RESP", group: "investments", types: [] },
  { id: "nonreg", name: "Non-Registered", group: "investments", types: [] },
  { id: "life", name: "Life Insurance", group: "investments", types: [] },
  { id: "uk", name: "UK Expense", group: "debt", types: ["Fees"] },
];

/** Month key "YYYY-MM". */
export type MonthKey = string;
export type MonthBudget = Record<string, number>;

// The month and day the sample family's data was made for. The app itself
// uses the real date (see lib/budget todayISO).
export const CURRENT_MONTH: MonthKey = "2026-11";
export const TODAY = "2026-11-03";

// Example amounts from the approved budget design. Spending budget (Needs + Wants + Debt) = $7,270.
const NOV_BUDGET: MonthBudget = {
  housing: 3400, groceries: 700, transportation: 450, household: 200, childcare: 0,
  health: 150, digital: 120, dining: 600, holiday: 800, sinking: 300, hobbies: 150, misc: 0,
  emergency: 400, fhsa: 667, rrsp: 0, tfsa: 200, resp: 208, nonreg: 0, life: 83,
  uk: 400,
};

export const BUDGETS: Record<MonthKey, MonthBudget> = {
  "2026-10": { ...NOV_BUDGET, groceries: 650, digital: 100, dining: 500 },
  "2026-11": { ...NOV_BUDGET },
  "2026-12": { ...NOV_BUDGET, holiday: 1200, dining: 700 },
};

export interface ReceiptItem {
  name: string;
  qty: number;
  price: number; // unit price before tax
  hst: boolean; // the line is taxed
  /** Which tax when taxed: 13 = HST (the usual), 5 = GST only (e.g. kids' clothes, books, food under $4). */
  tax?: TaxRate | undefined;
  type?: string | undefined; // e.g. Dairy, Produce (grocery lines)
}

export interface Expense {
  id: string;
  date: string; // YYYY-MM-DD
  shop: string;
  amount: number;
  categoryId: string;
  type?: string;
  who: Person;
  labels: string[];
  items?: ReceiptItem[];
  /** Where the receipt photo is kept, in the private receipts folder. */
  receipt?: string;
  /** Where it came from. Older expenses don't say: see expenseSource. */
  source?: ExpenseSource;
}

/** Money in: pay, deposits and other income. */
export interface Income {
  id: string;
  date: string; // YYYY-MM-DD
  source: string; // e.g. "Payroll", "Child benefit"
  amount: number;
  who: Person;
}

export type ExpenseSource = "manual" | "receipt" | "statement";

export const SOURCE_LABEL: Record<ExpenseSource, string> = {
  manual: "Manual",
  receipt: "Receipt",
  statement: "Statement",
};

/** Where an expense came from: a receipt photo means a scanned receipt. */
export const expenseSource = (e: Expense): ExpenseSource =>
  e.source ?? (e.receipt ? "receipt" : "manual");

export const HST_RATE = 0.13;

/** Sales tax in Ontario: 13% HST on most things, 5% GST only on a few. */
export type TaxRate = 5 | 13;
export const TAX_LABEL: Record<0 | TaxRate, string> = { 0: "No tax", 13: "HST 13%", 5: "GST 5%" };

export const LABELS: string[] = ["Diwali", "Kids", "Work lunch", "Costco run"];

export const EXPENSES: Expense[] = [
  // November (this month): spent $3,812 of $7,270, so $3,458 left to spend.
  { id: "e1", date: "2026-11-01", shop: "Rent", amount: 3400, categoryId: "housing", type: "Rent", who: "J", labels: [] },
  {
    id: "e2", date: "2026-11-01", shop: "Costco", amount: 186.42, categoryId: "groceries", type: "General", who: "G", labels: ["Costco run"],
    items: [
      { name: "Kirkland eggs 24 pk", qty: 1, price: 9.99, hst: false },
      { name: "Milk 4L", qty: 2, price: 6.49, hst: false },
      { name: "Chicken thighs", qty: 2, price: 23.42, hst: false },
      { name: "Basmati rice 10kg", qty: 1, price: 22.99, hst: false },
      { name: "Bananas", qty: 1, price: 2.29, hst: false },
      { name: "Olive oil 3L", qty: 1, price: 29.99, hst: false },
      { name: "Baby spinach", qty: 1, price: 5.99, hst: false },
      { name: "Paper towels", qty: 1, price: 26.99, hst: true },
      { name: "Laundry detergent", qty: 1, price: 21.99, hst: true },
    ],
  },
  { id: "e3", date: "2026-11-03", shop: "No Frills", amount: 25.58, categoryId: "groceries", type: "Produce", who: "W", labels: [] },
  { id: "e4", date: "2026-11-02", shop: "Dollarama", amount: 26, categoryId: "household", type: "General", who: "W", labels: ["Diwali"] },
  { id: "e5", date: "2026-11-02", shop: "HomeSense", amount: 50, categoryId: "household", type: "Deco", who: "J", labels: ["Diwali"] },
  { id: "e6", date: "2026-11-03", shop: "Tim Hortons", amount: 8.75, categoryId: "dining", type: "Cafe", who: "G", labels: ["Work lunch"] },
  { id: "e7", date: "2026-11-02", shop: "Uber Eats", amount: 54, categoryId: "dining", type: "Delivery", who: "J", labels: [] },
  { id: "e8", date: "2026-11-01", shop: "Pai Northern Thai", amount: 61.25, categoryId: "dining", type: "Restaurant", who: "J", labels: ["Kids"] },
  // October (locked month)
  { id: "o1", date: "2026-10-01", shop: "Rent", amount: 3400, categoryId: "housing", type: "Rent", who: "J", labels: [] },
  { id: "o2", date: "2026-10-05", shop: "Costco", amount: 541.3, categoryId: "groceries", type: "General", who: "G", labels: [] },
  { id: "o3", date: "2026-10-12", shop: "No Frills", amount: 270.7, categoryId: "groceries", type: "General", who: "W", labels: [] },
  { id: "o4", date: "2026-10-01", shop: "TTC", amount: 156, categoryId: "transportation", type: "TTC", who: "G", labels: [] },
  { id: "o5", date: "2026-10-14", shop: "Uber", amount: 234, categoryId: "transportation", type: "Cab", who: "J", labels: [] },
  { id: "o6", date: "2026-10-20", shop: "Canadian Tire", amount: 264, categoryId: "household", type: "Household", who: "W", labels: ["Diwali"] },
  { id: "o7", date: "2026-10-09", shop: "Shoppers", amount: 96, categoryId: "health", type: "Health care", who: "W", labels: [] },
  { id: "o8", date: "2026-10-02", shop: "Rogers", amount: 134, categoryId: "digital", type: "Mobile plans", who: "J", labels: [] },
  { id: "o9", date: "2026-10-18", shop: "Swiss Chalet", amount: 96.4, categoryId: "dining", type: "Restaurant", who: "J", labels: [] },
  { id: "o12", date: "2026-10-25", shop: "Disney on Ice", amount: 748.6, categoryId: "dining", type: "Disney", who: "J", labels: ["Kids"] },
  { id: "o10", date: "2026-10-22", shop: "ElevenLabs", amount: 410, categoryId: "hobbies", type: "11Labs", who: "G", labels: [] },
  { id: "o11", date: "2026-10-28", shop: "UK bank transfer", amount: 400, categoryId: "uk", type: "Fees", who: "G", labels: [] },
];

export const RECENT_SHOPS = ["Tim Hortons", "No Frills", "Costco", "TTC", "Uber Eats", "Shoppers"];

/** Mock result of scanning a receipt photo. */
export const SCANNED_RECEIPT: { shop: string; items: ReceiptItem[] } = {
  shop: "No Frills",
  items: [
    { name: "Roma tomatoes", qty: 1, price: 3.49, hst: false },
    { name: "Paneer 350g", qty: 2, price: 5.99, hst: false },
    { name: "Atta flour 10kg", qty: 1, price: 17.99, hst: false },
    { name: "Dish soap", qty: 1, price: 3.97, hst: true },
    { name: "Garbage bags", qty: 1, price: 9.99, hst: true },
  ],
};

/** Something the family is saving up for: a car, a move, a baby, a holiday. */
export interface Plan {
  id: string;
  name: string;
  target: number;
  saved: number;
  by: MonthKey | ""; // the month they want it by, or "" for no date
}

export const INCOMES: Income[] = [
  { id: "i1", date: "2026-10-15", source: "Payroll", amount: 3600, who: "G" },
  { id: "i2", date: "2026-10-20", source: "Child benefit", amount: 620, who: "J" },
  { id: "i3", date: "2026-10-30", source: "Payroll", amount: 3600, who: "G" },
  { id: "i4", date: "2026-10-31", source: "Payroll", amount: 2400, who: "W" },
];

export const PLANS: Plan[] = [
  { id: "p1", name: "Buy a car", target: 20000, saved: 8000, by: "2027-06" },
  { id: "p2", name: "Next baby", target: 10000, saved: 3000, by: "2027-12" },
  { id: "p3", name: "Holiday to India", target: 6000, saved: 1200, by: "2027-04" },
];

/** One-tap ideas when adding a plan. */
export const PLAN_IDEAS = ["Buy a car", "Move home", "Buy a home", "Childcare", "Next baby", "Holiday"];

export const PORTFOLIO = { investments: 236576, homeEquity: 249624 };

export type FireGoalType = "retire" | "work_optional";

export interface FireAnswers {
  goal: FireGoalType;
  age: number;
  goalAge: number;
  income: number; // household per year
  spendMonthly: number; // today's dollars, once goal reached
  saveMonthly: number;
  investments: number; // incl. pensions
  homeEquity: number;
  sellHome: boolean;
}

export interface FireAssumptions {
  growth: number; // r
  growthAfter: number; // rr
  inflation: number; // i
  tax: number;
}

export const FIRE_ANSWERS: FireAnswers = {
  goal: "work_optional",
  age: 35,
  goalAge: 47,
  income: 195000,
  spendMonthly: 15000,
  saveMonthly: 1558,
  investments: 236576,
  homeEquity: 431914,
  sellHome: true,
};

export const FIRE_ASSUMPTIONS: FireAssumptions = {
  growth: 0.07,
  growthAfter: 0.055,
  inflation: 0.025,
  tax: 0.3,
};

export const HOUSEHOLD = { me: "Goku", partner: "Wife", city: "Toronto, ON" };
