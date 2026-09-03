import { colors, useAppTheme } from "@/constants/theme";
import api from "@/services/api";
import { moderateScale, scale, verticalScale } from "@/utils/scaling";
import { parseFlexibleNumber } from "@/utils/storage";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetTextInput,
} from "@gorhom/bottom-sheet";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
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
  paymentType?: any;
  paymentMethod?: any;
  card?: any;
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

interface Transaction {
  id: string;
  title: string;
  amount: number;
  category: string;
  rawDate: Date;
  type: "INCOME" | "EXPENSE";
  icon: string;
  paymentMethod?: string;
}

interface UserCard {
  id: string;
  name: string;
  cardType: "CREDIT" | "DEBIT" | string;
}

interface FilterListHeaderProps {
  filterCategories: string[];
  filterCards: string[];
  selectedFilter: string;
  selectedCardFilter: string;
  setSelectedFilter: (value: string) => void;
  setSelectedCardFilter: (value: string) => void;
  isDark: boolean;
  appColors: any;
  getFilterLabel: (filter: string) => string;
  translatePaymentMethod: (method: string) => string;
  getPaymentIcon: (method?: string) => string;
}

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
                  isDark && { backgroundColor: appColors.cardBackground },
                  isActive && [
                    styles.filterChipActive,
                    { backgroundColor: appColors.primaryTeal },
                  ],
                ]}
                onPress={() => setSelectedFilter(String(item))}
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

const getPaymentIcon = (method?: string): string => {
  if (!method) return "💵";
  const m = method.toLowerCase();
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
  const safeLocale = (locale || "en").replace("_", "-");

  try {
    const formatted = new Intl.DateTimeFormat(safeLocale, options).format(date);
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
    return date.toLocaleDateString();
  }
};

