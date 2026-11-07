import { createContext } from "react";
import type {
  Category,
  Expense,
  FireAnswers,
  FireAssumptions,
  Income,
  MonthBudget,
  MonthKey,
  Person,
  Plan,
} from "@/data/sample";

export interface Household {
  me: string;
  partner: string; // empty when it's just one person
  city: string;
}

export interface PersonInfo {
  id: Person;
  name: string;
  tag: string; // shown in the round person tag
}

export interface SetupResult {
  household: Household;
  income: number; // monthly take-home
  budget: MonthBudget; // this month's budget
  categories: Category[];
}

// Kept in its own file so editing sample data or the provider during hot reload
// never creates a second context (which shows "useStore outside provider").
export interface Store {
  /** False until saved data has been read from this device. */
  ready: boolean;
  /** Today on this device, "YYYY-MM-DD", and its month "YYYY-MM". */
  today: string;
  month: MonthKey;
  setupDone: boolean;
  /** The signed-in person's email, or null when using this device only. */
  email: string | null;
  /** The household this person belongs to, once signed in and set up. */
  householdId: string | null;
  signIn: (email: string) => Promise<void>;
  /** Phone only: finish signing in with the code from the email. */
  verifyCode?: (email: string, code: string) => Promise<void>;
  signOut: () => Promise<void>;
  /** This device has a household from before signing in, not yet brought over. */
  deviceData: boolean;
  bringOverDeviceData: () => Promise<void>;
  skipDeviceData: () => void;
  completeSetup: (r: SetupResult) => Promise<void>;
  loadSampleFamily: () => void;
  startOver: () => void;
  household: Household;
  setHousehold: (h: Household) => void;
  people: PersonInfo[];
  income: number;
  /** The family's own categories: renamed, added or removed. */
  categories: Category[];
  setCategories: (c: Category[]) => void;
  budgets: Record<MonthKey, MonthBudget>;
  saveBudget: (month: MonthKey, draft: MonthBudget, when: "this" | "next") => void;
  expenses: Expense[];
  addExpense: (e: Expense) => void;
  updateExpense: (e: Expense) => void;
  deleteExpense: (id: string) => void;
  /** Money in: pay, deposits and other income. */
  incomes: Income[];
  addIncome: (i: Income) => void;
  deleteIncome: (id: string) => void;
  /** Open the expense sheet to change an existing expense. */
  editing: Expense | null;
  openEdit: (e: Expense) => void;
  labels: string[];
  createLabel: (l: string) => void;
  /** Things the family is saving up for. "Goals" is kept for the FIRE goal. */
  plans: Plan[];
  savePlan: (p: Plan) => void;
  deletePlan: (id: string) => void;
  portfolio: { investments: number; homeEquity: number } | null;
  fire: FireAnswers;
  setFire: (a: FireAnswers) => void;
  fireSet: boolean;
  setFireSet: (v: boolean) => void;
  assumptions: FireAssumptions;
  setAssumptions: (a: FireAssumptions) => void;
  addOpen: boolean;
  setAddOpen: (o: boolean) => void;
}

export const Ctx = createContext<Store | null>(null);
