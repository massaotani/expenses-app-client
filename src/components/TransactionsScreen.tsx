import api from "@/services/api";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface ExpenseItem {
  id: string;
  description?: string;
  title?: string;
  value?: number | string;
  amount?: number | string;
  category: string;
  dueDate?: string;
  paidAt?: string;
  date?: string;
}

interface IncomeItem {
  id: string;
  description?: string;
  title?: string;
  source?: string;
  value?: number | string;
  amount?: number | string;
  category?: string;
  createdAt?: string;
  date?: string;
}

interface UserProfile {
  monthlyIncome?: number | string;
}

export interface Transaction {
  id: string;
  title: string;
  amount: number;
  category: string;
  dateFormatted: string;
  rawDate: Date;
  type: "INCOME" | "EXPENSE";
  icon: string;
}

const parseAmount = (val: any): number => {
  if (typeof val === "number") return isNaN(val) ? 0 : val;
  if (typeof val === "string") {
    const parsed = parseFloat(val);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
};

const getCategoryIcon = (
  category: string,
  type: "INCOME" | "EXPENSE",
): string => {
  if (type === "INCOME") return "💼";
  const cat = (category || "").toLowerCase();
  if (cat.includes("food") || cat.includes("grocer")) return "🛒";
  if (cat.includes("house") || cat.includes("rent")) return "🏠";
  if (cat.includes("transp") || cat.includes("uber") || cat.includes("travel"))
    return "🚗";
  if (
    cat.includes("entertain") ||
    cat.includes("stream") ||
    cat.includes("movie")
  )
    return "🎬";
  return "💳";
};

const formatDate = (dateString: string): { formatted: string; raw: Date } => {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    return { formatted: "Recent", raw: new Date() };
  }
  const formatted = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  return { formatted, raw: date };
};

