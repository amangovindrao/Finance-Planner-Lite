import * as Haptics from "expo-haptics";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
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

const CATEGORY_ICONS: Record<string, string> = {
  Food: "restaurant-outline",
  Transport: "car-outline",
  Shopping: "bag-outline",
  Entertainment: "game-controller-outline",
  Health: "heart-outline",
  Education: "book-outline",
  Bills: "receipt-outline",
  Miscellaneous: "ellipsis-horizontal-outline",
};

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
  const [amountFocused, setAmountFocused] = useState(false);

  const amountScale = useRef(new Animated.Value(1)).current;
  const sheetY = useRef(new Animated.Value(600)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(sheetY, {
        toValue: 0,
        tension: 65,
        friction: 11,
        useNativeDriver: true,
      }).start();
    } else {
      sheetY.setValue(600);
    }
  }, [visible]);

  useEffect(() => {
    Animated.spring(amountScale, {
      toValue: amountFocused ? 1.04 : 1,
      tension: 120,
      friction: 8,
      useNativeDriver: true,
    }).start();
  }, [amountFocused]);

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

  const hasAmount = !!amount && parseFloat(amount) > 0;

  return (
    <Modal visible={visible} animationType="none" transparent onRequestClose={onClose}>
      <Pressable style={s.backdrop} onPress={onClose} />
      <Animated.View style={[s.sheet, { transform: [{ translateY: sheetY }], paddingBottom: insets.bottom + 24 }]}>
        <View style={s.handle} />

        <View style={s.header}>
          <Text style={[s.title, { color: colors.foreground }]}>
            {editExpense ? "Edit Expense" : "Add Expense"}
          </Text>
          <TouchableOpacity onPress={onClose} style={s.closeBtn}>
            <Ionicons name="close" size={20} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={s.scrollContent}
        >
          {templates.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.templateRow}>
              {templates.map((t) => (
                <TouchableOpacity key={t.id} style={[s.templateChip, { backgroundColor: colors.secondary }]} onPress={() => applyTemplate(t)}>
                  <Text style={[s.templateText, { color: colors.mutedForeground }]}>{t.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          <Animated.View style={[s.amountBlock, { transform: [{ scale: amountScale }] }]}>
            <Text style={[s.rupeeSign, { color: hasAmount ? colors.foreground : colors.mutedForeground }]}>₹</Text>
            <TextInput
              style={[s.amountInput, { color: colors.foreground }]}
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor={colors.mutedForeground + "60"}
              autoFocus
              onFocus={() => setAmountFocused(true)}
              onBlur={() => setAmountFocused(false)}
              selectionColor={colors.primary}
            />
          </Animated.View>

          <TextInput
            style={[s.noteInput, { backgroundColor: colors.secondary, color: colors.foreground }]}
            value={description}
            onChangeText={handleDescriptionChange}
            placeholder="Add note (optional)"
            placeholderTextColor={colors.mutedForeground + "80"}
            returnKeyType="done"
          />

          <Text style={[s.sectionLabel, { color: colors.mutedForeground }]}>Category</Text>
          <View style={s.chipGrid}>
            {CATEGORIES.map((c) => {
              const selected = category === c;
              return (
                <TouchableOpacity
                  key={c}
                  style={[
                    s.catChip,
                    {
                      backgroundColor: selected ? colors.primary + "18" : colors.secondary,
                      borderColor: selected ? colors.primary + "60" : "transparent",
                    },
                  ]}
                  onPress={() => {
                    setCategory(c);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                >
                  <Ionicons
                    name={CATEGORY_ICONS[c] as "restaurant-outline"}
                    size={14}
                    color={selected ? colors.primary : colors.mutedForeground}
                  />
                  <Text style={[s.catLabel, { color: selected ? colors.primary : colors.mutedForeground }]}>{c}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {accounts.length > 0 && (
            <>
              <Text style={[s.sectionLabel, { color: colors.mutedForeground }]}>Pay From</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.hScroll}>
                <TouchableOpacity
                  style={[s.payChip, { backgroundColor: sourceId === null ? colors.primary + "18" : colors.secondary, borderColor: sourceId === null ? colors.primary + "60" : "transparent" }]}
                  onPress={() => setSourceId(null)}
                >
                  <Ionicons name="cash-outline" size={14} color={sourceId === null ? colors.primary : colors.mutedForeground} />
                  <Text style={[s.payLabel, { color: sourceId === null ? colors.primary : colors.mutedForeground }]}>Cash</Text>
                </TouchableOpacity>
                {accounts.map((a) => {
                  const sel = sourceId === a.id;
                  return (
                    <TouchableOpacity
                      key={a.id}
                      style={[s.payChip, { backgroundColor: sel ? colors.primary + "18" : colors.secondary, borderColor: sel ? colors.primary + "60" : "transparent" }]}
                      onPress={() => setSourceId(a.id)}
                    >
                      <Ionicons name={a.icon as "card-outline"} size={14} color={sel ? colors.primary : colors.mutedForeground} />
                      <Text style={[s.payLabel, { color: sel ? colors.primary : colors.mutedForeground }]}>{a.name}</Text>
                      {sel && (
                        <Text style={[s.payBalance, { color: colors.mutedForeground }]}>₹{a.balance.toFixed(0)}</Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </>
          )}

          <View style={s.optionsRow}>
            <TouchableOpacity
              style={[s.optionChip, { backgroundColor: isRecurring ? colors.primary + "18" : colors.secondary, borderColor: isRecurring ? colors.primary + "50" : "transparent" }]}
              onPress={() => {
                setIsRecurring(!isRecurring);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
            >
              <Ionicons name="repeat" size={14} color={isRecurring ? colors.primary : colors.mutedForeground} />
              <Text style={[s.optionLabel, { color: isRecurring ? colors.primary : colors.mutedForeground }]}>Recurring</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={s.templateLink}
              onPress={() => setShowSaveTemplate(!showSaveTemplate)}
            >
              <Ionicons name="bookmark-outline" size={13} color={colors.mutedForeground} />
              <Text style={[s.templateLinkText, { color: colors.mutedForeground }]}>Save as template</Text>
            </TouchableOpacity>
          </View>

          {showSaveTemplate && (
            <View style={[s.templateSaveRow, { backgroundColor: colors.secondary }]}>
              <TextInput
                style={[s.templateInput, { color: colors.foreground }]}
                value={templateName}
                onChangeText={setTemplateName}
                placeholder="Template name"
                placeholderTextColor={colors.mutedForeground + "80"}
              />
              <TouchableOpacity style={[s.templateSaveBtn, { backgroundColor: colors.primary }]} onPress={handleSaveTemplate}>
                <Text style={[s.templateSaveBtnText, { color: colors.primaryForeground }]}>Save</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>

        <TouchableOpacity
          style={[s.submitBtn, { backgroundColor: hasAmount ? colors.primary : colors.secondary, opacity: hasAmount ? 1 : 0.7 }]}
          onPress={handleSubmit}
          activeOpacity={0.8}
        >
          <Text style={[s.submitText, { color: hasAmount ? colors.primaryForeground : colors.mutedForeground }]}>
            {editExpense ? "Update Expense" : "Add Expense"}
          </Text>
        </TouchableOpacity>
      </Animated.View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  sheet: {
    backgroundColor: "#111318",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 12,
    maxHeight: "85%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 20,
  },
  handle: {
    width: 32,
    height: 3,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 4,
  },
  title: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
  },
  closeBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 8,
    gap: 16,
  },
  templateRow: {
    flexGrow: 0,
    marginBottom: -4,
  },
  templateChip: {
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    marginRight: 8,
  },
  templateText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  amountBlock: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    gap: 2,
  },
  rupeeSign: {
    fontSize: 36,
    fontFamily: "Inter_600SemiBold",
    marginTop: 4,
  },
  amountInput: {
    fontSize: 64,
    fontFamily: "Inter_700Bold",
    minWidth: 80,
    textAlign: "center",
    letterSpacing: -2,
    ...(Platform.OS === "web" ? {} : {}),
  },
  noteInput: {
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  sectionLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: -4,
  },
  chipGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  catChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  catLabel: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  hScroll: {
    flexGrow: 0,
    marginBottom: 4,
  },
  payChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  payLabel: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  payBalance: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    marginLeft: 2,
  },
  optionsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  optionChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1,
  },
  optionLabel: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  templateLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 8,
  },
  templateLinkText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  templateSaveRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    overflow: "hidden",
    gap: 0,
  },
  templateInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  templateSaveBtn: {
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  templateSaveBtnText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  submitBtn: {
    marginHorizontal: 20,
    marginTop: 8,
    borderRadius: 16,
    paddingVertical: 17,
    alignItems: "center",
  },
  submitText: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.2,
  },
});
