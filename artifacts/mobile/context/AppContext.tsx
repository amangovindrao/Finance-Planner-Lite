import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { Platform, Share } from "react-native";
import {
  cancelScheduledNotification,
  requestNotificationPermissions,
  scheduleTaskReminder,
  sendImmediateNotification,
} from "@/utils/notifications";
import {
  DbAccount,
  DbBudget,
  DbExpense,
  DbLoan,
  DbSavingsGoal,
  DbTask,
  DbTemplate,
  getDb,
  initDatabase,
  isWebFallback,
} from "@/db/database";

export type Category =
  | "Food"
  | "Transport"
  | "Subscriptions"
  | "Shopping"
  | "Education"
  | "Miscellaneous";

export const CATEGORIES: Category[] = [
  "Food",
  "Transport",
  "Subscriptions",
  "Shopping",
  "Education",
  "Miscellaneous",
];

export const CATEGORY_COLORS: Record<Category, string> = {
  Food: "#FF6B6B",
  Transport: "#4ECDC4",
  Subscriptions: "#A78BFA",
  Shopping: "#FB923C",
  Education: "#60A5FA",
  Miscellaneous: "#94A3B8",
};

export type AccountType = "bank" | "wallet" | "cash";

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  balance: number;
  icon: string;
  color: string;
}

export const ACCOUNT_ICONS: Record<AccountType, string> = {
  bank: "card-outline",
  wallet: "wallet-outline",
  cash: "cash-outline",
};

export const ACCOUNT_COLORS = [
  "#4B7CF6", "#00C781", "#A78BFA", "#FB923C", "#60A5FA", "#4ECDC4", "#FF6B6B",
];

export interface Expense {
  id: string;
  amount: number;
  category: Category;
  description: string;
  date: string;
  isRecurring: boolean;
  sourceId: string | null;
}

export interface Budget {
  totalAmount: number;
  categoryLimits: Record<Category, number>;
}

export interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline?: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  deadline?: string;
  completed: boolean;
  category: string;
  createdAt: string;
}

export interface Template {
  id: string;
  name: string;
  amount: number;
  category: Category;
}

export type LoanType = "lent" | "borrowed";

export interface Loan {
  id: string;
  personName: string;
  amount: number;
  type: LoanType;
  date: string;
  note: string;
  settled: boolean;
}

export interface NotificationPrefs {
  budgetAlerts: boolean;
  taskReminders: boolean;
}

const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  budgetAlerts: true,
  taskReminders: true,
};

const DEFAULT_BUDGET: Budget = {
  totalAmount: 15000,
  categoryLimits: {
    Food: 4000,
    Transport: 1500,
    Subscriptions: 1000,
    Shopping: 3000,
    Education: 2500,
    Miscellaneous: 3000,
  },
};

const AS_KEYS = {
  expenses: "@ft_expenses",
  budget: "@ft_budget",
  tasks: "@ft_tasks",
  goals: "@ft_goals",
  templates: "@ft_templates",
  pin: "@ft_pin",
  streak: "@ft_streak",
  lastMonth: "@ft_last_month",
  accounts: "@ft_accounts",
  userName: "@ft_user_name",
  isOnboarded: "@ft_is_onboarded",
  notifPrefs: "@ft_notif_prefs",
  loans: "@ft_loans",
  privacyMode: "@ft_privacy_mode",
  profilePhoto: "@ft_profile_photo",
  notifiedThresholds: "@ft_notified_thresholds",
};

function generateId(): string {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

export function autoCategorize(description: string): Category {
  const t = description.toLowerCase();
  if (/zomato|swiggy|food|restaurant|pizza|burger|coffee|cafe|dinner|lunch|breakfast|grocery|eat|dining|sushi|biryani|dosa|chai|dhaba|mess/.test(t))
    return "Food";
  if (/ola|uber|rapido|bus|taxi|auto|metro|train|parking|transit|ride|fuel|petrol|diesel|rickshaw|bike|cab/.test(t))
    return "Transport";
  if (/netflix|spotify|amazon prime|hotstar|jio|airtel|vodafone|vi|bsnl|recharge|subscription|monthly|premium|plan|youtube/.test(t))
    return "Subscriptions";
  if (/myntra|flipkart|meesho|nykaa|ajio|shopping|clothes|fashion|store|mall|buy|purchase|order|amazon|snapdeal/.test(t))
    return "Shopping";
  if (/textbook|course|tuition|school|university|books|study|class|education|learning|exam|udemy|coursera|byju|coaching/.test(t))
    return "Education";
  return "Miscellaneous";
}

function rowToLoan(row: DbLoan): Loan {
  return {
    id: row.id,
    personName: row.person_name,
    amount: row.amount,
    type: row.type as LoanType,
    date: row.date,
    note: row.note,
    settled: row.settled === 1,
  };
}

function rowToExpense(row: DbExpense): Expense {
  return {
    id: row.id,
    amount: row.amount,
    category: row.category as Category,
    description: row.description,
    date: row.date,
    isRecurring: row.is_recurring === 1,
    sourceId: row.source_id ?? null,
  };
}

function rowToAccount(row: DbAccount): Account {
  return {
    id: row.id,
    name: row.name,
    type: row.type as AccountType,
    balance: row.balance,
    icon: row.icon,
    color: row.color,
  };
}

function rowToTask(row: DbTask): Task {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    deadline: row.deadline ?? undefined,
    completed: row.completed === 1,
    category: row.category,
    createdAt: row.created_at,
  };
}

