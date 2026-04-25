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
  DbBudget,
  DbExpense,
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

export interface Expense {
  id: string;
  amount: number;
  category: Category;
  description: string;
  date: string;
  isRecurring: boolean;
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

const DEFAULT_BUDGET: Budget = {
  totalAmount: 1500,
  categoryLimits: {
    Food: 400,
    Transport: 150,
    Subscriptions: 100,
    Shopping: 300,
    Education: 250,
    Miscellaneous: 300,
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
};

function generateId(): string {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

export function autoCategorize(description: string): Category {
  const t = description.toLowerCase();
  if (/food|restaurant|pizza|burger|coffee|cafe|dinner|lunch|breakfast|grocery|eat|dining|sushi|tacos/.test(t))
    return "Food";
  if (/uber|lyft|bus|taxi|gas|subway|metro|train|parking|transit|ride|fuel/.test(t))
    return "Transport";
  if (/netflix|spotify|amazon prime|apple|hulu|disney|subscription|monthly|premium|plan/.test(t))
    return "Subscriptions";
  if (/shopping|clothes|fashion|store|mall|buy|purchase|order|amazon/.test(t))
    return "Shopping";
  if (/textbook|course|tuition|school|university|books|study|class|education|learning|exam/.test(t))
    return "Education";
  return "Miscellaneous";
}

function rowToExpense(row: DbExpense): Expense {
  return {
    id: row.id,
    amount: row.amount,
    category: row.category as Category,
    description: row.description,
    date: row.date,
    isRecurring: row.is_recurring === 1,
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
  pin: string | null;
  isLocked: boolean;
  streak: number;
  currentMonth: string;
  isLoaded: boolean;
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
  setPin: (p: string | null) => void;
  unlockWithPin: (p: string) => boolean;
  exportCSV: () => Promise<void>;
  getMonthExpenses: () => Expense[];
  getCategoryTotal: (c: Category) => number;
  getTotalSpent: () => number;
  getInsights: () => string[];
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [budget, setBudget] = useState<Budget>(DEFAULT_BUDGET);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [pin, setPin_] = useState<string | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [streak, setStreak] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const currentMonth = new Date().toISOString().slice(0, 7);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    if (Platform.OS === "web") {
      loadFromAsyncStorage();
    } else {
      loadFromSQLite();
    }
  }, []);

  async function loadFromAsyncStorage() {
    try {
      const [expRaw, budRaw, tasksRaw, goalsRaw, tmplRaw, pinRaw, streakRaw, lastMonthRaw] =
        await AsyncStorage.multiGet(Object.values(AS_KEYS));
      const loadedExpenses: Expense[] = expRaw[1] ? JSON.parse(expRaw[1]) : [];
      const loadedBudget: Budget = budRaw[1] ? JSON.parse(budRaw[1]) : DEFAULT_BUDGET;
      const loadedTasks: Task[] = tasksRaw[1] ? JSON.parse(tasksRaw[1]) : [];
      const loadedGoals: SavingsGoal[] = goalsRaw[1] ? JSON.parse(goalsRaw[1]) : [];
      const loadedTemplates: Template[] = tmplRaw[1] ? JSON.parse(tmplRaw[1]) : [];
      const loadedPin: string | null = pinRaw[1] ?? null;
      const loadedStreak: number = streakRaw[1] ? parseInt(streakRaw[1]) : 0;
      const lastMonth: string = lastMonthRaw[1] ?? "";

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
        if (updatedExpenses.length !== loadedExpenses.length) {
          await AsyncStorage.setItem(AS_KEYS.expenses, JSON.stringify(updatedExpenses));
        }
      }
      setExpenses(updatedExpenses);
      setBudget(loadedBudget);
      setTasks(loadedTasks);
      setSavingsGoals(loadedGoals);
      setTemplates(loadedTemplates);
      setPin_(loadedPin);
      setIsLocked(!!loadedPin);
      setStreak(loadedStreak);
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
      const pinRow = db.getFirstSync<{ value: string }>("SELECT value FROM settings WHERE key = 'pin'");
      const loadedPin = pinRow?.value ?? null;
      const streakRow = db.getFirstSync<{ value: string }>("SELECT value FROM settings WHERE key = 'streak'");
      const loadedStreak = streakRow ? parseInt(streakRow.value) : 0;
      const lastMonthRow = db.getFirstSync<{ value: string }>("SELECT value FROM settings WHERE key = 'last_month'");
      const lastMonth = lastMonthRow?.value ?? "";

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
              "INSERT INTO expenses (id, amount, category, description, date, is_recurring) VALUES (?, ?, ?, ?, ?, ?)",
              [newExp.id, newExp.amount, newExp.category, newExp.description, newExp.date, 1]
            );
            updatedExpenses.push(newExp);
          }
        });
        db.runSync("INSERT OR REPLACE INTO settings (key, value) VALUES ('last_month', ?)", [currentMonth]);
      }

      setExpenses(updatedExpenses);
      setBudget(loadedBudget);
      setTasks(loadedTasks);
      setSavingsGoals(loadedGoals);
      setTemplates(loadedTemplates);
      setPin_(loadedPin);
      setIsLocked(!!loadedPin);
      setStreak(loadedStreak);
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

  const getInsights = useCallback((): string[] => {
    const insights: string[] = [];
    const total = getTotalSpent();
    const pct = budget.totalAmount > 0 ? (total / budget.totalAmount) * 100 : 0;
    const remaining = budget.totalAmount - total;

    if (pct > 90) insights.push("Close to your monthly budget limit.");
    else if (pct < 50) insights.push(`On track — only ${Math.round(pct)}% of budget used.`);

    CATEGORIES.forEach((cat) => {
      const spent = getCategoryTotal(cat);
      const limit = budget.categoryLimits[cat];
      if (limit > 0 && spent > limit) insights.push(`${cat} exceeded by $${(spent - limit).toFixed(0)}.`);
    });

    if (streak >= 3) insights.push(`${streak}-day spending streak — keep it up!`);
    if (remaining > 0 && pct <= 80) insights.push(`$${remaining.toFixed(0)} remaining this month.`);

    return insights.slice(0, 3);
  }, [getTotalSpent, budget, getCategoryTotal, streak]);

  const addExpense = useCallback((e: Omit<Expense, "id">) => {
    const id = generateId();
    const newExpense = { ...e, id };
    dbRun(
      "INSERT INTO expenses (id, amount, category, description, date, is_recurring) VALUES (?, ?, ?, ?, ?, ?)",
      [id, e.amount, e.category, e.description, e.date, e.isRecurring ? 1 : 0]
    );
    setExpenses((prev) => {
      const next = [newExpense, ...prev];
      asSet("expenses", next);
      return next;
    });
  }, []);

  const updateExpense = useCallback((id: string, u: Partial<Expense>) => {
    setExpenses((prev) => {
      const updated = prev.map((e) => (e.id === id ? { ...e, ...u } : e));
      const exp = updated.find((e) => e.id === id);
      if (exp) {
        dbRun(
          "UPDATE expenses SET amount=?, category=?, description=?, date=?, is_recurring=? WHERE id=?",
          [exp.amount, exp.category, exp.description, exp.date, exp.isRecurring ? 1 : 0, id]
        );
        asSet("expenses", updated);
      }
      return updated;
    });
  }, []);

  const deleteExpense = useCallback((id: string) => {
    dbRun("DELETE FROM expenses WHERE id=?", [id]);
    setExpenses((prev) => {
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
    const headers = "Date,Category,Description,Amount,Recurring\n";
    const rows = expenses
      .map((e) => `${e.date},${e.category},"${e.description}",${e.amount},${e.isRecurring}`)
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
  }, [expenses]);

  const value: AppContextType = {
    expenses, budget, tasks, savingsGoals, templates,
    pin, isLocked, streak, currentMonth, isLoaded,
    addExpense, updateExpense, deleteExpense, updateBudget,
    addTask, updateTask, deleteTask,
    addSavingsGoal, updateSavingsGoal, deleteSavingsGoal,
    addTemplate, deleteTemplate,
    setPin, unlockWithPin,
    exportCSV,
    getMonthExpenses, getCategoryTotal, getTotalSpent, getInsights,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextType {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
