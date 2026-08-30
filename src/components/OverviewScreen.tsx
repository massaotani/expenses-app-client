import { parseFlexibleNumber } from "@/utils/storage";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { LineChart } from "react-native-gifted-charts";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
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

export interface UserCard {
  id: string;
  name: string;
  cardType: "CREDIT" | "DEBIT";
}

const CATEGORIES = [
  "Food",
  "Fixed Expenses",
  "Housing",
  "Healthcare",
  "Entertainment",
  "Transportation",
  "Clothing",
  "PET",
  "Travel",
  "Others",
];

export default function OverviewScreen() {
  const { t, i18n } = useTranslation();
  const { token } = useAuth();
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // User State
  const [userName, setUserName] = useState<string>("");
  const [monthlyIncome, setMonthlyIncome] = useState<number>(0);
  const [investmentPot, setInvestmentPot] = useState<number>(0);

  // Raw API Data
  const [rawExpenses, setRawExpenses] = useState<SpringBootExpense[]>([]);
  const [rawIncomes, setRawIncomes] = useState<SpringBootIncome[]>([]);

  // Expense Data States
  const [totalExpenses, setTotalExpenses] = useState<number>(0);
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  const [budgetItems, setBudgetItems] = useState<any[]>([]);
  const [expenseDate, setExpenseDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);

  // Card States
  const [userCards, setUserCards] = useState<UserCard[]>([]);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);

  // Card Management Modal States
  const [modalCardVisible, setModalCardVisible] = useState<boolean>(false);
  const [cardModalMode, setCardModalMode] = useState<
    "LIST" | "FORM" | "DETAILS" | "EDIT"
  >("LIST");
  const [selectedCardForAction, setSelectedCardForAction] =
    useState<UserCard | null>(null);
  const [newCardName, setNewCardName] = useState<string>("");
  const [newCardType, setNewCardType] = useState<"CREDIT" | "DEBIT">("CREDIT");
  const [submittingCard, setSubmittingCard] = useState<boolean>(false);

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

  // Trend Data
  const [trendData, setTrendData] = useState<
    { value: number; label: string }[]
  >([]);

  // Dynamic Total Balance: Monthly Income - Dynamic Expenses
  const totalBalance = monthlyIncome - totalExpenses;

  const router = useRouter();
  const { signOut } = useAuth();

  useEffect(() => {
    if (token) {
      fetchAllData();
    }
  }, [token]);

  useEffect(() => {
    processFigmaData(rawExpenses, rawIncomes);
  }, [i18n.language, rawExpenses, rawIncomes]);

  const processMonthlyTrend = (expenses: SpringBootExpense[]) => {
    const now = new Date();
    const last6Months = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const month = d.getMonth();
      const year = d.getFullYear();

      const monthlyTotal = expenses
        .filter((exp) => {
          const expDate = exp.dueDate ? new Date(exp.dueDate) : new Date();
          return expDate.getMonth() === month && expDate.getFullYear() === year;
        })
        .reduce((sum, exp) => sum + exp.value, 0);

      const rawLabel = d.toLocaleDateString(i18n.language, { month: "short" });
      const capitalizedLabel =
        rawLabel.charAt(0).toUpperCase() + rawLabel.slice(1);

      last6Months.push({
        label: capitalizedLabel,
        value: monthlyTotal,
      });
    }

    return last6Months;
  };

  const formatDateDDMMYYYY = (date: Date) => {
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === "android") {
      setShowDatePicker(false);
    }
    if (selectedDate) {
      setExpenseDate(selectedDate);
    }
  };
  const handleDismiss = () => {
    setShowDatePicker(false);
  };

  const fetchAllData = async () => {
    try {
      const [expensesRes, userRes, incomesRes, cardsRes] =
        await Promise.allSettled([
          api.get<SpringBootExpense[]>("/api/v1/expenses"),
          api.get<UserProfile>("/api/v1/users/me"),
          api.get<SpringBootIncome[]>("/api/v1/incomes"),
          api.get<UserCard[]>("/api/v1/cards"),
        ]);

      const isUnauthorized = [expensesRes, userRes, incomesRes, cardsRes].some(
        (res) =>
          res.status === "rejected" && res.reason?.response?.status === 401,
      );

      if (isUnauthorized) {
        Alert.alert("Session Expired", "Please log in again.");
        await signOut();
        return;
      }

      const fetchedExpenses =
        expensesRes.status === "fulfilled" ? expensesRes.value.data : [];
      const fetchedIncomes =
        incomesRes.status === "fulfilled" ? incomesRes.value.data : [];

      setRawExpenses(fetchedExpenses);
      setRawIncomes(fetchedIncomes);

      if (userRes.status === "fulfilled") {
        const user = userRes.value.data;
        setUserName(user.name || "");
        setMonthlyIncome(user.monthlyIncome || 0);
        setInvestmentPot(user.investmentPot || 0);
      }

      if (cardsRes.status === "fulfilled") {
        const cards = cardsRes.value.data || [];
        setUserCards(cards);
        if (cards.length > 0 && !selectedCardId) {
          setSelectedCardId(cards[0].id);
        }
      }

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
    const total = expenses.reduce((sum, item) => sum + item.value, 0);
    setTotalExpenses(total);

    setTrendData(processMonthlyTrend(expenses));

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

    const formattedExpenses = expenses.map((item) => ({
      id: `exp-${item.id || Math.random()}`,
      type: "EXPENSE" as const,
      title: item.description,
      category: item.category,
      rawDate: item.dueDate ? new Date(item.dueDate) : new Date(),
      date: item.dueDate
        ? new Date(item.dueDate).toLocaleDateString(i18n.language, {
            month: "short",
            day: "numeric",
          })
        : t("today", "Today"),
      amount: item.value,
      emoji: getCategoryEmoji(item.category),
    }));

    const formattedIncomes = incomesList.map((item) => ({
      id: `inc-${item.id || Math.random()}`,
      type: "INCOME" as const,
      title: item.description,
      category: "DEPOSIT",
      rawDate: item.createdAt ? new Date(item.createdAt) : new Date(),
      date: item.createdAt
        ? new Date(item.createdAt).toLocaleDateString(i18n.language, {
            month: "short",
            day: "numeric",
          })
        : t("today", "Today"),
      amount: item.value,
      emoji: "💰",
    }));

    const combined = [...formattedExpenses, ...formattedIncomes].sort(
      (a, b) => b.rawDate.getTime() - a.rawDate.getTime(),
    );

    setRecentTransactions(combined.slice(0, 5));
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchAllData();
  };

  const handleCreateCard = async () => {
    if (!newCardName.trim()) {
      Alert.alert("Validation Error", "Please enter a card name.");
      return;
    }

    setSubmittingCard(true);

    try {
      const response = await api.post<UserCard>("/api/v1/cards", {
        name: newCardName.trim(),
        cardType: newCardType,
      });

      setUserCards((prevCards) => [...prevCards, response.data]);

      setNewCardName("");
      setNewCardType("CREDIT");
      setCardModalMode("LIST");

      fetchAllData();
    } catch (error) {
      console.error("Error adding card:", error);
      Alert.alert("Error", "Failed to add card. Please try again.");
    } finally {
      setSubmittingCard(false);
    }
  };

  const handleStartEditCard = () => {
    if (!selectedCardForAction) return;
    setNewCardName(selectedCardForAction.name);
    setNewCardType(selectedCardForAction.cardType);
    setCardModalMode("EDIT");
  };

  const handleUpdateCard = async () => {
    if (!selectedCardForAction || !newCardName.trim()) {
      Alert.alert(t("error", "Error"), "Please enter a card name.");
      return;
    }

    setSubmittingCard(true);

    try {
      await api.put(`/api/v1/cards/${selectedCardForAction.id}`, {
        name: newCardName.trim(),
        cardType: newCardType,
      });

      setNewCardName("");
      setNewCardType("CREDIT");
      setSelectedCardForAction(null);
      setCardModalMode("LIST");
      await fetchAllData();
    } catch (error) {
      console.error("Error updating card:", error);
      Alert.alert(t("error", "Error"), "Failed to update card.");
    } finally {
      setSubmittingCard(false);
    }
  };

  const handleDeleteCard = async () => {
    if (!selectedCardForAction) return;

    const cardToDeleteId = selectedCardForAction.id;

    Alert.alert(
      t("delete", "Delete"),
      "Are you sure you want to delete this card?",
      [
        { text: t("cancel", "Cancel"), style: "cancel" },
        {
          text: t("delete", "Delete"),
          style: "destructive",
          onPress: async () => {
            setSubmittingCard(true);
            try {
              await api.delete(`/api/v1/cards/${cardToDeleteId}`);

              setUserCards((prevCards) =>
                prevCards.filter((card) => card.id !== cardToDeleteId),
              );

              setSelectedCardForAction(null);
              setCardModalMode("LIST");
              fetchAllData();
            } catch (error: any) {
              console.error(
                "Error deleting card stacktrace:",
                error?.response?.data || error,
              );
              Alert.alert(
                t("error", "Error"),
                error?.response?.data?.message ||
                  "Failed to delete card. Ensure no active expenses require this card.",
              );
            } finally {
              setSubmittingCard(false);
            }
          },
        },
      ],
    );
  };

  const handleAddIncome = async () => {
    const normalizedValue = incomeValue.replace(",", ".");
    const deposit = parseFloat(normalizedValue);

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
    const numericValue = parseFlexibleNumber(value);

    if (!description.trim() || !value.trim() || isNaN(numericValue)) {
      Alert.alert(
        "Validation Error",
        "Please enter a valid description and amount.",
      );
      return;
    }

    if (paymentType === "CARD" && (!selectedCardId || userCards.length === 0)) {
      Alert.alert(
        "Validation Error",
        "Please select a card to pay with this expense.",
      );
      return;
    }

    setSubmitting(true);

    const year = expenseDate.getFullYear();
    const month = String(expenseDate.getMonth() + 1).padStart(2, "0");
    const day = String(expenseDate.getDate()).padStart(2, "0");
    const time = expenseDate.toTimeString().split(" ")[0];
    const formattedDueDate = `${year}-${month}-${day}T${time}`;

    const newExpense: Omit<SpringBootExpense, "id"> = {
      description: description.trim(),
      value: numericValue,
      category: category
        .toUpperCase()
        .trim()
        .replace(/\s+/g, "_") as SpringBootExpense["category"],
      dueDate: formattedDueDate,
      isPaid: isPaid,
      paidAt: isPaid ? formattedDueDate : null,
      paymentType: paymentType,
      cardId: paymentType === "CARD" ? selectedCardId : null,
      recurrencePeriod: recurrencePeriod,
    };

    try {
      await api.post("/api/v1/expenses", newExpense);

      setDescription("");
      setValue("");
      setCategory("Food");
      setExpenseDate(new Date());
      setIsPaid(true);
      setPaymentType("CASH");
      setRecurrencePeriod("NONE");
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

  const formatCategoryLabel = (cat: string) => {
    if (!cat) return "";
    const key = cat.toLowerCase().trim().replace(/\s+/g, "_");

    const fallback = cat
      .replace(/_/g, " ")
      .toLowerCase()
      .replace(/\b\w/g, (char) => char.toUpperCase());

    return t(key, { defaultValue: fallback });
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
      case "fixed_expenses":
      case "fixed expenses":
        return "📌";
      default:
        return "💳";
    }
  };

  const getCategoryColor = (cat: string) => {
    switch (cat?.toLowerCase().replace(/_/g, " ").trim()) {
      case "housing":
        return colors.primaryTeal;
      case "food":
        return colors.primaryOrange;
      case "fixed expenses":
        return colors.deepOchre;
      case "transportation":
      case "transport":
        return colors.sageTeal;
      case "entertainment":
        return colors.goldenOchre;
      case "healthcare":
      case "health":
        return colors.softOrange;
      case "clothing":
        return colors.terracotta;
      case "pet":
        return colors.amber;
      case "travel":
        return colors.deepSage;
      case "others":
      default:
        return colors.neutral;
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
          <Text style={styles.monthText}>{t("overview", "OVERVIEW")}</Text>

          {/* Greeting Row with Card Manager Button */}
          <View style={styles.userGreetingRow}>
            <Text style={styles.greetingText}>
              {t("hello", "Hello")}
              {userName ? `, ${userName}` : ""}.
            </Text>
            <TouchableOpacity
              style={styles.cardIconButton}
              onPress={() => {
                setCardModalMode("LIST");
                setModalCardVisible(true);
              }}
            >
              <Ionicons
                name="card-outline"
                size={20}
                color={colors.textLight}
              />
            </TouchableOpacity>
          </View>

          <Text style={styles.subtitleText}>
            {t("takeCareFinances", "Take good care of your finances!")}
          </Text>

          <View style={styles.balanceCard}>
            <Text style={styles.balanceLabel}>
              {t("totalBalance", "TOTAL BALANCE")}
            </Text>
            <Text style={styles.balanceAmount}>
              $
              {totalBalance.toLocaleString(i18n.language, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </Text>
            {investmentPot > 0 && (
              <Text style={styles.balanceTrend}>
                {t("investmentPot", "Investment Pot")}: $
                {investmentPot.toLocaleString(i18n.language, {
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
                <Text style={styles.miniCardLabel}>
                  {t("income", "INCOME")}
                </Text>
                <Text style={styles.miniCardAdd}>+</Text>
              </View>

              <Text style={styles.miniCardValue}>
                $
                {monthlyIncome.toLocaleString(i18n.language, {
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
                <Text style={styles.miniCardLabel}>
                  {t("expenses", "EXPENSES")}
                </Text>
                <Text style={styles.miniCardAdd}>+</Text>
              </View>
              <Text style={styles.miniCardValue}>
                $
                {totalExpenses.toLocaleString(i18n.language, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* --- BODY CONTENT --- */}
        <View style={styles.body}>
          {/* Spending Trend */}
          <View style={styles.sectionCard}>
            <Text style={styles.cardTitle}>
              {t("spendingTrend", "Spending Trend")}
            </Text>

            <View style={styles.chartContainer}>
              <LineChart
                data={trendData}
                curved
                color={colors.primaryOrange || "#C86D4B"}
                thickness={2.5}
                hideDataPoints
                height={130}
                spacing={44}
                initialSpacing={15}
                endSpacing={15}
                noOfSections={3}
                rulesType="dashed"
                rulesColor="#E5E7EB"
                yAxisColor="transparent"
                xAxisColor="#E5E7EB"
                yAxisTextStyle={{
                  color: colors.textMuted || "#9CA3AF",
                  fontSize: 11,
                }}
                xAxisLabelTextStyle={{
                  color: colors.textMuted || "#9CA3AF",
                  fontSize: 11,
                }}
                formatYLabel={(val) => `${Number(val)}`}
              />
            </View>
          </View>

          {/* Budget Overview */}
          <View style={styles.sectionCard}>
            <Text style={styles.cardTitle}>
              {t("monthlyBudget", "Monthly Budget")}
            </Text>
            {budgetItems.map((item) => {
              const sharePercentage =
                totalExpenses > 0 ? (item.spent / totalExpenses) * 100 : 0;

              return (
                <View key={item.id} style={styles.budgetItem}>
                  <View style={styles.budgetHeader}>
                    <Text style={styles.budgetCategory}>
                      {t(item.category.toLowerCase(), {
                        defaultValue: item.category,
                      })}
                    </Text>
                    <Text style={styles.budgetAmounts}>
                      ${item.spent.toFixed(2).replace(".", ",")}{" "}
                      <Text style={styles.budgetLimit}>
                        ({sharePercentage.toFixed(0)}%)
                      </Text>
                    </Text>
                  </View>
                  <View style={styles.progressBarTrack}>
                    <View
                      style={[
                        styles.progressBarFill,
                        {
                          width: `${Math.min(sharePercentage, 100)}%`,
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
              <Text style={styles.cardTitle}>{t("recent", "Recent")}</Text>
              <TouchableOpacity onPress={() => router.push("/transactions")}>
                <Text style={styles.seeAllText}>
                  {t("seeAll", "See all")} →
                </Text>
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
                    {String(
                      t(tx.category.toLowerCase(), {
                        defaultValue: tx.category,
                      }),
                    )}{" "}
                    · {tx.date}
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
                    ? `+$${tx.amount.toFixed(2).replace(".", ",")}`
                    : `-$${tx.amount.toFixed(2).replace(".", ",")}`}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* --- CARD MANAGEMENT MODAL --- */}
      <Modal
        statusBarTranslucent={true}
        visible={modalCardVisible}
        animationType="slide"
        transparent
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => {
            Keyboard.dismiss();
            setModalCardVisible(false);
          }}
        >
          <KeyboardAwareScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            enableOnAndroid={true}
            enableAutomaticScroll={true}
            extraScrollHeight={50}
            contentContainerStyle={{ flexGrow: 1, justifyContent: "flex-end" }}
          >
            <Pressable
              style={styles.modalContent}
              onPress={() => Keyboard.dismiss()}
            >
              {/* 1. LIST MODE */}
              {cardModalMode === "LIST" && (
                <>
                  <View style={styles.modalHeaderRow}>
                    <Text style={styles.modalTitle}>
                      {t("registeredCards", "Registered Cards")}
                    </Text>
                    <TouchableOpacity
                      style={styles.addCardHeaderButton}
                      onPress={() => {
                        setNewCardName("");
                        setNewCardType("CREDIT");
                        setCardModalMode("FORM");
                      }}
                    >
                      <Text style={styles.addCardHeaderButtonText}>
                        + {t("addCard", "Add Card")}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {userCards.length === 0 ? (
                    <View style={styles.emptyCardsContainer}>
                      <Text style={styles.emptyCardsText}>
                        {t("noCardsRegistered", "No cards registered")}
                      </Text>
                    </View>
                  ) : (
                    <ScrollView style={{ maxHeight: 240, marginVertical: 12 }}>
                      {userCards.map((c) => (
                        <TouchableOpacity
                          key={c.id}
                          style={styles.cardListItem}
                          onPress={() => {
                            setSelectedCardForAction(c);
                            setCardModalMode("DETAILS");
                          }}
                        >
                          <Text
                            style={[styles.cardListItemText, { flex: 1 }]}
                            numberOfLines={1}
                          >
                            💳 {c.name || t("unnamedCard", "Unnamed Card")}
                          </Text>
                          <Text style={styles.cardListItemBadge}>
                            {String(
                              t((c.cardType || "CREDIT").toLowerCase(), {
                                defaultValue:
                                  c.cardType === "DEBIT" ? "Debit" : "Credit",
                              }),
                            )}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  )}

                  <View style={styles.modalActions}>
                    <TouchableOpacity
                      style={[styles.modalButton, styles.cancelButton]}
                      onPress={() => {
                        Keyboard.dismiss();
                        setModalCardVisible(false);
                      }}
                    >
                      <Text style={styles.cancelButtonText}>
                        {t("close", "Close")}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}

              {/* 2. CARD DETAILS MODE */}
              {cardModalMode === "DETAILS" && selectedCardForAction && (
                <>
                  <View style={styles.modalHeaderRow}>
                    <TouchableOpacity onPress={() => setCardModalMode("LIST")}>
                      <Text style={styles.backButtonText}>
                        ← {t("back", "Back")}
                      </Text>
                    </TouchableOpacity>
                    <Text style={styles.modalTitle}>
                      {selectedCardForAction.name}
                    </Text>
                    <View style={{ width: 40 }} />
                  </View>

                  <View style={{ marginVertical: 20 }}>
                    <Text style={styles.inputLabel}>
                      {t("cardType", "Card Type")}
                    </Text>
                    <Text style={styles.cardListItemText}>
                      💳{" "}
                      {String(
                        t(selectedCardForAction.cardType.toLowerCase(), {
                          defaultValue:
                            selectedCardForAction.cardType === "CREDIT"
                              ? "Credit"
                              : "Debit",
                        }),
                      )}
                    </Text>
                  </View>

                  <View style={styles.modalActions}>
                    <TouchableOpacity
                      style={[styles.modalButton, styles.cancelButton]}
                      onPress={handleStartEditCard}
                    >
                      <Text style={styles.cancelButtonText}>
                        {t("edit", "Edit")}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.modalButton,
                        { backgroundColor: "#EF4444" },
                      ]}
                      onPress={handleDeleteCard}
                      disabled={submittingCard}
                    >
                      {submittingCard ? (
                        <ActivityIndicator color="#FFF" />
                      ) : (
                        <Text style={styles.saveButtonText}>
                          {t("delete", "Delete")}
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </>
              )}

              {/* 3. EDIT OR CREATE FORM MODE */}
              {(cardModalMode === "FORM" || cardModalMode === "EDIT") && (
                <>
                  <View style={styles.modalHeaderRow}>
                    <TouchableOpacity
                      onPress={() =>
                        setCardModalMode(
                          cardModalMode === "EDIT" ? "DETAILS" : "LIST",
                        )
                      }
                    >
                      <Text style={styles.backButtonText}>
                        ← {t("back", "Back")}
                      </Text>
                    </TouchableOpacity>
                    <Text style={styles.modalTitle}>
                      {cardModalMode === "EDIT"
                        ? `${t("edit", "Edit")} ${t("card", "Card")}`
                        : t("newCard", "New Card")}
                    </Text>
                    <View style={{ width: 40 }} />
                  </View>

                  <Text style={styles.inputLabel}>
                    {t("cardName", "Card Name")}
                  </Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Chase Sapphire, Nubank"
                    value={newCardName}
                    onChangeText={setNewCardName}
                  />

                  <Text style={styles.inputLabel}>
                    {t("cardType", "Card Type")}
                  </Text>
                  <View style={styles.categoryContainer}>
                    {(["CREDIT", "DEBIT"] as const).map((type) => (
                      <TouchableOpacity
                        key={type}
                        style={[
                          styles.categoryChip,
                          newCardType === type && styles.categoryChipSelected,
                        ]}
                        onPress={() => setNewCardType(type)}
                      >
                        <Text
                          style={[
                            styles.categoryChipText,
                            newCardType === type &&
                              styles.categoryChipTextSelected,
                          ]}
                        >
                          {String(
                            t(type.toLowerCase(), {
                              defaultValue:
                                type === "CREDIT" ? "Credit" : "Debit",
                            }),
                          )}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <View style={styles.modalActions}>
                    <TouchableOpacity
                      style={[styles.modalButton, styles.cancelButton]}
                      onPress={() =>
                        setCardModalMode(
                          cardModalMode === "EDIT" ? "DETAILS" : "LIST",
                        )
                      }
                    >
                      <Text style={styles.cancelButtonText}>
                        {t("cancel", "Cancel")}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.modalButton, styles.saveButton]}
                      onPress={
                        cardModalMode === "EDIT"
                          ? handleUpdateCard
                          : handleCreateCard
                      }
                      disabled={submittingCard}
                    >
                      {submittingCard ? (
                        <ActivityIndicator color="#FFF" />
                      ) : (
                        <Text style={styles.saveButtonText}>
                          {t("saveCard", "Save Card")}
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </Pressable>
          </KeyboardAwareScrollView>
        </Pressable>
      </Modal>

      {/* --- ADD INCOME MODAL --- */}
      <Modal
        statusBarTranslucent={true}
        visible={modalIncomeVisible}
        animationType="slide"
        transparent
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => {
            Keyboard.dismiss();
            setModalIncomeVisible(false);
          }}
        >
          <KeyboardAwareScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            enableOnAndroid={true}
            enableAutomaticScroll={true}
            extraScrollHeight={60}
            contentContainerStyle={{ flexGrow: 1, justifyContent: "flex-end" }}
          >
            <Pressable
              style={styles.modalContent}
              onPress={() => Keyboard.dismiss()}
            >
              <Text style={styles.modalTitle}>
                {t("addIncomeDeposit", "Add Income Deposit")}
              </Text>

              <Text style={styles.inputLabel}>
                {t("sourceDescription", "Source / Description")}
              </Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Monthly Salary, Freelance"
                value={incomeSource}
                onChangeText={setIncomeSource}
              />

              <Text style={styles.inputLabel}>{t("amount", "Amount ($)")}</Text>
              <TextInput
                style={styles.input}
                placeholder="0.00"
                keyboardType="decimal-pad"
                value={incomeValue}
                onChangeText={(text) => {
                  const normalized = text
                    .replace(/\./g, ",")
                    .replace(/(,\d{2})\d+$/, "$1");
                  setIncomeValue(normalized);
                }}
              />

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => {
                    Keyboard.dismiss();
                    setModalIncomeVisible(false);
                  }}
                >
                  <Text style={styles.cancelButtonText}>
                    {t("cancel", "Cancel")}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalButton, styles.saveButton]}
                  onPress={handleAddIncome}
                  disabled={submittingIncome}
                >
                  {submittingIncome ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <Text style={styles.saveButtonText}>
                      {t("addToIncome", "Add to Income")}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
              <View style={styles.bottomExtension} />
            </Pressable>
          </KeyboardAwareScrollView>
        </Pressable>
      </Modal>

      {/* --- ADD EXPENSE MODAL --- */}
      <Modal
        statusBarTranslucent={true}
        visible={modalExpensesVisible}
        animationType="slide"
        transparent
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => {
            Keyboard.dismiss();
            setModalExpensesVisible(false);
          }}
        >
          <KeyboardAwareScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            enableOnAndroid={true}
            enableAutomaticScroll={true}
            extraScrollHeight={30}
            contentContainerStyle={{ flexGrow: 1, justifyContent: "flex-end" }}
          >
            <Pressable
              style={styles.modalContent}
              onPress={() => Keyboard.dismiss()}
            >
              <Text style={styles.modalTitle}>
                {t("addNewExpense", "Add New Expense")}
              </Text>

              <Text style={styles.inputLabel}>
                {t("description", "Description")}
              </Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Grocery Shopping"
                value={description}
                onChangeText={setDescription}
              />

              <Text style={styles.inputLabel}>{t("amount", "Amount ($)")}</Text>
              <TextInput
                style={styles.input}
                placeholder="0.00"
                keyboardType="decimal-pad"
                value={value}
                onChangeText={(text) => {
                  const normalized = text
                    .replace(/\./g, ",")
                    .replace(/(,\d{2})\d+$/, "$1");
                  setValue(normalized);
                }}
              />

              <Text style={styles.inputLabel}>{t("category", "Category")}</Text>
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
                      {formatCategoryLabel(cat)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>
                {t("paymentMethod", "Payment Method")}
              </Text>
              <View style={styles.categoryContainer}>
                {(["CASH", "CARD"] as const).map((type) => {
                  const isDisabled = type === "CARD" && userCards.length === 0;

                  return (
                    <TouchableOpacity
                      key={type}
                      disabled={isDisabled}
                      style={[
                        styles.categoryChip,
                        paymentType === type && styles.categoryChipSelected,
                        isDisabled && { opacity: 0.4 },
                      ]}
                      onPress={() => {
                        setPaymentType(type);
                        if (
                          type === "CARD" &&
                          userCards.length > 0 &&
                          !selectedCardId
                        ) {
                          setSelectedCardId(userCards[0].id);
                        }
                      }}
                    >
                      <Text
                        style={[
                          styles.categoryChipText,
                          paymentType === type &&
                            styles.categoryChipTextSelected,
                        ]}
                      >
                        {String(
                          t(type.toLowerCase(), {
                            defaultValue: type === "CASH" ? "Cash" : "Card",
                          }),
                        )}
                        {isDisabled
                          ? ` ${String(
                              t("noCardsAvailable", {
                                defaultValue: "(No Cards Available)",
                              }),
                            )}`
                          : ""}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {paymentType === "CARD" && userCards.length > 0 && (
                <>
                  <Text style={styles.inputLabel}>
                    {t("selectCard", "Select Card")}
                  </Text>
                  <View style={styles.categoryContainer}>
                    {userCards.map((card) => (
                      <TouchableOpacity
                        key={card.id}
                        style={[
                          styles.categoryChip,
                          selectedCardId === card.id &&
                            styles.categoryChipSelected,
                        ]}
                        onPress={() => setSelectedCardId(card.id)}
                      >
                        <Text
                          style={[
                            styles.categoryChipText,
                            selectedCardId === card.id &&
                              styles.categoryChipTextSelected,
                          ]}
                        >
                          💳 {card.name} (
                          {String(
                            t(card.cardType.toLowerCase(), {
                              defaultValue:
                                card.cardType === "CREDIT" ? "Credit" : "Debit",
                            }),
                          )}
                          )
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}
              <Text style={styles.inputLabel}>{t("date", "Date")}</Text>
              <TouchableOpacity
                style={styles.datePickerButton}
                onPress={() => setShowDatePicker(true)}
              >
                <Ionicons
                  name="calendar-outline"
                  size={20}
                  color={colors.textDark}
                />
                <Text style={styles.datePickerText}>
                  {formatDateDDMMYYYY(expenseDate)}
                </Text>
              </TouchableOpacity>

              {showDatePicker &&
                (Platform.OS === "ios" ? (
                  <Modal
                    transparent
                    animationType="fade"
                    visible={showDatePicker}
                    onRequestClose={() => setShowDatePicker(false)}
                  >
                    <TouchableOpacity
                      style={styles.datePickerBackdrop}
                      activeOpacity={1}
                      onPress={() => setShowDatePicker(false)}
                    >
                      <TouchableOpacity
                        activeOpacity={1}
                        style={styles.datePickerContainerIOS}
                      >
                        <View style={styles.datePickerHeaderIOS}>
                          <TouchableOpacity
                            onPress={() => setShowDatePicker(false)}
                          >
                            <Text style={styles.datePickerDoneText}>
                              {t("done", "Done")}
                            </Text>
                          </TouchableOpacity>
                        </View>
                        <DateTimePicker
                          value={expenseDate}
                          mode="date"
                          display="spinner"
                          onValueChange={handleDateChange}
                          onDismiss={handleDismiss}
                          maximumDate={new Date(2100, 11, 31)}
                          style={{ alignSelf: "center", width: "100%" }}
                        />
                      </TouchableOpacity>
                    </TouchableOpacity>
                  </Modal>
                ) : (
                  <DateTimePicker
                    value={expenseDate}
                    mode="date"
                    display="default"
                    onValueChange={handleDateChange}
                    onDismiss={handleDismiss}
                    maximumDate={new Date(2100, 11, 31)}
                  />
                ))}
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => {
                    Keyboard.dismiss();
                    setModalExpensesVisible(false);
                  }}
                >
                  <Text style={styles.cancelButtonText}>
                    {t("cancel", "Cancel")}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalButton, styles.saveButton]}
                  onPress={handleAddExpense}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <Text style={styles.saveButtonText}>
                      {t("saveExpense", "Save Expense")}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
              <View style={styles.bottomExtension} />
            </Pressable>
          </KeyboardAwareScrollView>
        </Pressable>
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
  userGreetingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
  },
  greetingText: {
    fontSize: 28,
    fontWeight: "bold",
    color: colors.textLight,
  },
  cardIconButton: {
    backgroundColor: colors.headerCardOverlay,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
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
  incomeText: { color: colors.depositText },
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
  chartContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingRight: 12,
    marginTop: 8,
  },
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
  expenseText: { color: colors.expenseText },
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
    maxHeight: "85%",
  },
  bottomExtension: {
    position: "absolute",
    bottom: -1000,
    left: 0,
    right: 0,
    height: 1000,
    backgroundColor: colors.cardBackground || "#FFFFFF",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: colors.textDark,
  },
  modalHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  addCardHeaderButton: {
    backgroundColor: colors.primaryTeal || "#008080",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  addCardHeaderButtonText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 12,
  },
  backButtonText: {
    fontSize: 14,
    color: colors.primaryTeal || "#008080",
    fontWeight: "600",
  },
  emptyCardsContainer: {
    paddingVertical: 32,
    alignItems: "center",
  },
  emptyCardsText: {
    color: colors.textMuted || "#9CA3AF",
    fontSize: 15,
  },
  cardListItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.screenBackground || "#F5F5F5",
    borderRadius: 12,
    marginBottom: 8,
  },
  cardListItemText: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.textDark || "#111827",
  },
  cardListItemBadge: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.textMuted || "#6B7280",
    letterSpacing: 0.5,
    marginLeft: 8,
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
    flexBasis: "48%", // Fits 2 columns per row
    flexGrow: 1, // Distributes remaining horizontal space equally
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
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
  modalActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: "auto",
    paddingTop: 15,
  },
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
  datePickerButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.screenBackground || "#F5F5F5",
    borderRadius: 10,
    padding: 12,
    gap: 10,
  },
  datePickerText: {
    fontSize: 15,
    color: colors.textDark,
    fontWeight: "500",
  },
  datePickerBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  datePickerContainerIOS: {
    backgroundColor: colors.cardBackground || "#FFFFFF",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 20,
  },
  datePickerHeaderIOS: {
    flexDirection: "row",
    justifyContent: "flex-end",
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border || "#E5E7EB",
  },
  datePickerDoneText: {
    color: colors.primaryTeal || "#008080",
    fontWeight: "bold",
    fontSize: 16,
  },
});
