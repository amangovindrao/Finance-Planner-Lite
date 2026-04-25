import * as Haptics from "expo-haptics";
import React, { useEffect, useState } from "react";
import {
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
import {
  CATEGORIES,
  CATEGORY_COLORS,
  Category,
  Expense,
  Template,
  autoCategorize,
  useApp,
} from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

interface Props {
  visible: boolean;
  onClose: () => void;
  editExpense?: Expense;
}

export function ExpenseForm({ visible, onClose, editExpense }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { addExpense, updateExpense, templates, addTemplate, accounts } = useApp();

  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<Category>("Food");
  const [description, setDescription] = useState("");
  const [isRecurring, setIsRecurring] = useState(false);
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [sourceId, setSourceId] = useState<string | null>(null);

  useEffect(() => {
    if (editExpense) {
      setAmount(editExpense.amount.toString());
      setCategory(editExpense.category);
      setDescription(editExpense.description);
      setIsRecurring(editExpense.isRecurring);
      setSourceId(editExpense.sourceId);
    } else {
      setAmount("");
      setCategory("Food");
      setDescription("");
      setIsRecurring(false);
      setSourceId(accounts.length > 0 ? accounts[0].id : null);
    }
  }, [editExpense, visible]);

  function handleDescriptionChange(text: string) {
    setDescription(text);
    if (!editExpense) {
      setCategory(autoCategorize(text));
    }
  }

  function applyTemplate(t: Template) {
    setAmount(t.amount.toString());
    setCategory(t.category);
    setDescription(t.name);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  function handleSubmit() {
    const parsed = parseFloat(amount);
    if (!parsed || parsed <= 0) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const today = new Date().toISOString().slice(0, 10);
    if (editExpense) {
      updateExpense(editExpense.id, { amount: parsed, category, description, isRecurring, sourceId });
    } else {
      addExpense({ amount: parsed, category, description, date: today, isRecurring, sourceId });
    }
    onClose();
  }

  function handleSaveTemplate() {
    if (!templateName.trim() || !amount) return;
    addTemplate({
      name: templateName.trim(),
      amount: parseFloat(amount) || 0,
      category,
    });
    setShowSaveTemplate(false);
    setTemplateName("");
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  const s = createStyles(colors, insets);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={s.backdrop} onPress={onClose} />
      <View style={s.sheet}>
        <View style={s.handle} />
        <View style={s.header}>
          <Text style={s.title}>{editExpense ? "Edit Expense" : "Add Expense"}</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={22} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>

        {templates.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.templates}>
            {templates.map((t) => (
              <TouchableOpacity key={t.id} style={s.templateChip} onPress={() => applyTemplate(t)}>
                <Text style={s.templateText}>{t.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        <View style={s.amountRow}>
          <Text style={s.currencySign}>₹</Text>
          <TextInput
            style={s.amountInput}
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            placeholder="0.00"
            placeholderTextColor={colors.mutedForeground}
            autoFocus
          />
        </View>

        <TextInput
          style={s.descInput}
          value={description}
          onChangeText={handleDescriptionChange}
          placeholder="Description (auto-categorizes)"
          placeholderTextColor={colors.mutedForeground}
        />

        <Text style={s.sectionLabel}>Category</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.catScroll}>
          {CATEGORIES.map((c) => (
            <TouchableOpacity
              key={c}
              style={[
                s.catChip,
                category === c && {
                  backgroundColor: CATEGORY_COLORS[c] + "33",
                  borderColor: CATEGORY_COLORS[c],
                },
              ]}
              onPress={() => setCategory(c)}
            >
              <View style={[s.catDot, { backgroundColor: CATEGORY_COLORS[c] }]} />
              <Text style={[s.catLabel, { color: category === c ? CATEGORY_COLORS[c] : colors.mutedForeground }]}>
                {c}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {accounts.length > 0 && (
          <>
            <Text style={s.sectionLabel}>Pay From</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.catScroll}>
              <TouchableOpacity
                style={[s.sourceChip, sourceId === null && { borderColor: colors.mutedForeground, backgroundColor: colors.mutedForeground + "20" }]}
                onPress={() => setSourceId(null)}
              >
                <Ionicons name="ellipsis-horizontal" size={14} color={sourceId === null ? colors.foreground : colors.mutedForeground} />
                <Text style={[s.sourceLabel, { color: sourceId === null ? colors.foreground : colors.mutedForeground }]}>None</Text>
              </TouchableOpacity>
              {accounts.map((a) => (
                <TouchableOpacity
                  key={a.id}
                  style={[
                    s.sourceChip,
                    sourceId === a.id && { backgroundColor: a.color + "25", borderColor: a.color },
                  ]}
                  onPress={() => setSourceId(a.id)}
                >
                  <Ionicons name={a.icon as "card-outline"} size={14} color={sourceId === a.id ? a.color : colors.mutedForeground} />
                  <Text style={[s.sourceLabel, { color: sourceId === a.id ? a.color : colors.mutedForeground }]}>
                    {a.name}
                  </Text>
                  {sourceId === a.id && (
                    <Text style={[s.sourceBalance, { color: a.color }]}>₹{a.balance.toFixed(0)}</Text>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        )}

        <View style={s.row}>
          <TouchableOpacity
            style={[s.toggle, isRecurring && { borderColor: colors.primary }]}
            onPress={() => setIsRecurring(!isRecurring)}
          >
            <Ionicons
              name={isRecurring ? "repeat" : "repeat-outline"}
              size={18}
              color={isRecurring ? colors.primary : colors.mutedForeground}
            />
            <Text style={[s.toggleLabel, { color: isRecurring ? colors.primary : colors.mutedForeground }]}>
              Recurring
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={s.toggle}
            onPress={() => setShowSaveTemplate(!showSaveTemplate)}
          >
            <Ionicons name="bookmark-outline" size={18} color={colors.mutedForeground} />
            <Text style={[s.toggleLabel, { color: colors.mutedForeground }]}>Save template</Text>
          </TouchableOpacity>
        </View>

        {showSaveTemplate && (
          <View style={s.tmplRow}>
            <TextInput
              style={s.tmplInput}
              value={templateName}
              onChangeText={setTemplateName}
              placeholder="Template name"
              placeholderTextColor={colors.mutedForeground}
            />
            <TouchableOpacity style={s.tmplSave} onPress={handleSaveTemplate}>
              <Text style={[s.tmplSaveText, { color: colors.primaryForeground }]}>Save</Text>
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity
          style={[s.submitBtn, { backgroundColor: colors.primary }]}
          onPress={handleSubmit}
        >
          <Text style={[s.submitText, { color: colors.primaryForeground }]}>
            {editExpense ? "Update" : "Add Expense"}
          </Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

function createStyles(colors: ReturnType<typeof useColors>, insets: ReturnType<typeof useSafeAreaInsets>) {
  return StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)" },
    sheet: {
      backgroundColor: colors.card,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: 20,
      paddingBottom: insets.bottom + 20,
      gap: 14,
    },
    handle: {
      width: 36, height: 4, backgroundColor: colors.border,
      borderRadius: 2, alignSelf: "center", marginBottom: 4,
    },
    header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    title: { fontSize: 18, fontFamily: "Inter_700Bold", color: colors.foreground },
    templates: { flexGrow: 0 },
    templateChip: {
      backgroundColor: colors.secondary, borderRadius: 20,
      paddingHorizontal: 14, paddingVertical: 6, marginRight: 8,
    },
    templateText: { color: colors.foreground, fontSize: 13, fontFamily: "Inter_500Medium" },
    amountRow: { flexDirection: "row", alignItems: "center", gap: 4 },
    currencySign: { fontSize: 32, fontFamily: "Inter_600SemiBold", color: colors.mutedForeground },
    amountInput: { flex: 1, fontSize: 40, fontFamily: "Inter_700Bold", color: colors.foreground },
    descInput: {
      backgroundColor: colors.input, borderRadius: 12, padding: 14,
      color: colors.foreground, fontFamily: "Inter_400Regular", fontSize: 15,
    },
    sectionLabel: {
      color: colors.mutedForeground, fontSize: 12, fontFamily: "Inter_500Medium",
      textTransform: "uppercase", letterSpacing: 0.8,
    },
    catScroll: { flexGrow: 0 },
    catChip: {
      flexDirection: "row", alignItems: "center", gap: 6,
      paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20,
      borderWidth: 1, borderColor: colors.border, marginRight: 8,
    },
    catDot: { width: 6, height: 6, borderRadius: 3 },
    catLabel: { fontSize: 13, fontFamily: "Inter_500Medium" },
    sourceChip: {
      flexDirection: "row", alignItems: "center", gap: 6,
      paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20,
      borderWidth: 1, borderColor: colors.border, marginRight: 8,
    },
    sourceLabel: { fontSize: 13, fontFamily: "Inter_500Medium" },
    sourceBalance: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
    row: { flexDirection: "row", gap: 12 },
    toggle: {
      flexDirection: "row", alignItems: "center", gap: 6,
      paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
      borderWidth: 1, borderColor: colors.border,
    },
    toggleLabel: { fontSize: 13, fontFamily: "Inter_500Medium" },
    tmplRow: { flexDirection: "row", gap: 8 },
    tmplInput: {
      flex: 1, backgroundColor: colors.input, borderRadius: 10,
      padding: 12, color: colors.foreground, fontFamily: "Inter_400Regular",
    },
    tmplSave: {
      backgroundColor: colors.accent, borderRadius: 10,
      paddingHorizontal: 16, justifyContent: "center",
    },
    tmplSaveText: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
    submitBtn: { borderRadius: 14, padding: 16, alignItems: "center", marginTop: 4 },
    submitText: { fontSize: 16, fontFamily: "Inter_700Bold" },
  });
}
