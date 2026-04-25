import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  DimensionValue,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
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
  Loan,
  LoanType,
  useApp,
} from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import { fmt, fmtFull, fmtHidden } from "@/utils/currency";

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good Morning";
  if (h < 17) return "Good Afternoon";
  return "Good Evening";
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const {
    budget,
    accounts,
    loans,
    savingsGoals,
    streak,
    userName,
    getMonthExpenses,
    getCategoryTotal,
    getTotalSpent,
    getTodaySpent,
    getTotalBalance,
    getInsights,
    deleteExpense,
    addLoan,
    updateLoan,
    deleteLoan,
    isPrivacyMode,
    togglePrivacyMode,
  } = useApp();

  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [editExpense, setEditExpense] = useState<Expense | undefined>();
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [showLoanForm, setShowLoanForm] = useState(false);
  const [editLoan, setEditLoan] = useState<Loan | undefined>();
  const [loanPerson, setLoanPerson] = useState("");
  const [loanAmount, setLoanAmount] = useState("");
  const [loanType, setLoanType] = useState<LoanType>("lent");
  const [loanNote, setLoanNote] = useState("");

  const monthExpenses = getMonthExpenses();
  const totalSpent = getTotalSpent();
  const todaySpent = getTodaySpent();
  const totalBalance = getTotalBalance();
  const remaining = budget.totalAmount - totalSpent;
  const pct = budget.totalAmount > 0 ? (totalSpent / budget.totalAmount) * 100 : 0;
  const insights = getInsights();
  const activeLoans = loans.filter((l) => !l.settled);

  const filtered = searchQuery.trim()
    ? monthExpenses.filter(
        (e) =>
          e.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          e.category.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : monthExpenses.slice().reverse().slice(0, 15);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  function openLoanForm(loan?: Loan) {
    if (loan) {
      setEditLoan(loan);
      setLoanPerson(loan.personName);
      setLoanAmount(loan.amount.toString());
      setLoanType(loan.type);
      setLoanNote(loan.note);
    } else {
      setEditLoan(undefined);
      setLoanPerson("");
      setLoanAmount("");
      setLoanType("lent");
      setLoanNote("");
    }
    setShowLoanForm(true);
  }

  function saveLoan() {
    const amt = parseFloat(loanAmount);
    if (!loanPerson.trim() || isNaN(amt) || amt <= 0) {
      Alert.alert("Error", "Please enter a valid person name and amount.");
      return;
    }
    const loanData = {
      personName: loanPerson.trim(),
      amount: amt,
      type: loanType,
      date: today(),
      note: loanNote.trim(),
      settled: false,
    };
    if (editLoan) {
      updateLoan(editLoan.id, loanData);
    } else {
      addLoan(loanData);
    }
    setShowLoanForm(false);
  }

  const amtDisplay = (val: number) => isPrivacyMode ? fmtHidden() : fmt(val);
  const amtFullDisplay = (val: number) => isPrivacyMode ? fmtHidden() : fmtFull(val);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 12, backgroundColor: colors.background }]}>
        <View style={{ flex: 1 }}>
          {showSearch ? (
            <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons name="search" size={16} color={colors.mutedForeground} />
              <TextInput
                style={[styles.searchInput, { color: colors.foreground }]}
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search expenses..."
                placeholderTextColor={colors.mutedForeground}
                autoFocus
              />
              <TouchableOpacity onPress={() => { setShowSearch(false); setSearchQuery(""); }}>
                <Ionicons name="close" size={16} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <Text style={[styles.greeting, { color: colors.mutedForeground }]}>
                {getGreeting()}{userName ? `, ${userName}` : ""} 👋
              </Text>
              <Text style={[styles.appTitle, { color: colors.foreground }]}>Budget</Text>
            </>
          )}
        </View>
        <View style={styles.headerRight}>
          {streak >= 3 && (
            <View style={[styles.streakBadge, { backgroundColor: colors.primary + "20" }]}>
              <Ionicons name="flame" size={14} color={colors.primary} />
              <Text style={[styles.streakText, { color: colors.primary }]}>{streak}</Text>
            </View>
          )}
          <TouchableOpacity onPress={togglePrivacyMode}>
            <Ionicons
              name={isPrivacyMode ? "eye-off-outline" : "eye-outline"}
              size={22}
              color={isPrivacyMode ? colors.primary : colors.foreground}
            />
          </TouchableOpacity>
          {!showSearch && (
            <TouchableOpacity onPress={() => setShowSearch(true)}>
              <Ionicons name="search-outline" size={22} color={colors.foreground} />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={() => router.push("/settings")}>
            <Ionicons name="settings-outline" size={22} color={colors.foreground} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: bottomPad + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {accounts.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.accountsScroll}>
            <View style={[styles.totalBalanceCard, { backgroundColor: colors.card }]}>
              <Text style={[styles.acctLabel, { color: colors.mutedForeground }]}>Total Balance</Text>
              <Text style={[styles.totalBalanceAmount, { color: colors.primary }]}>
                {amtDisplay(totalBalance)}
              </Text>
            </View>
            {accounts.map((a) => (
              <View key={a.id} style={[styles.acctCard, { backgroundColor: colors.card, borderColor: a.color + "40" }]}>
                <View style={[styles.acctIconCircle, { backgroundColor: a.color + "20" }]}>
                  <Ionicons name={a.icon as "card-outline"} size={18} color={a.color} />
                </View>
                <Text style={[styles.acctName, { color: colors.mutedForeground }]}>{a.name}</Text>
                <Text style={[styles.acctBalance, { color: a.balance < 0 ? colors.destructive : colors.foreground }]}>
                  {amtDisplay(a.balance)}
                </Text>
              </View>
            ))}
          </ScrollView>
        )}

        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <BudgetRing percentage={pct} spent={totalSpent} remaining={remaining} />

          <View style={[styles.budgetRow, { borderTopColor: colors.border }]}>
            <Text style={[styles.budgetLabel, { color: colors.mutedForeground }]}>Monthly Budget</Text>
            <Text style={[styles.budgetValue, { color: colors.foreground }]}>
              {amtDisplay(budget.totalAmount)}
            </Text>
          </View>

          <View style={[styles.todayRow, { borderTopColor: colors.border }]}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Ionicons name="today-outline" size={14} color={colors.mutedForeground} />
              <Text style={[styles.budgetLabel, { color: colors.mutedForeground }]}>Today's Spending</Text>
            </View>
            <Text style={[styles.budgetValue, { color: todaySpent > 0 ? colors.accent : colors.mutedForeground }]}>
              {amtDisplay(todaySpent)}
            </Text>
          </View>
        </View>

        {insights.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.insightScroll}>
            {insights.map((insight, i) => (
              <View key={i} style={[styles.insightChip, { backgroundColor: colors.card }]}>
                <Ionicons name="bulb-outline" size={13} color={colors.accent} />
                <Text style={[styles.insightText, { color: colors.foreground }]}>{insight}</Text>
              </View>
            ))}
          </ScrollView>
        )}

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Given / Taken</Text>
          <TouchableOpacity
            style={[styles.addLoanBtn, { backgroundColor: colors.primary + "18" }]}
            onPress={() => openLoanForm()}
          >
            <Ionicons name="add" size={15} color={colors.primary} />
            <Text style={[styles.addLoanText, { color: colors.primary }]}>Add</Text>
          </TouchableOpacity>
        </View>

        {activeLoans.length === 0 ? (
          <View style={[styles.emptyLoans, { backgroundColor: colors.card }]}>
            <Text style={{ fontSize: 20 }}>🤝</Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No pending money with anyone</Text>
          </View>
        ) : (
          activeLoans.map((loan) => (
            <Pressable
              key={loan.id}
              style={[
                styles.loanCard,
                {
                  backgroundColor: colors.card,
                  borderLeftColor: loan.type === "lent" ? "#22c55e" : "#f59e0b",
                },
              ]}
              onLongPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                Alert.alert(
                  loan.personName,
                  "What do you want to do?",
                  [
                    { text: "Mark Settled", onPress: () => updateLoan(loan.id, { settled: true }) },
                    { text: "Edit", onPress: () => openLoanForm(loan) },
                    { text: "Delete", style: "destructive", onPress: () => deleteLoan(loan.id) },
                    { text: "Cancel", style: "cancel" },
                  ]
                );
              }}
            >
              <View style={[styles.loanTypeBadge, { backgroundColor: loan.type === "lent" ? "#22c55e22" : "#f59e0b22" }]}>
                <Text style={[styles.loanTypeText, { color: loan.type === "lent" ? "#22c55e" : "#f59e0b" }]}>
                  {loan.type === "lent" ? "GIVEN" : "TAKEN"}
                </Text>
              </View>
              <View style={styles.loanInfo}>
                <Text style={[styles.loanPerson, { color: colors.foreground }]}>{loan.personName}</Text>
                {loan.note ? (
                  <Text style={[styles.loanNote, { color: colors.mutedForeground }]} numberOfLines={1}>{loan.note}</Text>
                ) : null}
                <Text style={[styles.loanDate, { color: colors.mutedForeground }]}>{loan.date}</Text>
              </View>
              <Text style={[styles.loanAmount, { color: loan.type === "lent" ? "#22c55e" : "#f59e0b" }]}>
                {isPrivacyMode ? fmtHidden() : fmtFull(loan.amount)}
              </Text>
            </Pressable>
          ))
        )}

        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Spending</Text>
        {CATEGORIES.map((cat) => {
          const spent = getCategoryTotal(cat);
          const limit = budget.categoryLimits[cat];
          const catPct: DimensionValue = limit > 0 ? `${Math.min((spent / limit) * 100, 100)}%` : "0%";
          const overBudget = limit > 0 && spent > limit;
          return (
            <View key={cat} style={[styles.catRow, { backgroundColor: colors.card }]}>
              <View style={[styles.catDot, { backgroundColor: CATEGORY_COLORS[cat as Category] }]} />
              <View style={styles.catInfo}>
                <View style={styles.catTop}>
                  <Text style={[styles.catName, { color: colors.foreground }]}>{cat}</Text>
                  <Text style={[styles.catAmount, { color: overBudget ? colors.destructive : colors.mutedForeground }]}>
                    {isPrivacyMode ? "****" : `${fmt(spent)} / ${fmt(limit)}`}
                  </Text>
                </View>
                <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: catPct,
                        backgroundColor: overBudget ? colors.destructive : CATEGORY_COLORS[cat as Category],
                      },
                    ]}
                  />
                </View>
              </View>
            </View>
          );
        })}

        {savingsGoals.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Savings Goals</Text>
            {savingsGoals.map((g) => {
              const gpct: DimensionValue =
                g.targetAmount > 0 ? `${Math.min((g.currentAmount / g.targetAmount) * 100, 100)}%` : "0%";
              return (
                <View key={g.id} style={[styles.goalCard, { backgroundColor: colors.card }]}>
                  <View style={styles.goalHeader}>
                    <Text style={[styles.goalName, { color: colors.foreground }]}>{g.name}</Text>
                    <Text style={[styles.goalAmount, { color: colors.primary }]}>
                      {isPrivacyMode ? "****" : `${fmt(g.currentAmount)} / ${fmt(g.targetAmount)}`}
                    </Text>
                  </View>
                  <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
                    <View style={[styles.progressFill, { width: gpct, backgroundColor: colors.primary }]} />
                  </View>
                  {g.deadline && (
                    <Text style={[styles.goalDeadline, { color: colors.mutedForeground }]}>
                      Due {g.deadline}
                    </Text>
                  )}
                </View>
              );
            })}
          </>
        )}

        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
          {searchQuery ? "Results" : "Recent"}
        </Text>
        {filtered.length === 0 ? (
          <View style={[styles.emptyState, { backgroundColor: colors.card }]}>
            <Ionicons name="receipt-outline" size={32} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              {searchQuery ? "No matching expenses" : "No expenses yet this month"}
            </Text>
          </View>
        ) : (
          filtered.map((e) => {
            const srcAccount = accounts.find((a) => a.id === e.sourceId);
            return (
              <Pressable
                key={e.id}
                style={[styles.expenseItem, { backgroundColor: colors.card }]}
                onLongPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  setEditExpense(e);
                  setShowExpenseForm(true);
                }}
              >
                <View style={[styles.expenseIcon, { backgroundColor: CATEGORY_COLORS[e.category as Category] + "22" }]}>
                  <Ionicons name="receipt-outline" size={16} color={CATEGORY_COLORS[e.category as Category]} />
                </View>
                <View style={styles.expenseInfo}>
                  <Text style={[styles.expenseDesc, { color: colors.foreground }]} numberOfLines={1}>
                    {e.description || e.category}
                  </Text>
                  <View style={{ flexDirection: "row", gap: 6, alignItems: "center" }}>
                    <Text style={[styles.expenseMeta, { color: colors.mutedForeground }]}>{e.date}</Text>
                    {srcAccount && (
                      <>
                        <Text style={[styles.expenseMeta, { color: colors.mutedForeground }]}>·</Text>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                          <Ionicons name={srcAccount.icon as "card-outline"} size={10} color={srcAccount.color} />
                          <Text style={[styles.expenseMeta, { color: srcAccount.color }]}>{srcAccount.name}</Text>
                        </View>
                      </>
                    )}
                  </View>
                </View>
                <View style={styles.expenseRight}>
                  <Text style={[styles.expenseAmount, { color: colors.foreground }]}>
                    {isPrivacyMode ? fmtHidden() : `-${fmtFull(e.amount)}`}
                  </Text>
                  <View style={{ flexDirection: "row", gap: 4 }}>
                    {e.isRecurring && <Ionicons name="repeat" size={11} color={colors.mutedForeground} />}
                    <Text style={[styles.expenseCategory, { backgroundColor: CATEGORY_COLORS[e.category as Category] + "22", color: CATEGORY_COLORS[e.category as Category] }]}>
                      {e.category}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    deleteExpense(e.id);
                  }}
                >
                  <Ionicons name="trash-outline" size={15} color={colors.destructive} />
                </TouchableOpacity>
              </Pressable>
            );
          })
        )}
      </ScrollView>

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary, bottom: bottomPad + 90 }]}
        onPress={() => { setEditExpense(undefined); setShowExpenseForm(true); }}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={30} color={colors.background} />
      </TouchableOpacity>

      <ExpenseForm
        visible={showExpenseForm}
        onClose={() => { setShowExpenseForm(false); setEditExpense(undefined); }}
        editExpense={editExpense}
      />

      <Modal visible={showLoanForm} transparent animationType="slide" onRequestClose={() => setShowLoanForm(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>
              {editLoan ? "Edit" : "Add"} Given / Taken
            </Text>

            <View style={styles.loanTypeRow}>
              <TouchableOpacity
                style={[styles.typeBtn, loanType === "lent" && { backgroundColor: "#22c55e22", borderColor: "#22c55e" }]}
                onPress={() => setLoanType("lent")}
              >
                <Text style={[styles.typeBtnText, { color: loanType === "lent" ? "#22c55e" : colors.mutedForeground }]}>
                  💸 I Gave
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.typeBtn, loanType === "borrowed" && { backgroundColor: "#f59e0b22", borderColor: "#f59e0b" }]}
                onPress={() => setLoanType("borrowed")}
              >
                <Text style={[styles.typeBtnText, { color: loanType === "borrowed" ? "#f59e0b" : colors.mutedForeground }]}>
                  🤲 I Took
                </Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={[styles.modalInput, { backgroundColor: colors.background, color: colors.foreground, borderColor: colors.border }]}
              value={loanPerson}
              onChangeText={setLoanPerson}
              placeholder="Person's name"
              placeholderTextColor={colors.mutedForeground}
            />
            <TextInput
              style={[styles.modalInput, { backgroundColor: colors.background, color: colors.foreground, borderColor: colors.border }]}
              value={loanAmount}
              onChangeText={setLoanAmount}
              placeholder="Amount (₹)"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="numeric"
            />
            <TextInput
              style={[styles.modalInput, { backgroundColor: colors.background, color: colors.foreground, borderColor: colors.border }]}
              value={loanNote}
              onChangeText={setLoanNote}
              placeholder="Note (optional)"
              placeholderTextColor={colors.mutedForeground}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.border }]}
                onPress={() => setShowLoanForm(false)}
              >
                <Text style={[styles.modalBtnText, { color: colors.foreground }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.primary }]}
                onPress={saveLoan}
              >
                <Text style={[styles.modalBtnText, { color: "#fff" }]}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  greeting: { fontSize: 13, fontFamily: "Inter_400Regular", marginBottom: 2 },
  appTitle: { fontSize: 28, fontFamily: "Inter_700Bold" },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 12, paddingBottom: 4 },
  streakBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12,
  },
  streakText: { fontSize: 13, fontFamily: "Inter_700Bold" },
  searchBar: {
    flexDirection: "row", alignItems: "center", gap: 8,
    borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10,
    borderWidth: 1, marginBottom: 4,
  },
  searchInput: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 4, gap: 12 },
  accountsScroll: { flexGrow: 0, marginBottom: 4 },
  totalBalanceCard: {
    borderRadius: 16, padding: 16, marginRight: 10, minWidth: 130,
    justifyContent: "center",
  },
  acctLabel: { fontSize: 11, fontFamily: "Inter_500Medium", marginBottom: 4 },
  totalBalanceAmount: { fontSize: 22, fontFamily: "Inter_700Bold" },
  acctCard: {
    borderRadius: 16, padding: 14, marginRight: 10, minWidth: 110,
    borderWidth: 1, gap: 6,
  },
  acctIconCircle: {
    width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center",
  },
  acctName: { fontSize: 11, fontFamily: "Inter_500Medium" },
  acctBalance: { fontSize: 16, fontFamily: "Inter_700Bold" },
  card: { borderRadius: 20, padding: 20, alignItems: "center", gap: 12 },
  budgetRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    width: "100%", paddingTop: 12, borderTopWidth: 1,
  },
  todayRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    width: "100%", paddingTop: 10, borderTopWidth: 1,
  },
  budgetLabel: { fontSize: 13, fontFamily: "Inter_400Regular" },
  budgetValue: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  insightScroll: { flexGrow: 0 },
  insightChip: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14, marginRight: 10,
    maxWidth: 260,
  },
  insightText: { fontSize: 13, fontFamily: "Inter_400Regular", flexShrink: 1 },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 4 },
  sectionTitle: { fontSize: 17, fontFamily: "Inter_700Bold", marginTop: 4 },
  addLoanBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  addLoanText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  emptyLoans: { borderRadius: 14, padding: 20, alignItems: "center", gap: 6, flexDirection: "row", justifyContent: "center" },
  loanCard: {
    flexDirection: "row", alignItems: "center", borderRadius: 14, padding: 14, gap: 12,
    borderLeftWidth: 3,
  },
  loanTypeBadge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  loanTypeText: { fontSize: 10, fontFamily: "Inter_700Bold" },
  loanInfo: { flex: 1, gap: 2 },
  loanPerson: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  loanNote: { fontSize: 12, fontFamily: "Inter_400Regular" },
  loanDate: { fontSize: 11, fontFamily: "Inter_400Regular" },
  loanAmount: { fontSize: 15, fontFamily: "Inter_700Bold" },
  catRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    borderRadius: 14, padding: 14,
  },
  catDot: { width: 10, height: 10, borderRadius: 5 },
  catInfo: { flex: 1, gap: 6 },
  catTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  catName: { fontSize: 14, fontFamily: "Inter_500Medium" },
  catAmount: { fontSize: 13, fontFamily: "Inter_400Regular" },
  progressTrack: { height: 4, borderRadius: 2, overflow: "hidden" },
  progressFill: { height: 4, borderRadius: 2 },
  goalCard: { borderRadius: 14, padding: 14, gap: 8 },
  goalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  goalName: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  goalAmount: { fontSize: 13, fontFamily: "Inter_500Medium" },
  goalDeadline: { fontSize: 11, fontFamily: "Inter_400Regular" },
  emptyState: {
    borderRadius: 14, padding: 32, alignItems: "center", gap: 8,
  },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  expenseItem: {
    flexDirection: "row", alignItems: "center", borderRadius: 14, padding: 14, gap: 12,
  },
  expenseIcon: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  expenseInfo: { flex: 1, gap: 3 },
  expenseDesc: { fontSize: 14, fontFamily: "Inter_500Medium" },
  expenseMeta: { fontSize: 11, fontFamily: "Inter_400Regular" },
  expenseRight: { alignItems: "flex-end", gap: 4 },
  expenseAmount: { fontSize: 15, fontFamily: "Inter_700Bold" },
  expenseCategory: {
    fontSize: 10, fontFamily: "Inter_500Medium",
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6,
  },
  deleteBtn: { padding: 6 },
  fab: {
    position: "absolute", right: 20,
    width: 58, height: 58, borderRadius: 29,
    alignItems: "center", justifyContent: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25, shadowRadius: 8, elevation: 6,
  },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  modalBox: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, gap: 14 },
  modalTitle: { fontSize: 18, fontFamily: "Inter_700Bold", marginBottom: 4 },
  loanTypeRow: { flexDirection: "row", gap: 10 },
  typeBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: "center",
    borderWidth: 1, borderColor: "transparent",
  },
  typeBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  modalInput: {
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, fontFamily: "Inter_400Regular", borderWidth: 1,
  },
  modalButtons: { flexDirection: "row", gap: 10, marginTop: 4 },
  modalBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: "center" },
  modalBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
});
