import api from "@/services/api";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
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

const formatWithCapitalMonth = (
  date: Date,
  locale: string,
  options: Intl.DateTimeFormatOptions,
): string => {
  try {
    const formatter = new Intl.DateTimeFormat(locale, options);
    const parts = formatter.formatToParts(date);
    return parts
      .map((part) => {
        if (part.type === "month" && part.value) {
          return part.value.charAt(0).toUpperCase() + part.value.slice(1);
        }
        return part.value;
      })
      .join("");
  } catch {
    return date.toLocaleDateString(locale, options);
  }
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

const parseRawDate = (dateString: string): Date => {
  const date = new Date(dateString);
  return isNaN(date.getTime()) ? new Date() : date;
};

const formatDate = (
  date: Date,
  locale: string,
  recentLabel: string,
): string => {
  if (isNaN(date.getTime())) return recentLabel;
  return formatWithCapitalMonth(date, locale, {
    month: "short",
    day: "numeric",
  });
};

export default function TransactionsScreen() {
  const { t, i18n } = useTranslation();
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
        api.get<UserProfile>("/api/v1/users/me"),
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
        const raw = parseRawDate(rawDateStr);
        const cat = item.category || "General";

        return {
          id: `exp-${item.id}`,
          title: item.description || item.title || "Expense",
          amount: Math.abs(parseAmount(numericValue)),
          category: cat,
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
        const raw = parseRawDate(rawDateStr);
        const cat = item.category || "Income";

        return {
          id: `inc-${item.id}`,
          title:
            item.description || item.title || item.source || "Income Deposit",
          amount: Math.abs(parseAmount(numericValue)),
          category: cat,
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

  const { totalIn, totalOut, netBalance } = useMemo(() => {
    let inSum = monthlyIncome;
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

  const translateCategory = useCallback(
    (category: string) => {
      const key = category.toLowerCase();
      return t(key, { defaultValue: category });
    },
    [t],
  );

  const getFilterLabel = useCallback(
    (filter: string) => {
      if (filter === "All") return t("all", "All");
      if (filter === "Income") return t("income", "INCOME");
      return translateCategory(filter);
    },
    [t, translateCategory],
  );

  const formattedHeaderDate = useMemo(() => {
    return formatWithCapitalMonth(new Date(), i18n.language, {
      month: "long",
      year: "numeric",
    });
  }, [i18n.language]);

  const renderHeader = () => (
    <View style={styles.headerWrapper}>
      <View style={styles.greenHeaderContainer}>
        <Text style={styles.headerTitle}>
          {t("transactions", "Transactions")}
        </Text>
        <Text style={styles.headerSubtitle}>
          {formattedHeaderDate} · {allTransactions.length}{" "}
          {t("records", "records")}
        </Text>

        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>{t("in", "IN")}</Text>
            <Text style={styles.summaryValue}>
              +$
              {totalIn.toLocaleString(i18n.language, {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              })}
            </Text>
          </View>

          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>{t("out", "OUT")}</Text>
            <Text style={styles.summaryValue}>
              -$
              {totalOut.toLocaleString(i18n.language, {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              })}
            </Text>
          </View>

          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>{t("net", "NET")}</Text>
            <Text style={styles.summaryValue}>
              {netBalance >= 0 ? "+" : "-"}$
              {Math.abs(netBalance).toLocaleString(i18n.language, {
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
                {getFilterLabel(item)}
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
          const formattedDate = formatDate(
            item.rawDate,
            i18n.language,
            t("recent", "Recent"),
          );
          const displayTitle =
            item.title === "Expense"
              ? t("expense", "Expense")
              : item.title === "Income Deposit"
                ? t("incomeDeposit", "Income Deposit")
                : item.title;

          return (
            <View style={styles.card}>
              <View style={styles.iconContainer}>
                <Text style={styles.iconEmoji}>{item.icon}</Text>
              </View>

              <View style={styles.cardDetails}>
                <Text style={styles.itemTitle} numberOfLines={1}>
                  {displayTitle}
                </Text>
                <View style={styles.tagRow}>
                  <View style={styles.categoryBadge}>
                    <Text
                      style={[
                        styles.categoryBadgeText,
                        isIncome && styles.incomeBadgeText,
                      ]}
                    >
                      {translateCategory(item.category)}
                    </Text>
                  </View>
                  <Text style={styles.dateText}>{formattedDate}</Text>
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
