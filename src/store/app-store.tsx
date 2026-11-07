import { useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Alert, AppState } from "react-native";
import {
  BUDGETS,
  CATEGORIES,
  EXPENSES,
  FIRE_ANSWERS,
  FIRE_ASSUMPTIONS,
  HOUSEHOLD,
  INCOMES,
  LABELS,
  PLANS,
  PORTFOLIO,
  TODAY,
  type Category,
  type Expense,
  type FireAnswers,
  type FireAssumptions,
  type MonthBudget,
  type MonthKey,
  type Plan,
} from "@/data/sample";
import { applyBudgetChange, spendingBudget, startMonth, todayISO } from "@/lib/budget";
import { diff, fromRows, NO_ROWS, toRows, type Saved, type Tables } from "@/lib/cloud";
import { peopleFor } from "@/lib/setup";
import { loadTables, myHouseholdId, pushChanges, supabase } from "@/lib/supabase";
import {
  Ctx,
  type Household,
  type PersonInfo,
  type SetupResult,
  type Store,
} from "./store-context";

/**
 * Before signing in, the app keeps its state on this device (the sample family,
 * or what someone entered before accounts existed). Once signed in, the
 * household lives in Supabase and this device only holds the session.
 */
type Local = Saved & { sample?: boolean };

const KEY = "firis.v1";

const SAMPLE: Local = {
  sample: true,
  setupDone: true,
  household: HOUSEHOLD,
  income: 9200,
  categories: CATEGORIES,
  budgets: BUDGETS,
  expenses: EXPENSES,
  incomes: INCOMES,
  labels: LABELS,
  plans: PLANS,
  portfolio: PORTFOLIO,
  fire: FIRE_ANSWERS,
  fireSet: true,
  assumptions: FIRE_ASSUMPTIONS,
};

const EMPTY: Local = {
  ...SAMPLE,
  sample: false,
  setupDone: false,
  household: { me: "", partner: "", city: "" },
  income: 0,
  budgets: {},
  expenses: [],
  incomes: [],
  labels: [],
  plans: [],
  portfolio: null,
  fireSet: false,
};

// Short messages, like the web app's toasts. One with an id shows at most once a minute,
// so a save that keeps retrying doesn't keep popping up.
const shown = new Map<string, number>();
function toast(msg: string, opts?: { id?: string }) {
  const now = Date.now();
  if (opts?.id && now - (shown.get(opts.id) ?? 0) < 60_000) return;
  if (opts?.id) shown.set(opts.id, now);
  Alert.alert("Loonvale", msg);
}

