import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { Platform, Share } from "react-native";

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

const KEYS = {
  expenses: "@ft_expenses",
  budget: "@ft_budget",
  tasks: "@ft_tasks",
  goals: "@ft_goals",
  templates: "@ft_templates",
  pin: "@ft_pin",
  streak: "@ft_streak",
  streakDate: "@ft_streak_date",
  lastMonth: "@ft_last_month",
};

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

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    try {
      const [expRaw, budRaw, tasksRaw, goalsRaw, tmplRaw, pinRaw, streakRaw, lastMonthRaw] =
        await AsyncStorage.multiGet([
          KEYS.expenses, KEYS.budget, KEYS.tasks, KEYS.goals,
          KEYS.templates, KEYS.pin, KEYS.streak, KEYS.lastMonth,
        ]);

      const loadedExpenses: Expense[] = expRaw[1] ? JSON.parse(expRaw[1]) : [];
      const loadedBudget: Budget = budRaw[1] ? JSON.parse(budRaw[1]) : DEFAULT_BUDGET;
      const loadedTasks: Task[] = tasksRaw[1] ? JSON.parse(tasksRaw[1]) : [];
      const loadedGoals: SavingsGoal[] = goalsRaw[1] ? JSON.parse(goalsRaw[1]) : [];
      const loadedTemplates: Template[] = tmplRaw[1] ? JSON.parse(tmplRaw[1]) : [];
      const loadedPin: string | null = pinRaw[1] ?? null;
      const loadedStreak: number = streakRaw[1] ? parseInt(streakRaw[1]) : 0;
      const lastMonth: string = lastMonthRaw[1] ?? "";

      // Auto-add recurring expenses for new month
      let updatedExpenses = [...loadedExpenses];
      if (lastMonth !== currentMonth) {
        const recurringExpenses = loadedExpenses.filter((e) => e.isRecurring);
        const thisMonthIds = new Set(
          loadedExpenses
            .filter((e) => e.date.startsWith(currentMonth))
            .map((e) => e.description.toLowerCase())
        );
        recurringExpenses.forEach((e) => {
          if (!thisMonthIds.has(e.description.toLowerCase())) {
            updatedExpenses.push({
              ...e,
              id: generateId(),
              date: `${currentMonth}-01`,
            });
          }
        });
        await AsyncStorage.setItem(KEYS.lastMonth, currentMonth);
        if (updatedExpenses.length !== loadedExpenses.length) {
          await AsyncStorage.setItem(KEYS.expenses, JSON.stringify(updatedExpenses));
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
    } catch (_) {
      // ignore storage errors
    } finally {
      setIsLoaded(true);
    }
  }

  const saveExpenses = useCallback(async (data: Expense[]) => {
    await AsyncStorage.setItem(KEYS.expenses, JSON.stringify(data));
  }, []);

  const saveTasks = useCallback(async (data: Task[]) => {
    await AsyncStorage.setItem(KEYS.tasks, JSON.stringify(data));
  }, []);

  const saveGoals = useCallback(async (data: SavingsGoal[]) => {
    await AsyncStorage.setItem(KEYS.goals, JSON.stringify(data));
  }, []);

  const saveTemplates = useCallback(async (data: Template[]) => {
    await AsyncStorage.setItem(KEYS.templates, JSON.stringify(data));
  }, []);

  const getMonthExpenses = useCallback((): Expense[] => {
    return expenses.filter((e) => e.date.startsWith(currentMonth));
  }, [expenses, currentMonth]);

  const getCategoryTotal = useCallback(
    (category: Category): number => {
      return getMonthExpenses()
        .filter((e) => e.category === category)
        .reduce((sum, e) => sum + e.amount, 0);
    },
    [getMonthExpenses]
  );

  const getTotalSpent = useCallback((): number => {
    return getMonthExpenses().reduce((sum, e) => sum + e.amount, 0);
  }, [getMonthExpenses]);

  const getInsights = useCallback((): string[] => {
    const insights: string[] = [];
    const monthExpenses = getMonthExpenses();
    const totalSpent = monthExpenses.reduce((s, e) => s + e.amount, 0);
    const remaining = budget.totalAmount - totalSpent;
    const pct = budget.totalAmount > 0 ? (totalSpent / budget.totalAmount) * 100 : 0;

    if (pct > 90) insights.push("You are close to your monthly budget limit.");
    else if (pct < 50) insights.push(`On track — only ${Math.round(pct)}% of budget used.`);

    CATEGORIES.forEach((cat) => {
      const spent = getCategoryTotal(cat);
      const limit = budget.categoryLimits[cat];
      if (limit > 0 && spent > limit) {
        insights.push(`${cat} exceeded by $${(spent - limit).toFixed(0)}.`);
      }
    });

    if (streak >= 3) insights.push(`${streak}-day spending streak — keep it up!`);
    if (remaining > 0 && pct <= 80)
      insights.push(`$${remaining.toFixed(0)} remaining this month.`);

    return insights.slice(0, 3);
  }, [getMonthExpenses, budget, getCategoryTotal, streak]);

  const addExpense = useCallback(
    (e: Omit<Expense, "id">) => {
      const next = [...expenses, { ...e, id: generateId() }];
      setExpenses(next);
      saveExpenses(next);
    },
    [expenses, saveExpenses]
  );

  const updateExpense = useCallback(
    (id: string, u: Partial<Expense>) => {
      const next = expenses.map((e) => (e.id === id ? { ...e, ...u } : e));
      setExpenses(next);
      saveExpenses(next);
    },
    [expenses, saveExpenses]
  );

  const deleteExpense = useCallback(
    (id: string) => {
      const next = expenses.filter((e) => e.id !== id);
      setExpenses(next);
      saveExpenses(next);
    },
    [expenses, saveExpenses]
  );

  const updateBudget = useCallback(
    (b: Partial<Budget>) => {
      const next = { ...budget, ...b };
      setBudget(next);
      AsyncStorage.setItem(KEYS.budget, JSON.stringify(next));
    },
    [budget]
  );

  const addTask = useCallback(
    (t: Omit<Task, "id" | "createdAt">) => {
      const next = [...tasks, { ...t, id: generateId(), createdAt: new Date().toISOString() }];
      setTasks(next);
      saveTasks(next);
    },
    [tasks, saveTasks]
  );

  const updateTask = useCallback(
    (id: string, u: Partial<Task>) => {
      const next = tasks.map((t) => (t.id === id ? { ...t, ...u } : t));
      setTasks(next);
      saveTasks(next);
    },
    [tasks, saveTasks]
  );

  const deleteTask = useCallback(
    (id: string) => {
      const next = tasks.filter((t) => t.id !== id);
      setTasks(next);
      saveTasks(next);
    },
    [tasks, saveTasks]
  );

  const addSavingsGoal = useCallback(
    (g: Omit<SavingsGoal, "id">) => {
      const next = [...savingsGoals, { ...g, id: generateId() }];
      setSavingsGoals(next);
      saveGoals(next);
    },
    [savingsGoals, saveGoals]
  );

  const updateSavingsGoal = useCallback(
    (id: string, u: Partial<SavingsGoal>) => {
      const next = savingsGoals.map((g) => (g.id === id ? { ...g, ...u } : g));
      setSavingsGoals(next);
      saveGoals(next);
    },
    [savingsGoals, saveGoals]
  );

  const deleteSavingsGoal = useCallback(
    (id: string) => {
      const next = savingsGoals.filter((g) => g.id !== id);
      setSavingsGoals(next);
      saveGoals(next);
    },
    [savingsGoals, saveGoals]
  );

  const addTemplate = useCallback(
    (t: Omit<Template, "id">) => {
      const next = [...templates, { ...t, id: generateId() }];
      setTemplates(next);
      saveTemplates(next);
    },
    [templates, saveTemplates]
  );

  const deleteTemplate = useCallback(
    (id: string) => {
      const next = templates.filter((t) => t.id !== id);
      setTemplates(next);
      saveTemplates(next);
    },
    [templates, saveTemplates]
  );

  const setPin = useCallback((p: string | null) => {
    setPin_(p);
    if (p) {
      AsyncStorage.setItem(KEYS.pin, p);
    } else {
      AsyncStorage.removeItem(KEYS.pin);
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
        // fall through to Share.share
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
