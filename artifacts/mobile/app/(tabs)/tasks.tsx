import * as Haptics from "expo-haptics";
import React, { useMemo, useState } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { TaskForm } from "@/components/TaskForm";
import { Task, useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

const TASK_FILTER_CATEGORIES = ["All", "Bill Payment", "Subscription", "Split Expense", "Savings Transfer", "General"];

export default function TasksScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { tasks, updateTask, deleteTask } = useApp();
  const [showForm, setShowForm] = useState(false);
  const [editTask, setEditTask] = useState<Task | undefined>();
  const [showCompleted, setShowCompleted] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("All");

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const { pending, completed } = useMemo(() => {
    const filtered = selectedCategory === "All" ? tasks : tasks.filter((t) => t.category === selectedCategory);
    const sorted = [...filtered].sort((a, b) => {
      if (a.deadline && b.deadline) return a.deadline.localeCompare(b.deadline);
      if (a.deadline) return -1;
      if (b.deadline) return 1;
      return b.createdAt.localeCompare(a.createdAt);
    });
    return {
      pending: sorted.filter((t) => !t.completed),
      completed: sorted.filter((t) => t.completed),
    };
  }, [tasks, selectedCategory]);

  function toggleComplete(task: Task) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    updateTask(task.id, { completed: !task.completed });
  }

  function handleDelete(id: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    deleteTask(id);
  }

  function getDaysUntil(deadline?: string): string | null {
    if (!deadline) return null;
    const diff = Math.ceil(
      (new Date(deadline).getTime() - new Date().setHours(0, 0, 0, 0)) / (1000 * 60 * 60 * 24)
    );
    if (diff < 0) return "Overdue";
    if (diff === 0) return "Today";
    if (diff === 1) return "Tomorrow";
    return `${diff} days`;
  }

  function getDeadlineColor(deadline?: string): string {
    if (!deadline) return colors.mutedForeground;
    const diff = Math.ceil(
      (new Date(deadline).getTime() - new Date().setHours(0, 0, 0, 0)) / (1000 * 60 * 60 * 24)
    );
    if (diff < 0) return colors.destructive;
    if (diff <= 2) return "#FB923C";
    return colors.mutedForeground;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[styles.header, { paddingTop: topPad + 12, backgroundColor: colors.background }]}
      >
        <Text style={[styles.title, { color: colors.foreground }]}>Tasks</Text>
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: colors.accent }]}
          onPress={() => { setEditTask(undefined); setShowForm(true); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
          testID="add-task-btn"
        >
          <Ionicons name="add" size={20} color={colors.accentForeground} />
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterContent}
      >
        {TASK_FILTER_CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat}
            style={[
              styles.filterChip,
              { borderColor: colors.border, backgroundColor: selectedCategory === cat ? colors.accent + "33" : "transparent" },
              selectedCategory === cat && { borderColor: colors.accent },
            ]}
            onPress={() => setSelectedCategory(cat)}
          >
            <Text
              style={[
                styles.filterLabel,
                { color: selectedCategory === cat ? colors.accent : colors.mutedForeground },
              ]}
            >
              {cat}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottomPad + 90, paddingHorizontal: 16 }}
      >
        {pending.length === 0 && completed.length === 0 ? (
          <View style={[styles.empty, { borderColor: colors.border }]}>
            <Ionicons name="checkmark-circle-outline" size={40} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>All caught up</Text>
            <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>
              {selectedCategory === "All" ? "Add finance reminders and tasks" : `No ${selectedCategory} tasks`}
            </Text>
          </View>
        ) : (
          <>
            {pending.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
                  PENDING · {pending.length}
                </Text>
                {pending.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    onToggle={() => toggleComplete(task)}
                    onEdit={() => { setEditTask(task); setShowForm(true); }}
                    onDelete={() => handleDelete(task.id)}
                    daysLabel={getDaysUntil(task.deadline)}
                    deadlineColor={getDeadlineColor(task.deadline)}
                    colors={colors}
                  />
                ))}
              </View>
            )}

            {completed.length > 0 && (
              <View style={styles.section}>
                <TouchableOpacity
                  style={styles.completedToggle}
                  onPress={() => setShowCompleted(!showCompleted)}
                >
                  <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
                    COMPLETED · {completed.length}
                  </Text>
                  <Ionicons
                    name={showCompleted ? "chevron-up" : "chevron-down"}
                    size={14}
                    color={colors.mutedForeground}
                  />
                </TouchableOpacity>
                {showCompleted &&
                  completed.map((task) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      onToggle={() => toggleComplete(task)}
                      onEdit={() => { setEditTask(task); setShowForm(true); }}
                      onDelete={() => handleDelete(task.id)}
                      daysLabel={null}
                      deadlineColor={colors.mutedForeground}
                      colors={colors}
                      dimmed
                    />
                  ))}
              </View>
            )}
          </>
        )}
      </ScrollView>

      <TaskForm
        visible={showForm}
        onClose={() => { setShowForm(false); setEditTask(undefined); }}
        editTask={editTask}
      />
    </View>
  );
}

