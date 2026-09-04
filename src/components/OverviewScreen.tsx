import { moderateScale, scale, verticalScale } from "@/utils/scaling";
import { parseFlexibleNumber } from "@/utils/storage";
import { Ionicons } from "@expo/vector-icons";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetTextInput,
} from "@gorhom/bottom-sheet";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
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
  TouchableOpacity,
  View,
} from "react-native";
import { LineChart } from "react-native-gifted-charts";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../app/_layout";
import { useAppTheme } from "../constants/theme";
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
  value?: number;
  amount?: number;
  createdAt: string;
}

export interface UserCard {
  id: string;
  name: string;
  cardType: "CREDIT" | "DEBIT";
}

export interface MonthlyBalance {
  id?: string;
  year: number;
  month: number;
  income: number;
  totalExpenses: number;
  savings: number;
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

const toLocalISOString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
};

export default function OverviewScreen() {
  const chartRef = useRef<any>(null);
  const { colors, isDark } = useAppTheme();
  const { t, i18n } = useTranslation();
  const { token, signOut } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const [userName, setUserName] = useState<string>("");
  const [monthlyIncome, setMonthlyIncome] = useState<number>(0);
  const [totalDeposits, setTotalDeposits] = useState<number>(0);
  const [investmentPot, setInvestmentPot] = useState<number>(0);
  const [monthlyBalance, setMonthlyBalance] = useState<MonthlyBalance | null>(
    null,
  );

  const [rawExpenses, setRawExpenses] = useState<SpringBootExpense[]>([]);
  const [rawIncomes, setRawIncomes] = useState<SpringBootIncome[]>([]);

  const [totalExpenses, setTotalExpenses] = useState<number>(0);
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  const [budgetItems, setBudgetItems] = useState<any[]>([]);
  const [expenseDate, setExpenseDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);

  const [userCards, setUserCards] = useState<UserCard[]>([]);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);

  const [cardModalMode, setCardModalMode] = useState<
    "LIST" | "FORM" | "DETAILS" | "EDIT"
  >("LIST");
  const [selectedCardForAction, setSelectedCardForAction] =
    useState<UserCard | null>(null);
  const [newCardName, setNewCardName] = useState<string>("");
  const [newCardType, setNewCardType] = useState<"CREDIT" | "DEBIT">("CREDIT");
  const [submittingCard, setSubmittingCard] = useState<boolean>(false);

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [description, setDescription] = useState("");
  const [value, setValue] = useState("");
  const [category, setCategory] = useState("Food");
  const [isPaid, setIsPaid] = useState(true);
  const [paymentType, setPaymentType] = useState<"CASH" | "CARD">("CASH");
  const [recurrencePeriod, setRecurrencePeriod] = useState<
    "NONE" | "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY"
  >("NONE");

  const [submittingIncome, setSubmittingIncome] = useState<boolean>(false);

  const [incomeSource, setIncomeSource] = useState("");
  const [incomeValue, setIncomeValue] = useState("");
  const [incomeDate, setIncomeDate] = useState<Date>(new Date());
  const [showIncomeDatePicker, setShowIncomeDatePicker] =
    useState<boolean>(false);

  const [trendData, setTrendData] = useState<
    { value: number; label: string }[]
  >([]);

  const now = new Date();
  const isCurrentMonthBalance =
    monthlyBalance?.year === now.getFullYear() &&
    monthlyBalance?.month === now.getMonth() + 1;

  const effectiveIncome = isCurrentMonthBalance
    ? monthlyBalance.income
    : monthlyIncome + totalDeposits;

  const effectiveExpenses = isCurrentMonthBalance
    ? monthlyBalance.totalExpenses
    : totalExpenses;

  const totalBalance = isCurrentMonthBalance
    ? monthlyBalance.savings
    : effectiveIncome - effectiveExpenses;

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;

      if (token) {
        fetchAllData(isMounted);
      }

      return () => {
        isMounted = false;
      };
    }, [token]),
  );
  const expensesSheetRef = useRef<BottomSheetModal>(null);
  const incomeSheetRef = useRef<BottomSheetModal>(null);
  const cardSheetRef = useRef<BottomSheetModal>(null);

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        pressBehavior="close"
      />
    ),
    [],
  );

  useEffect(() => {
    if (trendData.length > 0 && chartRef.current) {
      const itemSpacing = 55;
      const targetIndex = 1;
      const offset = targetIndex * itemSpacing;

      setTimeout(() => {
        // Handles both ScrollView and FlatList refs
        if (typeof chartRef.current.scrollTo === "function") {
          chartRef.current.scrollTo({ x: offset, animated: true });
        } else if (typeof chartRef.current.scrollToOffset === "function") {
          chartRef.current.scrollToOffset({ offset, animated: true });
        }
      }, 100);
    }
  }, [trendData]);

  useEffect(() => {
    processFigmaData(rawExpenses, rawIncomes);
  }, [i18n.language, rawExpenses, rawIncomes]);

  const formatCurrency = (amount: number) => {
    return (amount || 0).toLocaleString(i18n.language, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const processMonthlyTrend = (expenses: SpringBootExpense[]) => {
    const now = new Date();
    const monthsTrend = [];

    for (let i = 3; i >= -3; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const month = d.getMonth();
      const year = d.getFullYear();

      const monthlyTotal = expenses
        .filter((exp) => {
          if (!exp.dueDate) return false;
          const expDate = parseLocalDateTime(exp.dueDate);
          return expDate.getMonth() === month && expDate.getFullYear() === year;
        })
        .reduce(
          (sum, exp) => sum + parseAmount(exp.value ?? (exp as any).amount),
          0,
        );

      const rawLabel = d.toLocaleDateString(i18n.language, { month: "short" });
      const capitalizedLabel =
        rawLabel.charAt(0).toUpperCase() + rawLabel.slice(1);

      monthsTrend.push({
        label: capitalizedLabel,
        value: Math.max(0, monthlyTotal || 0),
        focused: i === 0,
      });
    }

    return monthsTrend;
  };

  const parseLocalDateTime = (
    dateInput: string | Date | undefined | null,
  ): Date => {
    if (!dateInput) return new Date();
    if (dateInput instanceof Date) return dateInput;

    const str = String(dateInput);
    const [datePart, timePart] = str.split("T");
    const dateParts = datePart.split("-").map(Number);

    if (dateParts.length === 3 && !dateParts.some(isNaN)) {
      let hours = 0,
        minutes = 0,
        seconds = 0;

      if (timePart) {
        const cleanTime = timePart.split(".")[0].replace("Z", "");
        const timeParts = cleanTime.split(":").map(Number);
        hours = timeParts[0] || 0;
        minutes = timeParts[1] || 0;
        seconds = timeParts[2] || 0;
      }

      return new Date(
        dateParts[0],
        dateParts[1] - 1,
        dateParts[2],
        hours,
        minutes,
        seconds,
      );
    }

    const parsed = new Date(dateInput);
    return !isNaN(parsed.getTime()) ? parsed : new Date();
  };

  const formatDateDDMMYYYY = (date: Date) => {
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === "android" && event.type === "dismissed") {
      setShowDatePicker(false);
      return;
    }

    const date =
      selectedDate ||
      (event?.nativeEvent?.timestamp
        ? new Date(event.nativeEvent.timestamp)
        : null);

    if (Platform.OS === "android" && event.type === "set") {
      setShowDatePicker(false);
    }

    if (date) {
      setExpenseDate(date);
    }
  };

  const fetchAllData = async (isMounted = true) => {
    try {
      const [expensesRes, userRes, incomesRes, cardsRes, balanceRes] =
        await Promise.allSettled([
          api.get<SpringBootExpense[]>("/api/v1/expenses"),
          api.get<UserProfile>("/api/v1/users/me"),
          api.get<SpringBootIncome[]>("/api/v1/incomes"),
          api.get<UserCard[]>("/api/v1/cards"),
          api.get<MonthlyBalance>("/api/v1/monthly-balances/current"),
        ]);

      if (!isMounted) return;

      const isUnauthorized = [
        expensesRes,
        userRes,
        incomesRes,
        cardsRes,
        balanceRes,
      ].some(
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

      if (balanceRes.status === "fulfilled") {
        setMonthlyBalance(balanceRes.value.data);
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
      if (isMounted) console.error("API Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const parseAmount = (val: any): number => {
    if (typeof val === "number") return isNaN(val) ? 0 : val;
    if (typeof val === "string") {
      const parsed = parseFloat(val.replace(",", "."));
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  };

  const processFigmaData = (
    expenses: SpringBootExpense[],
    incomesList: SpringBootIncome[],
  ) => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    setTrendData(processMonthlyTrend(expenses));

    const currentMonthIncomes = incomesList.filter((item) => {
      if (!item.createdAt) return true;
      const d = parseLocalDateTime(item.createdAt);
      return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
    });

    const calculatedDeposits = currentMonthIncomes.reduce(
      (sum, item) => sum + parseAmount(item.value ?? item.amount),
      0,
    );
    setTotalDeposits(calculatedDeposits);

    const currentMonthExpenses = expenses.filter((item) => {
      if (!item.dueDate) return true;
      const d = parseLocalDateTime(item.dueDate);
      return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
    });

    const totalExp = currentMonthExpenses.reduce(
      (sum, item) => sum + parseAmount(item.value ?? (item as any).amount),
      0,
    );
    setTotalExpenses(totalExp);

    const budgetMap = currentMonthExpenses.reduce(
      (acc, item) => {
        const itemVal = parseAmount(item.value ?? (item as any).amount);
        acc[item.category] = (acc[item.category] || 0) + itemVal;
        return acc;
      },
      {} as Record<string, number>,
    );

    const groupedBudgets = Object.keys(budgetMap).map((cat, index) => ({
      id: index.toString(),
      category: cat,
      spent: budgetMap[cat],
      limit: budgetMap[cat] + budgetMap[cat] * 0.2,
      color: getCategoryColor(cat, isDark),
    }));
    setBudgetItems(groupedBudgets);

    const formattedExpenses = currentMonthExpenses.map((item) => {
      const parsedDate = parseLocalDateTime(item.dueDate);
      return {
        id: `exp-${item.id || Math.random()}`,
        type: "EXPENSE" as const,
        title: item.description,
        category: item.category,
        rawDate: parsedDate,
        date: item.dueDate
          ? parsedDate.toLocaleDateString(i18n.language, {
              month: "short",
              day: "numeric",
            })
          : t("today", "Today"),
        amount: parseAmount(item.value ?? (item as any).amount),
        emoji: getCategoryEmoji(item.category),
      };
    });

    const formattedIncomes = currentMonthIncomes.map((item) => {
      const parsedDate = parseLocalDateTime(item.createdAt);
      return {
        id: `inc-${item.id || Math.random()}`,
        type: "INCOME" as const,
        title: item.description,
        category: "DEPOSIT",
        rawDate: parsedDate,
        date: item.createdAt
          ? parsedDate.toLocaleDateString(i18n.language, {
              month: "short",
              day: "numeric",
            })
          : t("today", "Today"),
        amount: parseAmount(item.value ?? item.amount),
        emoji: "💰",
      };
    });

    const combined = [...formattedExpenses, ...formattedIncomes].sort(
      (a, b) => {
        const timeDiff = b.rawDate.getTime() - a.rawDate.getTime();
        if (timeDiff !== 0) return timeDiff;
        return String(b.id).localeCompare(String(a.id));
      },
    );

    setRecentTransactions(combined.slice(0, 5));
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchAllData();
  };

  const decimalSeparator =
    (1.1).toLocaleString(i18n.language).replace(/\d/g, "") || ".";

  const handleIncomeDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === "android" && event.type === "dismissed") {
      setShowIncomeDatePicker(false);
      return;
    }

    const date =
      selectedDate ||
      (event?.nativeEvent?.timestamp
        ? new Date(event.nativeEvent.timestamp)
        : null);

    if (Platform.OS === "android" && event.type === "set") {
      setShowIncomeDatePicker(false);
    }

    if (date) {
      setIncomeDate(date);
    }
  };

  const handleAddIncome = async () => {
    const deposit = parseFlexibleNumber(incomeValue);

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

    const now = new Date();
    const selectedYear = incomeDate.getFullYear();
    const selectedMonth = incomeDate.getMonth();

    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    let hours = now.getHours();
    let minutes = now.getMinutes();
    let seconds = now.getSeconds();

    const selectedMonthKey = selectedYear * 12 + selectedMonth;
    const currentMonthKey = currentYear * 12 + currentMonth;

    if (selectedMonthKey > currentMonthKey) {
      hours = 0;
      minutes = 0;
      seconds = 0;
    } else if (selectedMonthKey < currentMonthKey) {
      hours = 23;
      minutes = 59;
      seconds = 59;
    }

    const fullLocalDateTime = new Date(
      selectedYear,
      selectedMonth,
      incomeDate.getDate(),
      hours,
      minutes,
      seconds,
    );

    try {
      await api.post("/api/v1/incomes", {
        description: incomeSource.trim(),
        amount: deposit,
        value: deposit,
        createdAt: toLocalISOString(fullLocalDateTime), // Selected date formatted
      });

      setIncomeSource("");
      setIncomeValue("");
      setIncomeDate(new Date());
      handleCloseIncomeModal();

      await fetchAllData();
    } catch (error) {
      console.error("Error creating income record:", error);
      Alert.alert("Error", "Failed to save income deposit.");
    } finally {
      setSubmittingIncome(false);
    }
  };

  const handleOpenIncomeModal = () => {
    incomeSheetRef.current?.present();
  };

  const handleCloseIncomeModal = () => {
    Keyboard.dismiss();
    incomeSheetRef.current?.dismiss();
    clearIncomeFields();
  };

  const handleOpenExpensesModal = () => {
    expensesSheetRef.current?.present();
  };

  const handleCloseExpensesModal = () => {
    Keyboard.dismiss();
    expensesSheetRef.current?.dismiss();
    clearExpenseFields();
  };

  const handleOpenCardModal = () => {
    setCardModalMode("LIST");
    cardSheetRef.current?.present();
  };

  const handleCloseCardModal = () => {
    Keyboard.dismiss();
    cardSheetRef.current?.dismiss();
    clearCardFields();
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

    const now = new Date();
    const selectedYear = expenseDate.getFullYear();
    const selectedMonth = expenseDate.getMonth();

    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    let hours = now.getHours();
    let minutes = now.getMinutes();
    let seconds = now.getSeconds();

    const selectedMonthKey = selectedYear * 12 + selectedMonth;
    const currentMonthKey = currentYear * 12 + currentMonth;

    if (selectedMonthKey > currentMonthKey) {
      hours = 0;
      minutes = 0;
      seconds = 0;
    } else if (selectedMonthKey < currentMonthKey) {
      hours = 23;
      minutes = 59;
      seconds = 59;
    }

    const fullLocalDateTime = new Date(
      selectedYear,
      selectedMonth,
      expenseDate.getDate(),
      hours,
      minutes,
      seconds,
    );

    const formattedDueDate = toLocalISOString(fullLocalDateTime);

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
      handleCloseExpensesModal();

      await fetchAllData();
    } catch (error) {
      console.error("Error creating expense:", error);
      Alert.alert("Error", "Failed to save expense.");
    } finally {
      setSubmitting(false);
    }
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
      await fetchAllData();
    } catch (error) {
      console.error("Error adding card:", error);
      Alert.alert("Error", "Failed to add card.");
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
    const cardToDeleteId = String(selectedCardForAction.id);

    const isCardInUse = rawExpenses.some((exp: any) => {
      const rawCardId = exp.cardId ?? exp.card?.id;
      if (!rawCardId) return false;
      return String(rawCardId) === cardToDeleteId;
    });

    const alertTitle = t("delete", "Delete");
    const alertMessage = isCardInUse
      ? t(
          "cardInUseWarning",
          "This card is associated with another expenses. Are you sure you want to delete it?",
        )
      : t(
          "deleteCardConfirmation",
          "Are you sure you want to delete this card?",
        );

    Alert.alert(alertTitle, alertMessage, [
      { text: t("cancel", "Cancel"), style: "cancel" },
      {
        text: t("delete", "Delete"),
        style: "destructive",
        onPress: async () => {
          setSubmittingCard(true);
          try {
            await api.delete(`/api/v1/cards/${cardToDeleteId}`);
            setUserCards((prevCards) =>
              prevCards.filter((card) => String(card.id) !== cardToDeleteId),
            );
            setSelectedCardForAction(null);
            setCardModalMode("LIST");
            await fetchAllData();
          } catch (error: any) {
            Alert.alert(
              t("error", "Error"),
              error?.response?.data?.message || "Failed to delete card.",
            );
          } finally {
            setSubmittingCard(false);
          }
        },
      },
    ]);
  };

  const clearIncomeFields = () => {
    setIncomeSource("");
    setIncomeValue("");
  };

  const clearExpenseFields = () => {
    setDescription("");
    setValue("");
    setCategory("Food");
    setExpenseDate(new Date());
    setIsPaid(true);
    setPaymentType("CASH");
    setRecurrencePeriod("NONE");
    if (userCards.length > 0) {
      setSelectedCardId(userCards[0].id);
    }
  };

  const clearCardFields = () => {
    setNewCardName("");
    setNewCardType("CREDIT");
    setSelectedCardForAction(null);
    setCardModalMode("LIST");
  };

  const formatCategoryLabel = (cat: string) => {
    if (!cat) return "";
    const key = cat.toLowerCase().trim().replace(/\s+/g, "_");
    const fallback = cat
      .replace(/_/g, " ")
      .toLowerCase()
      .replace(/\b\w/g, (c) => c.toUpperCase());
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
      case "healthcare":
        return "🩺";
      case "clothing":
        return "👕";
      case "pet":
        return "🐾";
      case "travel":
        return "✈️";
      default:
        return "💳";
    }
  };

  const getCategoryColor = (cat: string, isDark: boolean = false): string => {
    switch (cat?.toLowerCase().replace(/_/g, " ").trim()) {
      case "housing":
        return isDark ? "#ff595e" : "#ff6600";
      case "food":
        return isDark ? "#ff924c" : "#ff9900";
      case "fixed expenses":
        return isDark ? "#A78BFA" : "#6D28D9";
      case "transportation":
      case "transport":
        return isDark ? "#8ac926" : "#669900";
      case "entertainment":
        return isDark ? "#c5ca30" : "#99cc33";
      case "healthcare":
      case "health":
        return isDark ? "#ffca3a" : "#ffcc00";
      case "clothing":
        return isDark ? "#36949d" : "#006699";
      case "pet":
        return isDark ? "#1982c4" : "#3399cc";
      case "travel":
        return isDark ? "#6a4c93" : "#990066";
      default:
        return isDark ? "#565aa0" : "#cc3399";
    }
  };

  if (loading) {
    return (
      <View
        style={[
          styles.centerContainer,
          { backgroundColor: colors.screenBackground },
        ]}
      >
        <ActivityIndicator size="large" color={colors.primaryTeal} />
      </View>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.headerBackground }]}
    >
      <StatusBar
        barStyle={colors.statusBarStyle}
        backgroundColor={colors.headerBackground}
      />

      <View
        style={[styles.header, { backgroundColor: colors.headerBackground }]}
      >
        <Text style={styles.monthText}>{t("overview", "OVERVIEW")}</Text>

        <View style={styles.userGreetingRow}>
          <Text style={styles.greetingText}>
            {t("hello", "Hello")}
            {userName ? `, ${userName.split(" ")[0]}` : ""}.
          </Text>
          <TouchableOpacity
            style={styles.cardIconButton}
            onPress={handleOpenCardModal}
          >
            <Ionicons name="card-outline" size={20} color="#FFFFFF" />
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
            onPress={handleOpenIncomeModal}
          >
            <View style={styles.rowContainer}>
              <Text style={styles.miniCardLabel}>{t("income", "INCOME")}</Text>
              <Text style={styles.miniCardAdd}>+</Text>
            </View>

            <Text style={styles.miniCardValue}>
              $
              {effectiveIncome.toLocaleString(i18n.language, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.miniCard, styles.flex1, { marginLeft: 8 }]}
            onPress={handleOpenExpensesModal}
          >
            <View style={styles.rowContainer}>
              <Text style={styles.miniCardLabel}>
                {t("expenses", "EXPENSES")}
              </Text>
              <Text style={styles.miniCardAdd}>+</Text>
            </View>
            <Text style={styles.miniCardValue}>
              $
              {effectiveExpenses.toLocaleString(i18n.language, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={[styles.body, { backgroundColor: colors.screenBackground }]}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primaryTeal}
            />
          }
        >
          <View
            style={[
              styles.sectionCard,
              { backgroundColor: colors.cardBackground },
            ]}
          >
            <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
              {t("spendingTrend", "Spending Trend")}
            </Text>

            <View style={styles.chartContainer}>
              <LineChart
                scrollRef={chartRef}
                data={trendData}
                curved
                color={colors.graphicLine}
                thickness={2.5}
                hideDataPoints={false}
                focusedDataPointIndex={3}
                dataPointsColor={colors.graphicLine}
                focusedDataPointColor={colors.graphicLine}
                height={130}
                spacing={55}
                initialSpacing={20}
                endSpacing={0}
                noOfSections={3}
                rulesType="dashed"
                rulesColor="#E5E7EB"
                yAxisColor="transparent"
                xAxisColor="#E5E7EB"
                yAxisTextStyle={{
                  color: colors.textSecondary,
                  fontSize: 11,
                }}
                xAxisLabelTextStyle={{
                  color: colors.textSecondary,
                  fontSize: 11,
                }}
                formatYLabel={(val) => `${Number(val)}`}
                areaChart={false}
                adjustToWidth={false}
                startFillColor="transparent"
                endFillColor="transparent"
                startOpacity={0}
                endOpacity={0}
                curveType={1}
              />
            </View>
          </View>

          <View
            style={[
              styles.sectionCard,
              { backgroundColor: colors.cardBackground },
            ]}
          >
            <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
              {t("monthlyBudget", "Monthly Budget")}
            </Text>
            {budgetItems.map((item) => {
              const sharePercentage =
                effectiveExpenses > 0
                  ? (item.spent / effectiveExpenses) * 100
                  : 0;

              return (
                <View key={item.id} style={styles.budgetItem}>
                  <View style={styles.budgetHeader}>
                    <Text
                      style={[
                        styles.budgetCategory,
                        { color: colors.textPrimary },
                      ]}
                    >
                      {t(item.category.toLowerCase().replace(/\s+/g, "_"), {
                        defaultValue: item.category,
                      })}
                    </Text>
                    <Text
                      style={[
                        styles.budgetAmounts,
                        { color: colors.monthlyAmount },
                      ]}
                    >
                      ${formatCurrency(item.spent)}{" "}
                      <Text
                        style={[
                          styles.budgetLimit,
                          { color: colors.textSecondary },
                        ]}
                      >
                        ({sharePercentage.toFixed(0)}%)
                      </Text>
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.progressBarTrack,
                      { backgroundColor: colors.iconBoxBg },
                    ]}
                  >
                    <View
                      style={[
                        styles.progressBarFill,
                        {
                          width: `${Math.min(sharePercentage, 100)}%`,
                          backgroundColor: getCategoryColor(
                            item.category,
                            isDark,
                          ),
                        },
                      ]}
                    />
                  </View>
                </View>
              );
            })}
          </View>

          <View
            style={[
              styles.sectionCard,
              { backgroundColor: colors.cardBackground },
            ]}
          >
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
                {t("recent", "Recent")}
              </Text>
              <TouchableOpacity onPress={() => router.push("/transactions")}>
                <Text
                  style={[styles.seeAllText, { color: colors.primaryTeal }]}
                >
                  {t("seeAll", "See all")} →
                </Text>
              </TouchableOpacity>
            </View>

            {recentTransactions.map((tx) => (
              <View
                key={tx.id}
                style={[
                  styles.transactionRow,
                  { borderBottomColor: colors.divider },
                ]}
              >
                <View
                  style={[
                    styles.iconContainer,
                    { backgroundColor: colors.iconBoxBg },
                  ]}
                >
                  <Text style={styles.emojiText}>{tx.emoji}</Text>
                </View>

                <View style={styles.transactionMeta}>
                  <Text
                    style={[
                      styles.transactionTitle,
                      { color: colors.textPrimary },
                    ]}
                  >
                    {tx.title}
                  </Text>
                  <Text
                    style={[
                      styles.transactionSubtitle,
                      { color: colors.textSecondary },
                    ]}
                  >
                    {String(
                      t(tx.category.toLowerCase().replace(/\s+/g, "_"), {
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
                    ? `+$${formatCurrency(tx.amount)}`
                    : `-$${formatCurrency(tx.amount)}`}
                </Text>
              </View>
            ))}
          </View>
        </ScrollView>
      </View>

      <BottomSheetModal
        ref={cardSheetRef}
        onDismiss={clearCardFields}
        enableDynamicSizing
        enablePanDownToClose
        keyboardBehavior="interactive"
        android_keyboardInputMode="adjustPan"
        keyboardBlurBehavior="restore"
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: colors.cardBackground }}
      >
        <BottomSheetScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
        >
          <Pressable style={{ flex: 1 }} onPress={() => Keyboard.dismiss()}>
            {cardModalMode === "LIST" && (
              <>
                <View style={styles.modalHeaderRow}>
                  <Text
                    style={[styles.modalTitle, { color: colors.textPrimary }]}
                  >
                    {t("registeredCards", "Registered Cards")}
                  </Text>
                  <TouchableOpacity
                    style={[
                      styles.addCardHeaderButton,
                      { backgroundColor: colors.addButtonBg },
                    ]}
                    onPress={() => {
                      setNewCardName("");
                      setNewCardType("CREDIT");
                      setCardModalMode("FORM");
                    }}
                  >
                    <Text
                      style={[
                        styles.addCardHeaderButtonText,
                        { color: colors.cardBackground },
                      ]}
                    >
                      + {t("addCard", "Add Card")}
                    </Text>
                  </TouchableOpacity>
                </View>

                {userCards.length === 0 ? (
                  <View style={styles.emptyCardsContainer}>
                    <Text
                      style={[
                        styles.emptyCardsText,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {t("noCardsRegistered", "No cards registered")}
                    </Text>
                  </View>
                ) : (
                  <ScrollView style={{ maxHeight: 240, marginVertical: 12 }}>
                    {userCards.map((c) => (
                      <TouchableOpacity
                        key={c.id}
                        style={[
                          styles.cardListItem,
                          { backgroundColor: colors.iconBoxBg },
                        ]}
                        onPress={() => {
                          setSelectedCardForAction(c);
                          setCardModalMode("DETAILS");
                        }}
                      >
                        <Text
                          style={[
                            styles.cardListItemText,
                            { flex: 1, color: colors.textPrimary },
                          ]}
                          numberOfLines={1}
                        >
                          💳 {c.name || t("unnamedCard", "Unnamed Card")}
                        </Text>
                        <Text
                          style={[
                            styles.cardListItemBadge,
                            {
                              backgroundColor: colors.neutral,
                              color: colors.typeCard,
                              minWidth: scale(55),
                              textAlign: "center",
                            },
                          ]}
                        >
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
                    style={[
                      styles.modalButton,
                      styles.cancelButton,
                      { backgroundColor: colors.iconBoxBg },
                    ]}
                    onPress={handleCloseCardModal}
                  >
                    <Text
                      style={[
                        styles.cancelButtonText,
                        { color: colors.textPrimary },
                      ]}
                    >
                      {t("close", "Close")}
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            {cardModalMode === "DETAILS" && selectedCardForAction && (
              <>
                <View style={styles.modalHeaderRow}>
                  <TouchableOpacity onPress={() => setCardModalMode("LIST")}>
                    <Text
                      style={[
                        styles.backButtonText,
                        { color: colors.primaryTeal },
                      ]}
                    >
                      ← {t("back", "Back")}
                    </Text>
                  </TouchableOpacity>
                  <Text
                    style={[styles.modalTitle, { color: colors.textPrimary }]}
                  >
                    {selectedCardForAction.name}
                  </Text>
                  <View style={{ width: 40 }} />
                </View>

                <View style={{ marginVertical: 20 }}>
                  <Text
                    style={[styles.inputLabel, { color: colors.textSecondary }]}
                  >
                    {t("cardType", "Card Type")}
                  </Text>
                  <Text
                    style={[
                      styles.cardListItemText,
                      { color: colors.textPrimary },
                    ]}
                  >
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
                    style={[
                      styles.modalButton,
                      styles.cancelButton,
                      { backgroundColor: colors.iconBoxBg },
                    ]}
                    onPress={handleStartEditCard}
                  >
                    <Text
                      style={[
                        styles.cancelButtonText,
                        { color: colors.textPrimary },
                      ]}
                    >
                      {t("edit", "Edit")}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.modalButton, { backgroundColor: "#EF4444" }]}
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
                    <Text
                      style={[
                        styles.backButtonText,
                        { color: colors.primaryTeal },
                      ]}
                    >
                      ← {t("back", "Back")}
                    </Text>
                  </TouchableOpacity>
                  <Text
                    style={[styles.modalTitle, { color: colors.textPrimary }]}
                  >
                    {cardModalMode === "EDIT"
                      ? `${t("edit", "Edit")} ${t("card", "Card")}`
                      : t("newCard", "New Card")}
                  </Text>
                  <View style={{ width: 40 }} />
                </View>

                <Text
                  style={[styles.inputLabel, { color: colors.textSecondary }]}
                >
                  {t("cardName", "Card Name")}
                </Text>
                <BottomSheetTextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.iconBoxBg,
                      color: colors.textPrimary,
                    },
                  ]}
                  placeholder="e.g. Chase Sapphire, Nubank"
                  placeholderTextColor={colors.textSecondary}
                  value={newCardName}
                  onChangeText={setNewCardName}
                />

                <Text
                  style={[styles.inputLabel, { color: colors.textSecondary }]}
                >
                  {t("cardType", "Card Type")}
                </Text>
                <View style={styles.twoColumnContainer}>
                  {(["CREDIT", "DEBIT"] as const).map((type) => (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.categoryChipTwoCol,
                        { backgroundColor: colors.iconBoxBg },
                        newCardType === type && {
                          backgroundColor: colors.primaryTeal,
                        },
                      ]}
                      onPress={() => setNewCardType(type)}
                    >
                      <Text
                        style={[
                          styles.categoryChipText,
                          { color: colors.textPrimary },
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
                    style={[
                      styles.modalButton,
                      styles.cancelButton,
                      { backgroundColor: colors.iconBoxBg },
                    ]}
                    onPress={() =>
                      setCardModalMode(
                        cardModalMode === "EDIT" ? "DETAILS" : "LIST",
                      )
                    }
                  >
                    <Text
                      style={[
                        styles.cancelButtonText,
                        { color: colors.textPrimary },
                      ]}
                    >
                      {t("cancel", "Cancel")}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.modalButton,
                      styles.saveButton,
                      { backgroundColor: colors.primaryTeal },
                    ]}
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
        </BottomSheetScrollView>
      </BottomSheetModal>

      <BottomSheetModal
        ref={incomeSheetRef}
        onDismiss={clearIncomeFields}
        enableDynamicSizing
        enablePanDownToClose
        keyboardBehavior="interactive"
        android_keyboardInputMode="adjustPan"
        keyboardBlurBehavior="restore"
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: colors.cardBackground }}
      >
        <BottomSheetScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
        >
          <Pressable style={{ flex: 1 }} onPress={() => Keyboard.dismiss()}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
              {t("addIncomeDeposit", "Add Income Deposit")}
            </Text>

            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
              {t("sourceDescription", "Source / Description")}
            </Text>
            <BottomSheetTextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.iconBoxBg,
                  color: colors.textPrimary,
                },
              ]}
              placeholder="e.g. Monthly Salary, Freelance"
              placeholderTextColor={colors.textSecondary}
              value={incomeSource}
              onChangeText={setIncomeSource}
            />

            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
              {t("amount", "Amount ($)")}
            </Text>
            <BottomSheetTextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.iconBoxBg,
                  color: colors.textPrimary,
                },
              ]}
              placeholder={`0${decimalSeparator}00`}
              placeholderTextColor={colors.textSecondary}
              keyboardType="decimal-pad"
              value={incomeValue}
              onChangeText={(text) => {
                // Replace alternative separators (, or .) with the active locale's separator
                let sanitized = text.replace(/[.,]/g, decimalSeparator);

                // Prevent multiple decimal separators
                const parts = sanitized.split(decimalSeparator);
                if (parts.length > 2) {
                  sanitized = `${parts[0]}${decimalSeparator}${parts.slice(1).join("")}`;
                }

                // Restrict to 2 decimal places
                if (parts[1] && parts[1].length > 2) {
                  sanitized = `${parts[0]}${decimalSeparator}${parts[1].slice(0, 2)}`;
                }

                setIncomeValue(sanitized);
              }}
            />

            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
              {t("date", "Date")}
            </Text>
            <TouchableOpacity
              style={[
                styles.datePickerButton,
                { backgroundColor: colors.iconBoxBg },
              ]}
              onPress={() => setShowIncomeDatePicker(true)}
            >
              <Ionicons
                name="calendar-outline"
                size={20}
                color={colors.textPrimary}
              />
              <Text
                style={[styles.datePickerText, { color: colors.textPrimary }]}
              >
                {formatDateDDMMYYYY(incomeDate)}
              </Text>
            </TouchableOpacity>

            {showIncomeDatePicker &&
              (Platform.OS === "ios" ? (
                <Modal
                  transparent
                  animationType="fade"
                  visible={showIncomeDatePicker}
                  onRequestClose={() => setShowIncomeDatePicker(false)}
                >
                  <TouchableOpacity
                    style={styles.datePickerBackdrop}
                    activeOpacity={1}
                    onPress={() => setShowIncomeDatePicker(false)}
                  >
                    <TouchableOpacity
                      activeOpacity={1}
                      style={[
                        styles.datePickerContainerIOS,
                        { backgroundColor: colors.cardBackground },
                      ]}
                    >
                      <View
                        style={[
                          styles.datePickerHeaderIOS,
                          { borderBottomColor: colors.divider },
                        ]}
                      >
                        <TouchableOpacity
                          onPress={() => setShowIncomeDatePicker(false)}
                        >
                          <Text
                            style={[
                              styles.datePickerDoneText,
                              { color: colors.primaryTeal },
                            ]}
                          >
                            {t("done", "Done")}
                          </Text>
                        </TouchableOpacity>
                      </View>
                      <DateTimePicker
                        value={incomeDate}
                        mode="date"
                        display="spinner"
                        onValueChange={handleIncomeDateChange}
                        maximumDate={new Date(2100, 11, 31)}
                        style={{ alignSelf: "center", width: "100%" }}
                      />
                    </TouchableOpacity>
                  </TouchableOpacity>
                </Modal>
              ) : (
                <DateTimePicker
                  value={incomeDate}
                  mode="date"
                  display="default"
                  onValueChange={handleIncomeDateChange}
                  maximumDate={new Date(2100, 11, 31)}
                />
              ))}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.cancelButton,
                  { backgroundColor: colors.iconBoxBg },
                ]}
                onPress={handleCloseIncomeModal}
              >
                <Text
                  style={[
                    styles.cancelButtonText,
                    { color: colors.textPrimary },
                  ]}
                >
                  {t("cancel", "Cancel")}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.saveButton,
                  { backgroundColor: colors.primaryTeal },
                ]}
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
          </Pressable>
        </BottomSheetScrollView>
      </BottomSheetModal>

      <BottomSheetModal
        ref={expensesSheetRef}
        onDismiss={clearExpenseFields}
        enableDynamicSizing
        enablePanDownToClose={true}
        keyboardBehavior="interactive"
        android_keyboardInputMode="adjustPan"
        keyboardBlurBehavior="restore"
        backdropComponent={renderBackdrop}
        backgroundStyle={{
          backgroundColor: colors.cardBackground,
        }}
      >
        <BottomSheetScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingBottom: 40,
          }}
        >
          <Pressable style={{ flex: 1 }} onPress={() => Keyboard.dismiss()}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
              {t("addNewExpense", "Add New Expense")}
            </Text>

            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
              {t("description", "Description")}
            </Text>
            <BottomSheetTextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.iconBoxBg,
                  color: colors.textPrimary,
                },
              ]}
              placeholder="e.g. Grocery Shopping"
              placeholderTextColor={colors.textSecondary}
              value={description}
              onChangeText={setDescription}
            />

            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
              {t("amount", "Amount ($)")}
            </Text>
            <BottomSheetTextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.iconBoxBg,
                  color: colors.textPrimary,
                },
              ]}
              placeholder={`0${decimalSeparator}00`}
              placeholderTextColor={colors.textSecondary}
              keyboardType="decimal-pad"
              value={value}
              onChangeText={(text) => {
                // Replace alternative separators (, or .) with the active locale's separator
                let sanitized = text.replace(/[.,]/g, decimalSeparator);

                // Prevent multiple decimal separators
                const parts = sanitized.split(decimalSeparator);
                if (parts.length > 2) {
                  sanitized = `${parts[0]}${decimalSeparator}${parts.slice(1).join("")}`;
                }

                // Restrict to 2 decimal places
                if (parts[1] && parts[1].length > 2) {
                  sanitized = `${parts[0]}${decimalSeparator}${parts[1].slice(0, 2)}`;
                }

                setValue(sanitized);
              }}
            />

            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
              {t("category", "Category")}
            </Text>
            <View style={styles.categoryContainer}>
              <View style={styles.categoryColumn}>
                {CATEGORIES.slice(0, Math.ceil(CATEGORIES.length / 2)).map(
                  (cat) => (
                    <TouchableOpacity
                      key={cat}
                      style={[
                        styles.categoryChip,
                        { backgroundColor: colors.iconBoxBg },
                        category === cat && {
                          backgroundColor: colors.primaryTeal,
                        },
                      ]}
                      onPress={() => setCategory(cat)}
                    >
                      <Text
                        style={[
                          styles.categoryChipText,
                          { color: colors.textPrimary },
                          category === cat && styles.categoryChipTextSelected,
                        ]}
                        numberOfLines={1}
                      >
                        {formatCategoryLabel(cat)}
                      </Text>
                    </TouchableOpacity>
                  ),
                )}
              </View>

              <View style={styles.categoryColumn}>
                {CATEGORIES.slice(Math.ceil(CATEGORIES.length / 2)).map(
                  (cat) => (
                    <TouchableOpacity
                      key={cat}
                      style={[
                        styles.categoryChip,
                        { backgroundColor: colors.iconBoxBg },
                        category === cat && {
                          backgroundColor: colors.primaryTeal,
                        },
                      ]}
                      onPress={() => setCategory(cat)}
                    >
                      <Text
                        style={[
                          styles.categoryChipText,
                          { color: colors.textPrimary },
                          category === cat && styles.categoryChipTextSelected,
                        ]}
                        numberOfLines={1}
                      >
                        {formatCategoryLabel(cat)}
                      </Text>
                    </TouchableOpacity>
                  ),
                )}
              </View>
            </View>

            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
              {t("paymentMethod", "Payment Method")}
            </Text>
            <View style={styles.categoryContainer}>
              <View style={styles.categoryColumn}>
                {(() => {
                  const type = "CASH";
                  return (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.categoryChip,
                        { backgroundColor: colors.iconBoxBg },
                        paymentType === type && {
                          backgroundColor: colors.primaryTeal,
                        },
                      ]}
                      onPress={() => setPaymentType(type)}
                    >
                      <Text
                        style={[
                          styles.categoryChipText,
                          { color: colors.textPrimary },
                          paymentType === type &&
                            styles.categoryChipTextSelected,
                        ]}
                      >
                        {String(
                          t(type.toLowerCase(), {
                            defaultValue: "Cash",
                          }),
                        )}
                      </Text>
                    </TouchableOpacity>
                  );
                })()}
              </View>

              <View style={styles.categoryColumn}>
                {(() => {
                  const type = "CARD";
                  const isDisabled = userCards.length === 0;

                  return (
                    <TouchableOpacity
                      key={type}
                      disabled={isDisabled}
                      style={[
                        styles.categoryChip,
                        { backgroundColor: colors.iconBoxBg },
                        paymentType === type && {
                          backgroundColor: colors.primaryTeal,
                        },
                        isDisabled && { opacity: 0.4 },
                      ]}
                      onPress={() => {
                        setPaymentType(type);
                        if (userCards.length > 0 && !selectedCardId) {
                          setSelectedCardId(userCards[0].id);
                        }
                      }}
                    >
                      <Text
                        style={[
                          styles.categoryChipText,
                          { color: colors.textPrimary },
                          paymentType === type &&
                            styles.categoryChipTextSelected,
                        ]}
                        numberOfLines={1}
                      >
                        {String(
                          t(type.toLowerCase(), {
                            defaultValue: "Card",
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
                })()}
              </View>
            </View>

            {paymentType === "CARD" && userCards.length > 0 && (
              <>
                <Text
                  style={[styles.inputLabel, { color: colors.textSecondary }]}
                >
                  {t("selectCard", "Select Card")}
                </Text>
                <View style={styles.categoryContainer}>
                  <View style={styles.categoryColumn}>
                    {userCards
                      .slice(0, Math.ceil(userCards.length / 2))
                      .map((card) => (
                        <TouchableOpacity
                          key={card.id}
                          style={[
                            styles.categoryChip,
                            { backgroundColor: colors.iconBoxBg },
                            selectedCardId === card.id && {
                              backgroundColor: colors.primaryTeal,
                            },
                          ]}
                          onPress={() => setSelectedCardId(card.id)}
                        >
                          <Text
                            style={[
                              styles.categoryChipText,
                              { color: colors.textPrimary },
                              selectedCardId === card.id &&
                                styles.categoryChipTextSelected,
                            ]}
                            numberOfLines={1}
                          >
                            💳 {card.name} (
                            {String(
                              t(card.cardType.toLowerCase(), {
                                defaultValue:
                                  card.cardType === "CREDIT"
                                    ? "Credit"
                                    : "Debit",
                              }),
                            )}
                            )
                          </Text>
                        </TouchableOpacity>
                      ))}
                  </View>

                  <View style={styles.categoryColumn}>
                    {userCards
                      .slice(Math.ceil(userCards.length / 2))
                      .map((card) => (
                        <TouchableOpacity
                          key={card.id}
                          style={[
                            styles.categoryChip,
                            { backgroundColor: colors.iconBoxBg },
                            selectedCardId === card.id && {
                              backgroundColor: colors.primaryTeal,
                            },
                          ]}
                          onPress={() => setSelectedCardId(card.id)}
                        >
                          <Text
                            style={[
                              styles.categoryChipText,
                              { color: colors.textPrimary },
                              selectedCardId === card.id &&
                                styles.categoryChipTextSelected,
                            ]}
                            numberOfLines={1}
                          >
                            💳 {card.name} (
                            {String(
                              t(card.cardType.toLowerCase(), {
                                defaultValue:
                                  card.cardType === "CREDIT"
                                    ? "Credit"
                                    : "Debit",
                              }),
                            )}
                            )
                          </Text>
                        </TouchableOpacity>
                      ))}
                  </View>
                </View>
              </>
            )}

            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
              {t("date", "Date")}
            </Text>
            <TouchableOpacity
              style={[
                styles.datePickerButton,
                { backgroundColor: colors.iconBoxBg },
              ]}
              onPress={() => setShowDatePicker(true)}
            >
              <Ionicons
                name="calendar-outline"
                size={20}
                color={colors.textPrimary}
              />
              <Text
                style={[styles.datePickerText, { color: colors.textPrimary }]}
              >
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
                      style={[
                        styles.datePickerContainerIOS,
                        { backgroundColor: colors.cardBackground },
                      ]}
                    >
                      <View
                        style={[
                          styles.datePickerHeaderIOS,
                          { borderBottomColor: colors.divider },
                        ]}
                      >
                        <TouchableOpacity
                          onPress={() => setShowDatePicker(false)}
                        >
                          <Text
                            style={[
                              styles.datePickerDoneText,
                              { color: colors.primaryTeal },
                            ]}
                          >
                            {t("done", "Done")}
                          </Text>
                        </TouchableOpacity>
                      </View>
                      <DateTimePicker
                        value={expenseDate}
                        mode="date"
                        display="spinner"
                        onValueChange={handleDateChange}
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
                  maximumDate={new Date(2100, 11, 31)}
                />
              ))}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.cancelButton,
                  { backgroundColor: colors.iconBoxBg },
                ]}
                onPress={handleCloseExpensesModal}
              >
                <Text
                  style={[
                    styles.cancelButtonText,
                    { color: colors.textPrimary },
                  ]}
                >
                  {t("cancel", "Cancel")}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.saveButton,
                  { backgroundColor: colors.primaryTeal },
                ]}
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
          </Pressable>
        </BottomSheetScrollView>
      </BottomSheetModal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    paddingHorizontal: scale(20),
    paddingTop: verticalScale(16),
    paddingBottom: verticalScale(28),
  },
  monthText: {
    fontSize: moderateScale(12),
    fontWeight: "700",
    color: "rgba(255, 255, 255, 0.7)",
    letterSpacing: scale(1.2),
  },
  userGreetingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: verticalScale(4),
  },
  greetingText: {
    fontSize: moderateScale(28),
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  cardIconButton: {
    padding: scale(8),
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: scale(12),
  },
  subtitleText: {
    fontSize: moderateScale(14),
    color: "rgba(255, 255, 255, 0.8)",
    marginTop: verticalScale(4),
    marginBottom: verticalScale(16),
  },
  balanceCard: {
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    borderRadius: scale(20),
    padding: scale(16),
    marginBottom: verticalScale(12),
  },
  balanceLabel: {
    fontSize: moderateScale(11),
    fontWeight: "700",
    color: "rgba(255, 255, 255, 0.6)",
    letterSpacing: scale(0.5),
  },
  balanceAmount: {
    fontSize: moderateScale(32),
    fontWeight: "bold",
    color: "#FFFFFF",
    marginVertical: verticalScale(4),
  },
  balanceTrend: {
    fontSize: moderateScale(12),
    color: "rgba(255, 255, 255, 0.8)",
  },
  dualCardRow: {
    flexDirection: "row",
    gap: scale(10),
  },
  flex1: { flex: 1 },
  miniCard: {
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    borderRadius: scale(16),
    padding: scale(14),
  },
  rowContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  miniCardLabel: {
    fontSize: moderateScale(11),
    fontWeight: "700",
    color: "rgba(255, 255, 255, 0.6)",
  },
  miniCardAdd: {
    fontSize: moderateScale(16),
    color: "#FFFFFF",
    fontWeight: "bold",
  },
  miniCardValue: {
    fontSize: moderateScale(16),
    fontWeight: "bold",
    color: "#FFFFFF",
    marginTop: verticalScale(4),
  },
  body: {
    flex: 1,
    borderTopLeftRadius: scale(24),
    borderTopRightRadius: scale(24),
    overflow: "hidden",
    paddingBottom: scale(40),
  },
  scrollContent: {
    padding: scale(20),
    gap: verticalScale(16),
  },
  sectionCard: {
    borderRadius: scale(20),
    padding: scale(16),
  },
  cardTitle: {
    fontSize: moderateScale(18),
    fontWeight: "700",
    marginBottom: verticalScale(12),
  },
  chartContainer: {
    alignItems: "center",
    marginVertical: verticalScale(8),
    overflow: "hidden",
    width: "100%",
  },
  budgetItem: {
    marginBottom: verticalScale(12),
  },
  budgetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: verticalScale(4),
  },
  budgetCategory: {
    fontSize: moderateScale(14),
    fontWeight: "600",
  },
  budgetAmounts: {
    fontSize: moderateScale(13),
    fontWeight: "600",
  },
  budgetLimit: {
    fontSize: moderateScale(12),
  },
  progressBarTrack: {
    height: verticalScale(8),
    borderRadius: scale(4),
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: scale(4),
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  seeAllText: {
    fontSize: moderateScale(13),
    fontWeight: "600",
  },
  transactionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: verticalScale(10),
    borderBottomWidth: 1,
  },
  iconContainer: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(12),
    justifyContent: "center",
    alignItems: "center",
    marginRight: scale(12),
  },
  emojiText: {
    fontSize: moderateScale(18),
  },
  transactionMeta: {
    flex: 1,
  },
  transactionTitle: {
    fontSize: moderateScale(15),
    fontWeight: "600",
  },
  transactionSubtitle: {
    fontSize: moderateScale(12),
    marginTop: verticalScale(2),
  },
  transactionAmount: {
    fontSize: moderateScale(15),
    fontWeight: "700",
  },
  incomeText: { color: "#1E6B5C" },
  expenseText: { color: "#D9534F" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: scale(24),
    borderTopRightRadius: scale(24),
    padding: scale(24),
    paddingBottom:
      Platform.OS === "ios" ? verticalScale(34) : verticalScale(24),
    width: "100%",
  },
  bottomExtension: {
    position: "absolute",
    bottom: verticalScale(-1000),
    left: 0,
    right: 0,
    height: verticalScale(1000),
  },
  modalHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: verticalScale(16),
  },
  modalTitle: {
    fontSize: moderateScale(20),
    fontWeight: "700",
  },
  addCardHeaderButton: {
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(6),
    borderRadius: scale(12),
  },
  addCardHeaderButtonText: {
    fontWeight: "600",
    fontSize: moderateScale(13),
  },
  emptyCardsContainer: {
    paddingVertical: verticalScale(20),
    alignItems: "center",
  },
  emptyCardsText: {
    fontSize: moderateScale(14),
  },
  cardListItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: verticalScale(12),
    paddingHorizontal: scale(12),
    borderRadius: scale(12),
    marginBottom: verticalScale(8),
  },
  cardListItemText: {
    fontSize: moderateScale(15),
    fontWeight: "600",
  },
  cardListItemBadge: {
    fontSize: moderateScale(12),
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(2),
    borderRadius: scale(6),
  },
  backButtonText: {
    fontWeight: "600",
    fontSize: moderateScale(14),
  },
  inputLabel: {
    fontSize: moderateScale(12),
    fontWeight: "600",
    marginTop: verticalScale(12),
    marginBottom: verticalScale(6),
  },
  input: {
    borderRadius: scale(12),
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(10),
    fontSize: moderateScale(15),
  },
  categoryContainer: {
    flexDirection: "row",
    gap: scale(10),
  },
  categoryColumn: {
    flex: 1,
    gap: verticalScale(8),
  },
  categoryChip: {
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(10),
    borderRadius: scale(12),
    alignItems: "center",
    justifyContent: "center",
  },
  categoryChipText: {
    fontSize: moderateScale(13),
    fontWeight: "600",
  },
  categoryChipTextSelected: {
    color: "#FFFFFF",
  },
  twoColumnContainer: {
    flexDirection: "row",
    gap: 12, // adjust gap spacing between the two columns as needed
    marginBottom: 16,
  },
  categoryChipTwoCol: {
    flex: 1, // forces equal 50/50 split
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  datePickerButton: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: scale(12),
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(12),
    gap: scale(10),
  },
  datePickerText: {
    fontSize: moderateScale(15),
    fontWeight: "500",
  },
  modalActions: {
    flexDirection: "row",
    gap: scale(12),
    marginTop: verticalScale(24),
  },
  modalButton: {
    flex: 1,
    paddingVertical: verticalScale(12),
    borderRadius: scale(12),
    alignItems: "center",
  },
  cancelButton: {},
  cancelButtonText: {
    fontWeight: "700",
    fontSize: moderateScale(14),
  },
  saveButton: {},
  saveButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: moderateScale(14),
  },
  datePickerBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  datePickerContainerIOS: {
    borderTopLeftRadius: scale(20),
    borderTopRightRadius: scale(20),
    paddingBottom: verticalScale(20),
  },
  datePickerHeaderIOS: {
    alignItems: "flex-end",
    padding: scale(16),
    borderBottomWidth: 1,
  },
  datePickerDoneText: {
    fontWeight: "bold",
    fontSize: moderateScale(16),
  },
});
