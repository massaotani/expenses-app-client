import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../app/_layout";
import { colors } from "../constants/theme";
import api from "../services/api";

// 1. MATCHING YOUR EXACT SPRING BOOT DTO
export interface SpringBootExpense {
  id: number;
  description: string; // You used description instead of title
  value: number; // You used value instead of amount
  category: string;
  dueDate: string; // YYYY-MM-DD format
  isPaid: boolean;
  paymentType?: string;
}

export default function OverviewScreen() {
  const { token } = useAuth();
  const [loading, setLoading] = useState<boolean>(true);

  // Computed state for the Figma UI
  const [totalExpenses, setTotalExpenses] = useState<number>(0);
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  const [budgetItems, setBudgetItems] = useState<any[]>([]);

  // Mocking Income/Balance since your Spring Boot app currently only tracks Expenses
  const mockIncome = 7050.0;
  const totalBalance = mockIncome - totalExpenses;

  useEffect(() => {
    if (token) {
      fetchExpenses();
    }
  }, [token]);

  const fetchExpenses = async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      // 2. FETCH FROM YOUR EXISTING ENDPOINT
      const response = await api.get<SpringBootExpense[]>("/api/v1/expenses");
      processFigmaData(response.data);
    } catch (error) {
      console.error("API Error, falling back to mock data:", error);
      // Fallback data mapping to your Spring Boot structure so you can test UI without the server
      const mockData: SpringBootExpense[] = [
        {
          id: 1,
          description: "Whole Foods Market",
          value: 87.4,
          category: "Food",
          dueDate: "2026-07-31",
          isPaid: true,
        },
        {
          id: 2,
          description: "Netflix",
          value: 17.99,
          category: "Entertainment",
          dueDate: "2026-07-29",
          isPaid: true,
        },
        {
          id: 3,
          description: "Apartment Rent",
          value: 1450.0,
          category: "Housing",
          dueDate: "2026-07-28",
          isPaid: true,
        },
        {
          id: 4,
          description: "Uber",
          value: 14.2,
          category: "Transport",
          dueDate: "2026-07-27",
          isPaid: true,
        },
      ];
      processFigmaData(mockData);
    } finally {
      setLoading(false);
    }
  };

  // 3. TRANSFORM SPRING BOOT DATA INTO FIGMA UI DATA
  const processFigmaData = (data: SpringBootExpense[]) => {
    // A. Calculate Total Expenses
    const total = data.reduce((sum, item) => sum + item.value, 0);
    setTotalExpenses(total);

    // B. Group by Category for the "Budget Overview" card
    const budgetMap = data.reduce(
      (acc, item) => {
        acc[item.category] = (acc[item.category] || 0) + item.value;
        return acc;
      },
      {} as Record<string, number>,
    );

    const groupedBudgets = Object.keys(budgetMap).map((cat, index) => ({
      id: index.toString(),
      category: cat,
      spent: budgetMap[cat],
      limit: budgetMap[cat] + budgetMap[cat] * 0.2, // Mocking a budget limit 20% higher than spent
      color: getCategoryColor(cat),
    }));
    setBudgetItems(groupedBudgets);

    // C. Format for "Recent" list (Adapting your names to UI needs)
    const transactions = data.slice(0, 5).map((item) => ({
      id: item.id,
      title: item.description, // Mapping your 'description' to UI 'title'
      category: item.category,
      // Convert Spring Boot '2026-07-31' to UI 'Jul 31'
      date: new Date(`${item.dueDate}T00:00:00`).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      amount: item.value,
      emoji: getCategoryEmoji(item.category),
    }));
    setRecentTransactions(transactions);
  };

  // UI Helpers
  const getCategoryEmoji = (category: string) => {
    switch (category?.toLowerCase()) {
      case "food":
        return "🛒";
      case "housing":
        return "🏠";
      case "transport":
        return "🚗";
      case "entertainment":
        return "🎬";
      default:
        return "💳";
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category?.toLowerCase()) {
      case "housing":
        return colors.primaryTeal;
      case "food":
        return colors.primaryOrange;
      case "transport":
        return colors.sageTeal;
      default:
        return colors.softOrange;
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primaryTeal} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={colors.headerBackground}
      />
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* --- HEADER SECTION --- */}
        <View style={styles.header}>
          <Text style={styles.monthText}>JULY 2026</Text>
          <Text style={styles.greetingText}>Good morning, Alex.</Text>
          <Text style={styles.subtitleText}>
            Your finances are looking healthy.
          </Text>

          <View style={styles.balanceCard}>
            <Text style={styles.balanceLabel}>TOTAL BALANCE</Text>
            <Text style={styles.balanceAmount}>
              $
              {totalBalance.toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </Text>
            <Text style={styles.balanceTrend}>↑ 4.2% from last month</Text>
          </View>

          <View style={styles.dualCardRow}>
            <View style={[styles.miniCard, styles.flex1, { marginRight: 8 }]}>
              <Text style={styles.miniCardLabel}>INCOME</Text>
              <Text style={styles.miniCardValue}>
                ${mockIncome.toLocaleString()}
              </Text>
            </View>

            <View style={[styles.miniCard, styles.flex1, { marginLeft: 8 }]}>
              <Text style={styles.miniCardLabel}>EXPENSES</Text>
              <Text style={styles.miniCardValue}>
                ${totalExpenses.toLocaleString()}
              </Text>
            </View>
          </View>
        </View>

        {/* --- BODY CONTENT --- */}
        <View style={styles.body}>
          {/* Budget Overview */}
          <View style={styles.sectionCard}>
            <Text style={styles.cardTitle}>Budget Overview</Text>
            {budgetItems.map((item) => {
              const progressPercentage = Math.min(
                (item.spent / item.limit) * 100,
                100,
              );
              return (
                <View key={item.id} style={styles.budgetItem}>
                  <View style={styles.budgetHeader}>
                    <Text style={styles.budgetCategory}>{item.category}</Text>
                    <Text style={styles.budgetAmounts}>
                      ${item.spent.toFixed(0)}{" "}
                      <Text style={styles.budgetLimit}>
                        / ${item.limit.toFixed(0)}
                      </Text>
                    </Text>
                  </View>
                  <View style={styles.progressBarTrack}>
                    <View
                      style={[
                        styles.progressBarFill,
                        {
                          width: `${progressPercentage}%`,
                          backgroundColor: item.color,
                        },
                      ]}
                    />
                  </View>
                </View>
              );
            })}
          </View>

          {/* Recent Transactions */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.cardTitle}>Recent</Text>
              <TouchableOpacity>
                <Text style={styles.seeAllText}>See all →</Text>
              </TouchableOpacity>
            </View>

            {recentTransactions.map((tx) => (
              <View key={tx.id} style={styles.transactionRow}>
                <View style={styles.iconContainer}>
                  <Text style={styles.emojiText}>{tx.emoji}</Text>
                </View>

                <View style={styles.transactionMeta}>
                  <Text style={styles.transactionTitle}>{tx.title}</Text>
                  <Text style={styles.transactionSubtitle}>
                    {tx.category} · {tx.date}
                  </Text>
                </View>

                {/* All items fetched from /api/expenses are negative cash flow */}
                <Text style={[styles.transactionAmount, styles.expenseText]}>
                  -{tx.amount.toFixed(2)}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// Ensure you keep the exact same StyleSheet from the previous message here!
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.headerBackground },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.screenBackground,
  },
  flex1: { flex: 1 },
  header: {
    backgroundColor: colors.headerBackground,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
  },
  monthText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.textLightMuted,
    letterSpacing: 1.5,
  },
  greetingText: {
    fontSize: 28,
    fontWeight: "bold",
    color: colors.textLight,
    marginTop: 4,
  },
  subtitleText: {
    fontSize: 14,
    color: colors.textLightMuted,
    marginTop: 2,
    marginBottom: 20,
  },
  balanceCard: {
    backgroundColor: colors.headerCardOverlay,
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
  },
  balanceLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.textLightMuted,
    letterSpacing: 1.2,
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: "bold",
    color: colors.textLight,
    marginVertical: 6,
  },
  balanceTrend: { fontSize: 13, color: colors.textLightMuted },
  dualCardRow: { flexDirection: "row", justifyContent: "space-between" },
  miniCard: {
    backgroundColor: colors.headerCardOverlay,
    borderRadius: 12,
    padding: 16,
  },
  miniCardLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.textLightMuted,
    letterSpacing: 1,
  },
  miniCardValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: colors.textLight,
    marginTop: 6,
  },
  body: {
    backgroundColor: colors.screenBackground,
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 40,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  sectionCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: "bold",
    color: colors.textDark,
    marginBottom: 16,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  seeAllText: { fontSize: 13, fontWeight: "600", color: colors.primaryOrange },
  budgetItem: { marginBottom: 16 },
  budgetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  budgetCategory: { fontSize: 14, fontWeight: "600", color: colors.textDark },
  budgetAmounts: { fontSize: 13, fontWeight: "600", color: colors.textDark },
  budgetLimit: { color: colors.textMuted, fontWeight: "normal" },
  progressBarTrack: {
    height: 8,
    backgroundColor: colors.progressTrack,
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBarFill: { height: "100%", borderRadius: 4 },
  transactionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.screenBackground,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  emojiText: { fontSize: 20 },
  transactionMeta: { flex: 1 },
  transactionTitle: { fontSize: 15, fontWeight: "600", color: colors.textDark },
  transactionSubtitle: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  transactionAmount: { fontSize: 15, fontWeight: "bold" },
  incomeText: { color: colors.primaryTeal },
  expenseText: { color: colors.textDark },
});