function rowToGoal(row: DbSavingsGoal): SavingsGoal {
  return {
    id: row.id,
    name: row.name,
    targetAmount: row.target_amount,
    currentAmount: row.current_amount,
    deadline: row.deadline ?? undefined,
  };
}

function rowToTemplate(row: DbTemplate): Template {
  return {
    id: row.id,
    name: row.name,
    amount: row.amount,
    category: row.category as Category,
  };
}

function parseBudget(row: DbBudget): Budget {
  return {
    totalAmount: row.total_amount,
    categoryLimits: JSON.parse(row.category_limits) as Record<Category, number>,
  };
}

interface AppContextType {
  expenses: Expense[];
  budget: Budget;
  tasks: Task[];
  savingsGoals: SavingsGoal[];
  templates: Template[];
  accounts: Account[];
  loans: Loan[];
  pin: string | null;
  isLocked: boolean;
  streak: number;
  currentMonth: string;
  isLoaded: boolean;
  userName: string;
  profilePhoto: string | null;
  isOnboarded: boolean;
  notificationPrefs: NotificationPrefs;
  isPrivacyMode: boolean;
  addExpense: (e: Omit<Expense, "id">) => void;
  updateExpense: (id: string, u: Partial<Expense>) => void;
  deleteExpense: (id: string) => void;
  updateBudget: (b: Partial<Budget>) => void;
  addTask: (t: Omit<Task, "id" | "createdAt">) => void;
  updateTask: (id: string, u: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  addSavingsGoal: (g: Omit<SavingsGoal, "id">) => void;
  updateSavingsGoal: (id: string, u: Partial<SavingsGoal>) => void;
  deleteSavingsGoal: (id: string) => void;
  addTemplate: (t: Omit<Template, "id">) => void;
  deleteTemplate: (id: string) => void;
  addAccount: (a: Omit<Account, "id">) => void;
  updateAccount: (id: string, u: Partial<Account>) => void;
  deleteAccount: (id: string) => void;
  addLoan: (l: Omit<Loan, "id">) => void;
  updateLoan: (id: string, u: Partial<Loan>) => void;
  deleteLoan: (id: string) => void;
  setPin: (p: string | null) => void;
  unlockWithPin: (p: string) => boolean;
  exportCSV: () => Promise<void>;
  getMonthExpenses: () => Expense[];
  getCategoryTotal: (c: Category) => number;
  getTotalSpent: () => number;
  getTodaySpent: () => number;
  getTotalBalance: () => number;
  getInsights: () => string[];
  completeOnboarding: (name: string, budget: number, initialAccounts: Omit<Account, "id">[]) => void;
  updateNotificationPrefs: (prefs: Partial<NotificationPrefs>) => void;
  togglePrivacyMode: () => void;
  updateUserName: (name: string) => void;
  updateProfilePhoto: (uri: string | null) => void;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [budget, setBudget] = useState<Budget>(DEFAULT_BUDGET);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [pin, setPin_] = useState<string | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [streak, setStreak] = useState(0);
  const [userName, setUserName] = useState("");
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [isOnboarded, setIsOnboarded] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPrefs>(DEFAULT_NOTIFICATION_PREFS);
  const [isPrivacyMode, setIsPrivacyMode] = useState(false);
  const currentMonth = new Date().toISOString().slice(0, 7);
  const initialized = useRef(false);
  const notifPrefsRef = useRef<NotificationPrefs>(DEFAULT_NOTIFICATION_PREFS);
  const notifiedThresholds = useRef<Set<string>>(new Set());
  const taskNotifIds = useRef<Record<string, string>>({});
  const budgetRef = useRef<Budget>(DEFAULT_BUDGET);
  const expensesRef = useRef<Expense[]>([]);

  useEffect(() => { expensesRef.current = expenses; }, [expenses]);
  useEffect(() => { budgetRef.current = budget; }, [budget]);
  useEffect(() => { notifPrefsRef.current = notificationPrefs; }, [notificationPrefs]);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    if (Platform.OS === "web") {
      loadFromAsyncStorage();
    } else {
      loadFromSQLite();
    }
    requestNotificationPermissions();
  }, []);

  async function loadFromAsyncStorage() {
    try {
      const keys = Object.values(AS_KEYS);
      const pairs = await AsyncStorage.multiGet(keys);
      const map: Record<string, string | null> = {};
      pairs.forEach(([k, v]) => { map[k] = v; });

      const loadedExpenses: Expense[] = map[AS_KEYS.expenses] ? JSON.parse(map[AS_KEYS.expenses]!) : [];
      const loadedBudget: Budget = map[AS_KEYS.budget] ? JSON.parse(map[AS_KEYS.budget]!) : DEFAULT_BUDGET;
      const loadedTasks: Task[] = map[AS_KEYS.tasks] ? JSON.parse(map[AS_KEYS.tasks]!) : [];
      const loadedGoals: SavingsGoal[] = map[AS_KEYS.goals] ? JSON.parse(map[AS_KEYS.goals]!) : [];
      const loadedTemplates: Template[] = map[AS_KEYS.templates] ? JSON.parse(map[AS_KEYS.templates]!) : [];
      const loadedAccounts: Account[] = map[AS_KEYS.accounts] ? JSON.parse(map[AS_KEYS.accounts]!) : [];
      const loadedPin: string | null = map[AS_KEYS.pin] ?? null;
      const loadedStreak: number = map[AS_KEYS.streak] ? parseInt(map[AS_KEYS.streak]!) : 0;
      const loadedUserName: string = map[AS_KEYS.userName] ?? "";
      const loadedIsOnboarded: boolean = map[AS_KEYS.isOnboarded] === "true";
      const lastMonth: string = map[AS_KEYS.lastMonth] ?? "";
      const loadedNotifPrefs: NotificationPrefs = map[AS_KEYS.notifPrefs]
        ? { ...DEFAULT_NOTIFICATION_PREFS, ...JSON.parse(map[AS_KEYS.notifPrefs]!) }
        : DEFAULT_NOTIFICATION_PREFS;
      const loadedLoans: Loan[] = map[AS_KEYS.loans] ? JSON.parse(map[AS_KEYS.loans]!) : [];
      const loadedPrivacyMode: boolean = map[AS_KEYS.privacyMode] === "true";
      const loadedProfilePhoto: string | null = map[AS_KEYS.profilePhoto] ?? null;
      const rawNT = map[AS_KEYS.notifiedThresholds];
      if (rawNT) {
        try {
          const parsed: { month: string; keys: string[] } = JSON.parse(rawNT);
          if (parsed.month === currentMonth) {
            notifiedThresholds.current = new Set(parsed.keys);
          }
        } catch { /* ignore */ }
      }

      let updatedExpenses = [...loadedExpenses];
      if (lastMonth !== currentMonth) {
        const recurring = loadedExpenses.filter((e) => e.isRecurring);
        const thisMonthDescs = new Set(
          loadedExpenses.filter((e) => e.date.startsWith(currentMonth)).map((e) => e.description.toLowerCase())
        );
        recurring.forEach((e) => {
          if (!thisMonthDescs.has(e.description.toLowerCase())) {
            updatedExpenses.push({ ...e, id: generateId(), date: `${currentMonth}-01` });
          }
        });
        await AsyncStorage.setItem(AS_KEYS.lastMonth, currentMonth);
        await AsyncStorage.removeItem(AS_KEYS.notifiedThresholds);
        notifiedThresholds.current = new Set();
        if (updatedExpenses.length !== loadedExpenses.length) {
          await AsyncStorage.setItem(AS_KEYS.expenses, JSON.stringify(updatedExpenses));
        }
      }

      setExpenses(updatedExpenses);
      setBudget(loadedBudget);
      setTasks(loadedTasks);
      setSavingsGoals(loadedGoals);
      setTemplates(loadedTemplates);
      setAccounts(loadedAccounts);
      setLoans(loadedLoans);
      setPin_(loadedPin);
      setIsLocked(!!loadedPin);
      setStreak(loadedStreak);
      setUserName(loadedUserName);
      setProfilePhoto(loadedProfilePhoto);
      setIsOnboarded(loadedIsOnboarded);
      setNotificationPrefs(loadedNotifPrefs);
      notifPrefsRef.current = loadedNotifPrefs;
      setIsPrivacyMode(loadedPrivacyMode);
    } catch (err) {
      console.warn("AS load error:", err);
    } finally {
      setIsLoaded(true);
    }
  }

  function loadFromSQLite() {
    try {
      initDatabase();
      if (isWebFallback()) {
        loadFromAsyncStorage();
        return;
      }
      const db = getDb();
      const expRows = db.getAllSync<DbExpense>("SELECT * FROM expenses ORDER BY date DESC");
      const loadedExpenses = expRows.map(rowToExpense);
      const budRow = db.getFirstSync<DbBudget>("SELECT * FROM budgets WHERE id = 1");
      const loadedBudget = budRow ? parseBudget(budRow) : DEFAULT_BUDGET;
      const taskRows = db.getAllSync<DbTask>("SELECT * FROM tasks ORDER BY created_at DESC");
      const loadedTasks = taskRows.map(rowToTask);
      const goalRows = db.getAllSync<DbSavingsGoal>("SELECT * FROM savings_goals");
      const loadedGoals = goalRows.map(rowToGoal);
      const tmplRows = db.getAllSync<DbTemplate>("SELECT * FROM templates");
      const loadedTemplates = tmplRows.map(rowToTemplate);
      const acctRows = db.getAllSync<DbAccount>("SELECT * FROM accounts");
      const loadedAccounts = acctRows.map(rowToAccount);
      const pinRow = db.getFirstSync<{ value: string }>("SELECT value FROM settings WHERE key = 'pin'");
      const loadedPin = pinRow?.value ?? null;
      const streakRow = db.getFirstSync<{ value: string }>("SELECT value FROM settings WHERE key = 'streak'");
      const loadedStreak = streakRow ? parseInt(streakRow.value) : 0;
      const lastMonthRow = db.getFirstSync<{ value: string }>("SELECT value FROM settings WHERE key = 'last_month'");
      const lastMonth = lastMonthRow?.value ?? "";
      const userNameRow = db.getFirstSync<{ value: string }>("SELECT value FROM settings WHERE key = 'user_name'");
      const loadedUserName = userNameRow?.value ?? "";
      const onboardedRow = db.getFirstSync<{ value: string }>("SELECT value FROM settings WHERE key = 'is_onboarded'");
      const loadedIsOnboarded = onboardedRow?.value === "true";
      const notifRow = db.getFirstSync<{ value: string }>("SELECT value FROM settings WHERE key = 'notif_prefs'");
      const loadedNotifPrefs: NotificationPrefs = notifRow?.value
        ? { ...DEFAULT_NOTIFICATION_PREFS, ...JSON.parse(notifRow.value) }
        : DEFAULT_NOTIFICATION_PREFS;
      const loanRows = db.getAllSync<DbLoan>("SELECT * FROM loans ORDER BY date DESC");
      const loadedLoans = loanRows.map(rowToLoan);
      const privacyRow = db.getFirstSync<{ value: string }>("SELECT value FROM settings WHERE key = 'privacy_mode'");
      const loadedPrivacyMode = privacyRow?.value === "true";
      const photoRow = db.getFirstSync<{ value: string }>("SELECT value FROM settings WHERE key = 'profile_photo'");
      const loadedProfilePhoto: string | null = photoRow?.value ?? null;
      const ntRow = db.getFirstSync<{ value: string }>("SELECT value FROM settings WHERE key = 'notified_thresholds'");
      if (ntRow?.value) {
        try {
          const parsed: { month: string; keys: string[] } = JSON.parse(ntRow.value);
          if (parsed.month === currentMonth) {
            notifiedThresholds.current = new Set(parsed.keys);
          }
        } catch { /* ignore */ }
      }

      let updatedExpenses = [...loadedExpenses];
      if (lastMonth !== currentMonth) {
        const recurring = loadedExpenses.filter((e) => e.isRecurring);
        const thisMonthDescs = new Set(
          loadedExpenses.filter((e) => e.date.startsWith(currentMonth)).map((e) => e.description.toLowerCase())
        );
        recurring.forEach((e) => {
          if (!thisMonthDescs.has(e.description.toLowerCase())) {
            const newExp: Expense = { ...e, id: generateId(), date: `${currentMonth}-01` };
            db.runSync(
              "INSERT INTO expenses (id, amount, category, description, date, is_recurring, source_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
              [newExp.id, newExp.amount, newExp.category, newExp.description, newExp.date, 1, newExp.sourceId ?? null]
            );
            updatedExpenses.push(newExp);
          }
        });
        db.runSync("INSERT OR REPLACE INTO settings (key, value) VALUES ('last_month', ?)", [currentMonth]);
        db.runSync("DELETE FROM settings WHERE key = 'notified_thresholds'", []);
        notifiedThresholds.current = new Set();
      }

      setExpenses(updatedExpenses);
      setBudget(loadedBudget);
      setTasks(loadedTasks);
      setSavingsGoals(loadedGoals);
      setTemplates(loadedTemplates);
      setAccounts(loadedAccounts);
      setLoans(loadedLoans);
      setPin_(loadedPin);
      setIsLocked(!!loadedPin);
      setStreak(loadedStreak);
      setUserName(loadedUserName);
      setProfilePhoto(loadedProfilePhoto);
      setIsOnboarded(loadedIsOnboarded);
      setNotificationPrefs(loadedNotifPrefs);
      notifPrefsRef.current = loadedNotifPrefs;
      setIsPrivacyMode(loadedPrivacyMode);
    } catch (err) {
      console.warn("SQLite load error:", err);
      loadFromAsyncStorage();
    } finally {
      setIsLoaded(true);
    }
  }

  function dbRun(sql: string, args: (string | number | null)[]) {
    if (Platform.OS === "web" || isWebFallback()) return;
    try { getDb().runSync(sql, args); } catch (err) { console.warn("DB run error:", err); }
  }

  async function asSet(key: keyof typeof AS_KEYS, value: unknown) {
    if (Platform.OS !== "web") return;
    await AsyncStorage.setItem(AS_KEYS[key], JSON.stringify(value));
  }

  const getMonthExpenses = useCallback((): Expense[] => {
    return expenses.filter((e) => e.date.startsWith(currentMonth));
  }, [expenses, currentMonth]);

  const getCategoryTotal = useCallback(
    (category: Category): number => {
      return getMonthExpenses().filter((e) => e.category === category).reduce((s, e) => s + e.amount, 0);
    },
    [getMonthExpenses]
  );

  const getTotalSpent = useCallback((): number => {
    return getMonthExpenses().reduce((s, e) => s + e.amount, 0);
  }, [getMonthExpenses]);

  const getTodaySpent = useCallback((): number => {
    const today = new Date().toISOString().slice(0, 10);
    return expenses.filter((e) => e.date === today).reduce((s, e) => s + e.amount, 0);
  }, [expenses]);

  const getTotalBalance = useCallback((): number => {
    return accounts.reduce((s, a) => s + a.balance, 0);
  }, [accounts]);

  const getInsights = useCallback((): string[] => {
    const insights: string[] = [];
    const total = getTotalSpent();
    const pct = budget.totalAmount > 0 ? (total / budget.totalAmount) * 100 : 0;
    const remaining = budget.totalAmount - total;

    if (pct > 90) insights.push("Heads up — you're close to your monthly budget limit.");
    else if (pct < 50) insights.push(`On track — only ${Math.round(pct)}% of budget used.`);

    CATEGORIES.forEach((cat) => {
      const spent = getCategoryTotal(cat);
      const limit = budget.categoryLimits[cat];
      if (limit > 0 && spent > limit) insights.push(`${cat} exceeded by ₹${(spent - limit).toFixed(0)}.`);
    });

    if (streak >= 3) insights.push(`${streak}-day spending streak — keep it up!`);
    if (remaining > 0 && pct <= 80) insights.push(`₹${remaining.toFixed(0)} remaining this month.`);

    if (accounts.length > 0) {
      const lowAccount = accounts.find((a) => a.balance < 500 && a.balance >= 0);
      if (lowAccount) insights.push(`${lowAccount.name} balance is running low (₹${lowAccount.balance.toFixed(0)}).`);
    }

    return insights.slice(0, 3);
  }, [getTotalSpent, budget, getCategoryTotal, streak, accounts]);

  function persistNotifiedThresholds(month: string, thresholds: Set<string>) {
    const data = JSON.stringify({ month, keys: Array.from(thresholds) });
    if (Platform.OS !== "web") {
      dbRun("INSERT OR REPLACE INTO settings (key, value) VALUES ('notified_thresholds', ?)", [data]);
    } else {
      AsyncStorage.setItem(AS_KEYS.notifiedThresholds, data);
    }
  }

  const addExpense = useCallback((e: Omit<Expense, "id">) => {
    const id = generateId();
    const newExpense: Expense = { ...e, id };
    dbRun(
      "INSERT INTO expenses (id, amount, category, description, date, is_recurring, source_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [id, e.amount, e.category, e.description, e.date, e.isRecurring ? 1 : 0, e.sourceId ?? null]
    );

    if (e.sourceId) {
      dbRun("UPDATE accounts SET balance = balance - ? WHERE id = ?", [e.amount, e.sourceId]);
      setAccounts((prev) => {
        const next = prev.map((a) => a.id === e.sourceId ? { ...a, balance: a.balance - e.amount } : a);
        if (Platform.OS === "web") AsyncStorage.setItem(AS_KEYS.accounts, JSON.stringify(next));
        return next;
      });
    }

    setExpenses((prev) => {
      const next = [newExpense, ...prev];
      asSet("expenses", next);

      if (notifPrefsRef.current.budgetAlerts) {
        const month = new Date().toISOString().slice(0, 7);
        const monthExp = next.filter((exp) => exp.date.startsWith(month));

        const bud = budgetRef.current;
        const catTotal = monthExp
          .filter((exp) => exp.category === e.category)
          .reduce((s, exp) => s + exp.amount, 0);
        const catLimit = bud.categoryLimits[e.category];
        if (catLimit > 0) {
          const catPct = (catTotal / catLimit) * 100;
          if (catPct >= 100 && !notifiedThresholds.current.has(`${e.category}-100`)) {
            notifiedThresholds.current.add(`${e.category}-100`);
            sendImmediateNotification(
              `${e.category} budget exceeded!`,
              `You've spent all of your ₹${catLimit} ${e.category} budget this month.`
            );
          } else if (catPct >= 80 && !notifiedThresholds.current.has(`${e.category}-80`)) {
            notifiedThresholds.current.add(`${e.category}-80`);
            sendImmediateNotification(
              `${e.category} budget at 80%`,
              `You've used 80% of your ₹${catLimit} ${e.category} budget.`
            );
          }
        }

        const total = monthExp.reduce((s, exp) => s + exp.amount, 0);
        const totalPct = bud.totalAmount > 0 ? (total / bud.totalAmount) * 100 : 0;
        if (totalPct >= 100 && !notifiedThresholds.current.has("total-100")) {
          notifiedThresholds.current.add("total-100");
          sendImmediateNotification(
            "Monthly budget exceeded!",
            `You've spent all of your ₹${bud.totalAmount} monthly budget.`
          );
        } else if (totalPct >= 80 && !notifiedThresholds.current.has("total-80")) {
          notifiedThresholds.current.add("total-80");
          sendImmediateNotification(
            "Monthly budget at 80%",
            `You've used 80% of your ₹${bud.totalAmount} monthly budget.`
          );
        }

        persistNotifiedThresholds(month, notifiedThresholds.current);
      }

      return next;
    });

    setStreak((prevStreak) => {
      const today = new Date().toISOString().slice(0, 10);
      const nextStreak = prevStreak + 1;
      if (Platform.OS !== "web") {
        dbRun("INSERT OR REPLACE INTO settings (key, value) VALUES ('streak', ?)", [nextStreak.toString()]);
        dbRun("INSERT OR REPLACE INTO settings (key, value) VALUES ('streak_date', ?)", [today]);
      } else {
        AsyncStorage.setItem(AS_KEYS.streak, nextStreak.toString());
      }
      return nextStreak;
    });
  }, []);

  const updateExpense = useCallback((id: string, u: Partial<Expense>) => {
    setExpenses((prev) => {
      const old = prev.find((e) => e.id === id);
      const updated = prev.map((e) => (e.id === id ? { ...e, ...u } : e));
      const exp = updated.find((e) => e.id === id);
      if (exp) {
        dbRun(
          "UPDATE expenses SET amount=?, category=?, description=?, date=?, is_recurring=?, source_id=? WHERE id=?",
          [exp.amount, exp.category, exp.description, exp.date, exp.isRecurring ? 1 : 0, exp.sourceId ?? null, id]
        );
        if (old && u.amount !== undefined && old.sourceId && old.sourceId === exp.sourceId) {
          const diff = u.amount - old.amount;
          dbRun("UPDATE accounts SET balance = balance - ? WHERE id = ?", [diff, old.sourceId]);
          setAccounts((accs) => accs.map((a) => a.id === old.sourceId ? { ...a, balance: a.balance - diff } : a));
        }
        asSet("expenses", updated);
      }
      return updated;
    });
  }, []);

  const deleteExpense = useCallback((id: string) => {
    setExpenses((prev) => {
      const exp = prev.find((e) => e.id === id);
      if (exp?.sourceId) {
        dbRun("UPDATE accounts SET balance = balance + ? WHERE id = ?", [exp.amount, exp.sourceId]);
        setAccounts((accs) => accs.map((a) => a.id === exp.sourceId ? { ...a, balance: a.balance + exp.amount } : a));
      }
      dbRun("DELETE FROM expenses WHERE id=?", [id]);
      const next = prev.filter((e) => e.id !== id);
      asSet("expenses", next);
      return next;
    });
  }, []);

  const updateBudget = useCallback((b: Partial<Budget>) => {
    setBudget((prev) => {
      const next = { ...prev, ...b };
      dbRun("UPDATE budgets SET total_amount=?, category_limits=? WHERE id=1", [
        next.totalAmount, JSON.stringify(next.categoryLimits),
      ]);
      asSet("budget", next);
      return next;
    });
  }, []);

  const addTask = useCallback((t: Omit<Task, "id" | "createdAt">) => {
    const id = generateId();
    const createdAt = new Date().toISOString();
    const newTask: Task = { ...t, id, createdAt, completed: false };
    dbRun(
      "INSERT INTO tasks (id, title, description, deadline, completed, category, created_at) VALUES (?, ?, ?, ?, 0, ?, ?)",
      [id, t.title, t.description, t.deadline ?? null, t.category, createdAt]
    );
    setTasks((prev) => {
      const next = [newTask, ...prev];
      asSet("tasks", next);
      return next;
    });
    if (notifPrefsRef.current.taskReminders && t.deadline) {
      scheduleTaskReminder(t.title, t.deadline).then((notifId) => {
        if (notifId) taskNotifIds.current[id] = notifId;
      });
    }
  }, []);

  const updateTask = useCallback((id: string, u: Partial<Task>) => {
    setTasks((prev) => {
      const updated = prev.map((t) => (t.id === id ? { ...t, ...u } : t));
      const task = updated.find((t) => t.id === id);
      if (task) {
        dbRun(
          "UPDATE tasks SET title=?, description=?, deadline=?, completed=?, category=? WHERE id=?",
          [task.title, task.description, task.deadline ?? null, task.completed ? 1 : 0, task.category, id]
        );
        asSet("tasks", updated);

        if (notifPrefsRef.current.taskReminders) {
          const oldNotifId = taskNotifIds.current[id];
          if (oldNotifId) {
            cancelScheduledNotification(oldNotifId);
            delete taskNotifIds.current[id];
          }
          if (task.deadline && !task.completed) {
            scheduleTaskReminder(task.title, task.deadline).then((notifId) => {
              if (notifId) taskNotifIds.current[id] = notifId;
            });
          }
        }
      }
      return updated;
    });
  }, []);

  const deleteTask = useCallback((id: string) => {
    dbRun("DELETE FROM tasks WHERE id=?", [id]);
    setTasks((prev) => {
      const next = prev.filter((t) => t.id !== id);
      asSet("tasks", next);
      return next;
    });
    const notifId = taskNotifIds.current[id];
    if (notifId) {
      cancelScheduledNotification(notifId);
      delete taskNotifIds.current[id];
    }
  }, []);

  const addSavingsGoal = useCallback((g: Omit<SavingsGoal, "id">) => {
    const id = generateId();
    const newGoal = { ...g, id };
    dbRun(
      "INSERT INTO savings_goals (id, name, target_amount, current_amount, deadline) VALUES (?, ?, ?, ?, ?)",
      [id, g.name, g.targetAmount, g.currentAmount, g.deadline ?? null]
    );
    setSavingsGoals((prev) => {
      const next = [...prev, newGoal];
      asSet("goals", next);
      return next;
    });
  }, []);

  const updateSavingsGoal = useCallback((id: string, u: Partial<SavingsGoal>) => {
    setSavingsGoals((prev) => {
      const updated = prev.map((g) => (g.id === id ? { ...g, ...u } : g));
      const goal = updated.find((g) => g.id === id);
      if (goal) {
        dbRun(
          "UPDATE savings_goals SET name=?, target_amount=?, current_amount=?, deadline=? WHERE id=?",
          [goal.name, goal.targetAmount, goal.currentAmount, goal.deadline ?? null, id]
        );
        asSet("goals", updated);
      }
      return updated;
    });
  }, []);

  const deleteSavingsGoal = useCallback((id: string) => {
    dbRun("DELETE FROM savings_goals WHERE id=?", [id]);
    setSavingsGoals((prev) => {
      const next = prev.filter((g) => g.id !== id);
      asSet("goals", next);
      return next;
    });
  }, []);

  const addTemplate = useCallback((t: Omit<Template, "id">) => {
    const id = generateId();
    const newTemplate = { ...t, id };
    dbRun(
      "INSERT INTO templates (id, name, amount, category) VALUES (?, ?, ?, ?)",
      [id, t.name, t.amount, t.category]
    );
    setTemplates((prev) => {
      const next = [...prev, newTemplate];
      asSet("templates", next);
      return next;
    });
  }, []);

  const deleteTemplate = useCallback((id: string) => {
    dbRun("DELETE FROM templates WHERE id=?", [id]);
    setTemplates((prev) => {
      const next = prev.filter((t) => t.id !== id);
      asSet("templates", next);
      return next;
    });
  }, []);

  const addAccount = useCallback((a: Omit<Account, "id">) => {
    const id = generateId();
    const newAccount: Account = { ...a, id };
    dbRun(
      "INSERT INTO accounts (id, name, type, balance, icon, color) VALUES (?, ?, ?, ?, ?, ?)",
      [id, a.name, a.type, a.balance, a.icon, a.color]
    );
    setAccounts((prev) => {
      const next = [...prev, newAccount];
      if (Platform.OS === "web") AsyncStorage.setItem(AS_KEYS.accounts, JSON.stringify(next));
      return next;
    });
  }, []);

  const updateAccount = useCallback((id: string, u: Partial<Account>) => {
    setAccounts((prev) => {
      const updated = prev.map((a) => (a.id === id ? { ...a, ...u } : a));
      const acct = updated.find((a) => a.id === id);
      if (acct) {
        dbRun(
          "UPDATE accounts SET name=?, type=?, balance=?, icon=?, color=? WHERE id=?",
          [acct.name, acct.type, acct.balance, acct.icon, acct.color, id]
        );
        if (Platform.OS === "web") AsyncStorage.setItem(AS_KEYS.accounts, JSON.stringify(updated));
      }
      return updated;
    });
  }, []);

  const deleteAccount = useCallback((id: string) => {
    dbRun("DELETE FROM accounts WHERE id=?", [id]);
    setAccounts((prev) => {
      const next = prev.filter((a) => a.id !== id);
      if (Platform.OS === "web") AsyncStorage.setItem(AS_KEYS.accounts, JSON.stringify(next));
      return next;
    });
  }, []);

  const setPin = useCallback((p: string | null) => {
    setPin_(p);
    if (Platform.OS !== "web") {
      if (p) {
        dbRun("INSERT OR REPLACE INTO settings (key, value) VALUES ('pin', ?)", [p]);
      } else {
        dbRun("DELETE FROM settings WHERE key='pin'", []);
      }
    } else {
      if (p) {
        AsyncStorage.setItem(AS_KEYS.pin, p);
      } else {
        AsyncStorage.removeItem(AS_KEYS.pin);
      }
    }
  }, []);

  const unlockWithPin = useCallback(
    (p: string): boolean => {
      if (p === pin) {
        setIsLocked(false);
        return true;
      }
      return false;
    },
    [pin]
  );

  const exportCSV = useCallback(async () => {
    const headers = "Date,Category,Description,Amount,Recurring,Source\n";
    const rows = expenses
      .map((e) => {
        const srcName = accounts.find((a) => a.id === e.sourceId)?.name ?? "";
        return `${e.date},${e.category},"${e.description}",${e.amount},${e.isRecurring},"${srcName}"`;
      })
      .join("\n");
    const csv = headers + rows;

    if (Platform.OS !== "web" && FileSystem.documentDirectory) {
      try {
        const fileUri = FileSystem.documentDirectory + "finance_export.csv";
        await FileSystem.writeAsStringAsync(fileUri, csv, { encoding: FileSystem.EncodingType.UTF8 });
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(fileUri, { mimeType: "text/csv", dialogTitle: "Export Expenses CSV" });
          return;
        }
      } catch (_) {
        // fall through
      }
    }
    Share.share({ message: csv, title: "Finance Export" });
  }, [expenses, accounts]);

  const completeOnboarding = useCallback(
    (name: string, budgetAmount: number, initialAccounts: Omit<Account, "id">[]) => {
      setUserName(name);
      const newBudget = { ...DEFAULT_BUDGET, totalAmount: budgetAmount };
      setBudget(newBudget);

      if (Platform.OS !== "web") {
        dbRun("INSERT OR REPLACE INTO settings (key, value) VALUES ('user_name', ?)", [name]);
        dbRun("INSERT OR REPLACE INTO settings (key, value) VALUES ('is_onboarded', ?)", ["true"]);
        dbRun("UPDATE budgets SET total_amount=? WHERE id=1", [budgetAmount]);
      } else {
        AsyncStorage.setItem(AS_KEYS.userName, name);
        AsyncStorage.setItem(AS_KEYS.isOnboarded, "true");
        AsyncStorage.setItem(AS_KEYS.budget, JSON.stringify(newBudget));
      }

      const newAccounts: Account[] = initialAccounts.map((a) => {
        const id = generateId();
        dbRun(
          "INSERT INTO accounts (id, name, type, balance, icon, color) VALUES (?, ?, ?, ?, ?, ?)",
          [id, a.name, a.type, a.balance, a.icon, a.color]
        );
        return { ...a, id };
      });
      setAccounts(newAccounts);
      if (Platform.OS === "web") {
        AsyncStorage.setItem(AS_KEYS.accounts, JSON.stringify(newAccounts));
      }

      setIsOnboarded(true);
    },
    []
  );

  const updateNotificationPrefs = useCallback((prefs: Partial<NotificationPrefs>) => {
    setNotificationPrefs((prev) => {
      const next = { ...prev, ...prefs };
      notifPrefsRef.current = next;
      if (Platform.OS !== "web") {
        dbRun("INSERT OR REPLACE INTO settings (key, value) VALUES ('notif_prefs', ?)", [JSON.stringify(next)]);
      } else {
        AsyncStorage.setItem(AS_KEYS.notifPrefs, JSON.stringify(next));
      }
      return next;
    });
  }, []);

  const addLoan = useCallback((l: Omit<Loan, "id">) => {
    const id = generateId();
    const newLoan: Loan = { ...l, id };
    dbRun(
      "INSERT INTO loans (id, person_name, amount, type, date, note, settled) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [id, l.personName, l.amount, l.type, l.date, l.note, l.settled ? 1 : 0]
    );
    setLoans((prev) => {
      const next = [newLoan, ...prev];
      if (Platform.OS === "web") AsyncStorage.setItem(AS_KEYS.loans, JSON.stringify(next));
      return next;
    });
  }, []);

  const updateLoan = useCallback((id: string, u: Partial<Loan>) => {
    setLoans((prev) => {
      const updated = prev.map((l) => (l.id === id ? { ...l, ...u } : l));
      const loan = updated.find((l) => l.id === id);
      if (loan) {
        dbRun(
          "UPDATE loans SET person_name=?, amount=?, type=?, date=?, note=?, settled=? WHERE id=?",
          [loan.personName, loan.amount, loan.type, loan.date, loan.note, loan.settled ? 1 : 0, id]
        );
        if (Platform.OS === "web") AsyncStorage.setItem(AS_KEYS.loans, JSON.stringify(updated));
      }
      return updated;
    });
  }, []);

  const deleteLoan = useCallback((id: string) => {
    dbRun("DELETE FROM loans WHERE id=?", [id]);
    setLoans((prev) => {
      const next = prev.filter((l) => l.id !== id);
      if (Platform.OS === "web") AsyncStorage.setItem(AS_KEYS.loans, JSON.stringify(next));
      return next;
    });
  }, []);

  const togglePrivacyMode = useCallback(() => {
    setIsPrivacyMode((prev) => {
      const next = !prev;
      if (Platform.OS !== "web") {
        dbRun("INSERT OR REPLACE INTO settings (key, value) VALUES ('privacy_mode', ?)", [next ? "true" : "false"]);
      } else {
        AsyncStorage.setItem(AS_KEYS.privacyMode, next ? "true" : "false");
      }
      return next;
    });
  }, []);

  const updateUserName = useCallback((name: string) => {
    setUserName(name);
    if (Platform.OS !== "web") {
      dbRun("INSERT OR REPLACE INTO settings (key, value) VALUES ('user_name', ?)", [name]);
    } else {
      AsyncStorage.setItem(AS_KEYS.userName, name);
    }
  }, []);

  const updateProfilePhoto = useCallback((uri: string | null) => {
    setProfilePhoto(uri);
    if (Platform.OS !== "web") {
      if (uri) {
        dbRun("INSERT OR REPLACE INTO settings (key, value) VALUES ('profile_photo', ?)", [uri]);
      } else {
        dbRun("DELETE FROM settings WHERE key = 'profile_photo'", []);
      }
    } else {
      if (uri) {
        AsyncStorage.setItem(AS_KEYS.profilePhoto, uri);
      } else {
        AsyncStorage.removeItem(AS_KEYS.profilePhoto);
      }
    }
  }, []);

  const value: AppContextType = {
    expenses, budget, tasks, savingsGoals, templates, accounts, loans,
    pin, isLocked, streak, currentMonth, isLoaded, userName, profilePhoto, isOnboarded,
    notificationPrefs, isPrivacyMode,
    addExpense, updateExpense, deleteExpense, updateBudget,
    addTask, updateTask, deleteTask,
    addSavingsGoal, updateSavingsGoal, deleteSavingsGoal,
    addTemplate, deleteTemplate,
    addAccount, updateAccount, deleteAccount,
    addLoan, updateLoan, deleteLoan,
    setPin, unlockWithPin,
    exportCSV,
    getMonthExpenses, getCategoryTotal, getTotalSpent, getTodaySpent, getTotalBalance, getInsights,
    completeOnboarding,
    updateNotificationPrefs,
    togglePrivacyMode,
    updateUserName,
    updateProfilePhoto,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextType {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
