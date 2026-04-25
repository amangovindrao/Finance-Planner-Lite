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
import { BarChartView, PieChartView } from "@/components/Charts";
import { CATEGORIES, CATEGORY_COLORS, Category, useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

type Period = "week" | "month";

export default function AnalyticsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { expenses, budget, currentMonth, getInsights } = useApp();
  const [period, setPeriod] = useState<Period>("month");
  const insights = getInsights();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const filteredExpenses = useMemo(() => {
    if (period === "month") {
      return expenses.filter((e) => e.date.startsWith(currentMonth));
    }
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return expenses.filter((e) => new Date(e.date) >= weekAgo);
  }, [expenses, period, currentMonth]);

  const categoryData = useMemo((): Record<Category, number> => {
    const d: Record<Category, number> = {
      Food: 0, Transport: 0, Subscriptions: 0,
      Shopping: 0, Education: 0, Miscellaneous: 0,
    };
    filteredExpenses.forEach((e) => { d[e.category] += e.amount; });
    return d;
  }, [filteredExpenses]);

  const weeklyBarData = useMemo(() => {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const totals: Record<string, number> = {};
    days.forEach((d) => (totals[d] = 0));
    const now = new Date();
    expenses.forEach((e) => {
      const d = new Date(e.date);
      const diff = (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24);
      if (diff < 7) {
        const label = days[d.getDay()];
        totals[label] = (totals[label] ?? 0) + e.amount;
      }
    });
    return days.map((d) => ({ label: d.slice(0, 1), value: totals[d] }));
  }, [expenses]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[styles.header, { paddingTop: topPad + 12, backgroundColor: colors.background }]}
      >
        <Text style={[styles.title, { color: colors.foreground }]}>Analytics</Text>
        <View style={[styles.toggle, { backgroundColor: colors.secondary }]}>
          {(["week", "month"] as Period[]).map((p) => (
            <TouchableOpacity
              key={p}
              style={[styles.toggleBtn, period === p && { backgroundColor: colors.card }]}
              onPress={() => setPeriod(p)}
            >
              <Text
                style={[styles.toggleLabel, { color: period === p ? colors.foreground : colors.mutedForeground }]}
              >
                {p === "week" ? "7 days" : "Month"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottomPad + 90, paddingHorizontal: 16, gap: 20 }}
      >
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>Category Breakdown</Text>
          <PieChartView data={categoryData} />
        </View>

        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>Weekly Spending</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <BarChartView data={weeklyBarData} barColor={colors.primary} />
          </ScrollView>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>Budget vs Actual</Text>
          {CATEGORIES.map((cat) => {
            const spent = categoryData[cat];
            const limit = budget.categoryLimits[cat];
            if (limit === 0 && spent === 0) return null;
            const isOver = spent > limit && limit > 0;
            const pct = limit > 0 ? Math.min((spent / limit) * 100, 100) : 0;
            return (
              <View key={cat} style={styles.budgetRow}>
                <View style={styles.budgetMeta}>
                  <View style={[styles.dot, { backgroundColor: CATEGORY_COLORS[cat] }]} />
                  <Text style={[styles.budgetCat, { color: colors.foreground }]}>{cat}</Text>
                  <Text
                    style={[styles.budgetSpent, { color: isOver ? colors.destructive : colors.foreground }]}
                  >
                    ${spent.toFixed(0)}
                    {limit > 0 && (
                      <Text style={{ color: colors.mutedForeground }}>/{limit}</Text>
                    )}
                  </Text>
                </View>
                <View style={[styles.bar, { backgroundColor: colors.muted }]}>
                  <View
                    style={[
                      styles.barFill,
                      {
                        width: `${pct}%` as any,
                        backgroundColor: isOver ? colors.destructive : CATEGORY_COLORS[cat],
                      },
                    ]}
                  />
                </View>
                {isOver && (
                  <Text style={[styles.overText, { color: colors.destructive }]}>
                    Over by ${(spent - limit).toFixed(0)}
                  </Text>
                )}
              </View>
            );
          })}
        </View>

        {insights.length > 0 && (
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>Smart Insights</Text>
            {insights.map((insight, i) => (
              <View key={i} style={[styles.insightRow, { borderBottomColor: colors.border }]}>
                <View style={[styles.insightBullet, { backgroundColor: colors.primary }]} />
                <Text style={[styles.insightText, { color: colors.foreground }]}>{insight}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
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
  toggle: {
    flexDirection: "row",
    borderRadius: 10,
    padding: 3,
  },
  toggleBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8 },
  toggleLabel: { fontSize: 13, fontFamily: "Inter_500Medium" },
  card: {
    borderRadius: 20,
    padding: 18,
    gap: 14,
  },
  cardTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  budgetRow: { gap: 6 },
  budgetMeta: { flexDirection: "row", alignItems: "center", gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  budgetCat: { flex: 1, fontSize: 13, fontFamily: "Inter_500Medium" },
  budgetSpent: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  bar: { height: 6, borderRadius: 3, overflow: "hidden" },
  barFill: { height: 6, borderRadius: 3 },
  overText: { fontSize: 11, fontFamily: "Inter_400Regular" },
  insightRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 10,
    borderBottomWidth: 1,
    gap: 10,
  },
  insightBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 5,
  },
  insightText: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular" },
});