function TaskRow({
  task, onToggle, onEdit, onDelete, daysLabel, deadlineColor, colors, dimmed,
}: {
  task: Task;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  daysLabel: string | null;
  deadlineColor: string;
  colors: ReturnType<typeof useColors>;
  dimmed?: boolean;
}) {
  const [showActions, setShowActions] = useState(false);

  return (
    <TouchableOpacity
      style={[styles.taskRow, { backgroundColor: colors.card, opacity: dimmed ? 0.6 : 1 }]}
      onPress={() => setShowActions(!showActions)}
      onLongPress={onEdit}
    >
      <TouchableOpacity onPress={onToggle} style={styles.checkWrap}>
        <View
          style={[
            styles.check,
            {
              borderColor: task.completed ? colors.primary : colors.border,
              backgroundColor: task.completed ? colors.primary + "22" : "transparent",
            },
          ]}
        >
          {task.completed && <Ionicons name="checkmark" size={12} color={colors.primary} />}
        </View>
      </TouchableOpacity>

      <View style={styles.taskInfo}>
        <Text
          style={[
            styles.taskTitle,
            {
              color: colors.foreground,
              textDecorationLine: task.completed ? "line-through" : "none",
            },
          ]}
          numberOfLines={1}
        >
          {task.title}
        </Text>
        <View style={styles.taskMeta}>
          <Text style={[styles.taskCategory, { color: colors.mutedForeground }]}>{task.category}</Text>
          {daysLabel && (
            <Text style={[styles.taskDeadline, { color: deadlineColor }]}>{daysLabel}</Text>
          )}
        </View>
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
        <Ionicons name="chevron-forward" size={16} color={colors.border} />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  title: { fontSize: 26, fontFamily: "Inter_700Bold" },
  addBtn: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  filterScroll: { flexGrow: 0, marginBottom: 4 },
  filterContent: { paddingHorizontal: 16, gap: 8 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterLabel: { fontSize: 12, fontFamily: "Inter_500Medium" },
  section: { marginTop: 16 },
  sectionLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 1, marginBottom: 8 },
  completedToggle: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  taskRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    gap: 12,
  },
  checkWrap: { padding: 2 },
  check: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  taskInfo: { flex: 1 },
  taskTitle: { fontSize: 14, fontFamily: "Inter_500Medium" },
  taskMeta: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 3 },
  taskCategory: { fontSize: 11, fontFamily: "Inter_400Regular" },
  taskDeadline: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  actions: { flexDirection: "row", gap: 8 },
  actionBtn: { padding: 4 },
  empty: {
    marginTop: 60,
    borderWidth: 1,
    borderStyle: "dashed",
    borderRadius: 20,
    padding: 40,
    alignItems: "center",
    gap: 8,
  },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold", marginTop: 8 },
  emptySubtitle: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
});