export default function TransactionsScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<string>("All");
  const [monthlyIncome, setMonthlyIncome] = useState<number>(0);

  const fetchData = async () => {
    try {
      const [expensesRes, incomesRes, userRes] = await Promise.allSettled([
        api.get<ExpenseItem[]>("/api/v1/expenses"),
        api.get<IncomeItem[]>("/api/v1/incomes"),
        api.get<UserProfile>("/api/v1/users/me"), // Fetch base user profile
      ]);

      const expensesData =
        expensesRes.status === "fulfilled" ? expensesRes.value.data : [];
      const incomesData =
        incomesRes.status === "fulfilled" ? incomesRes.value.data : [];

      if (userRes.status === "fulfilled" && userRes.value.data?.monthlyIncome) {
        setMonthlyIncome(parseAmount(userRes.value.data.monthlyIncome));
      }

      const parsedExpenses: Transaction[] = (
        Array.isArray(expensesData) ? expensesData : []
      ).map((item) => {
        const numericValue = item.value ?? item.amount;
        const rawDateStr = item.dueDate || item.paidAt || item.date || "";
        const { formatted, raw } = formatDate(rawDateStr);
        const cat = item.category || "General";

        return {
          id: `exp-${item.id}`,
          title: item.description || item.title || "Expense",
          amount: Math.abs(parseAmount(numericValue)),
          category: cat,
          dateFormatted: formatted,
          rawDate: raw,
          type: "EXPENSE",
          icon: getCategoryIcon(cat, "EXPENSE"),
        };
      });

      const parsedIncomes: Transaction[] = (
        Array.isArray(incomesData) ? incomesData : []
      ).map((item) => {
        const numericValue = item.value ?? item.amount;
        const rawDateStr = item.createdAt || item.date || "";
        const { formatted, raw } = formatDate(rawDateStr);
        const cat = item.category || "Income";

        return {
          id: `inc-${item.id}`,
          title:
            item.description || item.title || item.source || "Income Deposit",
          amount: Math.abs(parseAmount(numericValue)),
          category: cat,
          dateFormatted: formatted,
          rawDate: raw,
          type: "INCOME",
          icon: getCategoryIcon(cat, "INCOME"),
        };
      });

      const combined = [...parsedExpenses, ...parsedIncomes].sort(
        (a, b) => b.rawDate.getTime() - a.rawDate.getTime(),
      );

      setAllTransactions(combined);
    } catch (error) {
      console.error("Error fetching transactions:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, []);

  // Compute summary values including monthly income base
  const { totalIn, totalOut, netBalance } = useMemo(() => {
    let inSum = monthlyIncome; // Start with base monthly income
    let outSum = 0;
    allTransactions.forEach((t) => {
      if (t.type === "INCOME") inSum += t.amount;
      else outSum += t.amount;
    });
    return {
      totalIn: inSum,
      totalOut: outSum,
      netBalance: inSum - outSum,
    };
  }, [allTransactions, monthlyIncome]);

  const filterCategories = useMemo(() => {
    const categoriesSet = new Set<string>();
    allTransactions.forEach((t) => {
      if (t.type === "EXPENSE" && t.category) {
        categoriesSet.add(t.category);
      }
    });
    return ["All", "Income", ...Array.from(categoriesSet)];
  }, [allTransactions]);

  const filteredTransactions = useMemo(() => {
    if (selectedFilter === "All") return allTransactions;
    if (selectedFilter === "Income")
      return allTransactions.filter((t) => t.type === "INCOME");
    return allTransactions.filter(
      (t) =>
        t.type === "EXPENSE" &&
        t.category.toLowerCase() === selectedFilter.toLowerCase(),
    );
  }, [allTransactions, selectedFilter]);

  const renderHeader = () => (
    <View style={styles.headerWrapper}>
      <View style={styles.greenHeaderContainer}>
        <Text style={styles.headerTitle}>Transactions</Text>
        <Text style={styles.headerSubtitle}>
          {new Date().toLocaleDateString("en-US", {
            month: "long",
            year: "numeric",
          })}{" "}
          · {allTransactions.length} records
        </Text>

        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>IN</Text>
            <Text style={styles.summaryValue}>
              +$
              {totalIn.toLocaleString("en-US", {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              })}
            </Text>
          </View>

          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>OUT</Text>
            <Text style={styles.summaryValue}>
              -$
              {totalOut.toLocaleString("en-US", {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              })}
            </Text>
          </View>

          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>NET</Text>
            <Text style={styles.summaryValue}>
              {netBalance >= 0 ? "+" : "-"}$
              {Math.abs(netBalance).toLocaleString("en-US", {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              })}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterListContainer}
      >
        {filterCategories.map((item) => {
          const isActive = selectedFilter.toLowerCase() === item.toLowerCase();
          return (
            <TouchableOpacity
              key={item}
              style={[styles.filterChip, isActive && styles.filterChipActive]}
              onPress={() => setSelectedFilter(item)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.filterChipText,
                  isActive && styles.filterChipTextActive,
                ]}
              >
                {item}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#204B4C" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#204B4C" />
      <FlatList
        data={filteredTransactions}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader()}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#FFFFFF"
          />
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const isIncome = item.type === "INCOME";
          return (
            <View style={styles.card}>
              <View style={styles.iconContainer}>
                <Text style={styles.iconEmoji}>{item.icon}</Text>
              </View>

              <View style={styles.cardDetails}>
                <Text style={styles.itemTitle} numberOfLines={1}>
                  {item.title}
                </Text>
                <View style={styles.tagRow}>
                  <View style={styles.categoryBadge}>
                    <Text
                      style={[
                        styles.categoryBadgeText,
                        isIncome && styles.incomeBadgeText,
                      ]}
                    >
                      {item.category}
                    </Text>
                  </View>
                  <Text style={styles.dateText}>{item.dateFormatted}</Text>
                </View>
              </View>

              <Text
                style={[
                  styles.amountText,
                  isIncome ? styles.incomeAmount : styles.expenseAmount,
                ]}
              >
                {isIncome
                  ? `+${item.amount.toFixed(2)}`
                  : `-${item.amount.toFixed(2)}`}
              </Text>
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#204B4C",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F4F1EA",
  },
  listContent: {
    backgroundColor: "#F4F1EA",
    flexGrow: 1,
    paddingBottom: 40,
  },
  headerWrapper: {
    backgroundColor: "#F4F1EA",
  },
  greenHeaderContainer: {
    backgroundColor: "#204B4C",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 28,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.7)",
    marginTop: 4,
    marginBottom: 20,
  },
  summaryRow: {
    flexDirection: "row",
    gap: 10,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "rgba(255, 255, 255, 0.6)",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  filterListContainer: {
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#F4F1EA",
  },
  filterChip: {
    backgroundColor: "#EBE6DD",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
  },
  filterChipActive: {
    backgroundColor: "#1C3637",
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4A4A4A",
  },
  filterChipTextActive: {
    color: "#FFFFFF",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#EAE6DF",
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#F2EFE9",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  iconEmoji: {
    fontSize: 22,
  },
  cardDetails: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1C1C1E",
    marginBottom: 6,
  },
  tagRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  categoryBadge: {
    backgroundColor: "#EFECE6",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  categoryBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6E6B64",
  },
  incomeBadgeText: {
    color: "#1E6B5C",
  },
  dateText: {
    fontSize: 12,
    color: "#8E8E93",
    fontWeight: "500",
  },
  amountText: {
    fontSize: 16,
    fontWeight: "700",
  },
  expenseAmount: {
    color: "#1C1C1E",
  },
  incomeAmount: {
    color: "#1E6B5C",
  },
});
