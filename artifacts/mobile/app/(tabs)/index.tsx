import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { BudgetRing } from "@/components/BudgetRing";
import { ExpenseForm } from "@/components/ExpenseForm";
import {
  CATEGORIES,
  CATEGORY_COLORS,
  Category,
  Expense,
  useApp,
} from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const {
    budget,
    savingsGoals,
    streak,
    getMonthExpenses,
    getCategoryTotal,
    getTotalSpent,
    getInsights,
    deleteExpense,
  } = useApp();

  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [editExpense, setEditExpense] = useState<Expense | undefined>();
  const [searchQuery, setSearchQuery] = useState("");

  const monthExpenses = getMonthExpenses();
  const totalSpent = getTotalSpent();
  const remaining = budget.totalAmount - totalSpent;
  const pct = budget.totalAmount > 0 ? (totalSpent / budget.totalAmount) * 100 : 0;
  const insights = getInsights();

  const filtered = searchQuery.trim()
    ? monthExpenses.filter(
        (e) =>
          e.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          e.category.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : monthExpenses.slice().reverse().slice(0, 15);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[styles.header, { paddingTop: topPad + 12, backgroundColor: colors.background }]}
      >
        <View>
          <Text style={[styles.greeting, { color: colors.mutedForeground }]}>
            {new Date().toLocaleString("default", { month: "long", year: "numeric" })}
          </Text>
          <Text style={[styles.appTitle, { color: colors.foreground }]}>Budget</Text>
        </View>
        <View style={styles.headerRight}>
          {streak >= 3 && (
            <View style={[styles.streakBadge, { backgroundColor: colors.primary + "20" }]}>
              <Ionicons name="flame" size={14} color={colors.primary} />
              <Text style={[styles.streakText, { color: colors.primary }]}>{streak}</Text>
            </View>
          )}
          <TouchableOpacity onPress={() => router.push("/settings")}>
            <Ionicons name="settings-outline" size={22} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottomPad + 90 }}
      >
        <View style={[styles.budgetCard, { backgroundColor: colors.card }]}>
          <BudgetRing percentage={pct} spent={totalSpent} remaining={remaining} />
          <View style={[styles.budgetTotal, { borderTopColor: colors.border }]}>
            <Text style={[styles.budgetLabel, { color: colors.mutedForeground }]}>
              Monthly Budget
            </Text>
            <Text style={[styles.budgetAmount, { color: colors.foreground }]}>
              ${budget.totalAmount.toFixed(2)}
            </Text>
          </View>
        </View>

        {insights.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.insightScroll}
          >
            {insights.map((insight, i) => (
              <View
                key={i}
                style={[styles.insightChip, { backgroundColor: colors.secondary }]}
              >
                <Ionicons
                  name="bulb-outline"
                  size={14}
                  color={colors.primary}
                  style={styles.insightIcon}
                />
                <Text style={[styles.insightText, { color: colors.foreground }]}>
                  {insight}
                </Text>
              </View>
            ))}
          </ScrollView>
        )}

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Spending</Text>
          {CATEGORIES.map((cat) => {
            const spent = getCategoryTotal(cat);
            const limit = budget.categoryLimits[cat];
            const catPct = limit > 0 ? Math.min((spent / limit) * 100, 100) : 0;
            const isOver = spent > limit && limit > 0;
            return (
              <View key={cat} style={styles.catRow}>
                <View style={[styles.catDot, { backgroundColor: CATEGORY_COLORS[cat] }]} />
                <View style={styles.catInfo}>
                  <View style={styles.catHeader}>
                    <Text style={[styles.catName, { color: colors.foreground }]}>{cat}</Text>
                    <Text
                      style={[styles.catAmount, { color: isOver ? colors.destructive : colors.foreground }]}
                    >
                      ${spent.toFixed(0)}
                      {limit > 0 && (
                        <Text style={[styles.catLimit, { color: colors.mutedForeground }]}>
                          {" "}/{" "}${limit}
                        </Text>
                      )}
                    </Text>
                  </View>
                  <View style={[styles.progressBg, { backgroundColor: colors.muted }]}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${catPct}%` as any,
                          backgroundColor: isOver ? colors.destructive : CATEGORY_COLORS[cat],
                        },
                      ]}
                    />
                  </View>
                </View>
              </View>
            );
          })}
        </View>

        {savingsGoals.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Goals</Text>
              <TouchableOpacity onPress={() => router.push("/settings")}>
                <Text style={[styles.seeAll, { color: colors.primary }]}>Manage</Text>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {savingsGoals.map((g) => {
                const gPct = g.targetAmount > 0 ? (g.currentAmount / g.targetAmount) * 100 : 0;
                return (
                  <View
                    key={g.id}
                    style={[styles.goalCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                  >
                    <Text style={[styles.goalName, { color: colors.foreground }]} numberOfLines={1}>
                      {g.name}
                    </Text>
                    <Text style={[styles.goalAmount, { color: colors.primary }]}>
                      ${g.currentAmount.toFixed(0)}
                    </Text>
                    <Text style={[styles.goalTarget, { color: colors.mutedForeground }]}>
                      of ${g.targetAmount.toFixed(0)}
                    </Text>
                    <View style={[styles.goalBar, { backgroundColor: colors.muted }]}>
                      <View
                        style={[
                          styles.goalFill,
                          { width: `${Math.min(gPct, 100)}%` as any, backgroundColor: colors.primary },
                        ]}
                      />
                    </View>
                    <Text style={[styles.goalPct, { color: colors.mutedForeground }]}>
                      {Math.round(gPct)}%
                    </Text>
                  </View>
                );
              })}
            </ScrollView>
          </View>
        )}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Recent</Text>
          </View>
          {filtered.length === 0 ? (
            <View style={[styles.empty, { borderColor: colors.border }]}>
              <Ionicons name="receipt-outline" size={28} color={colors.mutedForeground} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                No expenses yet
              </Text>
            </View>
          ) : (
            filtered.map((expense) => (
              <ExpenseRow
                key={expense.id}
                expense={expense}
                onEdit={() => { setEditExpense(expense); setShowExpenseForm(true); }}
                onDelete={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); deleteExpense(expense.id); }}
                colors={colors}
              />
            ))
          )}
        </View>
      </ScrollView>

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary, bottom: bottomPad + 80 }]}
        onPress={() => { setEditExpense(undefined); setShowExpenseForm(true); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
        testID="add-expense-fab"
      >
        <Ionicons name="add" size={28} color={colors.primaryForeground} />
      </TouchableOpacity>

      <ExpenseForm
        visible={showExpenseForm}
        onClose={() => { setShowExpenseForm(false); setEditExpense(undefined); }}
        editExpense={editExpense}
      />
    </View>
  );
}

function ExpenseRow({
  expense,
  onEdit,
  onDelete,
  colors,
}: {
  expense: Expense;
  onEdit: () => void;
  onDelete: () => void;
  colors: ReturnType<typeof useColors>;
}) {
  const [showActions, setShowActions] = useState(false);
  return (
    <Pressable
      onPress={() => setShowActions(!showActions)}
      onLongPress={onEdit}
      style={[styles.expenseRow, { borderBottomColor: colors.border }]}
    >
      <View style={[styles.expenseIcon, { backgroundColor: CATEGORY_COLORS[expense.category as Category] + "22" }]}>
        <View style={[styles.expenseDot, { backgroundColor: CATEGORY_COLORS[expense.category as Category] }]} />
      </View>
      <View style={styles.expenseInfo}>
        <Text style={[styles.expenseDesc, { color: colors.foreground }]} numberOfLines={1}>
          {expense.description || expense.category}
        </Text>
        <Text style={[styles.expenseDate, { color: colors.mutedForeground }]}>
          {expense.category} · {expense.date.slice(5)}
          {expense.isRecurring && " · Recurring"}
        </Text>
      </View>
      {showActions ? (
        <View style={styles.actions}>
          <TouchableOpacity onPress={onEdit} style={styles.actionBtn}>
            <Ionicons name="pencil" size={16} color={colors.accent} />
          </TouchableOpacity>
          <TouchableOpacity onPress={onDelete} style={styles.actionBtn}>
            <Ionicons name="trash" size={16} color={colors.destructive} />
          </TouchableOpacity>
        </View>
      ) : (
        <Text style={[styles.expenseAmount, { color: colors.destructive }]}>
          -${expense.amount.toFixed(2)}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  greeting: { fontSize: 13, fontFamily: "Inter_400Regular" },
  appTitle: { fontSize: 26, fontFamily: "Inter_700Bold", marginTop: 2 },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 12 },
  streakBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  streakText: { fontSize: 13, fontFamily: "Inter_700Bold" },
  budgetCard: {
    margin: 16,
    borderRadius: 20,
    padding: 20,
    alignItems: "center",
    gap: 12,
  },
  budgetTotal: { borderTopWidth: 1, paddingTop: 12, width: "100%", flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  budgetLabel: { fontSize: 13, fontFamily: "Inter_400Regular" },
  budgetAmount: { fontSize: 18, fontFamily: "Inter_700Bold" },
  insightScroll: { paddingHorizontal: 16, gap: 8, paddingBottom: 4 },
  insightChip: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    maxWidth: 240,
  },
  insightIcon: { marginRight: 6 },
  insightText: { fontSize: 12, fontFamily: "Inter_400Regular", flex: 1 },
  section: { paddingHorizontal: 16, marginTop: 20 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  sectionTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  seeAll: { fontSize: 13, fontFamily: "Inter_500Medium" },
  catRow: { flexDirection: "row", alignItems: "center", marginBottom: 12, gap: 10 },
  catDot: { width: 8, height: 8, borderRadius: 4, marginTop: 2 },
  catInfo: { flex: 1 },
  catHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  catName: { fontSize: 13, fontFamily: "Inter_500Medium" },
  catAmount: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  catLimit: { fontFamily: "Inter_400Regular" },
  progressBg: { height: 4, borderRadius: 2, overflow: "hidden" },
  progressFill: { height: 4, borderRadius: 2 },
  goalCard: {
    width: 130,
    borderRadius: 16,
    padding: 14,
    marginRight: 12,
    borderWidth: 1,
    gap: 4,
  },
  goalName: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  goalAmount: { fontSize: 18, fontFamily: "Inter_700Bold" },
  goalTarget: { fontSize: 11, fontFamily: "Inter_400Regular" },
  goalBar: { height: 4, borderRadius: 2, overflow: "hidden", marginTop: 6 },
  goalFill: { height: 4, borderRadius: 2 },
  goalPct: { fontSize: 11, fontFamily: "Inter_400Regular" },
  empty: { borderWidth: 1, borderStyle: "dashed", borderRadius: 12, padding: 30, alignItems: "center", gap: 8 },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  expenseRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1, gap: 12 },
  expenseIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  expenseDot: { width: 8, height: 8, borderRadius: 4 },
  expenseInfo: { flex: 1 },
  expenseDesc: { fontSize: 14, fontFamily: "Inter_500Medium" },
  expenseDate: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  expenseAmount: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  actions: { flexDirection: "row", gap: 8 },
  actionBtn: { padding: 4 },
  fab: {
    position: "absolute",
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
