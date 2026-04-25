import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  DimensionValue,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
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
    notificationPrefs,
    isPrivacyMode,
    userName,
    profilePhoto,
    updateBudget,
    addSavingsGoal,
    updateSavingsGoal,
    deleteSavingsGoal,
    deleteTemplate,
    setPin,
    exportCSV,
    updateNotificationPrefs,
    togglePrivacyMode,
    updateUserName,
    updateProfilePhoto,
  } = useApp();

  const [showBudget, setShowBudget] = useState(false);
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [showPinForm, setShowPinForm] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
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

  async function pickProfileImage() {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission needed", "Please allow access to your photos.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });
      if (!result.canceled && result.assets.length > 0) {
        updateProfilePhoto(result.assets[0].uri);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch {
      Alert.alert("Error", "Could not pick image.");
    }
  }

  function saveName() {
    const trimmed = nameInput.trim();
    if (trimmed) {
      updateUserName(trimmed);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    setEditingName(false);
  }

  const initials = userName ? userName.trim().split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase() : "?";

  const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    profileSection: {
      marginHorizontal: 16, marginTop: 20,
      backgroundColor: colors.card, borderRadius: 20, padding: 20,
      flexDirection: "row", alignItems: "center", gap: 16,
    },
    avatarWrapper: { position: "relative" },
    avatarCircle: {
      width: 64, height: 64, borderRadius: 32,
      backgroundColor: colors.primary + "22",
      alignItems: "center", justifyContent: "center",
    },
    avatarImage: { width: 64, height: 64, borderRadius: 32 },
    avatarEditBadge: {
      position: "absolute", bottom: 0, right: 0,
      width: 22, height: 22, borderRadius: 11,
      backgroundColor: colors.primary,
      alignItems: "center", justifyContent: "center",
      borderWidth: 2, borderColor: colors.card,
    },
    avatarInitials: { fontSize: 22, fontFamily: "Inter_700Bold", color: colors.primary },
    profileInfo: { flex: 1 },
    profileNameRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    profileName: { fontSize: 18, fontFamily: "Inter_600SemiBold", color: colors.foreground },
    profileSub: { fontSize: 13, fontFamily: "Inter_400Regular", color: colors.mutedForeground, marginTop: 2 },
    profileEditInput: {
      fontSize: 18, fontFamily: "Inter_600SemiBold",
      color: colors.foreground,
      borderBottomWidth: 1, borderBottomColor: colors.primary,
      paddingVertical: 2, flex: 1,
    },
    profileSaveBtn: { paddingHorizontal: 10, paddingVertical: 4 },
    profileSaveBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: colors.primary },
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
        <TouchableOpacity style={s.profileSection} activeOpacity={0.85} onPress={() => { if (!editingName) { setNameInput(userName); setEditingName(true); } }}>
          <TouchableOpacity style={s.avatarWrapper} onPress={pickProfileImage}>
            {profilePhoto ? (
              <Image source={{ uri: profilePhoto }} style={s.avatarImage} />
            ) : (
              <View style={s.avatarCircle}>
                <Text style={s.avatarInitials}>{initials}</Text>
              </View>
            )}
            <View style={s.avatarEditBadge}>
              <Ionicons name="camera" size={11} color="#fff" />
            </View>
          </TouchableOpacity>

          <View style={s.profileInfo}>
            {editingName ? (
              <View style={s.profileNameRow}>
                <TextInput
                  style={s.profileEditInput}
                  value={nameInput}
                  onChangeText={setNameInput}
                  autoFocus
                  returnKeyType="done"
                  onSubmitEditing={saveName}
                  onBlur={saveName}
                  selectTextOnFocus
                />
                <TouchableOpacity style={s.profileSaveBtn} onPress={saveName}>
                  <Text style={s.profileSaveBtnText}>Save</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={s.profileNameRow}>
                <Text style={s.profileName}>{userName || "Your Name"}</Text>
                <Ionicons name="pencil-outline" size={14} color={colors.mutedForeground} />
              </View>
            )}
            <Text style={s.profileSub}>Tap name to edit · Tap photo to change</Text>
          </View>
        </TouchableOpacity>

        <View style={s.section}>
          <Text style={s.sectionLabel}>Budget</Text>
          <TouchableOpacity style={s.row} onPress={() => setShowBudget(true)}>
            <View style={s.rowIcon}>
              <Ionicons name="wallet-outline" size={18} color={colors.primary} />
            </View>
            <View style={s.rowInfo}>
              <Text style={s.rowTitle}>Monthly Budget</Text>
              <Text style={s.rowSub}>₹{budget.totalAmount}/month</Text>
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
                  ₹{g.currentAmount.toFixed(0)} of ₹{g.targetAmount.toFixed(0)} ({Math.round(pct)}%)
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
                  <Text style={s.tmplSub}>₹{t.amount} · {t.category}</Text>
                </View>
                <TouchableOpacity onPress={() => deleteTemplate(t.id)}>
                  <Ionicons name="trash-outline" size={16} color={colors.destructive} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        <View style={s.section}>
          <Text style={s.sectionLabel}>Notifications</Text>
          <View style={s.row}>
            <View style={s.rowIcon}>
              <Ionicons name="notifications-outline" size={18} color={colors.primary} />
            </View>
            <View style={s.rowInfo}>
              <Text style={s.rowTitle}>Budget Alerts</Text>
              <Text style={s.rowSub}>Alert at 80% and 100% of budget limits</Text>
            </View>
            <Switch
              value={notificationPrefs.budgetAlerts}
              onValueChange={(v) => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                updateNotificationPrefs({ budgetAlerts: v });
              }}
              trackColor={{ false: colors.muted, true: colors.primary + "88" }}
              thumbColor={notificationPrefs.budgetAlerts ? colors.primary : colors.mutedForeground}
            />
          </View>
          <View style={s.row}>
            <View style={s.rowIcon}>
              <Ionicons name="alarm-outline" size={18} color={colors.accent} />
            </View>
            <View style={s.rowInfo}>
              <Text style={s.rowTitle}>Task Reminders</Text>
              <Text style={s.rowSub}>Remind 1 day before task deadline</Text>
            </View>
            <Switch
              value={notificationPrefs.taskReminders}
              onValueChange={(v) => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                updateNotificationPrefs({ taskReminders: v });
              }}
              trackColor={{ false: colors.muted, true: colors.accent + "88" }}
              thumbColor={notificationPrefs.taskReminders ? colors.accent : colors.mutedForeground}
            />
          </View>
        </View>

        <View style={s.section}>
          <Text style={s.sectionLabel}>Privacy</Text>
          <View style={s.row}>
            <View style={[s.rowIcon, { backgroundColor: colors.primary + "22" }]}>
              <Ionicons name={isPrivacyMode ? "eye-off-outline" : "eye-outline"} size={18} color={colors.primary} />
            </View>
            <View style={s.rowInfo}>
              <Text style={s.rowTitle}>Privacy Mode</Text>
              <Text style={s.rowSub}>{isPrivacyMode ? "Balances hidden" : "Balances visible"}</Text>
            </View>
            <Switch
              value={isPrivacyMode}
              onValueChange={togglePrivacyMode}
              trackColor={{ false: colors.muted, true: colors.primary + "88" }}
              thumbColor={isPrivacyMode ? colors.primary : colors.mutedForeground}
            />
          </View>
        </View>

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
          <Text style={s.label}>Target Amount (₹)</Text>
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
