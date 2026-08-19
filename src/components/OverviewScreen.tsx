import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../app/_layout";
import { colors } from "../constants/theme";
import api from "../services/api";

export interface SpringBootExpense {
  id?: string;
  description: string;
  value: number;
  category: string;
  dueDate: string;
  isPaid: boolean;
  paidAt?: string | null;
  paymentType: "CASH" | "CARD";
  recurrencePeriod: "NONE" | "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";
  cardId?: string | null;
}

export interface UserProfile {
  id: string;
  name: string;
  monthlyIncome: number;
  investmentPot: number;
  monthlyExpenses: number;
}

export interface SpringBootIncome {
  id: string;
  description: string;
  value: number;
  createdAt: string;
}

const CATEGORIES = [
  "Food",
  "Housing",
  "Transportation",
  "Entertainment",
  "Utilities",
];

// const INCOME_CATEGORIES = [
//   "Salary",
//   "Freelance",
//   "Investments",
//   "Gift",
//   "Other",
// ];

export default function OverviewScreen() {
  const { token } = useAuth();
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // User State
  const [userName, setUserName] = useState<string>("");
  const [monthlyIncome, setMonthlyIncome] = useState<number>(0);
  const [investmentPot, setInvestmentPot] = useState<number>(0);

  // Expense Data States
  const [totalExpenses, setTotalExpenses] = useState<number>(0);
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  const [budgetItems, setBudgetItems] = useState<any[]>([]);

  // Expense Modal States
  const [modalExpensesVisible, setModalExpensesVisible] =
    useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [description, setDescription] = useState("");
  const [value, setValue] = useState("");
  const [category, setCategory] = useState("Food");
  const [isPaid, setIsPaid] = useState(true);
  const [paymentType, setPaymentType] = useState<"CASH" | "CARD">("CASH");
  const [recurrencePeriod, setRecurrencePeriod] = useState<
    "NONE" | "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY"
  >("NONE");

  // Income Modal States
  const [modalIncomeVisible, setModalIncomeVisible] = useState<boolean>(false);
  const [submittingIncome, setSubmittingIncome] = useState<boolean>(false);
  const [incomeSource, setIncomeSource] = useState("");
  const [incomeValue, setIncomeValue] = useState("");
  const [incomes, setIncomes] = useState<SpringBootIncome[]>([]);
  // const [incomeCategory, setIncomeCategory] = useState("Salary");
  // const [incomePaymentType, setIncomePaymentType] = useState<"CASH" | "CARD">(
  //   "CARD",
  // );

  // Dynamic Total Balance: Monthly Income - Dynamic Expenses
  const totalBalance = monthlyIncome - totalExpenses;

  useEffect(() => {
    if (token) {
      fetchAllData();
    }
  }, [token]);

  const fetchAllData = async () => {
    try {
      const [expensesRes, userRes, incomesRes] = await Promise.allSettled([
        api.get<SpringBootExpense[]>("/api/v1/expenses"),
        api.get<UserProfile>("/api/v1/users/me"),
        api.get<SpringBootIncome[]>("/api/v1/incomes"),
      ]);

      const fetchedExpenses =
        expensesRes.status === "fulfilled" ? expensesRes.value.data : [];
      const fetchedIncomes =
        incomesRes.status === "fulfilled" ? incomesRes.value.data : [];

      if (userRes.status === "fulfilled") {
        const user = userRes.value.data;
        setUserName(user.name || "");
        setMonthlyIncome(user.monthlyIncome || 0);
        setInvestmentPot(user.investmentPot || 0);
      }

      if (incomesRes.status === "fulfilled") {
        setIncomes(fetchedIncomes);
      }

      // Process both expenses and deposits together
      processFigmaData(fetchedExpenses, fetchedIncomes);
    } catch (error) {
      console.error("API Error fetching dashboard data:", error);
      Alert.alert("Network Error", "Could not fetch data from server.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  const processFigmaData = (
    expenses: SpringBootExpense[],
    incomesList: SpringBootIncome[],
  ) => {
    // 1. Process Expense Total & Budgets
    const total = expenses.reduce((sum, item) => sum + item.value, 0);
    setTotalExpenses(total);

    const budgetMap = expenses.reduce(
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
      limit: budgetMap[cat] + budgetMap[cat] * 0.2,
      color: getCategoryColor(cat),
    }));
    setBudgetItems(groupedBudgets);

    // 2. Map Expenses to Transaction Format
    const formattedExpenses = expenses.map((item) => ({
      id: `exp-${item.id || Math.random()}`,
      type: "EXPENSE" as const,
      title: item.description,
      category: item.category,
      rawDate: item.dueDate ? new Date(item.dueDate) : new Date(),
      date: item.dueDate
        ? new Date(item.dueDate).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          })
        : "Today",
      amount: item.value,
      emoji: getCategoryEmoji(item.category),
    }));

    // 3. Map Incomes to Transaction Format
    const formattedIncomes = incomesList.map((item) => ({
      id: `inc-${item.id || Math.random()}`,
      type: "INCOME" as const,
      title: item.description,
      category: "Deposit",
      rawDate: item.createdAt ? new Date(item.createdAt) : new Date(),
      date: item.createdAt
        ? new Date(item.createdAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          })
        : "Today",
      amount: item.value,
      emoji: "💰",
    }));

    // 4. Merge & Sort by Most Recent
    const combined = [...formattedExpenses, ...formattedIncomes].sort(
      (a, b) => b.rawDate.getTime() - a.rawDate.getTime(),
    );

    setRecentTransactions(combined.slice(0, 5));
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchAllData();
  };

  const handleAddIncome = async () => {
    const deposit = parseFloat(incomeValue);

    if (
      !incomeSource.trim() ||
      !incomeValue.trim() ||
      isNaN(deposit) ||
      deposit <= 0
    ) {
      Alert.alert(
        "Validation Error",
        "Please enter a valid description and deposit amount.",
      );
      return;
    }

    setSubmittingIncome(true);

    try {
      // Matches IncomeDepositRequest: { description, amount }
      await api.post("/api/v1/incomes", {
        description: incomeSource.trim(),
        amount: deposit,
      });

      setIncomeSource("");
      setIncomeValue("");
      setModalIncomeVisible(false);
      fetchAllData();
    } catch (error) {
      console.error("Error creating income record:", error);
      Alert.alert("Error", "Failed to save income deposit.");
    } finally {
      setSubmittingIncome(false);
    }
  };

  const handleAddExpense = async () => {
    if (!description.trim() || !value.trim() || isNaN(Number(value))) {
      Alert.alert(
        "Validation Error",
        "Please enter a valid description and amount.",
      );
      return;
    }

    setSubmitting(true);
    const now = new Date().toISOString().slice(0, 19);

    const newExpense: Omit<SpringBootExpense, "id"> = {
      description: description.trim(),
      value: parseFloat(value),
      category: category.toUpperCase() as SpringBootExpense["category"],
      dueDate: now,
      isPaid: isPaid,
      paidAt: isPaid ? now : null,
      paymentType: paymentType,
      recurrencePeriod: recurrencePeriod,
    };

    try {
      await api.post("/api/v1/expenses", newExpense);

      setDescription("");
      setValue("");
      setCategory("Food");
      setIsPaid(true);
      setPaymentType("CASH");
      setRecurrencePeriod("NONE");
      setModalIncomeVisible(false);
      setModalExpensesVisible(false);

      fetchAllData();
    } catch (error) {
      console.error("Error creating expense:", error);
      Alert.alert(
        "Error",
        "Failed to save expense. Verify backend validation.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const getCategoryEmoji = (cat: string) => {
    switch (cat?.toLowerCase()) {
      case "food":
        return "🛒";
      case "housing":
        return "🏠";
      case "transportation":
        return "🚗";
      case "entertainment":
        return "🎬";
      default:
        return "💳";
    }
  };

  const getCategoryColor = (cat: string) => {
    switch (cat?.toLowerCase()) {
      case "housing":
        return colors.primaryTeal;
      case "food":
        return colors.primaryOrange;
      case "transportation":
        return colors.sageTeal;
      case "entertainment":
        return colors.goldenOchre;
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

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primaryTeal}
          />
        }
      >
        {/* --- HEADER SECTION --- */}
        <View style={styles.header}>
          <Text style={styles.monthText}>OVERVIEW</Text>
          <Text style={styles.greetingText}>
            Good morning{userName ? `, ${userName}` : ""}.
          </Text>
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
            {investmentPot > 0 && (
              <Text style={styles.balanceTrend}>
                Investment Pot: $
                {investmentPot.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                })}
              </Text>
            )}
          </View>

          <View style={styles.dualCardRow}>
            <TouchableOpacity
              style={[styles.miniCard, styles.flex1, { marginRight: 8 }]}
              onPress={() => setModalIncomeVisible(true)}
            >
              <View style={styles.rowContainer}>
                <Text style={styles.miniCardLabel}>INCOME</Text>
                <Text style={styles.miniCardAdd}>+</Text>
              </View>

              <Text style={styles.miniCardValue}>
                $
                {monthlyIncome.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.miniCard, styles.flex1, { marginLeft: 8 }]}
              onPress={() => setModalExpensesVisible(true)}
            >
              <View style={styles.rowContainer}>
                <Text style={styles.miniCardLabel}>EXPENSES</Text>
                <Text style={styles.miniCardAdd}>+</Text>
              </View>
              <Text style={styles.miniCardValue}>
                $
                {totalExpenses.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </Text>
            </TouchableOpacity>
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

                <Text
                  style={[
                    styles.transactionAmount,
                    tx.type === "INCOME"
                      ? styles.incomeText
                      : styles.expenseText,
                  ]}
                >
                  {tx.type === "INCOME"
                    ? `+$${tx.amount.toFixed(2)}`
                    : `-$${tx.amount.toFixed(2)}`}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* --- ADD INCOME MODAL --- */}
      <Modal visible={modalIncomeVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Income Deposit</Text>

            <Text style={styles.inputLabel}>Source / Description</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Monthly Salary, Freelance"
              value={incomeSource}
              onChangeText={setIncomeSource}
            />

            <Text style={styles.inputLabel}>Amount ($)</Text>
            <TextInput
              style={styles.input}
              placeholder="0.00"
              keyboardType="decimal-pad"
              value={incomeValue}
              onChangeText={setIncomeValue}
            />
            {/* 
            <Text style={styles.inputLabel}>Category</Text>
            <View style={styles.categoryContainer}>
              {INCOME_CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.categoryChip,
                    incomeCategory === cat && styles.categoryChipSelected,
                  ]}
                  onPress={() => setIncomeCategory(cat)}
                >
                  <Text
                    style={[
                      styles.categoryChipText,
                      incomeCategory === cat && styles.categoryChipTextSelected,
                    ]}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View> */}
            {/* 
            <Text style={styles.inputLabel}>Deposit Method</Text>
            <View style={styles.categoryContainer}>
              {(["CASH", "CARD"] as const).map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.categoryChip,
                    incomePaymentType === type && styles.categoryChipSelected,
                  ]}
                  onPress={() => setIncomePaymentType(type)}
                >
                  <Text
                    style={[
                      styles.categoryChipText,
                      incomePaymentType === type &&
                        styles.categoryChipTextSelected,
                    ]}
                  >
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </View> */}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setModalIncomeVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleAddIncome}
                disabled={submittingIncome}
              >
                {submittingIncome ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.saveButtonText}>Add to Income</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* --- ADD EXPENSE MODAL --- */}
      <Modal visible={modalExpensesVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add New Expense</Text>

            <Text style={styles.inputLabel}>Description</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Grocery Shopping"
              value={description}
              onChangeText={setDescription}
            />

            <Text style={styles.inputLabel}>Amount ($)</Text>
            <TextInput
              style={styles.input}
              placeholder="0.00"
              keyboardType="decimal-pad"
              value={value}
              onChangeText={setValue}
            />

            <Text style={styles.inputLabel}>Category</Text>
            <View style={styles.categoryContainer}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.categoryChip,
                    category === cat && styles.categoryChipSelected,
                  ]}
                  onPress={() => setCategory(cat)}
                >
                  <Text
                    style={[
                      styles.categoryChipText,
                      category === cat && styles.categoryChipTextSelected,
                    ]}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>Payment Method</Text>
            <View style={styles.categoryContainer}>
              {(["CASH", "CARD"] as const).map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.categoryChip,
                    paymentType === type && styles.categoryChipSelected,
                  ]}
                  onPress={() => setPaymentType(type)}
                >
                  <Text
                    style={[
                      styles.categoryChipText,
                      paymentType === type && styles.categoryChipTextSelected,
                    ]}
                  >
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>Repeat</Text>
            <View style={styles.categoryContainer}>
              {(["NONE", "WEEKLY", "MONTHLY", "YEARLY"] as const).map(
                (period) => (
                  <TouchableOpacity
                    key={period}
                    style={[
                      styles.categoryChip,
                      recurrencePeriod === period &&
                        styles.categoryChipSelected,
                    ]}
                    onPress={() => setRecurrencePeriod(period)}
                  >
                    <Text
                      style={[
                        styles.categoryChipText,
                        recurrencePeriod === period &&
                          styles.categoryChipTextSelected,
                      ]}
                    >
                      {period}
                    </Text>
                  </TouchableOpacity>
                ),
              )}
            </View>

            <View style={styles.switchRow}>
              <Text style={styles.inputLabel}>Mark as Paid</Text>
              <Switch
                value={isPaid}
                onValueChange={setIsPaid}
                trackColor={{ true: colors.primaryTeal }}
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setModalExpensesVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleAddExpense}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.saveButtonText}>Save Expense</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

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
  rowContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  miniCardLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.textLightMuted,
    letterSpacing: 1,
  },
  miniCardAdd: {
    fontSize: 15,
    fontWeight: "bold",
    color: colors.textLightMuted,
    letterSpacing: 1,
    marginLeft: "auto",
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
    paddingBottom: 80,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  incomeText: { color: colors.primaryTeal || "#008080" },
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
  expenseText: { color: colors.textDark },

  /* Modal Styles */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: colors.cardBackground || "#FFFFFF",
    padding: 24,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: colors.textDark,
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textDark,
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    backgroundColor: colors.screenBackground || "#F5F5F5",
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    color: colors.textDark,
  },
  categoryContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
  },
  categoryChip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: colors.screenBackground || "#F5F5F5",
  },
  categoryChipSelected: { backgroundColor: colors.primaryTeal || "#008080" },
  categoryChipText: { fontSize: 12, color: colors.textDark, fontWeight: "600" },
  categoryChipTextSelected: { color: "#FFFFFF" },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
  },
  modalActions: { flexDirection: "row", gap: 12, marginTop: 24 },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  cancelButton: { backgroundColor: colors.screenBackground || "#F5F5F5" },
  cancelButtonText: { color: colors.textDark, fontWeight: "600" },
  saveButton: { backgroundColor: colors.primaryTeal || "#008080" },
  saveButtonText: { color: "#FFFFFF", fontWeight: "bold" },
});
