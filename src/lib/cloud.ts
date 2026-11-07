// Turns the app's saved state into database rows, and works out what changed
// between two states so only those rows are written. Pure: no network here.
import type {
  Category,
  Expense,
  FireAnswers,
  Income,
  FireAssumptions,
  MonthBudget,
  MonthKey,
  Plan,
} from "@/data/sample";
import type { Household } from "@/store/store-context";

/** What the app keeps for a household (same shape as the store's state). */
export interface Saved {
  setupDone: boolean;
  household: Household;
  income: number;
  categories: Category[];
  budgets: Record<MonthKey, MonthBudget>;
  expenses: Expense[];
  incomes: Income[];
  labels: string[];
  plans: Plan[];
  portfolio: { investments: number; homeEquity: number } | null;
  fire: FireAnswers;
  fireSet: boolean;
  assumptions: FireAssumptions;
}

// Database rows are loosely typed; fromRows checks each field as it reads it.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

export interface Tables {
  households: Row[];
  categories: Row[];
  budgets: Row[];
  expenses: Row[];
  incomes: Row[];
  labels: Row[];
  plans: Row[];
  fire: Row[];
}

/** Primary key columns, apart from household_id, for each table. */
export const KEYS: Record<keyof Tables, string[]> = {
  households: ["id"],
  categories: ["id"],
  budgets: ["month", "category_id"],
  expenses: ["id"],
  incomes: ["id"],
  labels: ["name"],
  plans: ["id"],
  fire: [],
};

/** Write order: parents first. Deletes run in reverse. */
export const ORDER: (keyof Tables)[] = [
  "households",
  "categories",
  "fire",
  "labels",
  "plans",
  "budgets",
  "expenses",
  "incomes",
];

export function toRows(hid: string, s: Saved): Tables {
  const h = (r: Row) => ({ household_id: hid, ...r });
  const budgets: Row[] = [];
  for (const [month, b] of Object.entries(s.budgets))
    for (const [category_id, amount] of Object.entries(b))
      if (s.categories.some((c) => c.id === category_id))
        budgets.push(h({ month, category_id, amount }));
  return {
    households: [
      {
        id: hid,
        me_name: s.household.me,
        partner_name: s.household.partner,
        city: s.household.city,
        income: s.income,
        setup_done: s.setupDone,
      },
    ],
    categories: s.categories.map((c, i) =>
      h({ id: c.id, name: c.name, grp: c.group, types: c.types, sort: i }),
    ),
    budgets,
    expenses: s.expenses.map((e) =>
      h({
        id: e.id,
        date: e.date,
        shop: e.shop,
        amount: e.amount,
        category_id: e.categoryId,
        type: e.type ?? null,
        who: e.who,
        labels: e.labels,
        items: e.items ?? null,
        receipt_path: e.receipt ?? null,
        source: e.source ?? null,
      }),
    ),
    incomes: s.incomes.map((i) =>
      h({ id: i.id, date: i.date, source: i.source, amount: i.amount, who: i.who }),
    ),
    labels: s.labels.map((name) => h({ name })),
    plans: s.plans.map((p) =>
      h({ id: p.id, name: p.name, target: p.target, saved: p.saved, by_month: p.by || null }),
    ),
    fire: [
      h({ answers: s.fire, assumptions: s.assumptions, is_set: s.fireSet, portfolio: s.portfolio }),
    ],
  };
}

const num = (v: unknown) => Number(v ?? 0);

/** Rows read back from the database, into the app's state. */
export function fromRows(t: Tables, empty: Saved): Saved {
  const h = t.households[0] ?? {};
  const f = t.fire[0];
  const budgets: Record<MonthKey, MonthBudget> = {};
  for (const r of t.budgets) {
    const m = String(r["month"]);
    (budgets[m] ??= {})[String(r["category_id"])] = num(r["amount"]);
  }
  return {
    ...empty,
    setupDone: Boolean(h["setup_done"]),
    household: {
      me: String(h["me_name"] ?? ""),
      partner: String(h["partner_name"] ?? ""),
      city: String(h["city"] ?? ""),
    },
    income: num(h["income"]),
    categories: [...t.categories]
      .sort((a, b) => num(a["sort"]) - num(b["sort"]))
      .map((r) => ({
        id: String(r["id"]),
        name: String(r["name"]),
        group: r["grp"] as Category["group"],
        types: (r["types"] as string[] | null) ?? [],
      })),
    budgets,
    expenses: t.expenses.map((r) => {
      const e: Expense = {
        id: String(r["id"]),
        date: String(r["date"]),
        shop: String(r["shop"]),
        amount: num(r["amount"]),
        categoryId: String(r["category_id"]),
        who: r["who"] as Expense["who"],
        labels: (r["labels"] as string[] | null) ?? [],
      };
      if (r["type"]) e.type = String(r["type"]);
      if (r["items"]) e.items = r["items"] as NonNullable<Expense["items"]>;
      if (r["receipt_path"]) e.receipt = String(r["receipt_path"]);
      if (r["source"]) e.source = r["source"] as NonNullable<Expense["source"]>;
      return e;
    }),
    incomes: t.incomes.map((r) => ({
      id: String(r["id"]),
      date: String(r["date"]),
      source: String(r["source"]),
      amount: num(r["amount"]),
      who: r["who"] as Income["who"],
    })),
    labels: t.labels.map((r) => String(r["name"])),
    plans: t.plans.map((r) => ({
      id: String(r["id"]),
      name: String(r["name"]),
      target: num(r["target"]),
      saved: num(r["saved"]),
      by: r["by_month"] ? String(r["by_month"]) : "",
    })),
    fire: f ? { ...empty.fire, ...(f["answers"] as Partial<FireAnswers>) } : empty.fire,
    assumptions: f
      ? { ...empty.assumptions, ...(f["assumptions"] as Partial<FireAssumptions>) }
      : empty.assumptions,
    fireSet: f ? Boolean(f["is_set"]) : false,
    portfolio: (f?.["portfolio"] as Saved["portfolio"]) ?? null,
  };
}

export interface Change {
  table: keyof Tables;
  upsert: Row[];
  /** Key columns of rows to delete. */
  remove: Row[];
}

const keyOf = (table: keyof Tables, r: Row) => KEYS[table].map((k) => String(r[k])).join("\u0000");

/** Rows that are new or changed, and rows that are gone, table by table. */
export function diff(prev: Tables, next: Tables): Change[] {
  const out: Change[] = [];
  for (const table of ORDER) {
    const before = new Map(prev[table].map((r) => [keyOf(table, r), JSON.stringify(r)]));
    const after = new Set(next[table].map((r) => keyOf(table, r)));
    const upsert = next[table].filter((r) => before.get(keyOf(table, r)) !== JSON.stringify(r));
    const remove = prev[table]
      .filter((r) => !after.has(keyOf(table, r)))
      .map((r) => Object.fromEntries(KEYS[table].map((k) => [k, r[k]])));
    if (upsert.length || remove.length) out.push({ table, upsert, remove });
  }
  return out;
}

/** An empty set of tables, for a brand new household. */
export const NO_ROWS: Tables = {
  households: [],
  categories: [],
  budgets: [],
  expenses: [],
  incomes: [],
  labels: [],
  plans: [],
  fire: [],
};
