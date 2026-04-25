import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  FlatList,
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
  useApp,
} from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

type SortOption = "date-desc" | "date-asc" | "amount-desc" | "amount-asc" | "category-asc";

const SORT_LABELS: Record<SortOption, string> = {
  "date-desc": "Newest First",
  "date-asc": "Oldest First",
  "amount-desc": "Highest Amount",
  "amount-asc": "Lowest Amount",
  "category-asc": "Category A–Z",
};

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export default function TransactionsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { expenses, accounts, deleteExpense } = useApp();

  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("date-desc");
  const [selectedCategory, setSelectedCategory] = useState<Category | "All">("All");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showSortModal, setShowSortModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [tempDateFrom, setTempDateFrom] = useState("");
  const [tempDateTo, setTempDateTo] = useState("");
  const [tempCategory, setTempCategory] = useState<Category | "All">("All");
  const [dateError, setDateError] = useState("");

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const filtered = useMemo(() => {
    let result = [...expenses];

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(
        (e) =>
          e.description.toLowerCase().includes(q) ||
          e.category.toLowerCase().includes(q) ||
          e.amount.toFixed(2).includes(q) ||
          e.amount.toString().includes(q)
      );
    }

    if (selectedCategory !== "All") {
      result = result.filter((e) => e.category === selectedCategory);
    }

    if (dateFrom) {
      result = result.filter((e) => e.date >= dateFrom);
    }

    if (dateTo) {
      result = result.filter((e) => e.date <= dateTo);
    }

    switch (sortBy) {
      case "date-desc":
        result.sort((a, b) => b.date.localeCompare(a.date));
        break;
      case "date-asc":
        result.sort((a, b) => a.date.localeCompare(b.date));
        break;
      case "amount-desc":
        result.sort((a, b) => b.amount - a.amount);
        break;
      case "amount-asc":
        result.sort((a, b) => a.amount - b.amount);
        break;
      case "category-asc":
        result.sort((a, b) => a.category.localeCompare(b.category));
        break;
    }

    return result;
  }, [expenses, searchQuery, selectedCategory, dateFrom, dateTo, sortBy]);

  const hasActiveFilters = selectedCategory !== "All" || dateFrom !== "" || dateTo !== "";
  const totalFiltered = filtered.reduce((s, e) => s + e.amount, 0);

  const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

  function isValidDate(s: string): boolean {
    if (!DATE_RE.test(s)) return false;
    const d = new Date(s);
    return !isNaN(d.getTime());
  }

  function applyFilters() {
    if (tempDateFrom && !isValidDate(tempDateFrom)) {
      setDateError("'From' date must be YYYY-MM-DD (e.g. 2026-01-01)");
      return;
    }
    if (tempDateTo && !isValidDate(tempDateTo)) {
      setDateError("'To' date must be YYYY-MM-DD (e.g. 2026-04-30)");
      return;
    }
    if (tempDateFrom && tempDateTo && tempDateFrom > tempDateTo) {
      setDateError("'From' date must be before 'To' date");
      return;
    }
    setDateError("");
    setSelectedCategory(tempCategory);
    setDateFrom(tempDateFrom);
    setDateTo(tempDateTo);
    setShowFilterModal(false);
  }

  function resetFilters() {
    setTempCategory("All");
    setTempDateFrom("");
    setTempDateTo("");
  }

  function openFilterModal() {
    setTempCategory(selectedCategory);
    setTempDateFrom(dateFrom);
    setTempDateTo(dateTo);
    setDateError("");
    setShowFilterModal(true);
  }

  function setQuickRange(days: number) {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - days + 1);
    setTempDateFrom(formatDate(from));
    setTempDateTo(formatDate(to));
  }

  function setThisMonth() {
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    setTempDateFrom(formatDate(from));
    setTempDateTo(formatDate(now));
  }

  function setLastMonth() {
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const to = new Date(now.getFullYear(), now.getMonth(), 0);
    setTempDateFrom(formatDate(from));
    setTempDateTo(formatDate(to));
  }

  function clearDateRange() {
    setTempDateFrom("");
    setTempDateTo("");
  }

  const renderItem = ({ item: e }: { item: Expense }) => {
    const srcAccount = accounts.find((a) => a.id === e.sourceId);
    return (
      <View style={[styles.expenseItem, { backgroundColor: colors.card }]}>
        <View
          style={[
            styles.expenseIcon,
            { backgroundColor: CATEGORY_COLORS[e.category as Category] + "22" },
          ]}
        >
          <Ionicons
            name="receipt-outline"
            size={16}
            color={CATEGORY_COLORS[e.category as Category]}
          />
        </View>
        <View style={styles.expenseInfo}>
          <Text
            style={[styles.expenseDesc, { color: colors.foreground }]}
            numberOfLines={1}
          >
            {e.description || e.category}
          </Text>
          <View style={{ flexDirection: "row", gap: 6, alignItems: "center" }}>
            <Text style={[styles.expenseMeta, { color: colors.mutedForeground }]}>
              {e.date}
            </Text>
            {srcAccount && (
              <>
                <Text style={[styles.expenseMeta, { color: colors.mutedForeground }]}>·</Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                  <Ionicons
                    name={srcAccount.icon as "card-outline"}
                    size={10}
                    color={srcAccount.color}
                  />
                  <Text style={[styles.expenseMeta, { color: srcAccount.color }]}>
                    {srcAccount.name}
                  </Text>
                </View>
              </>
            )}
          </View>
        </View>
        <View style={styles.expenseRight}>
          <Text style={[styles.expenseAmount, { color: colors.foreground }]}>
            -${e.amount.toFixed(2)}
          </Text>
          <View style={{ flexDirection: "row", gap: 4, alignItems: "center" }}>
            {e.isRecurring && (
              <Ionicons name="repeat" size={11} color={colors.mutedForeground} />
            )}
            <Text
              style={[
                styles.expenseCategory,
                {
                  backgroundColor: CATEGORY_COLORS[e.category as Category] + "22",
                  color: CATEGORY_COLORS[e.category as Category],
                },
              ]}
            >
              {e.category}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={() => deleteExpense(e.id)}
        >
          <Ionicons name="trash-outline" size={15} color={colors.destructive} />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          { paddingTop: topPad + 12, backgroundColor: colors.background },
        ]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          All Transactions
        </Text>
        <View style={{ width: 34 }} />
      </View>

      <View style={[styles.searchRow, { paddingHorizontal: 16 }]}>
        <View
          style={[
            styles.searchBar,
            { backgroundColor: colors.card, borderColor: colors.border, flex: 1 },
          ]}
        >
          <Ionicons name="search" size={16} color={colors.mutedForeground} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search by name, category, or amount…"
            placeholderTextColor={colors.mutedForeground}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Ionicons name="close-circle" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={[
            styles.iconBtn,
            {
              backgroundColor: hasActiveFilters ? colors.primary + "20" : colors.card,
              borderColor: hasActiveFilters ? colors.primary : colors.border,
            },
          ]}
          onPress={openFilterModal}
        >
          <Ionicons
            name="options-outline"
            size={19}
            color={hasActiveFilters ? colors.primary : colors.mutedForeground}
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.iconBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => setShowSortModal(true)}
        >
          <Ionicons name="swap-vertical-outline" size={19} color={colors.mutedForeground} />
        </TouchableOpacity>
      </View>

      {(hasActiveFilters || searchQuery.trim()) && (
        <View style={[styles.summaryRow, { paddingHorizontal: 16 }]}>
          <Text style={[styles.summaryText, { color: colors.mutedForeground }]}>
            {filtered.length} result{filtered.length !== 1 ? "s" : ""} · Total: ${totalFiltered.toFixed(2)}
          </Text>
          {hasActiveFilters && (
            <TouchableOpacity
              onPress={() => {
                setSelectedCategory("All");
                setDateFrom("");
                setDateTo("");
              }}
            >
              <Text style={[styles.clearText, { color: colors.primary }]}>Clear filters</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {filtered.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="receipt-outline" size={48} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
            No transactions found
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>
            {searchQuery || hasActiveFilters
              ? "Try adjusting your search or filters"
              : "Add your first expense from the home screen"}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(e) => e.id}
          renderItem={renderItem}
          contentContainerStyle={[
            styles.list,
            { paddingBottom: bottomPad + 20 },
          ]}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        />
      )}

      <Modal
        visible={showSortModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSortModal(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowSortModal(false)}
        >
          <View
            style={[styles.sortSheet, { backgroundColor: colors.card }]}
            onStartShouldSetResponder={() => true}
          >
            <Text style={[styles.sheetTitle, { color: colors.foreground }]}>Sort By</Text>
            {(Object.keys(SORT_LABELS) as SortOption[]).map((opt) => (
              <TouchableOpacity
                key={opt}
                style={[
                  styles.sortOption,
                  sortBy === opt && { backgroundColor: colors.primary + "15" },
                ]}
                onPress={() => {
                  setSortBy(opt);
                  setShowSortModal(false);
                }}
              >
                <Text
                  style={[
                    styles.sortLabel,
                    { color: sortBy === opt ? colors.primary : colors.foreground },
                  ]}
                >
                  {SORT_LABELS[opt]}
                </Text>
                {sortBy === opt && (
                  <Ionicons name="checkmark" size={18} color={colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>

      <Modal
        visible={showFilterModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFilterModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowFilterModal(false)}>
          <View
            style={[styles.filterSheet, { backgroundColor: colors.card }]}
            onStartShouldSetResponder={() => true}
          >
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: colors.foreground }]}>Filter</Text>
              <TouchableOpacity onPress={resetFilters}>
                <Text style={[styles.resetText, { color: colors.mutedForeground }]}>Reset</Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.filterSectionLabel, { color: colors.mutedForeground }]}>
              Category
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginBottom: 16 }}
            >
              {(["All", ...CATEGORIES] as (Category | "All")[]).map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.catChip,
                    {
                      backgroundColor:
                        tempCategory === cat
                          ? (cat === "All" ? colors.primary : CATEGORY_COLORS[cat as Category]) + "25"
                          : colors.background,
                      borderColor:
                        tempCategory === cat
                          ? cat === "All"
                            ? colors.primary
                            : CATEGORY_COLORS[cat as Category]
                          : colors.border,
                    },
                  ]}
                  onPress={() => setTempCategory(cat)}
                >
                  {cat !== "All" && (
                    <View
                      style={[
                        styles.catChipDot,
                        { backgroundColor: CATEGORY_COLORS[cat as Category] },
                      ]}
                    />
                  )}
                  <Text
                    style={[
                      styles.catChipText,
                      {
                        color:
                          tempCategory === cat
                            ? cat === "All"
                              ? colors.primary
                              : CATEGORY_COLORS[cat as Category]
                            : colors.mutedForeground,
                      },
                    ]}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={[styles.filterSectionLabel, { color: colors.mutedForeground }]}>
              Date Range
            </Text>
            <View style={styles.quickRangeRow}>
              {[
                { label: "7d", action: () => setQuickRange(7) },
                { label: "30d", action: () => setQuickRange(30) },
                { label: "This month", action: setThisMonth },
                { label: "Last month", action: setLastMonth },
              ].map(({ label, action }) => (
                <TouchableOpacity
                  key={label}
                  style={[
                    styles.quickRangeBtn,
                    { backgroundColor: colors.background, borderColor: colors.border },
                  ]}
                  onPress={action}
                >
                  <Text style={[styles.quickRangeText, { color: colors.foreground }]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.dateRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.dateLabel, { color: colors.mutedForeground }]}>From</Text>
                <TextInput
                  style={[
                    styles.dateInput,
                    { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background },
                  ]}
                  value={tempDateFrom}
                  onChangeText={setTempDateFrom}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.mutedForeground}
                  maxLength={10}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.dateLabel, { color: colors.mutedForeground }]}>To</Text>
                <TextInput
                  style={[
                    styles.dateInput,
                    { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background },
                  ]}
                  value={tempDateTo}
                  onChangeText={setTempDateTo}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.mutedForeground}
                  maxLength={10}
                />
              </View>
            </View>
            {dateError ? (
              <Text style={[styles.dateErrorText, { color: colors.destructive }]}>
                {dateError}
              </Text>
            ) : null}
            {(tempDateFrom || tempDateTo) && (
              <TouchableOpacity onPress={clearDateRange} style={{ marginBottom: 8 }}>
                <Text style={[styles.clearText, { color: colors.mutedForeground }]}>
                  Clear date range
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.applyBtn, { backgroundColor: colors.primary }]}
              onPress={applyFilters}
            >
              <Text style={[styles.applyBtnText, { color: colors.background }]}>
                Apply Filters
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
  },
  searchInput: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular" },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  summaryText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  clearText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  list: { paddingHorizontal: 16, paddingTop: 4 },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: 40,
  },
  emptyTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", textAlign: "center" },
  emptySubtitle: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 20,
  },
  expenseItem: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    padding: 14,
    gap: 12,
  },
  expenseIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  expenseInfo: { flex: 1, gap: 3 },
  expenseDesc: { fontSize: 14, fontFamily: "Inter_500Medium" },
  expenseMeta: { fontSize: 11, fontFamily: "Inter_400Regular" },
  expenseRight: { alignItems: "flex-end", gap: 4 },
  expenseAmount: { fontSize: 15, fontFamily: "Inter_700Bold" },
  expenseCategory: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  deleteBtn: { padding: 6 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  sortSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    gap: 4,
  },
  filterSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sheetTitle: { fontSize: 17, fontFamily: "Inter_700Bold" },
  resetText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  sortOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  sortLabel: { fontSize: 15, fontFamily: "Inter_400Regular" },
  filterSectionLabel: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  catChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  catChipDot: { width: 7, height: 7, borderRadius: 3.5 },
  catChipText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  quickRangeRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 14,
    flexWrap: "wrap",
  },
  quickRangeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  quickRangeText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  dateRow: { flexDirection: "row", gap: 10, marginBottom: 8 },
  dateLabel: { fontSize: 12, fontFamily: "Inter_500Medium", marginBottom: 6 },
  dateInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  dateErrorText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginBottom: 8,
  },
  applyBtn: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  applyBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
});
