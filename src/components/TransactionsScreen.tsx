import { colors, useAppTheme } from "@/constants/theme";
import { useCurrency } from "@/context/CurrencyContext";
import api from "@/services/api";
import {
  ExpenseItem,
  FilterListHeaderProps,
  IncomeItem,
  Transaction,
  UserCard,
  UserProfile,
} from "@/types/overview";
import { formatCurrency } from "@/utils/formatters";
import { moderateScale, scale, verticalScale } from "@/utils/scaling";
import { parseFlexibleNumber } from "@/utils/storage";
import { Ionicons } from "@expo/vector-icons";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetTextInput,
} from "@gorhom/bottom-sheet";
import { useFocusEffect } from "expo-router";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  AppState,
  AppStateStatus,
  FlatList,
  Keyboard,
  PanResponder,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { ScrollView as GestureHandlerScrollView } from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";

const FilterListHeader = memo(
  ({
    filterCategories,
    filterCards,
    selectedFilter,
    selectedCardFilter,
    setSelectedFilter,
    setSelectedCardFilter,
    isDark,
    appColors,
    getFilterLabel,
    translatePaymentMethod,
    getPaymentIcon,
  }: FilterListHeaderProps) => {
    return (
      <View
        style={[
          styles.headerWrapper,
          { backgroundColor: appColors.screenBackground },
        ]}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[
            styles.filterListContainer,
            { backgroundColor: appColors.screenBackground },
          ]}
        >
          {filterCategories.map((item) => {
            const isActive =
              selectedFilter.toLowerCase() === String(item).toLowerCase();
            return (
              <TouchableOpacity
                key={String(item)}
                style={[
                  styles.filterChip,
                  styles.cardFilterChip,
                  isDark && { backgroundColor: appColors.cardBackground },
                  isActive && [
                    styles.filterChipActive,
                    { backgroundColor: appColors.primaryTeal },
                  ],
                ]}
                onPress={() => {
                  const filterValue = String(item);
                  setSelectedFilter(filterValue);

                  if (filterValue.toLowerCase() === "income") {
                    setSelectedCardFilter("All Payment Methods");
                  }
                }}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    isDark && { color: appColors.textSecondary },
                    isActive && styles.filterChipTextActive,
                  ]}
                >
                  {getFilterLabel(String(item))}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {filterCards.length > 1 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[
              styles.filterListContainer,
              { paddingTop: 0, backgroundColor: appColors.screenBackground },
            ]}
          >
            {filterCards.map((card) => {
              const cardStr = String(card || "Cash");
              const isActive =
                selectedCardFilter.toLowerCase() === cardStr.toLowerCase();
              const icon =
                cardStr === "All Payment Methods"
                  ? "🏷️"
                  : getPaymentIcon(cardStr);

              return (
                <TouchableOpacity
                  key={cardStr}
                  style={[
                    styles.filterChip,
                    styles.cardFilterChip,
                    isDark && { backgroundColor: appColors.cardBackground },
                    isActive && [
                      styles.filterChipActive,
                      { backgroundColor: appColors.primaryTeal },
                    ],
                  ]}
                  onPress={() => setSelectedCardFilter(cardStr)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      isDark && { color: appColors.textSecondary },
                      isActive && styles.filterChipTextActive,
                    ]}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                    maxFontSizeMultiplier={1.3}
                  >
                    {icon} {translatePaymentMethod(cardStr)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
      </View>
    );
  },
);

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

const parseAmount = (val: any): number => {
  if (typeof val === "number") return isNaN(val) ? 0 : val;
  if (typeof val === "string") {
    const parsed = parseFloat(val);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
};

const extractStringValue = (val: any, fallback = "Cash"): string => {
  if (!val) return fallback;
  if (typeof val === "string") return val;
  if (typeof val === "object") {
    return val.name || val.title || val.label || val.type || fallback;
  }
  return String(val);
};

const resolvePaymentMethod = (item: ExpenseItem, cards: UserCard[]): string => {
  const rawCardId =
    (typeof item.card === "string" ? item.card : null) ||
    (item as any).cardId ||
    (item as any).card_id ||
    (item.card && typeof item.card === "object" ? item.card.id : null);

  if (rawCardId !== null && rawCardId !== undefined) {
    const match = cards.find((c) => String(c.id) === String(rawCardId));
    const trimmedName = match?.name?.trim();
    if (trimmedName) return trimmedName;
    return "Deleted Card";
  }

  if (item.card && typeof item.card === "object" && item.card.name) {
    const match = cards.find(
      (c) =>
        c.name.trim().toLowerCase() === item.card.name.trim().toLowerCase(),
    );
    const trimmedMatchName = match?.name?.trim();
    if (trimmedMatchName) return trimmedMatchName;
    return "Deleted Card";
  }

  const rawMethod = extractStringValue(
    item.paymentMethod || item.paymentType,
    "Cash",
  );
  const normalized = rawMethod.trim().toLowerCase();

  if (
    normalized === "card" ||
    normalized === "cartao" ||
    normalized === "cartão" ||
    normalized.includes("deleted")
  ) {
    return "Deleted Card";
  }

  return rawMethod;
};

const getPaymentIcon = (method?: string): string => {
  if (!method) return "💵";
  const m = method.toLowerCase();
  if (
    m.includes("deleted") ||
    m.includes("deletad") ||
    m.includes("exclu") ||
    m.includes("eliminad")
  ) {
    return "🚫";
  }
  if (m.includes("cash") || m.includes("money") || m.includes("dinheiro")) {
    return "💵";
  }
  return "💳";
};

const formatWithCapitalMonth = (
  date: Date,
  locale: string,
  options: Intl.DateTimeFormatOptions,
): string => {
  if (!date || isNaN(date.getTime())) return "";
  const safeLocale = (locale || "en").replace("_", "-");

  try {
    const formatted = new Intl.DateTimeFormat(safeLocale, options).format(date);
    if (!formatted) return date.toLocaleDateString();

    const lowercasePrepositions = new Set([
      "de",
      "del",
      "e",
      "y",
      "do",
      "da",
      "dos",
      "das",
    ]);

    return formatted
      .split(" ")
      .map((word) => {
        const cleanLower = word.toLowerCase();
        if (lowercasePrepositions.has(cleanLower)) {
          return cleanLower;
        }
        return word.charAt(0).toUpperCase() + word.slice(1);
      })
      .join(" ");
  } catch {
    return date.toLocaleDateString() || "";
  }
};

function getCategoryIcon(cat: string, color: string, size = 20) {
  switch (cat?.toLowerCase().replace(/_/g, " ").trim()) {
    case "food":
      return <Ionicons name="cart" size={size} color={color} />;
    case "housing":
      return <Ionicons name="home" size={size} color={color} />;
    case "transportation":
      return <Ionicons name="car" size={size} color={color} />;
    case "entertainment":
      return <Ionicons name="film" size={size} color={color} />;
    case "fixed expenses":
      return <Ionicons name="receipt" size={size} color={color} />;
    case "healthcare":
      return <Ionicons name="medkit" size={size} color={color} />;
    case "clothing":
      return <Ionicons name="shirt" size={size} color={color} />;
    case "pet":
      return <Ionicons name="paw" size={size} color={color} />;
    case "travel":
      return <Ionicons name="airplane" size={size} color={color} />;
    case "deposit":
    case "income":
      return <Ionicons name="wallet" size={size} color={color} />;
    default:
      return <Ionicons name="card" size={size} color={color} />;
  }
}

const parseRawDate = (dateString: string): Date => {
  if (!dateString) return new Date();
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

const toLocalISOString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
};

export default function TransactionsScreen() {
  const { colors: appColors, isDark } = useAppTheme();
  const { currency } = useCurrency();
  const { t, i18n } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<string>("All");
  const [selectedCardFilter, setSelectedCardFilter] = useState<string>(
    "All Payment Methods",
  );
  const [monthlyIncome, setMonthlyIncome] = useState<number>(0);

  const [selectedTransaction, setSelectedTransaction] =
    useState<Transaction | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editDescription, setEditDescription] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editCategory, setEditCategory] = useState("");

  const [userCards, setUserCards] = useState<UserCard[]>([]);
  const [paymentType, setPaymentType] = useState<"CASH" | "CARD">("CASH");
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [submitting, setSubmitting] = useState<boolean>(false);

  const editSheetRef = useRef<BottomSheetModal>(null);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [selectedDate]),
  );

  const lastCheckedMonthRef = useRef<number>(new Date().getMonth());

  useEffect(() => {
    const checkMidnightRollover = () => {
      const now = new Date();
      const currentMonth = now.getMonth();

      if (lastCheckedMonthRef.current !== currentMonth) {
        lastCheckedMonthRef.current = currentMonth;
        setSelectedDate(new Date(now.getFullYear(), currentMonth, 1));
      }
    };

    const subscription = AppState.addEventListener(
      "change",
      (status: AppStateStatus) => {
        if (status === "active") {
          checkMidnightRollover();
          fetchData();
        }
      },
    );

    const interval = setInterval(checkMidnightRollover, 60000);

    return () => {
      subscription.remove();
      clearInterval(interval);
    };
  }, []);

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

  const fetchData = async () => {
    try {
      const year = selectedDate.getFullYear();
      const month = selectedDate.getMonth() + 1;
      const [expensesRes, incomesRes, userRes, cardsRes] =
        await Promise.allSettled([
          api.get<ExpenseItem[]>("/api/v1/expenses", {
            params: { year, month },
          }),
          api.get<IncomeItem[]>("/api/v1/incomes", { params: { year, month } }),
          api.get<UserProfile>("/api/v1/users/me"),
          api.get<UserCard[]>("/api/v1/cards"),
        ]);

      const expensesData =
        expensesRes.status === "fulfilled" ? expensesRes.value.data : [];
      const incomesData =
        incomesRes.status === "fulfilled" ? incomesRes.value.data : [];

      const userMonthlyIncome =
        userRes.status === "fulfilled" && userRes.value.data?.monthlyIncome
          ? parseAmount(userRes.value.data.monthlyIncome)
          : 0;

      setMonthlyIncome(userMonthlyIncome);

      const parsedExpenses: Transaction[] = (
        Array.isArray(expensesData) ? expensesData : []
      ).map((item) => ({
        id: `exp-${item.id}`,
        title: item.description || item.title || "Expense",
        amount: Math.abs(parseAmount(item.value ?? item.amount)),
        category: item.category || "General",
        rawDate: parseRawDate(item.dueDate || item.paidAt || item.date || ""),
        type: "EXPENSE",
        paymentMethod: resolvePaymentMethod(
          item,
          cardsRes.status === "fulfilled" ? cardsRes.value.data : [],
        ),
      }));

      let parsedIncomes: Transaction[] = (
        Array.isArray(incomesData) ? incomesData : []
      )
        .map((item) => ({
          id: `inc-${item.id}`,
          title:
            item.description || item.title || item.source || "Income Deposit",
          amount: Math.abs(parseAmount(item.value ?? item.amount)),
          category: item.category || "Income",
          rawDate: parseRawDate(item.createdAt || item.date || ""),
          type: "INCOME" as const,
        }))
        .filter(
          (item) =>
            item.rawDate.getFullYear() === year &&
            item.rawDate.getMonth() === month - 1,
        );

      const combined = [...parsedExpenses, ...parsedIncomes].sort(
        (a, b) => b.rawDate.getTime() - a.rawDate.getTime(),
      );

      setAllTransactions(combined);

      if (
        cardsRes.status === "fulfilled" &&
        Array.isArray(cardsRes.value.data)
      ) {
        setUserCards(cardsRes.value.data);
      }
    } catch (error) {
      if (__DEV__) {
        console.error("Error fetching transactions:", error);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [selectedDate]);

  const changeMonth = (offset: number) => {
    setSelectedDate(
      (prev) => new Date(prev.getFullYear(), prev.getMonth() + offset, 1),
    );
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return (
          Math.abs(gestureState.dx) > 20 &&
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 2
        );
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx < -50) {
          changeMonth(1);
        } else if (gestureState.dx > 50) {
          changeMonth(-1);
        }
      },
    }),
  ).current;

  const { totalIn, totalOut, netBalance } = useMemo(() => {
    let depositsSum = 0;
    let outSum = 0;

    allTransactions.forEach((t) => {
      if (t.type === "INCOME") {
        if (!t.id.startsWith("inc-default-")) {
          depositsSum += t.amount;
        }
      } else {
        outSum += t.amount;
      }
    });

    const inSum = monthlyIncome + depositsSum;

    return {
      totalIn: inSum,
      totalOut: outSum,
      netBalance: inSum - outSum,
    };
  }, [allTransactions, monthlyIncome]);

  const filterCategories = useMemo(() => {
    const categoriesSet = new Set<string>();
    let hasIncome = false;

    allTransactions.forEach((t) => {
      if (t.type === "INCOME") {
        hasIncome = true;
      } else if (t.type === "EXPENSE" && t.category) {
        categoriesSet.add(String(t.category));
      }
    });
    return [
      "All",
      ...(hasIncome ? ["Income"] : []),
      ...Array.from(categoriesSet),
    ];
  }, [allTransactions]);

  const filterCards = useMemo(() => {
    const cardsSet = new Set<string>();
    allTransactions.forEach((t) => {
      if (t.type === "EXPENSE") {
        cardsSet.add(String(t.paymentMethod || "Cash"));
      }
    });
    return ["All Payment Methods", ...Array.from(cardsSet)];
  }, [allTransactions]);

  const filteredTransactions = useMemo(() => {
    return allTransactions.filter((t) => {
      let matchesCategory = true;
      if (selectedFilter === "Income") {
        matchesCategory = t.type === "INCOME";
      } else if (selectedFilter !== "All") {
        matchesCategory =
          t.type === "EXPENSE" &&
          String(t.category).toLowerCase() === selectedFilter.toLowerCase();
      }

      let matchesCard = true;
      if (selectedCardFilter !== "All Payment Methods") {
        matchesCard =
          t.type === "EXPENSE" &&
          String(t.paymentMethod || "Cash").toLowerCase() ===
            selectedCardFilter.toLowerCase();
      }

      return matchesCategory && matchesCard;
    });
  }, [allTransactions, selectedFilter, selectedCardFilter]);

  const translateCategory = useCallback(
    (category: string) => {
      if (!category) return "";
      const normalizedKey = String(category)
        .toLowerCase()
        .trim()
        .replace(/\s+/g, "_");

      if (
        normalizedKey === "income" ||
        normalizedKey === "income_transaction"
      ) {
        return t("income_transaction", { defaultValue: "Income" }) || "Income";
      }

      return t(normalizedKey, { defaultValue: category }) || category;
    },
    [t],
  );

  const translatePaymentMethod = useCallback(
    (method: string) => {
      if (!method) return "";

      const normalized = String(method).toLowerCase().trim();

      if (
        normalized === "all payment methods" ||
        normalized === "all_payment_methods"
      ) {
        return (
          t("allPaymentMethods", { defaultValue: "All Payment Methods" }) ||
          "All Payment Methods"
        );
      }

      if (normalized === "deleted card" || normalized === "deleted_card") {
        return (
          t("deletedCard", { defaultValue: "Deleted Card" }) || "Deleted Card"
        );
      }

      if (normalized === "cash" || normalized === "dinheiro") {
        return t("cash", { defaultValue: "Cash" }) || "Cash";
      }

      if (
        normalized === "card" ||
        normalized === "cartao" ||
        normalized === "cartão"
      ) {
        return t("card", { defaultValue: "Card" }) || "Card";
      }

      return method;
    },
    [t],
  );

  const getFilterLabel = useCallback(
    (filter: string) => {
      if (filter === "All") return t("all", "All") || "All";
      if (filter === "Income")
        return t("income_transaction", "Income") || "Income";
      return translateCategory(filter) || filter;
    },
    [t, translateCategory],
  );

  const handleCardPress = (item: Transaction) => {
    setSelectedTransaction(item);
    setIsEditing(false);
    setModalVisible(true);

    requestAnimationFrame(() => {
      editSheetRef.current?.present();
    });
  };

  const handleStartEdit = () => {
    if (!selectedTransaction) return;
    setEditDescription(selectedTransaction.title);
    setEditAmount(
      formatAmountForInput(selectedTransaction.amount, i18n.language),
    );
    setEditCategory(selectedTransaction.category);

    const currentMethod = (selectedTransaction.paymentMethod || "Cash").trim();
    const matchingCard = userCards.find(
      (c) =>
        String(c.id) === String(currentMethod) ||
        c.name.toLowerCase() === currentMethod.toLowerCase(),
    );

    if (matchingCard) {
      setPaymentType("CARD");
      setSelectedCardId(matchingCard.id);
    } else if (currentMethod.toUpperCase() === "CARD") {
      setPaymentType("CARD");
      setSelectedCardId(userCards[0]?.id || null);
    } else {
      setPaymentType("CASH");
      setSelectedCardId(null);
    }

    setIsEditing(true);
  };

  const handleCloseExpensesModal = () => {
    Keyboard.dismiss();
    editSheetRef.current?.dismiss();
    setIsEditing(false);
    setSelectedTransaction(null);
  };

  const formatAmountForInput = (val: number, language: string): string => {
    const isZeroDecimal = ["JPY", "KRW"].includes(
      (currency || "").toUpperCase(),
    );
    if (isZeroDecimal) {
      return Math.round(val).toString();
    }

    const lang = (language || "en").toLowerCase();
    const isCommaDecimal = lang.startsWith("pt") || lang.startsWith("es");

    const fixedVal = val.toFixed(2);

    if (isCommaDecimal) {
      return fixedVal.replace(".", ",");
    }
    return fixedVal;
  };

  const handleSaveEdit = async () => {
    if (!selectedTransaction) return;

    const isIncome = selectedTransaction.type === "INCOME";
    const rawId = selectedTransaction.id.replace(
      isIncome ? "inc-" : "exp-",
      "",
    );
    const parsedAmount = parseFlexibleNumber(editAmount);

    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      Alert.alert(
        t("error", "Error") || "Error",
        t("invalidAmount", "Please enter a valid amount.") ||
          "Please enter a valid amount.",
      );
      return;
    }

    setSubmitting(true);

    const rawDateObj = new Date(selectedTransaction.rawDate);
    const formattedDate = !isNaN(rawDateObj.getTime())
      ? toLocalISOString(rawDateObj)
      : toLocalISOString(new Date());

    let finalPaymentMethod = "Cash";
    let cardIdPayload: string | null = null;

    if (!isIncome) {
      if (paymentType === "CARD") {
        const card = userCards.find(
          (c) => String(c.id) === String(selectedCardId),
        );
        finalPaymentMethod = card ? card.name : "Card";
        cardIdPayload = card ? card.id : selectedCardId;
      } else {
        finalPaymentMethod = "Cash";
      }
    }

    try {
      if (isIncome) {
        await api.put(`/api/v1/incomes/${rawId}`, {
          description: editDescription,
          value: parsedAmount,
          amount: parsedAmount,
          date: formattedDate,
        });
      } else {
        await api.put(`/api/v1/expenses/${rawId}`, {
          description: editDescription,
          value: parsedAmount,
          category: editCategory.toUpperCase().trim().replace(/\s+/g, "_"),
          dueDate: formattedDate,
          paymentType: paymentType,
          cardId: cardIdPayload,
          recurrencePeriod: "NONE",
          isPaid: true,
        });
      }

      setAllTransactions((prev) =>
        prev.map((item) =>
          item.id === selectedTransaction.id
            ? {
                ...item,
                title: editDescription,
                amount: parsedAmount,
                category: isIncome ? item.category : editCategory,
                paymentMethod: isIncome ? undefined : finalPaymentMethod,
              }
            : item,
        ),
      );

      setIsEditing(false);
      setModalVisible(false);
      editSheetRef.current?.dismiss();
    } catch (error: any) {
      if (__DEV__) {
        console.error(
          "Failed to update transaction:",
          error.response?.data || error.message,
        );
      }
      Alert.alert(
        t("error", "Error") || "Error",
        t("updateFailed", "Failed to update transaction.") ||
          "Failed to update transaction.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const isCategoryMatch = (cat1: string, cat2: string): boolean => {
    const norm1 = (cat1 || "").toLowerCase().replace(/_/g, " ").trim();
    const norm2 = (cat2 || "").toLowerCase().replace(/_/g, " ").trim();

    return (
      norm1 === norm2 || norm1.replace(/s$/, "") === norm2.replace(/s$/, "")
    );
  };

  const handleDelete = async () => {
    if (!selectedTransaction) return;

    const isIncome = selectedTransaction.type === "INCOME";
    const rawId = selectedTransaction.id.replace(
      isIncome ? "inc-" : "exp-",
      "",
    );
    const endpoint = isIncome
      ? `/api/v1/incomes/${rawId}`
      : `/api/v1/expenses/${rawId}`;

    Alert.alert(
      t("delete", "Delete") || "Delete",
      t("confirmDelete", "Are you sure you want to delete this transaction?") ||
        "Are you sure you want to delete this transaction?",
      [
        { text: t("cancel", "Cancel") || "Cancel", style: "cancel" },
        {
          text: t("delete", "Delete") || "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await api.delete(endpoint);
              setAllTransactions((prev) =>
                prev.filter((item) => item.id !== selectedTransaction.id),
              );
              setModalVisible(false);
              editSheetRef.current?.dismiss();
            } catch (error) {
              if (__DEV__) {
                console.error("Failed to delete transaction:", error);
              }
              Alert.alert(
                t("error", "Error") || "Error",
                t("deleteFailed", "Failed to delete transaction.") ||
                  "Failed to delete transaction.",
              );
            }
          },
        },
      ],
    );
  };

  const renderHeader = () => (
    <View
      style={[
        styles.headerWrapper,
        { backgroundColor: appColors.screenBackground },
      ]}
    >
      <View
        style={[
          styles.greenHeaderContainer,
          { backgroundColor: appColors.headerBackground },
        ]}
      >
        <Text style={styles.headerTitle}>
          {t("transactions", "Transactions") || "Transactions"}
        </Text>

        <View style={styles.monthSelectorRow}>
          <TouchableOpacity
            onPress={() => changeMonth(-1)}
            style={styles.monthNavButton}
          >
            <Text style={styles.monthNavText}>{"‹"}</Text>
          </TouchableOpacity>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Text style={styles.headerSubtitle}>
              {formatWithCapitalMonth(selectedDate, i18n.language, {
                month: "long",
                year: "numeric",
              })}
            </Text>
            <Text style={styles.headerSubtitle}>
              • {allTransactions.length} {t("records", "records") || "records"}
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => changeMonth(1)}
            style={styles.monthNavButton}
          >
            <Text style={styles.monthNavText}>{"›"}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>{t("in", "IN") || "IN"}</Text>
            <Text
              style={styles.summaryValue}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
            >
              +{formatCurrency(totalIn, currency)}
            </Text>
          </View>

          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>{t("out", "OUT") || "OUT"}</Text>
            <Text
              style={styles.summaryValue}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
            >
              -{formatCurrency(totalOut, currency)}
            </Text>
          </View>

          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>{t("net", "NET") || "NET"}</Text>
            <Text
              style={styles.summaryValue}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
            >
              {netBalance >= 0 ? "+" : "-"}
              {formatCurrency(Math.abs(netBalance), currency)}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );

  if (loading && !refreshing) {
    return (
      <SafeAreaView
        style={[
          styles.loadingContainer,
          { backgroundColor: appColors.screenBackground },
        ]}
      >
        <ActivityIndicator size="large" color={appColors.primaryTeal} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[
        styles.container,
        { backgroundColor: appColors.headerBackground },
      ]}
      edges={["top", "left", "right"]}
    >
      <StatusBar
        barStyle={appColors.statusBarStyle}
        backgroundColor={appColors.headerBackground}
      />

      {renderHeader()}

      <View
        style={{
          flex: 1,
          backgroundColor: appColors.screenBackground,
          paddingBottom: 45,
        }}
      >
        <FilterListHeader
          filterCategories={filterCategories}
          filterCards={filterCards}
          selectedFilter={selectedFilter}
          selectedCardFilter={selectedCardFilter}
          setSelectedFilter={setSelectedFilter}
          setSelectedCardFilter={setSelectedCardFilter}
          isDark={isDark}
          appColors={appColors}
          getFilterLabel={getFilterLabel}
          translatePaymentMethod={translatePaymentMethod}
          getPaymentIcon={getPaymentIcon}
        />

        <View style={{ flex: 1 }} {...panResponder.panHandlers}>
          <FlatList
            data={filteredTransactions}
            keyExtractor={(item) => item.id}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>
                  {t(
                    "noTransactionsRegistered",
                    "No transactions registered.",
                  ) || "No transactions registered."}
                </Text>
              </View>
            }
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={appColors.primaryTeal}
              />
            }
            contentContainerStyle={[
              styles.listContent,
              { backgroundColor: appColors.screenBackground },
            ]}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => {
              const isIncome = item.type === "INCOME";
              const paymentMethodName = item.paymentMethod || "Cash";
              const formattedDate = formatDate(
                item.rawDate,
                i18n.language,
                t("recent", "Recent") || "Recent",
              );

              return (
                <TouchableOpacity
                  style={[
                    styles.card,
                    {
                      backgroundColor: appColors.cardBackground,
                      borderColor: appColors.divider,
                    },
                  ]}
                  activeOpacity={0.7}
                  onPress={() => handleCardPress(item)}
                >
                  <View
                    style={[
                      styles.iconContainer,
                      { backgroundColor: appColors.iconBoxBg },
                    ]}
                  >
                    {getCategoryIcon(item.category, appColors.textPrimary, 20)}
                  </View>

                  <View style={styles.cardDetails}>
                    <Text
                      style={[
                        styles.itemTitle,
                        { color: appColors.textPrimary },
                      ]}
                      numberOfLines={1}
                    >
                      {item.title}
                    </Text>

                    <View style={styles.lineRow}>
                      <View
                        style={[
                          styles.categoryBadge,
                          isDark && { backgroundColor: appColors.primaryTeal },
                        ]}
                      >
                        <Text
                          style={[
                            styles.categoryBadgeText,
                            isDark && { color: appColors.textPrimary },
                          ]}
                        >
                          {translateCategory(item.category)}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.lineRow}>
                      <View
                        style={[
                          styles.paymentBadge,
                          isDark && { backgroundColor: appColors.iconBoxBg },
                          isIncome && styles.incomeBadge,
                        ]}
                      >
                        <Text
                          style={[
                            styles.paymentBadgeText,
                            isDark && { color: appColors.textPrimary },
                          ]}
                          numberOfLines={1}
                          ellipsizeMode="tail"
                          maxFontSizeMultiplier={1.3}
                        >
                          {isIncome
                            ? `💰 ${t("income_transaction", "Deposit") || "Deposit"}`
                            : `${getPaymentIcon(
                                paymentMethodName,
                              )} ${translatePaymentMethod(paymentMethodName)}`}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.dateText}>{formattedDate}</Text>
                  </View>

                  <Text
                    style={[
                      styles.amountText,
                      isIncome ? styles.incomeAmount : styles.expenseAmount,
                    ]}
                  >
                    {isIncome
                      ? `+${formatCurrency(item.amount, currency)}`
                      : `-${formatCurrency(item.amount, currency)}`}
                  </Text>
                </TouchableOpacity>
              );
            }}
          />
        </View>
      </View>

      <BottomSheetModal
        ref={editSheetRef}
        enableDynamicSizing
        enablePanDownToClose
        keyboardBehavior="interactive"
        android_keyboardInputMode="adjustPan"
        keyboardBlurBehavior="restore"
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: appColors.cardBackground }}
        onDismiss={() => {
          setModalVisible(false);
          setIsEditing(false);
          setSelectedTransaction(null);
        }}
      >
        <BottomSheetScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingBottom: 50,
          }}
        >
          {selectedTransaction && (
            <>
              {!isEditing ? (
                <>
                  <Text
                    style={[
                      styles.modalTitle,
                      { color: appColors.textPrimary },
                    ]}
                  >
                    {selectedTransaction.title}
                  </Text>
                  <Text
                    style={[
                      styles.modalAmount,
                      { color: appColors.primaryTeal },
                    ]}
                  >
                    {formatCurrency(selectedTransaction.amount, currency)}
                  </Text>

                  <View style={styles.modalDetailRow}>
                    <Text style={styles.modalDetailLabel}>
                      {t("category", "Category") || "Category"}:
                    </Text>
                    <Text
                      style={[
                        styles.modalDetailValue,
                        { color: appColors.textPrimary },
                      ]}
                    >
                      {translateCategory(selectedTransaction.category)}
                    </Text>
                  </View>

                  {selectedTransaction.type === "EXPENSE" && (
                    <View style={styles.modalDetailRow}>
                      <Text style={styles.modalDetailLabel}>
                        {t("paymentMethod", "Payment Method") ||
                          "Payment Method"}
                        :
                      </Text>
                      <Text
                        style={[
                          styles.modalDetailValue,
                          { color: appColors.textPrimary },
                        ]}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                        maxFontSizeMultiplier={1.3}
                      >
                        {getPaymentIcon(
                          selectedTransaction.paymentMethod || "Cash",
                        )}{" "}
                        {translatePaymentMethod(
                          selectedTransaction.paymentMethod || "Cash",
                        )}
                      </Text>
                    </View>
                  )}

                  <View style={styles.modalDetailRow}>
                    <Text style={styles.modalDetailLabel}>
                      {t("date", "Date") || "Date"}:
                    </Text>
                    <Text
                      style={[
                        styles.modalDetailValue,
                        { color: appColors.textPrimary },
                      ]}
                    >
                      {formatWithCapitalMonth(
                        selectedTransaction.rawDate,
                        i18n.language,
                        {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        },
                      )}
                    </Text>
                  </View>

                  <View style={styles.modalActions}>
                    <TouchableOpacity
                      style={[
                        styles.actionBtn,
                        styles.editBtn,
                        { backgroundColor: appColors.primaryTeal },
                      ]}
                      onPress={handleStartEdit}
                    >
                      <Text style={styles.btnText}>
                        {t("edit", "Edit") || "Edit"}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.actionBtn, styles.deleteBtn]}
                      onPress={handleDelete}
                    >
                      <Text style={styles.btnText}>
                        {t("delete", "Delete") || "Delete"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                <>
                  <Text
                    style={[
                      styles.modalTitle,
                      { color: appColors.textPrimary },
                    ]}
                  >
                    {t("edit", "Edit") || "Edit"}{" "}
                    {selectedTransaction.type === "INCOME"
                      ? t("income_transaction", "Deposit") || "Deposit"
                      : t("expense", "Expense") || "Expense"}
                  </Text>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>
                      {t("description", "Description") || "Description"}
                    </Text>
                    <BottomSheetTextInput
                      style={[
                        styles.input,
                        {
                          backgroundColor: appColors.screenBackground,
                          color: appColors.textPrimary,
                        },
                      ]}
                      value={editDescription}
                      onChangeText={setEditDescription}
                      placeholder={
                        t("description", "Description") || "Description"
                      }
                      placeholderTextColor={
                        appColors.textMuted || appColors.textSecondary
                      }
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>
                      {t("amount", "Amount") || "Amount"} ({currency})
                    </Text>
                    <BottomSheetTextInput
                      style={[
                        styles.input,
                        {
                          backgroundColor: appColors.screenBackground,
                          color: appColors.textPrimary,
                        },
                      ]}
                      value={editAmount}
                      onChangeText={(text) => {
                        const isZeroDecimal = ["JPY", "KRW"].includes(
                          (currency || "").toUpperCase(),
                        );
                        if (isZeroDecimal) {
                          setEditAmount(text.replace(/\D/g, ""));
                          return;
                        }

                        const lang = (i18n.language || "en").toLowerCase();
                        const isCommaDecimal =
                          lang.startsWith("pt") || lang.startsWith("es");

                        let normalized = text;
                        if (isCommaDecimal) {
                          normalized = text
                            .replace(/\./g, ",")
                            .replace(/(,\d{2})\d+$/, "$1");
                        } else {
                          normalized = text
                            .replace(/,/g, ".")
                            .replace(/(\.\d{2})\d+$/, "$1");
                        }

                        setEditAmount(normalized);
                      }}
                      keyboardType={
                        ["JPY", "KRW"].includes((currency || "").toUpperCase())
                          ? "number-pad"
                          : "decimal-pad"
                      }
                      placeholder={
                        ["JPY", "KRW"].includes((currency || "").toUpperCase())
                          ? "0"
                          : i18n.language.startsWith("pt") ||
                              i18n.language.startsWith("es")
                            ? "0,00"
                            : "0.00"
                      }
                      placeholderTextColor={
                        appColors.textMuted || appColors.textSecondary
                      }
                    />
                  </View>

                  {selectedTransaction.type === "EXPENSE" && (
                    <>
                      <View style={styles.inputGroup}>
                        <Text
                          style={[
                            styles.inputLabel,
                            isDark && { color: appColors.textSecondary },
                          ]}
                        >
                          {t("category", "Category") || "Category"}
                        </Text>
                        <View style={styles.categoryContainer}>
                          <View style={styles.categoryColumn}>
                            {CATEGORIES.slice(
                              0,
                              Math.ceil(CATEGORIES.length / 2),
                            ).map((cat) => {
                              const isSelected = isCategoryMatch(
                                editCategory,
                                cat,
                              );
                              return (
                                <TouchableOpacity
                                  key={cat}
                                  style={[
                                    styles.categoryChip,
                                    isDark && {
                                      backgroundColor: appColors.iconBoxBg,
                                    },
                                    isSelected && [
                                      styles.categoryChipSelected,
                                      {
                                        backgroundColor: appColors.primaryTeal,
                                      },
                                    ],
                                  ]}
                                  onPress={() => setEditCategory(cat)}
                                  activeOpacity={0.7}
                                >
                                  <Text
                                    style={[
                                      styles.categoryChipText,
                                      isDark && {
                                        color: appColors.textPrimary,
                                      },
                                      isSelected &&
                                        styles.categoryChipTextSelected,
                                    ]}
                                    numberOfLines={1}
                                  >
                                    {String(
                                      t(
                                        cat.toLowerCase().replace(/\s+/g, "_"),
                                        {
                                          defaultValue: cat,
                                        },
                                      ) || cat,
                                    )}
                                  </Text>
                                </TouchableOpacity>
                              );
                            })}
                          </View>

                          <View style={styles.categoryColumn}>
                            {CATEGORIES.slice(
                              Math.ceil(CATEGORIES.length / 2),
                            ).map((cat) => {
                              const isSelected = isCategoryMatch(
                                editCategory,
                                cat,
                              );
                              return (
                                <TouchableOpacity
                                  key={cat}
                                  style={[
                                    styles.categoryChip,
                                    isDark && {
                                      backgroundColor: appColors.iconBoxBg,
                                    },
                                    isSelected && [
                                      styles.categoryChipSelected,
                                      {
                                        backgroundColor: appColors.primaryTeal,
                                      },
                                    ],
                                  ]}
                                  onPress={() => setEditCategory(cat)}
                                  activeOpacity={0.7}
                                >
                                  <Text
                                    style={[
                                      styles.categoryChipText,
                                      isDark && {
                                        color: appColors.textPrimary,
                                      },
                                      isSelected &&
                                        styles.categoryChipTextSelected,
                                    ]}
                                    numberOfLines={1}
                                  >
                                    {String(
                                      t(
                                        cat.toLowerCase().replace(/\s+/g, "_"),
                                        {
                                          defaultValue: cat,
                                        },
                                      ) || cat,
                                    )}
                                  </Text>
                                </TouchableOpacity>
                              );
                            })}
                          </View>
                        </View>
                      </View>

                      <View style={styles.inputGroup}>
                        <Text
                          style={[
                            styles.inputLabel,
                            isDark && { color: appColors.textSecondary },
                          ]}
                        >
                          {t("paymentMethod", "Payment Method") ||
                            "Payment Method"}
                        </Text>
                        <View style={styles.categoryContainer}>
                          <View style={styles.categoryColumn}>
                            {(() => {
                              const type = "CASH";
                              const isSelected = paymentType === type;
                              return (
                                <TouchableOpacity
                                  key={type}
                                  style={[
                                    styles.categoryChip,
                                    isDark && {
                                      backgroundColor: appColors.iconBoxBg,
                                    },
                                    isSelected && [
                                      styles.categoryChipSelected,
                                      {
                                        backgroundColor: appColors.primaryTeal,
                                      },
                                    ],
                                  ]}
                                  onPress={() => setPaymentType(type)}
                                >
                                  <Text
                                    style={[
                                      styles.categoryChipText,
                                      isDark && {
                                        color: appColors.textPrimary,
                                      },
                                      isSelected &&
                                        styles.categoryChipTextSelected,
                                    ]}
                                    numberOfLines={1}
                                  >
                                    {String(
                                      t("cash", { defaultValue: "Cash" }) ||
                                        "Cash",
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
                              const isSelected = paymentType === type;

                              return (
                                <TouchableOpacity
                                  key={type}
                                  disabled={isDisabled}
                                  style={[
                                    styles.categoryChip,
                                    isDark && {
                                      backgroundColor: appColors.iconBoxBg,
                                    },
                                    isSelected && [
                                      styles.categoryChipSelected,
                                      {
                                        backgroundColor: appColors.primaryTeal,
                                      },
                                    ],
                                    isDisabled && { opacity: 0.4 },
                                  ]}
                                  onPress={() => {
                                    setPaymentType(type);
                                    if (
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
                                      isDark && {
                                        color: appColors.textPrimary,
                                      },
                                      isSelected &&
                                        styles.categoryChipTextSelected,
                                    ]}
                                    numberOfLines={1}
                                  >
                                    {String(
                                      t("card", { defaultValue: "Card" }) ||
                                        "Card",
                                    )}
                                  </Text>
                                </TouchableOpacity>
                              );
                            })()}
                          </View>
                        </View>
                      </View>

                      {paymentType === "CARD" && userCards.length > 0 && (
                        <View style={styles.inputGroup}>
                          <Text
                            style={[
                              styles.inputLabel,
                              isDark && { color: appColors.textSecondary },
                            ]}
                          >
                            {t("selectCard", "Select Card") || "Select Card"}
                          </Text>
                          <GestureHandlerScrollView
                            horizontal
                            nestedScrollEnabled
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={{
                              gap: scale(8),
                              paddingVertical: verticalScale(4),
                            }}
                          >
                            {userCards.map((card) => {
                              const isCardSelected = selectedCardId === card.id;
                              return (
                                <TouchableOpacity
                                  key={card.id}
                                  style={[
                                    styles.categoryChip,
                                    styles.equalCardChip,
                                    isDark && {
                                      backgroundColor: appColors.iconBoxBg,
                                    },
                                    isCardSelected && [
                                      styles.categoryChipSelected,
                                      {
                                        backgroundColor: appColors.primaryTeal,
                                      },
                                    ],
                                  ]}
                                  onPress={() => setSelectedCardId(card.id)}
                                >
                                  <Text
                                    style={[
                                      styles.categoryChipText,
                                      isDark && {
                                        color: appColors.textPrimary,
                                      },
                                      isCardSelected &&
                                        styles.categoryChipTextSelected,
                                    ]}
                                    numberOfLines={1}
                                    ellipsizeMode="tail"
                                    maxFontSizeMultiplier={1.3}
                                  >
                                    💳 {card.name}
                                  </Text>
                                </TouchableOpacity>
                              );
                            })}
                          </GestureHandlerScrollView>
                        </View>
                      )}
                    </>
                  )}

                  <View style={styles.modalActions}>
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: "#8E8E93" }]}
                      onPress={handleCloseExpensesModal}
                      disabled={submitting}
                    >
                      <Text style={styles.btnText}>
                        {t("cancel", "Cancel") || "Cancel"}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.actionBtn,
                        styles.editBtn,
                        { backgroundColor: appColors.primaryTeal },
                      ]}
                      onPress={handleSaveEdit}
                      disabled={submitting}
                    >
                      {submitting ? (
                        <ActivityIndicator color="#FFFFFF" size="small" />
                      ) : (
                        <Text style={styles.btnText}>
                          {t("save", "Save") || "Save"}
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </>
          )}
        </BottomSheetScrollView>
      </BottomSheetModal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primaryTeal,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  headerWrapper: {
    paddingBottom: verticalScale(8),
  },
  greenHeaderContainer: {
    paddingHorizontal: scale(20),
    paddingTop: verticalScale(16),
    paddingBottom: verticalScale(20),
    borderBottomLeftRadius: scale(28),
    borderBottomRightRadius: scale(28),
  },
  headerTitle: {
    fontSize: moderateScale(28),
    fontWeight: "700",
    color: "#FFFFFF",
  },
  headerSubtitle: {
    fontSize: moderateScale(13),
    color: "rgba(255,255,255,0.8)",
  },
  monthSelectorRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginVertical: verticalScale(12),
    paddingTop: scale(12),
    paddingBottom: scale(5),
  },
  monthNavButton: {
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(2),
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: scale(8),
  },
  monthNavText: {
    color: "#FFFFFF",
    fontSize: moderateScale(18),
    fontWeight: "bold",
  },
  summaryRow: {
    flexDirection: "row",
    gap: scale(8),
    marginTop: verticalScale(8),
  },
  summaryCard: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingVertical: verticalScale(12),
    paddingHorizontal: scale(10),
    borderRadius: scale(12),
    alignItems: "center",
  },
  summaryLabel: {
    fontSize: moderateScale(11),
    color: "rgba(255,255,255,0.8)",
    fontWeight: "600",
  },
  summaryValue: {
    fontSize: moderateScale(13),
    fontWeight: "700",
    color: "#FFFFFF",
    marginTop: verticalScale(2),
  },
  filterListContainer: {
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(8),
    gap: scale(8),
  },
  filterChip: {
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(6),
    borderRadius: scale(16),
    backgroundColor: "#EFECE6",
  },
  cardFilterChip: {
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
  },
  filterChipActive: {
    backgroundColor: colors.primaryTeal,
  },
  filterChipText: {
    fontSize: moderateScale(12),
    fontWeight: "600",
    color: "#555555",
  },
  filterChipTextActive: {
    color: "#FFFFFF",
  },
  listContent: {
    paddingHorizontal: scale(16),
    paddingBottom: verticalScale(40),
    gap: verticalScale(10),
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: scale(14),
    borderRadius: scale(16),
    borderWidth: 1,
  },
  iconContainer: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    justifyContent: "center",
    alignItems: "center",
    marginRight: scale(12),
  },
  iconEmoji: {
    fontSize: moderateScale(18),
  },
  cardDetails: {
    flex: 1,
    flexShrink: 1,
  },
  itemTitle: {
    fontSize: moderateScale(15),
    fontWeight: "600",
    marginBottom: verticalScale(2),
    flexShrink: 1,
  },
  lineRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: verticalScale(6),
  },
  categoryBadge: {
    backgroundColor: "#EFECE6",
    paddingHorizontal: scale(6),
    paddingVertical: verticalScale(2),
    borderRadius: scale(4),
  },
  categoryBadgeText: {
    fontSize: moderateScale(10),
    fontWeight: "600",
    color: "#666666",
  },
  paymentBadge: {
    backgroundColor: "#EFECE6",
    paddingHorizontal: scale(6),
    paddingVertical: verticalScale(2),
    borderRadius: scale(4),
  },
  paymentBadgeText: {
    fontSize: moderateScale(10),
    fontWeight: "600",
    color: "#666666",
  },
  incomeBadge: {
    backgroundColor: "rgba(35, 201, 96, 0.15)",
  },
  dateText: {
    fontSize: moderateScale(11),
    color: "#8E8E93",
    marginTop: verticalScale(4),
  },
  amountText: {
    fontSize: moderateScale(15),
    fontWeight: "700",
  },
  incomeAmount: {
    color: "#23c960",
  },
  expenseAmount: {
    color: "#C62828",
  },
  emptyContainer: {
    paddingVertical: verticalScale(40),
    alignItems: "center",
  },
  emptyText: {
    fontSize: moderateScale(14),
    color: "#8E8E93",
  },
  modalTitle: {
    fontSize: moderateScale(20),
    fontWeight: "700",
    marginBottom: verticalScale(4),
  },
  modalAmount: {
    fontSize: moderateScale(24),
    fontWeight: "800",
    marginBottom: verticalScale(16),
  },
  modalDetailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: verticalScale(8),
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  modalDetailLabel: {
    fontSize: moderateScale(14),
    color: "#8E8E93",
  },
  modalDetailValue: {
    fontSize: moderateScale(14),
    fontWeight: "600",
  },
  modalActions: {
    flexDirection: "row",
    gap: scale(12),
    marginTop: verticalScale(20),
  },
  actionBtn: {
    flex: 1,
    paddingVertical: verticalScale(12),
    borderRadius: scale(12),
    alignItems: "center",
    justifyContent: "center",
  },
  editBtn: {
    backgroundColor: colors.primaryTeal,
  },
  deleteBtn: {
    backgroundColor: "#EF4444",
  },
  btnText: {
    color: "#FFFFFF",
    fontSize: moderateScale(14),
    fontWeight: "700",
  },
  inputGroup: {
    marginTop: verticalScale(12),
  },
  inputLabel: {
    fontSize: moderateScale(12),
    fontWeight: "600",
    color: "#8E8E93",
    marginBottom: verticalScale(6),
  },
  input: {
    borderRadius: scale(10),
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(10),
    fontSize: moderateScale(14),
  },
  categoryContainer: {
    flexDirection: "row",
    gap: scale(8),
  },
  categoryColumn: {
    flex: 1,
    gap: verticalScale(6),
  },
  equalCardChip: {
    minWidth: scale(110),
    alignItems: "center",
    justifyContent: "center",
  },
  categoryChip: {
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(8),
    borderRadius: scale(8),
    backgroundColor: "#EFECE6",
    alignItems: "center",
  },
  categoryChipSelected: {
    backgroundColor: colors.primaryTeal,
  },
  categoryChipText: {
    fontSize: moderateScale(12),
    fontWeight: "600",
    color: "#555555",
  },
  categoryChipTextSelected: {
    color: "#FFFFFF",
  },
});
