import React, { useMemo, useState } from "react";
import {
  DimensionValue,
  Dimensions,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BarChart, PieChart } from "react-native-chart-kit";
import { Ionicons } from "@expo/vector-icons";
import { CATEGORIES, CATEGORY_COLORS, Category, useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

type Period = "week" | "month";

const SCREEN_WIDTH = Dimensions.get("window").width;

export default function AnalyticsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { expenses, budget, accounts, currentMonth, getInsights } = useApp();
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

  const categoryTotals = useMemo((): Record<Category, number> => {
    const d: Record<Category, number> = {
      Food: 0, Transport: 0, Subscriptions: 0,
      Shopping: 0, Education: 0, Miscellaneous: 0,
    };
    filteredExpenses.forEach((e) => { d[e.category] += e.amount; });
    return d;
  }, [filteredExpenses]);

  const pieData = useMemo(() => {
    return CATEGORIES
      .filter((c) => categoryTotals[c] > 0)
      .map((c) => ({
        name: c,
        population: categoryTotals[c],
        color: CATEGORY_COLORS[c],
        legendFontColor: colors.mutedForeground,
        legendFontSize: 12,
      }));
  }, [categoryTotals, colors]);

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
    return {
      labels: days.map((d) => d.slice(0, 1)),
      datasets: [{ data: days.map((d) => totals[d] || 0) }],
    };
  }, [expenses]);

  const sourceTotals = useMemo(() => {
    const result: { id: string; name: string; icon: string; color: string; total: number }[] = [];
    accounts.forEach((a) => {
      const total = filteredExpenses
        .filter((e) => e.sourceId === a.id)
        .reduce((s, e) => s + e.amount, 0);
      if (total > 0) result.push({ id: a.id, name: a.name, icon: a.icon, color: a.color, total });
    });
    const untagged = filteredExpenses
      .filter((e) => !e.sourceId)
      .reduce((s, e) => s + e.amount, 0);
    if (untagged > 0) result.push({ id: "_none", name: "Untagged", icon: "ellipsis-horizontal-outline", color: "#94A3B8", total: untagged });
    return result.sort((a, b) => b.total - a.total);
  }, [filteredExpenses, accounts]);

  const chartConfig = {
    backgroundColor: colors.card,
    backgroundGradientFrom: colors.card,
    backgroundGradientTo: colors.card,
    decimalPlaces: 0,
    color: (opacity = 1) => `${colors.primary}${Math.round(opacity * 255).toString(16).padStart(2, "0")}`,
    labelColor: () => colors.mutedForeground,
    barPercentage: 0.6,
    propsForBackgroundLines: { stroke: colors.border, strokeWidth: 1 },
    style: { borderRadius: 12 },
  };

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
        {pieData.length > 0 && (
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>Category Breakdown</Text>
            <PieChart
              data={pieData}
              width={SCREEN_WIDTH - 64}
              height={180}
              chartConfig={chartConfig}
              accessor="population"
              backgroundColor="transparent"
              paddingLeft="12"
              hasLegend
            />
          </View>
        )}

        {pieData.length === 0 && (
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>Category Breakdown</Text>
            <View style={[styles.emptyChart, { borderColor: colors.border }]}>
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No expenses this period</Text>
            </View>
          </View>
        )}

        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>Weekly Spending</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <BarChart
              data={weeklyBarData}
              width={Math.max(SCREEN_WIDTH - 64, weeklyBarData.labels.length * 60)}
              height={160}
              chartConfig={chartConfig}
              style={{ borderRadius: 12 }}
              showValuesOnTopOfBars={false}
              withInnerLines
              fromZero
              yAxisLabel="$"
              yAxisSuffix=""
            />
          </ScrollView>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>Budget vs Actual</Text>
          {CATEGORIES.map((cat) => {
            const spent = categoryTotals[cat];
            const limit = budget.categoryLimits[cat];
            if (limit === 0 && spent === 0) return null;
            const isOver = spent > limit && limit > 0;
            const pct = limit > 0 ? Math.min((spent / limit) * 100, 100) : 0;
            return (
              <View key={cat} style={styles.budgetRow}>
                <View style={styles.budgetMeta}>
                  <View style={[styles.dot, { backgroundColor: CATEGORY_COLORS[cat] }]} />
                  <Text style={[styles.budgetCat, { color: colors.foreground }]}>{cat}</Text>
                  <Text style={[styles.budgetSpent, { color: isOver ? colors.destructive : colors.foreground }]}>
                    ${spent.toFixed(0)}
                    {limit > 0 && <Text style={{ color: colors.mutedForeground }}>/{limit}</Text>}
                  </Text>
                </View>
                <View style={[styles.bar, { backgroundColor: colors.muted }]}>
                  <View
                    style={[
                      styles.barFill,
                      {
                        width: `${pct}%` as DimensionValue,
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

        {sourceTotals.length > 0 && (
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>Spending by Account</Text>
            {sourceTotals.map((s) => {
              const maxTotal = sourceTotals[0]?.total ?? 1;
              const pct = maxTotal > 0 ? (s.total / maxTotal) * 100 : 0;
              return (
                <View key={s.id} style={styles.budgetRow}>
                  <View style={styles.budgetMeta}>
                    <Ionicons name={s.icon as "card-outline"} size={15} color={s.color} />
                    <Text style={[styles.budgetCat, { color: colors.foreground }]}>{s.name}</Text>
                    <Text style={[styles.budgetSpent, { color: colors.foreground }]}>${s.total.toFixed(0)}</Text>
                  </View>
                  <View style={[styles.bar, { backgroundColor: colors.muted }]}>
                    <View style={[styles.barFill, { width: `${pct}%` as DimensionValue, backgroundColor: s.color }]} />
                  </View>
                </View>
              );
            })}
          </View>
        )}

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
  toggle: { flexDirection: "row", borderRadius: 10, padding: 3 },
  toggleBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8 },
  toggleLabel: { fontSize: 13, fontFamily: "Inter_500Medium" },
  card: { borderRadius: 20, padding: 18, gap: 14 },
  cardTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  emptyChart: {
    height: 120, borderWidth: 1, borderStyle: "dashed", borderRadius: 12,
    alignItems: "center", justifyContent: "center",
  },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  budgetRow: { gap: 6 },
  budgetMeta: { flexDirection: "row", alignItems: "center", gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  budgetCat: { flex: 1, fontSize: 13, fontFamily: "Inter_500Medium" },
  budgetSpent: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  bar: { height: 6, borderRadius: 3, overflow: "hidden" },
  barFill: { height: 6, borderRadius: 3 },
  overText: { fontSize: 11, fontFamily: "Inter_400Regular" },
  insightRow: {
    flexDirection: "row", alignItems: "flex-start",
    paddingVertical: 10, borderBottomWidth: 1, gap: 10,
  },
  insightBullet: { width: 6, height: 6, borderRadius: 3, marginTop: 5 },
  insightText: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular" },
});