const getCategoryIcon = (
  category: string,
  type: "INCOME" | "EXPENSE",
): string => {
  if (type === "INCOME") return "💰";

  const cat = (category || "").toLowerCase().trim();

  switch (cat) {
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

const formatCurrencyValue = (val: number, language: string): string => {
  const lang = (language || "en").toLowerCase();

  // Use European format (1.000,00) for Portuguese and Spanish
  const isCommaDecimal = lang.startsWith("pt") || lang.startsWith("es");
  const locale = isCommaDecimal ? "pt-BR" : "en-US";

  return val.toLocaleString(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

export default function TransactionsScreen() {
  const { colors: appColors, isDark } = useAppTheme();
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

  const editSheetRef = useRef<BottomSheetModal>(null);

  useEffect(() => {
    if (modalVisible) {
      editSheetRef.current?.present();
    } else {
      editSheetRef.current?.dismiss();
    }
  }, [modalVisible]);

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
        icon: getCategoryIcon(item.category || "General", "EXPENSE"),
        paymentMethod: extractStringValue(
          item.paymentMethod || item.card || item.paymentType,
          "Cash",
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
          icon: getCategoryIcon(item.category || "Income", "INCOME"),
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
      console.error("Error fetching transactions:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedDate]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [selectedDate]);

  const changeMonth = (offset: number) => {
    setSelectedDate(
      (prev) => new Date(prev.getFullYear(), prev.getMonth() + offset, 1),
    );
  };

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
      const normalized = String(category).toLowerCase().trim();

      if (normalized === "income" || normalized === "income_transaction") {
        return t("income_transaction", { defaultValue: "Income" });
      }

      return t(normalized, { defaultValue: category });
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
        return t("allPaymentMethods", {
          defaultValue: t("all_payment_methods", {
            defaultValue: "All Payment Methods",
          }),
        });
      }

      const keyWithUnderscores = normalized.replace(/\s+/g, "_");
      return t(keyWithUnderscores, {
        defaultValue: t(normalized, { defaultValue: method }),
      });
    },
    [t],
  );

  const getFilterLabel = useCallback(
    (filter: string) => {
      if (filter === "All") return t("all", "All");
      if (filter === "Income") return t("income_transaction", "Income");
      return translateCategory(filter);
    },
    [t, translateCategory],
  );

  const handleCardPress = (item: Transaction) => {
    setSelectedTransaction(item);
    setIsEditing(false);
    editSheetRef.current?.present();
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
        c.id === currentMethod ||
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

  const formatAmountForInput = (val: number, language: string): string => {
    const lang = (language || "en").toLowerCase();
    const isCommaDecimal = lang.startsWith("pt") || lang.startsWith("es");

    // Ensure 2 decimal places fixed formatting
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
        t("error", "Error"),
        t("invalidAmount", "Please enter a valid amount."),
      );
      return;
    }

    const rawDateObj = new Date(selectedTransaction.rawDate);
    const formattedDate = !isNaN(rawDateObj.getTime())
      ? toLocalISOString(rawDateObj)
      : toLocalISOString(new Date());

    let finalPaymentMethod = "Cash";
    let cardIdPayload: string | null = null;

    if (!isIncome) {
      if (paymentType === "CARD") {
        const card = userCards.find((c) => c.id === selectedCardId);
        finalPaymentMethod = card ? card.name : "Card";
        cardIdPayload = selectedCardId;
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
      editSheetRef.current?.dismiss();
    } catch (error: any) {
      console.error(
        "Failed to update transaction:",
        error.response?.data || error.message,
      );
      Alert.alert(
        t("error", "Error"),
        t("updateFailed", "Failed to update transaction."),
      );
    }
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
      t("delete", "Delete"),
      t("confirmDelete", "Are you sure you want to delete this transaction?"),
      [
        { text: t("cancel", "Cancel"), style: "cancel" },
        {
          text: t("delete", "Delete"),
          style: "destructive",
          onPress: async () => {
            try {
              await api.delete(endpoint);
              setAllTransactions((prev) =>
                prev.filter((item) => item.id !== selectedTransaction.id),
              );
              editSheetRef.current?.dismiss();
            } catch (error) {
              console.error("Failed to delete transaction:", error);
              Alert.alert(
                t("error", "Error"),
                t("deleteFailed", "Failed to delete transaction."),
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
          {t("transactions", "Transactions")}
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
              • {allTransactions.length} {t("records", "records")}
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
          {/* IN Summary */}
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>{t("in", "IN")}</Text>
            <Text
              style={styles.summaryValue}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
            >
              +${formatCurrencyValue(totalIn, i18n.language)}
            </Text>
          </View>

          {/* OUT Summary */}
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>{t("out", "OUT")}</Text>
            <Text
              style={styles.summaryValue}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
            >
              -${formatCurrencyValue(totalOut, i18n.language)}
            </Text>
          </View>

          {/* NET Summary */}
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>{t("net", "NET")}</Text>
            <Text
              style={styles.summaryValue}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
            >
              {netBalance >= 0 ? "+" : "-"}$
              {formatCurrencyValue(Math.abs(netBalance), i18n.language)}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );

  // const renderFiltersOnly = () => (
  //   <View
  //     style={[
  //       styles.headerWrapper,
  //       { backgroundColor: appColors.screenBackground },
  //     ]}
  //   >
  //     <ScrollView
  //       horizontal
  //       showsHorizontalScrollIndicator={false}
  //       contentContainerStyle={[
  //         styles.filterListContainer,
  //         { backgroundColor: appColors.screenBackground },
  //       ]}
  //     >
  //       {filterCategories.map((item) => {
  //         const isActive =
  //           selectedFilter.toLowerCase() === String(item).toLowerCase();
  //         return (
  //           <TouchableOpacity
  //             key={String(item)}
  //             style={[
  //               styles.filterChip,
  //               isDark && { backgroundColor: appColors.cardBackground },
  //               isActive && [
  //                 styles.filterChipActive,
  //                 { backgroundColor: appColors.primaryTeal },
  //               ],
  //             ]}
  //             onPress={() => setSelectedFilter(String(item))}
  //             activeOpacity={0.7}
  //           >
  //             <Text
  //               style={[
  //                 styles.filterChipText,
  //                 isDark && { color: appColors.textSecondary },
  //                 isActive && styles.filterChipTextActive,
  //               ]}
  //             >
  //               {getFilterLabel(String(item))}
  //             </Text>
  //           </TouchableOpacity>
  //         );
  //       })}
  //     </ScrollView>

  //     {filterCards.length > 1 && (
  //       <ScrollView
  //         horizontal
  //         showsHorizontalScrollIndicator={false}
  //         contentContainerStyle={[
  //           styles.filterListContainer,
  //           { paddingTop: 0, backgroundColor: appColors.screenBackground },
  //         ]}
  //       >
  //         {filterCards.map((card) => {
  //           const cardStr = String(card || "Cash");
  //           const isActive =
  //             selectedCardFilter.toLowerCase() === cardStr.toLowerCase();
  //           const icon =
  //             cardStr === "All Payment Methods"
  //               ? "🏷️"
  //               : getPaymentIcon(cardStr);

  //           return (
  //             <TouchableOpacity
  //               key={cardStr}
  //               style={[
  //                 styles.filterChip,
  //                 styles.cardFilterChip,
  //                 isDark && { backgroundColor: appColors.cardBackground },
  //                 isActive && [
  //                   styles.filterChipActive,
  //                   { backgroundColor: appColors.primaryTeal },
  //                 ],
  //               ]}
  //               onPress={() => setSelectedCardFilter(cardStr)}
  //               activeOpacity={0.7}
  //             >
  //               <Text
  //                 style={[
  //                   styles.filterChipText,
  //                   isDark && { color: appColors.textSecondary },
  //                   isActive && styles.filterChipTextActive,
  //                 ]}
  //               >
  //                 {icon} {translatePaymentMethod(cardStr)}
  //               </Text>
  //             </TouchableOpacity>
  //           );
  //         })}
  //       </ScrollView>
  //     )}
  //   </View>
  // );

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

      {/* 1. Fixed Header Container (Stays in place) */}
      {renderHeader()}

      {/* 2. Scrollable Body Container */}
      <View
        style={{
          flex: 1,
          backgroundColor: appColors.screenBackground,
          paddingBottom: 30,
        }}
      >
        <FlatList
          data={filteredTransactions}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={
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
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                {t("noTransactionsRegistered", "No transactions registered.")}
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
              t("recent", "Recent"),
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
                  <Text style={styles.iconEmoji}>{item.icon}</Text>
                </View>

                <View style={styles.cardDetails}>
                  <Text
                    style={[styles.itemTitle, { color: appColors.textPrimary }]}
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
                          isIncome && styles.incomeBadgeText,
                          isDark &&
                            isIncome && { color: appColors.textPrimary },
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
                        isIncome && styles.incomeBadge,
                        isDark && { backgroundColor: appColors.textMuted },
                      ]}
                    >
                      <Text
                        style={[
                          styles.paymentBadgeText,
                          isDark && { color: appColors.textPrimary },
                          isIncome && styles.incomeBadgeText,
                          isDark &&
                            isIncome && { color: appColors.textPrimary },
                        ]}
                      >
                        {isIncome
                          ? `💰 ${t("income_transaction", "Deposit")}`
                          : `${getPaymentIcon(paymentMethodName)} ${translatePaymentMethod(
                              paymentMethodName,
                            )}`}
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
                    ? `+${formatCurrencyValue(item.amount, i18n.language)}`
                    : `-${formatCurrencyValue(item.amount, i18n.language)}`}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
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
        }}
      >
        <BottomSheetScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingBottom: 24,
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
                    $
                    {formatCurrencyValue(
                      selectedTransaction.amount,
                      i18n.language,
                    )}
                  </Text>

                  <View style={styles.modalDetailRow}>
                    <Text style={styles.modalDetailLabel}>
                      {t("category", "Category")}:
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
                        {t("paymentMethod", "Payment Method")}:
                      </Text>
                      <Text
                        style={[
                          styles.modalDetailValue,
                          { color: appColors.textPrimary },
                        ]}
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
                      {t("date", "Date")}:
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
                      <Text style={styles.btnText}>{t("edit", "Edit")}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.actionBtn, styles.deleteBtn]}
                      onPress={handleDelete}
                    >
                      <Text style={styles.btnText}>
                        {t("delete", "Delete")}
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
                    {t("edit", "Edit")}{" "}
                    {selectedTransaction.type === "INCOME"
                      ? t("income_transaction", "Deposit")
                      : t("expense", "Expense")}
                  </Text>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>
                      {t("description", "Description")}
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
                      placeholder={t("description", "Description")}
                      placeholderTextColor={
                        appColors.textMuted || appColors.textSecondary
                      }
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>
                      {t("amount", "Amount")}
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
                      keyboardType="decimal-pad"
                      placeholder={
                        i18n.language.startsWith("pt") ||
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
                          {t("category", "Category")}
                        </Text>
                        <View style={styles.categoryContainer}>
                          <View style={styles.categoryColumn}>
                            {CATEGORIES.slice(
                              0,
                              Math.ceil(CATEGORIES.length / 2),
                            ).map((cat) => {
                              const isSelected =
                                editCategory.toLowerCase() ===
                                cat.toLowerCase();
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
                                      ),
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
                              const isSelected =
                                editCategory.toLowerCase() ===
                                cat.toLowerCase();
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
                                      ),
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
                          {t("paymentMethod", "Payment Method")}
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
                                  onPress={() => {
                                    setPaymentType(type);
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
                                      t(type.toLowerCase(), {
                                        defaultValue: "Card",
                                      }),
                                    )}
                                    {isDisabled
                                      ? ` ${String(
                                          t("noCardsAvailable", {
                                            defaultValue:
                                              "(No Cards Available)",
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
                              style={[
                                styles.inputLabel,
                                { marginTop: 12 },
                                isDark && {
                                  color: appColors.textSecondary,
                                },
                              ]}
                            >
                              {t("selectCard", "Select Card")}
                            </Text>
                            <View style={styles.categoryContainer}>
                              <View style={styles.categoryColumn}>
                                {userCards
                                  .slice(0, Math.ceil(userCards.length / 2))
                                  .map((card) => {
                                    const isSelected =
                                      selectedCardId === card.id;

                                    return (
                                      <TouchableOpacity
                                        key={card.id}
                                        style={[
                                          styles.categoryChip,
                                          isDark && {
                                            backgroundColor:
                                              appColors.iconBoxBg,
                                          },
                                          isSelected && [
                                            styles.categoryChipSelected,
                                            {
                                              backgroundColor:
                                                appColors.primaryTeal,
                                            },
                                          ],
                                        ]}
                                        onPress={() =>
                                          setSelectedCardId(card.id)
                                        }
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
                                    );
                                  })}
                              </View>

                              <View style={styles.categoryColumn}>
                                {userCards
                                  .slice(Math.ceil(userCards.length / 2))
                                  .map((card) => {
                                    const isSelected =
                                      selectedCardId === card.id;

                                    return (
                                      <TouchableOpacity
                                        key={card.id}
                                        style={[
                                          styles.categoryChip,
                                          isDark && {
                                            backgroundColor:
                                              appColors.iconBoxBg,
                                          },
                                          isSelected && [
                                            styles.categoryChipSelected,
                                            {
                                              backgroundColor:
                                                appColors.primaryTeal,
                                            },
                                          ],
                                        ]}
                                        onPress={() =>
                                          setSelectedCardId(card.id)
                                        }
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
                                    );
                                  })}
                              </View>
                            </View>
                          </>
                        )}
                      </View>
                    </>
                  )}

                  <View style={styles.modalActions}>
                    <TouchableOpacity
                      style={[
                        styles.actionBtn,
                        styles.cancelBtn,
                        { backgroundColor: appColors.iconBoxBg },
                      ]}
                      onPress={() => setIsEditing(false)}
                    >
                      <Text
                        style={[
                          styles.cancelBtnText,
                          { color: appColors.textPrimary },
                        ]}
                      >
                        {t("cancel", "Cancel")}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.actionBtn,
                        styles.editBtn,
                        { backgroundColor: appColors.primaryTeal },
                      ]}
                      onPress={handleSaveEdit}
                    >
                      <Text style={styles.btnText}>
                        {t("saveExpense", "Save")}
                      </Text>
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
    paddingBottom: verticalScale(60),
  },
  headerWrapper: {
    backgroundColor: "#F4F1EA",
  },
  greenHeaderContainer: {
    backgroundColor: "#204B4C",
    paddingHorizontal: scale(20),
    paddingTop: verticalScale(16),
    paddingBottom: verticalScale(15),
    borderBottomLeftRadius: scale(32),
    borderBottomRightRadius: scale(32),
  },
  headerTitle: {
    fontSize: moderateScale(32),
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: verticalScale(20),
  },
  headerSubtitle: {
    fontSize: moderateScale(14),
    color: "rgba(255, 255, 255, 0.7)",
    marginTop: verticalScale(4),
    marginBottom: verticalScale(20),
  },
  summaryRow: {
    flexDirection: "row",
    gap: scale(10),
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: scale(20),
    marginHorizontal: scale(20),
    marginBottom: verticalScale(12),
    padding: scale(16),
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#EAE6DF",
  },
  cardDetails: {
    flex: 1,
    gap: verticalScale(4),
  },
  lineRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  incomeBadge: {
    backgroundColor: "#E2F2EE",
  },
  summaryCard: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    borderRadius: scale(16),
    paddingVertical: verticalScale(14),
    paddingHorizontal: scale(12),
  },
  summaryLabel: {
    fontSize: moderateScale(11),
    fontWeight: "700",
    color: "rgba(255, 255, 255, 0.6)",
    letterSpacing: scale(0.5),
    marginBottom: verticalScale(4),
  },
  summaryValue: {
    fontSize: moderateScale(16),
    fontWeight: "700",
    color: "#FFFFFF",
  },
  filterListContainer: {
    gap: scale(8),
    paddingHorizontal: scale(20),
    paddingVertical: verticalScale(12),
    backgroundColor: "#F4F1EA",
  },
  filterChip: {
    backgroundColor: "#EBE6DD",
    paddingHorizontal: scale(18),
    paddingVertical: verticalScale(10),
    borderRadius: scale(20),
  },
  cardFilterChip: {
    backgroundColor: "#E0DDD5",
  },
  filterChipActive: {
    backgroundColor: "#1C3637",
  },
  filterChipText: {
    fontSize: moderateScale(14),
    fontWeight: "600",
    color: "#4A4A4A",
  },
  filterChipTextActive: {
    color: "#FFFFFF",
  },
  iconContainer: {
    width: scale(48),
    height: scale(48),
    borderRadius: scale(14),
    backgroundColor: "#F2EFE9",
    justifyContent: "center",
    alignItems: "center",
    marginRight: scale(14),
  },
  iconEmoji: {
    fontSize: moderateScale(22),
  },
  itemTitle: {
    fontSize: moderateScale(16),
    fontWeight: "700",
    color: "#1C1C1E",
    marginBottom: verticalScale(6),
  },
  categoryBadge: {
    backgroundColor: "#EFECE6",
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(3),
    borderRadius: scale(8),
  },
  categoryBadgeText: {
    fontSize: moderateScale(12),
    fontWeight: "600",
    color: "#6E6B64",
  },
  paymentBadge: {
    backgroundColor: "#E2ECE9",
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(3),
    borderRadius: scale(8),
  },
  paymentBadgeText: {
    fontSize: moderateScale(11),
    fontWeight: "600",
    color: "#204B4C",
  },
  incomeBadgeText: {
    color: "#1E6B5C",
  },
  dateText: {
    fontSize: moderateScale(12),
    color: "#8E8E93",
    fontWeight: "500",
  },
  amountText: {
    fontSize: moderateScale(16),
    fontWeight: "700",
  },
  expenseAmount: {
    color: colors.expenseText,
  },
  incomeAmount: {
    color: colors.depositText,
  },
  modalScrollViewContent: {
    alignItems: "center",
    paddingBottom: verticalScale(16),
  },
  modalTitle: {
    fontSize: moderateScale(20),
    fontWeight: "700",
    color: "#1C1C1E",
    marginBottom: verticalScale(8),
    textAlign: "center",
  },
  modalAmount: {
    fontSize: moderateScale(28),
    fontWeight: "700",
    color: "#204B4C",
    marginVertical: verticalScale(12),
    textAlign: "center",
  },
  modalDetailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    paddingVertical: verticalScale(8),
  },
  modalDetailLabel: {
    color: "#8E8E93",
    fontSize: moderateScale(14),
  },
  modalDetailValue: {
    fontWeight: "600",
    fontSize: moderateScale(14),
    color: "#1C1C1E",
  },
  inputGroup: {
    width: "100%",
    marginTop: verticalScale(12),
  },
  inputLabel: {
    fontSize: moderateScale(12),
    fontWeight: "600",
    color: "#6E6B64",
    marginBottom: verticalScale(4),
  },
  input: {
    backgroundColor: "#F4F1EA",
    borderRadius: scale(12),
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(10),
    fontSize: moderateScale(16),
    color: "#1C1C1E",
  },
  modalActions: {
    flexDirection: "row",
    gap: scale(12),
    marginTop: verticalScale(20),
    paddingBottom: verticalScale(20),
    width: "100%",
  },
  actionBtn: {
    flex: 1,
    paddingVertical: verticalScale(12),
    borderRadius: scale(12),
    alignItems: "center",
  },
  editBtn: {
    backgroundColor: "#204B4C",
  },
  deleteBtn: {
    backgroundColor: "#D9534F",
  },
  cancelBtn: {
    backgroundColor: "#EBE6DD",
  },
  btnText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: moderateScale(14),
  },
  cancelBtnText: {
    color: "#4A4A4A",
    fontWeight: "700",
    fontSize: moderateScale(14),
  },
  categoryContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: scale(10),
    marginTop: verticalScale(6),
  },
  categoryColumn: {
    flex: 1,
    gap: verticalScale(8),
  },
  categoryChip: {
    backgroundColor: "#EBE6DD",
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(10),
    borderRadius: scale(12),
    alignItems: "center",
    justifyContent: "center",
  },
  categoryChipSelected: {
    backgroundColor: "#204B4C",
  },
  categoryChipText: {
    fontSize: moderateScale(13),
    fontWeight: "600",
    color: "#4A4A4A",
  },
  categoryChipTextSelected: {
    color: "#FFFFFF",
  },
  monthSelectorRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: verticalScale(6),
    marginBottom: verticalScale(16),
  },
  monthNavButton: {
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(4),
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: scale(12),
  },
  monthNavText: {
    color: "#FFFFFF",
    fontSize: moderateScale(20),
    fontWeight: "bold",
  },
  emptyContainer: {
    paddingVertical: verticalScale(40),
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    fontSize: moderateScale(16),
    color: "#8E8E93",
    fontWeight: "500",
  },
});
