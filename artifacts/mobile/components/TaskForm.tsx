import * as Haptics from "expo-haptics";
import React, { useEffect, useState } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Task, useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

const TASK_CATEGORIES = [
  "Bill Payment",
  "Subscription",
  "Split Expense",
  "Savings Transfer",
  "General",
];

const PRESETS = [
  { title: "Pay rent", category: "Bill Payment" },
  { title: "Netflix renewal", category: "Subscription" },
  { title: "Split dinner", category: "Split Expense" },
  { title: "Transfer to savings", category: "Savings Transfer" },
  { title: "Pay tuition", category: "Bill Payment" },
];

interface Props {
  visible: boolean;
  onClose: () => void;
  editTask?: Task;
}

export function TaskForm({ visible, onClose, editTask }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { addTask, updateTask } = useApp();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("General");
  const [daysUntilDue, setDaysUntilDue] = useState<number | null>(null);

  useEffect(() => {
    if (editTask) {
      setTitle(editTask.title);
      setDescription(editTask.description);
      setCategory(editTask.category);
      setDaysUntilDue(null);
    } else {
      setTitle("");
      setDescription("");
      setCategory("General");
      setDaysUntilDue(null);
    }
  }, [editTask, visible]);

  function getDeadline(): string | undefined {
    if (daysUntilDue === null) return undefined;
    const d = new Date();
    d.setDate(d.getDate() + daysUntilDue);
    return d.toISOString().slice(0, 10);
  }

  function handleSubmit() {
    if (!title.trim()) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const deadline = editTask?.deadline ?? getDeadline();
    if (editTask) {
      updateTask(editTask.id, { title: title.trim(), description, category, deadline });
    } else {
      addTask({ title: title.trim(), description, category, deadline, completed: false });
    }
    onClose();
  }

  function applyPreset(preset: { title: string; category: string }) {
    setTitle(preset.title);
    setCategory(preset.category);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  const s = StyleSheet.create({
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
    header: {
      flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    },
    title_: {
      fontSize: 18, fontFamily: "Inter_700Bold", color: colors.foreground,
    },
    label: {
      color: colors.mutedForeground, fontSize: 12,
      fontFamily: "Inter_500Medium", textTransform: "uppercase", letterSpacing: 0.8,
    },
    input: {
      backgroundColor: colors.input, borderRadius: 12, padding: 14,
      color: colors.foreground, fontFamily: "Inter_400Regular", fontSize: 15,
    },
    presets: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    presetChip: {
      backgroundColor: colors.secondary, borderRadius: 20,
      paddingHorizontal: 12, paddingVertical: 6,
    },
    presetText: { color: colors.foreground, fontSize: 12, fontFamily: "Inter_400Regular" },
    catRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    catChip: {
      paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
      borderWidth: 1, borderColor: colors.border,
    },
    catLabel: { fontSize: 12, fontFamily: "Inter_400Regular" },
    daysRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
    dayBtn: {
      paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10,
      borderWidth: 1, borderColor: colors.border,
    },
    dayBtnText: { fontSize: 13, fontFamily: "Inter_500Medium" },
    submitBtn: { borderRadius: 14, padding: 16, alignItems: "center", marginTop: 4 },
    submitText: { fontSize: 16, fontFamily: "Inter_700Bold" },
  });

  const DUE_OPTIONS = [
    { label: "Today", days: 0 },
    { label: "Tomorrow", days: 1 },
    { label: "3 days", days: 3 },
    { label: "1 week", days: 7 },
    { label: "1 month", days: 30 },
  ];

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={s.backdrop} onPress={onClose} />
      <View style={s.sheet}>
        <View style={s.handle} />
        <View style={s.header}>
          <Text style={s.title_}>{editTask ? "Edit Task" : "Add Task"}</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={22} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>

        {!editTask && (
          <>
            <Text style={s.label}>Quick Presets</Text>
            <View style={s.presets}>
              {PRESETS.map((p) => (
                <TouchableOpacity key={p.title} style={s.presetChip} onPress={() => applyPreset(p)}>
                  <Text style={s.presetText}>{p.title}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        <TextInput
          style={s.input}
          value={title}
          onChangeText={setTitle}
          placeholder="Task title"
          placeholderTextColor={colors.mutedForeground}
          autoFocus
        />

        <TextInput
          style={[s.input, { minHeight: 60 }]}
          value={description}
          onChangeText={setDescription}
          placeholder="Notes (optional)"
          placeholderTextColor={colors.mutedForeground}
          multiline
        />

        <Text style={s.label}>Category</Text>
        <View style={s.catRow}>
          {TASK_CATEGORIES.map((c) => (
            <TouchableOpacity
              key={c}
              style={[s.catChip, category === c && { backgroundColor: colors.accent + "33", borderColor: colors.accent }]}
              onPress={() => setCategory(c)}
            >
              <Text style={[s.catLabel, { color: category === c ? colors.accent : colors.mutedForeground }]}>
                {c}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {!editTask && (
          <>
            <Text style={s.label}>Due Date</Text>
            <View style={s.daysRow}>
              {DUE_OPTIONS.map((o) => (
                <TouchableOpacity
                  key={o.days}
                  style={[s.dayBtn, daysUntilDue === o.days && { backgroundColor: colors.accent + "33", borderColor: colors.accent }]}
                  onPress={() => setDaysUntilDue(daysUntilDue === o.days ? null : o.days)}
                >
                  <Text style={[s.dayBtnText, { color: daysUntilDue === o.days ? colors.accent : colors.mutedForeground }]}>
                    {o.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        <TouchableOpacity
          style={[s.submitBtn, { backgroundColor: colors.accent }]}
          onPress={handleSubmit}
        >
          <Text style={[s.submitText, { color: colors.accentForeground }]}>
            {editTask ? "Update" : "Add Task"}
          </Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}
