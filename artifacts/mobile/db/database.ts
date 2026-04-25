import { Platform } from "react-native";
import { CREATE_TABLES_SQL, MIGRATE_SQL_STATEMENTS } from "./schema";

export type DbAccount = {
  id: string;
  name: string;
  type: string;
  balance: number;
  icon: string;
  color: string;
};

export type DbExpense = {
  id: string;
  amount: number;
  category: string;
  description: string;
  date: string;
  is_recurring: number;
  source_id: string | null;
};

export type DbBudget = {
  id: number;
  total_amount: number;
  category_limits: string;
};

export type DbSavingsGoal = {
  id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  deadline: string | null;
};

export type DbTask = {
  id: string;
  title: string;
  description: string;
  deadline: string | null;
  completed: number;
  category: string;
  created_at: string;
};

export type DbTemplate = {
  id: string;
  name: string;
  amount: number;
  category: string;
};

export type DbSetting = {
  key: string;
  value: string;
};

const DEFAULT_BUDGET_JSON = JSON.stringify({
  Food: 400, Transport: 150, Subscriptions: 100, Shopping: 300, Education: 250, Miscellaneous: 300,
});

let _db: import("expo-sqlite").SQLiteDatabase | null = null;
let _isWebFallback = false;

export function isWebFallback(): boolean {
  return _isWebFallback;
}

export function getDb(): import("expo-sqlite").SQLiteDatabase {
  if (_db) return _db;
  if (Platform.OS === "web") {
    _isWebFallback = true;
    return null as unknown as import("expo-sqlite").SQLiteDatabase;
  }
  const SQLite = require("expo-sqlite") as typeof import("expo-sqlite");
  _db = SQLite.openDatabaseSync("finance_tracker.db");
  return _db;
}

export function initDatabase(): void {
  if (Platform.OS === "web") {
    _isWebFallback = true;
    return;
  }
  try {
    const db = getDb();
    db.execSync(CREATE_TABLES_SQL);

    for (const stmt of MIGRATE_SQL_STATEMENTS) {
      try {
        db.execSync(stmt);
      } catch (_) {
        // column already exists — ignore
      }
    }

    const existing = db.getFirstSync<{ id: number }>("SELECT id FROM budgets WHERE id = 1");
    if (!existing) {
      db.runSync(
        "INSERT INTO budgets (id, total_amount, category_limits) VALUES (1, 1500, ?)",
        [DEFAULT_BUDGET_JSON]
      );
    }
  } catch (err) {
    console.warn("initDatabase error:", err);
    _isWebFallback = true;
  }
}
