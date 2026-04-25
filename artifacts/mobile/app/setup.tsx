import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  KeyboardAvoidingView,
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
import {
  ACCOUNT_COLORS,
  AccountType,
  useApp,
} from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

type DraftAccount = {
  name: string;
  type: AccountType;
  balance: string;
  color: string;
};

const ACCOUNT_TYPES: { type: AccountType; label: string; icon: string }[] = [
  { type: "bank", label: "Bank", icon: "card-outline" },
  { type: "wallet", label: "Wallet", icon: "wallet-outline" },
  { type: "cash", label: "Cash", icon: "cash-outline" },
];

const PRESETS: { name: string; type: AccountType }[] = [
  { name: "SBI", type: "bank" },
  { name: "HDFC", type: "bank" },
  { name: "Paytm", type: "wallet" },
  { name: "PhonePe", type: "wallet" },
  { name: "Cash", type: "cash" },
];

export default function SetupScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { completeOnboarding } = useApp();

  const [step, setStep] = useState<"profile" | "accounts">("profile");
  const [name, setName] = useState("");
  const [budgetAmount, setBudgetAmount] = useState("15000");
  const [accounts, setAccounts] = useState<DraftAccount[]>([
    { name: "Cash", type: "cash", balance: "0", color: ACCOUNT_COLORS[1] },
  ]);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);

  function goToAccounts() {
    if (!name.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setStep("accounts");
  }

  function addAccount(preset?: { name: string; type: AccountType }) {
    const idx = accounts.length % ACCOUNT_COLORS.length;
    setAccounts((prev) => [
      ...prev,
      {
        name: preset?.name ?? "",
        type: preset?.type ?? "bank",
        balance: "0",
        color: ACCOUNT_COLORS[idx],
      },
    ]);
    setEditingIdx(accounts.length);
  }

  function updateDraft(idx: number, field: keyof DraftAccount, value: string) {
    setAccounts((prev) => prev.map((a, i) => (i === idx ? { ...a, [field]: value } : a)));
  }

  function removeAccount(idx: number) {
    setAccounts((prev) => prev.filter((_, i) => i !== idx));
  }

  function handleFinish() {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const budget = parseFloat(budgetAmount) || 15000;
    const finalAccounts = accounts
      .filter((a) => a.name.trim())
      .map((a) => ({
        name: a.name.trim(),
        type: a.type,
        balance: parseFloat(a.balance) || 0,
        icon: ACCOUNT_TYPES.find((t) => t.type === a.type)?.icon ?? "card-outline",
        color: a.color,
      }));
    completeOnboarding(name.trim(), budget, finalAccounts);
    router.replace("/(tabs)");
  }

  const topPad = Platform.OS === "web" ? 60 : insets.top;

  const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scroll: { flex: 1 },
    inner: { padding: 24, paddingTop: topPad + 20, paddingBottom: 40 },
    logoRow: { alignItems: "center", marginBottom: 32 },
    logoCircle: {
      width: 72, height: 72, borderRadius: 36,
      backgroundColor: colors.primary + "20",
      alignItems: "center", justifyContent: "center", marginBottom: 16,
    },
    appName: {
      fontSize: 28, fontFamily: "Inter_700Bold", color: colors.foreground, textAlign: "center",
    },
    subtitle: {
      fontSize: 15, color: colors.mutedForeground, fontFamily: "Inter_400Regular",
      textAlign: "center", marginTop: 6,
    },
    label: {
      fontSize: 12, fontFamily: "Inter_600SemiBold", color: colors.mutedForeground,
      textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8, marginTop: 20,
    },
    input: {
      backgroundColor: colors.card, borderRadius: 14, padding: 16,
      color: colors.foreground, fontFamily: "Inter_400Regular", fontSize: 16,
      borderWidth: 1, borderColor: colors.border,
    },
    btn: {
      borderRadius: 16, padding: 17, alignItems: "center", marginTop: 32,
      backgroundColor: colors.primary,
    },
    btnText: { fontSize: 16, fontFamily: "Inter_700Bold", color: colors.background },
    stepIndicator: {
      flexDirection: "row", justifyContent: "center", gap: 8, marginBottom: 32,
    },
    dot: { width: 8, height: 8, borderRadius: 4 },
    sectionTitle: {
      fontSize: 22, fontFamily: "Inter_700Bold", color: colors.foreground, marginBottom: 4,
    },
    acctCard: {
      backgroundColor: colors.card, borderRadius: 14, padding: 16, marginBottom: 12,
      borderWidth: 1, borderColor: colors.border, gap: 10,
    },
    acctRow: { flexDirection: "row", gap: 10, alignItems: "center" },
    acctInput: {
      flex: 1, backgroundColor: colors.input, borderRadius: 10, padding: 12,
      color: colors.foreground, fontFamily: "Inter_400Regular", fontSize: 14,
    },
    typeRow: { flexDirection: "row", gap: 8 },
    typeBtn: {
      flex: 1, borderRadius: 10, padding: 10, alignItems: "center",
      borderWidth: 1, borderColor: colors.border,
    },
    typeBtnText: { fontSize: 12, fontFamily: "Inter_500Medium", marginTop: 4 },
    colorRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
    colorDot: { width: 26, height: 26, borderRadius: 13 },
    presetsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
    presetChip: {
      borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8,
      borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card,
      flexDirection: "row", alignItems: "center", gap: 6,
    },
    presetText: { fontSize: 13, fontFamily: "Inter_500Medium", color: colors.foreground },
    skipLink: { textAlign: "center", color: colors.mutedForeground, fontSize: 13, marginTop: 16, fontFamily: "Inter_400Regular" },
  });

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView style={s.scroll} contentContainerStyle={s.inner} keyboardShouldPersistTaps="handled">
        <View style={s.stepIndicator}>
          {[0, 1].map((i) => (
            <View
              key={i}
              style={[s.dot, {
                backgroundColor: (step === "profile" ? 0 : 1) >= i ? colors.primary : colors.border,
                width: (step === "profile" ? 0 : 1) === i ? 20 : 8,
              }]}
            />
          ))}
        </View>

        {step === "profile" ? (
          <>
            <View style={s.logoRow}>
              <View style={s.logoCircle}>
                <Ionicons name="wallet" size={36} color={colors.primary} />
              </View>
              <Text style={s.appName}>Finance Tracker</Text>
              <Text style={s.subtitle}>Smart money management for students</Text>
            </View>

            <Text style={s.label}>Your Name</Text>
            <TextInput
              style={s.input}
              value={name}
              onChangeText={setName}
              placeholder="e.g. Arjun"
              placeholderTextColor={colors.mutedForeground}
              autoFocus
              returnKeyType="next"
            />

            <Text style={s.label}>Monthly Budget</Text>
            <TextInput
              style={s.input}
              value={budgetAmount}
              onChangeText={setBudgetAmount}
              placeholder="15000"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="numeric"
              returnKeyType="done"
            />

            <TouchableOpacity style={[s.btn, !name.trim() && { opacity: 0.5 }]} onPress={goToAccounts}>
              <Text style={s.btnText}>Next: Add Accounts →</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={s.sectionTitle}>Your Accounts</Text>
            <Text style={[s.subtitle, { textAlign: "left", marginBottom: 16 }]}>
              Add your bank accounts, wallets, or cash to track your total balance.
            </Text>

            <Text style={s.label}>Quick Add</Text>
            <View style={s.presetsRow}>
              {PRESETS.map((p) => (
                <TouchableOpacity key={p.name} style={s.presetChip} onPress={() => addAccount(p)}>
                  <Ionicons
                    name={p.type === "bank" ? "card-outline" : p.type === "wallet" ? "wallet-outline" : "cash-outline"}
                    size={14} color={colors.mutedForeground}
                  />
                  <Text style={s.presetText}>{p.name}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {accounts.map((acct, idx) => (
              <View key={idx} style={s.acctCard}>
                <View style={s.acctRow}>
                  <View style={[s.colorDot, { backgroundColor: acct.color }]} />
                  <TextInput
                    style={[s.acctInput, { flex: 2 }]}
                    value={acct.name}
                    onChangeText={(v) => updateDraft(idx, "name", v)}
                    placeholder="Account name"
                    placeholderTextColor={colors.mutedForeground}
                  />
                  <TextInput
                    style={[s.acctInput, { flex: 1 }]}
                    value={acct.balance}
                    onChangeText={(v) => updateDraft(idx, "balance", v)}
                    placeholder="Balance"
                    placeholderTextColor={colors.mutedForeground}
                    keyboardType="numeric"
                  />
                  <TouchableOpacity onPress={() => removeAccount(idx)}>
                    <Ionicons name="close-circle" size={20} color={colors.destructive} />
                  </TouchableOpacity>
                </View>

                <View style={s.typeRow}>
                  {ACCOUNT_TYPES.map((t) => (
                    <TouchableOpacity
                      key={t.type}
                      style={[s.typeBtn, acct.type === t.type && { backgroundColor: acct.color + "25", borderColor: acct.color }]}
                      onPress={() => updateDraft(idx, "type", t.type)}
                    >
                      <Ionicons name={t.icon as "card-outline"} size={16} color={acct.type === t.type ? acct.color : colors.mutedForeground} />
                      <Text style={[s.typeBtnText, { color: acct.type === t.type ? acct.color : colors.mutedForeground }]}>{t.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={s.colorRow}>
                  {ACCOUNT_COLORS.map((c) => (
                    <Pressable
                      key={c}
                      style={[s.colorDot, { backgroundColor: c, borderWidth: acct.color === c ? 2.5 : 0, borderColor: colors.foreground }]}
                      onPress={() => updateDraft(idx, "color", c)}
                    />
                  ))}
                </View>
              </View>
            ))}

            <TouchableOpacity
              style={[s.btn, { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }]}
              onPress={() => addAccount()}
            >
              <Text style={[s.btnText, { color: colors.foreground }]}>+ Add Account</Text>
            </TouchableOpacity>

            <TouchableOpacity style={s.btn} onPress={handleFinish}>
              <Text style={s.btnText}>Get Started 🚀</Text>
            </TouchableOpacity>

            <Text style={s.skipLink} onPress={handleFinish}>Skip and start with defaults</Text>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
