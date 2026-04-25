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
import { CATEGORIES, SavingsGoal, useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const {
    budget,
    savingsGoals,
    templates,
    pin,
    updateBudget,
    addSavingsGoal,
    updateSavingsGoal,
    deleteSavingsGoal,
    deleteTemplate,
    setPin,
    exportCSV,
  } = useApp();

  const [showBudget, setShowBudget] = useState(false);
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [showPinForm, setShowPinForm] = useState(false);
  const [budgetInput, setBudgetInput] = useState(budget.totalAmount.toString());
  const [catInputs, setCatInputs] = useState<Record<string, string>>(
    Object.fromEntries(CATEGORIES.map((c) => [c, budget.categoryLimits[c].toString()]))
  );
  const [goalName, setGoalName] = useState("");
  const [goalTarget, setGoalTarget] = useState("");
  const [goalDeadline, setGoalDeadline] = useState("");
  const [pinInput, setPinInput] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [editGoal, setEditGoal] = useState<SavingsGoal | undefined>();
  const [goalAddAmount, setGoalAddAmount] = useState("");

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  function saveBudget() {
    const total = parseFloat(budgetInput);
    if (!total || total <= 0) return;
    const categoryLimits = { ...budget.categoryLimits };
    CATEGORIES.forEach((c) => {
      const v = parseFloat(catInputs[c]);
      if (!isNaN(v) && v >= 0) categoryLimits[c] = v;
    });
    updateBudget({ totalAmount: total, categoryLimits });
    setShowBudget(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  function saveGoal() {
    const target = parseFloat(goalTarget);
    if (!goalName.trim() || !target || target <= 0) return;
    if (editGoal) {
      updateSavingsGoal(editGoal.id, {
        name: goalName.trim(),
        targetAmount: target,
        deadline: goalDeadline || undefined,
      });
    } else {
      addSavingsGoal({
        name: goalName.trim(),
        targetAmount: target,
        currentAmount: 0,
        deadline: goalDeadline || undefined,
      });
    }
    setGoalName("");
    setGoalTarget("");
    setGoalDeadline("");
    setEditGoal(undefined);
    setShowGoalForm(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  function addFundsToGoal(goal: SavingsGoal) {
    const amount = parseFloat(goalAddAmount);
    if (!amount || amount <= 0) return;
    updateSavingsGoal(goal.id, {
      currentAmount: Math.min(goal.currentAmount + amount, goal.targetAmount),
    });
    setGoalAddAmount("");
    setEditGoal(undefined);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  function savePin() {
    if (pinInput.length !== 4) return;
    if (pinInput !== confirmPin) {
      Alert.alert("PINs do not match");
      return;
    }
    setPin(pinInput);
    setPinInput("");
    setConfirmPin("");
    setShowPinForm(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  function removePin() {
    setPin(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }

  const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: "row", alignItems: "flex-end",
      paddingTop: topPad + 12, paddingHorizontal: 16, paddingBottom: 12,
      gap: 12, backgroundColor: colors.background,
    },
    backBtn: { padding: 2 },
    title: { fontSize: 26, fontFamily: "Inter_700Bold", color: colors.foreground },
    section: { paddingHorizontal: 16, marginTop: 24 },
    sectionLabel: {
      color: colors.mutedForeground, fontSize: 11,
      fontFamily: "Inter_600SemiBold", letterSpacing: 1, marginBottom: 8,
    },
    row: {
      flexDirection: "row", alignItems: "center",
      backgroundColor: colors.card, borderRadius: 14, padding: 16, marginBottom: 8, gap: 12,
    },
    rowIcon: {
      width: 36, height: 36, borderRadius: 10,
      backgroundColor: colors.secondary, alignItems: "center", justifyContent: "center",
    },
    rowInfo: { flex: 1 },
    rowTitle: { fontSize: 15, fontFamily: "Inter_500Medium", color: colors.foreground },
    rowSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: colors.mutedForeground, marginTop: 2 },
    goalCard: {
      backgroundColor: colors.card, borderRadius: 14, padding: 14,
      marginBottom: 8, gap: 6,
    },
    goalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    goalName: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: colors.foreground },
    goalActions: { flexDirection: "row", gap: 8 },
    goalProgress: { fontSize: 13, fontFamily: "Inter_400Regular", color: colors.mutedForeground },
    goalBar: { height: 6, backgroundColor: colors.muted, borderRadius: 3, overflow: "hidden" },
    goalFill: { height: 6, backgroundColor: colors.primary, borderRadius: 3 },
    addFundRow: { flexDirection: "row", gap: 8, marginTop: 4 },
    fundInput: {
      flex: 1, backgroundColor: colors.input, borderRadius: 10, padding: 10,
      color: colors.foreground, fontFamily: "Inter_400Regular", fontSize: 14,
    },
    fundBtn: {
      backgroundColor: colors.primary, borderRadius: 10, paddingHorizontal: 16, justifyContent: "center",
    },
    fundBtnText: { color: colors.primaryForeground, fontFamily: "Inter_600SemiBold", fontSize: 14 },
    tmplRow: {
      flexDirection: "row", alignItems: "center",
      backgroundColor: colors.card, borderRadius: 14, padding: 14,
      marginBottom: 8, gap: 12,
    },
    tmplInfo: { flex: 1 },
    tmplName: { fontSize: 14, fontFamily: "Inter_500Medium", color: colors.foreground },
    tmplSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: colors.mutedForeground },
    addBtn: {
      flexDirection: "row", alignItems: "center", justifyContent: "center",
      gap: 8, backgroundColor: colors.secondary, borderRadius: 14,
      padding: 14, marginBottom: 8,
    },
    addBtnText: { fontSize: 14, fontFamily: "Inter_500Medium", color: colors.foreground },
    exportBtn: {
      flexDirection: "row", alignItems: "center", justifyContent: "center",
      gap: 8, backgroundColor: colors.accent, borderRadius: 14,
      padding: 14,
    },
    exportBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: colors.accentForeground },
    backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)" },
    modal: {
      backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24,
      padding: 20, paddingBottom: insets.bottom + 20, gap: 14,
    },
    modalHandle: {
      width: 36, height: 4, backgroundColor: colors.border,
      borderRadius: 2, alignSelf: "center", marginBottom: 4,
    },
    modalTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: colors.foreground },
    modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    label: { fontSize: 12, fontFamily: "Inter_500Medium", color: colors.mutedForeground, textTransform: "uppercase", letterSpacing: 0.8 },
    input: {
      backgroundColor: colors.input, borderRadius: 12, padding: 14,
      color: colors.foreground, fontFamily: "Inter_400Regular", fontSize: 15,
    },
    catRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
    catLabel: { fontSize: 14, fontFamily: "Inter_400Regular", color: colors.foreground },
    catInput: {
      backgroundColor: colors.input, borderRadius: 10, padding: 10,
      color: colors.foreground, fontFamily: "Inter_400Regular", fontSize: 14,
      width: 90, textAlign: "right",
    },
    submitBtn: { backgroundColor: colors.primary, borderRadius: 14, padding: 16, alignItems: "center" },
    submitText: { fontSize: 16, fontFamily: "Inter_700Bold", color: colors.primaryForeground },
  });

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={s.title}>Settings</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottomPad + 20 }}
      >
        <View style={s.section}>
          <Text style={s.sectionLabel}>Budget</Text>
          <TouchableOpacity style={s.row} onPress={() => setShowBudget(true)}>
            <View style={s.rowIcon}>
              <Ionicons name="wallet-outline" size={18} color={colors.primary} />
            </View>
            <View style={s.rowInfo}>
              <Text style={s.rowTitle}>Monthly Budget</Text>
              <Text style={s.rowSub}>${budget.totalAmount}/month</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>

        <View style={s.section}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <Text style={s.sectionLabel}>Savings Goals</Text>
            <TouchableOpacity onPress={() => { setEditGoal(undefined); setGoalName(""); setGoalTarget(""); setGoalDeadline(""); setShowGoalForm(true); }}>
              <Text style={{ color: colors.primary, fontSize: 13, fontFamily: "Inter_500Medium" }}>+ Add</Text>
            </TouchableOpacity>
          </View>
          {savingsGoals.map((g) => {
            const pct = g.targetAmount > 0 ? (g.currentAmount / g.targetAmount) * 100 : 0;
            return (
              <View key={g.id} style={s.goalCard}>
                <View style={s.goalHeader}>
                  <Text style={s.goalName}>{g.name}</Text>
                  <View style={s.goalActions}>
                    <TouchableOpacity onPress={() => { setEditGoal(g); setGoalName(g.name); setGoalTarget(g.targetAmount.toString()); setGoalDeadline(g.deadline ?? ""); setShowGoalForm(true); }}>
                      <Ionicons name="pencil-outline" size={16} color={colors.accent} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => deleteSavingsGoal(g.id)}>
                      <Ionicons name="trash-outline" size={16} color={colors.destructive} />
                    </TouchableOpacity>
                  </View>
                </View>
                <Text style={s.goalProgress}>
                  ${g.currentAmount.toFixed(0)} of ${g.targetAmount.toFixed(0)} ({Math.round(pct)}%)
                  {g.deadline && ` · Due ${g.deadline}`}
                </Text>
                <View style={s.goalBar}>
                  <View style={[s.goalFill, { width: `${Math.min(pct, 100)}%` as DimensionValue }]} />
                </View>
                <View style={s.addFundRow}>
                  <TextInput
                    style={s.fundInput}
                    placeholder="Add amount"
                    placeholderTextColor={colors.mutedForeground}
                    keyboardType="decimal-pad"
                    value={editGoal?.id === g.id ? goalAddAmount : ""}
                    onFocus={() => setEditGoal(g)}
                    onChangeText={setGoalAddAmount}
                  />
                  <TouchableOpacity style={s.fundBtn} onPress={() => addFundsToGoal(g)}>
                    <Text style={s.fundBtnText}>Add</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
          {savingsGoals.length === 0 && (
            <TouchableOpacity style={s.addBtn} onPress={() => { setEditGoal(undefined); setGoalName(""); setGoalTarget(""); setGoalDeadline(""); setShowGoalForm(true); }}>
              <Ionicons name="add-circle-outline" size={18} color={colors.mutedForeground} />
              <Text style={s.addBtnText}>Add savings goal</Text>
            </TouchableOpacity>
          )}
        </View>

        {templates.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionLabel}>Quick Add Templates</Text>
            {templates.map((t) => (
              <View key={t.id} style={s.tmplRow}>
                <View style={s.tmplInfo}>
                  <Text style={s.tmplName}>{t.name}</Text>
                  <Text style={s.tmplSub}>${t.amount} · {t.category}</Text>
                </View>
                <TouchableOpacity onPress={() => deleteTemplate(t.id)}>
                  <Ionicons name="trash-outline" size={16} color={colors.destructive} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        <View style={s.section}>
          <Text style={s.sectionLabel}>Security</Text>
          <TouchableOpacity style={s.row} onPress={() => setShowPinForm(true)}>
            <View style={s.rowIcon}>
              <Ionicons name="lock-closed-outline" size={18} color={colors.accent} />
            </View>
            <View style={s.rowInfo}>
              <Text style={s.rowTitle}>PIN Lock</Text>
              <Text style={s.rowSub}>{pin ? "Enabled — tap to change" : "Not set"}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
          </TouchableOpacity>
          {pin && (
            <TouchableOpacity style={s.row} onPress={removePin}>
              <View style={[s.rowIcon, { backgroundColor: colors.destructive + "22" }]}>
                <Ionicons name="lock-open-outline" size={18} color={colors.destructive} />
              </View>
              <Text style={[s.rowTitle, { color: colors.destructive }]}>Remove PIN</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={s.section}>
          <Text style={s.sectionLabel}>Data</Text>
          <TouchableOpacity style={s.exportBtn} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); exportCSV(); }}>
            <Ionicons name="share-outline" size={18} color={colors.accentForeground} />
            <Text style={s.exportBtnText}>Export CSV</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal visible={showBudget} animationType="slide" transparent onRequestClose={() => setShowBudget(false)}>
        <Pressable style={s.backdrop} onPress={() => setShowBudget(false)} />
        <ScrollView style={s.modal} contentContainerStyle={{ gap: 14 }}>
          <View style={s.modalHandle} />
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>Monthly Budget</Text>
            <TouchableOpacity onPress={() => setShowBudget(false)}>
              <Ionicons name="close" size={22} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>
          <Text style={s.label}>Total Budget</Text>
          <TextInput style={s.input} value={budgetInput} onChangeText={setBudgetInput}
            keyboardType="decimal-pad" placeholder="1500" placeholderTextColor={colors.mutedForeground} />
          <Text style={s.label}>Category Limits</Text>
          {CATEGORIES.map((cat) => (
            <View key={cat} style={s.catRow}>
              <Text style={s.catLabel}>{cat}</Text>
              <TextInput
                style={s.catInput}
                value={catInputs[cat]}
                onChangeText={(v) => setCatInputs((p) => ({ ...p, [cat]: v }))}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor={colors.mutedForeground}
              />
            </View>
          ))}
          <TouchableOpacity style={s.submitBtn} onPress={saveBudget}>
            <Text style={s.submitText}>Save Budget</Text>
          </TouchableOpacity>
          <View style={{ height: 20 }} />
        </ScrollView>
      </Modal>

      <Modal visible={showGoalForm} animationType="slide" transparent onRequestClose={() => setShowGoalForm(false)}>
        <Pressable style={s.backdrop} onPress={() => setShowGoalForm(false)} />
        <View style={s.modal}>
          <View style={s.modalHandle} />
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>{editGoal ? "Edit Goal" : "New Savings Goal"}</Text>
            <TouchableOpacity onPress={() => setShowGoalForm(false)}>
              <Ionicons name="close" size={22} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>
          <Text style={s.label}>Goal Name</Text>
          <TextInput style={s.input} value={goalName} onChangeText={setGoalName}
            placeholder="Emergency Fund" placeholderTextColor={colors.mutedForeground} autoFocus />
          <Text style={s.label}>Target Amount ($)</Text>
          <TextInput style={s.input} value={goalTarget} onChangeText={setGoalTarget}
            keyboardType="decimal-pad" placeholder="1000" placeholderTextColor={colors.mutedForeground} />
          <Text style={s.label}>Deadline (YYYY-MM-DD, optional)</Text>
          <TextInput style={s.input} value={goalDeadline} onChangeText={setGoalDeadline}
            placeholder="2025-12-31" placeholderTextColor={colors.mutedForeground} />
          <TouchableOpacity style={s.submitBtn} onPress={saveGoal}>
            <Text style={s.submitText}>{editGoal ? "Update" : "Create Goal"}</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      <Modal visible={showPinForm} animationType="slide" transparent onRequestClose={() => setShowPinForm(false)}>
        <Pressable style={s.backdrop} onPress={() => setShowPinForm(false)} />
        <View style={s.modal}>
          <View style={s.modalHandle} />
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>Set PIN Lock</Text>
            <TouchableOpacity onPress={() => setShowPinForm(false)}>
              <Ionicons name="close" size={22} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>
          <Text style={s.label}>New PIN (4 digits)</Text>
          <TextInput style={s.input} value={pinInput} onChangeText={setPinInput}
            keyboardType="number-pad" maxLength={4} secureTextEntry
            placeholder="••••" placeholderTextColor={colors.mutedForeground} autoFocus />
          <Text style={s.label}>Confirm PIN</Text>
          <TextInput style={s.input} value={confirmPin} onChangeText={setConfirmPin}
            keyboardType="number-pad" maxLength={4} secureTextEntry
            placeholder="••••" placeholderTextColor={colors.mutedForeground} />
          <TouchableOpacity style={s.submitBtn} onPress={savePin}>
            <Text style={s.submitText}>Set PIN</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}