async function load(): Promise<Local> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    // A phone that has never been signed in starts with the sample family to look around.
    return raw ? { ...EMPTY, ...(JSON.parse(raw) as Partial<Local>) } : SAMPLE;
  } catch {
    return SAMPLE;
  }
}

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [s, setS] = useState<Local>(SAMPLE);
  const [email, setEmail] = useState<string | null>(null);
  const [hid, setHid] = useState<string | null>(null);
  // What's on this device from before signing in, offered once to bring over.
  const [deviceData, setDeviceData] = useState<Local | null>(null);
  const synced = useRef<Tables>(NO_ROWS);
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [today, setToday] = useState(TODAY);
  const month = today.slice(0, 7);

  // Open the household for whoever is signed in; otherwise use this device.
  const openAccount = async (userId: string | null, userEmail: string | null) => {
    setEmail(userEmail);
    if (!userId) {
      setHid(null);
      setS(await load());
      setReady(true);
      return;
    }
    try {
      const id = await myHouseholdId(userId);
      if (id) {
        const tables = await loadTables(id);
        synced.current = tables;
        setHid(id);
        setS(fromRows(tables, EMPTY));
      } else {
        const local = await load();
        setDeviceData(local.setupDone && !local.sample ? local : null);
        synced.current = NO_ROWS;
        setHid(null);
        setS(EMPTY);
      }
    } catch {
      toast("Couldn't reach Loonvale. Check your connection and try again.");
    }
    setReady(true);
  };

  useEffect(() => {
    setToday(todayISO());
    const auth = supabase().auth;
    void auth
      .getSession()
      .then(({ data }) =>
        openAccount(data.session?.user.id ?? null, data.session?.user.email ?? null),
      );
    const { data: sub } = auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT")
        void openAccount(session?.user.id ?? null, session?.user.email ?? null);
    });
    // Pick up a new day (and a new month) when the app comes back into view.
    const wake = AppState.addEventListener("change", (st) => {
      if (st === "active") setToday(todayISO());
    });
    return () => {
      sub.subscription.unsubscribe();
      wake.remove();
    };
  }, []);

  // When a new month starts, carry the last budget forward.
  useEffect(() => {
    if (!ready) return;
    setS((x) => {
      if (!x.setupDone) return x;
      const budgets = startMonth(x.budgets, month);
      return budgets === x.budgets ? x : { ...x, budgets };
    });
  }, [ready, month]);

  // Not signed in: keep it on this device.
  useEffect(() => {
    if (!ready || email) return;
    AsyncStorage.setItem(KEY, JSON.stringify(s)).catch(() => {
      // Storage full: the app still works while it's open.
    });
  }, [s, ready, email]);

  // Signed in: send what changed to Supabase, one batch at a time.
  const queue = useRef(Promise.resolve());
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!ready || !hid) return;
    const t = setTimeout(() => {
      queue.current = queue.current.then(async () => {
        const next = toRows(hid, s);
        const changes = diff(synced.current, next);
        if (!changes.length) return;
        try {
          await pushChanges(hid, changes);
          synced.current = next;
        } catch {
          toast("Couldn't save. We'll try again in a moment.", { id: "save-error" });
          setTimeout(() => setRetry((n) => n + 1), 5000);
        }
      });
    }, 400);
    return () => clearTimeout(t);
  }, [s, ready, hid, retry]);

  // Start a household in Supabase for this person, holding the given state.
  const createHousehold = async (start: Local) => {
    const { data, error } = await supabase().rpc("create_household", {
      my_name: start.household.me,
    });
    if (error) throw error;
    synced.current = NO_ROWS;
    setHid(data as string);
    setS({ ...start, sample: false });
  };

  const set = (patch: Partial<Local>) => setS((x) => ({ ...x, ...patch }));

  const value = useMemo<Store>(
    () => ({
      ready,
      today,
      month,
      setupDone: s.setupDone,
      email,
      householdId: hid,
      // On the phone you type the 6-digit code from the email instead of tapping its link.
      signIn: async (address) => {
        const { error } = await supabase().auth.signInWithOtp({ email: address });
        if (error) throw error;
      },
      verifyCode: async (address, code) => {
        const { error } = await supabase().auth.verifyOtp({
          email: address,
          token: code.trim(),
          type: "email",
        });
        if (error) throw new Error("That code didn't work. Check it, or send a new one");
      },
      signOut: async () => {
        await queue.current;
        await supabase().auth.signOut();
      },
      deviceData: !!deviceData,
      bringOverDeviceData: async () => {
        if (!deviceData) return;
        await createHousehold(deviceData);
        setDeviceData(null);
        await AsyncStorage.removeItem(KEY).catch(() => undefined);
      },
      skipDeviceData: () => setDeviceData(null),
      completeSetup: async ({ household, income, budget, categories }: SetupResult) => {
        const spend = spendingBudget(budget, categories);
        const start: Local = {
          ...EMPTY,
          setupDone: true,
          household,
          income,
          categories,
          budgets: { [month]: budget },
          labels: [],
          // Start the FIRE questions from what we already know.
          fire: {
            ...FIRE_ANSWERS,
            income: 0,
            spendMonthly: spend,
            saveMonthly: Math.round(income - spend),
            investments: 0,
            homeEquity: 0,
            sellHome: false,
          },
        };
        if (email && !hid) await createHousehold(start);
        else setS(start);
      },
      loadSampleFamily: () => setS(SAMPLE),
      startOver: () => setS(EMPTY),
      household: s.household,
      setHousehold: (household) => set({ household }),
      people: peopleFor(s.household),
      income: s.income,
      categories: s.categories,
      // A removed category also leaves every month's budget.
      setCategories: (categories) =>
        setS((x) => {
          const keep = new Set(categories.map((c) => c.id));
          const budgets: Record<MonthKey, MonthBudget> = {};
          for (const [m, b] of Object.entries(x.budgets))
            budgets[m] = Object.fromEntries(Object.entries(b).filter(([id]) => keep.has(id)));
          return { ...x, categories, budgets };
        }),
      budgets: s.budgets,
      saveBudget: (m, d, w) =>
        setS((x) => ({ ...x, budgets: applyBudgetChange(x.budgets, m, d, w) })),
      expenses: s.expenses,
      addExpense: (e) =>
        setS((x) => ({ ...x, expenses: [e, ...x.expenses.filter((y) => y.id !== e.id)] })),
      updateExpense: (e) =>
        setS((x) => ({ ...x, expenses: x.expenses.map((y) => (y.id === e.id ? e : y)) })),
      deleteExpense: (id) =>
        setS((x) => ({ ...x, expenses: x.expenses.filter((y) => y.id !== id) })),
      incomes: s.incomes,
      addIncome: (i) =>
        setS((x) => ({ ...x, incomes: [i, ...x.incomes.filter((y) => y.id !== i.id)] })),
      deleteIncome: (id) => setS((x) => ({ ...x, incomes: x.incomes.filter((y) => y.id !== id) })),
      editing,
      openEdit: (e) => {
        setEditing(e);
        setAddOpen(true);
      },
      labels: s.labels,
      createLabel: (l) =>
        setS((x) => ({ ...x, labels: x.labels.includes(l) ? x.labels : [...x.labels, l] })),
      plans: s.plans,
      savePlan: (p) =>
        setS((x) => ({
          ...x,
          plans: x.plans.some((y) => y.id === p.id)
            ? x.plans.map((y) => (y.id === p.id ? p : y))
            : [...x.plans, p],
        })),
      deletePlan: (id) => setS((x) => ({ ...x, plans: x.plans.filter((y) => y.id !== id) })),
      portfolio: s.portfolio,
      fire: s.fire,
      setFire: (fire) => set({ fire }),
      fireSet: s.fireSet,
      setFireSet: (fireSet) => set({ fireSet }),
      assumptions: s.assumptions,
      setAssumptions: (assumptions) => set({ assumptions }),
      addOpen,
      setAddOpen: (o) => {
        setAddOpen(o);
        if (!o) setEditing(null);
      },
    }),
    [s, ready, addOpen, editing, today, month, email, hid, deviceData],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error("useStore outside provider");
  return s;
}
