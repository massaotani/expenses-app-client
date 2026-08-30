import { colors } from "@/constants/theme";
import api from "@/services/api";
import { parseFlexibleNumber } from "@/utils/storage";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Keyboard, // Added Keyboard import
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
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
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

const CATEGORIES = [
  "Food",
  "Housing",
  "Transportation",
  "Entertainment",
  "Utilities",
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
  const [selectedCardFilter, setSelectedCardFilter] = useState<string>(
    "All Payment Methods",
  );
  const [monthlyIncome, setMonthlyIncome] = useState<number>(0);

  // Modal & Edit States
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

  const fetchData = async () => {
    try {
      const [expensesRes, incomesRes, userRes, cardsRes] =
        await Promise.allSettled([
          api.get<ExpenseItem[]>("/api/v1/expenses"),
          api.get<IncomeItem[]>("/api/v1/incomes"),
          api.get<UserProfile>("/api/v1/users/me"),
          api.get<UserCard[]>("/api/v1/cards"),
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
        const payment = extractStringValue(
          item.paymentMethod || item.card || item.paymentType,
          "Cash",
        );

        return {
          id: `exp-${item.id}`,
          title: item.description || item.title || "Expense",
          amount: Math.abs(parseAmount(numericValue)),
          category: cat,
          rawDate: raw,
          type: "EXPENSE",
          icon: getCategoryIcon(cat, "EXPENSE"),
          paymentMethod: payment,
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
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, []);

  const { totalIn, totalOut, netBalance } = useMemo(() => {
    let inSum = 0;
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
  }, [allTransactions]);

  const filterCategories = useMemo(() => {
    const categoriesSet = new Set<string>();
    allTransactions.forEach((t) => {
      if (t.type === "EXPENSE" && t.category) {
        categoriesSet.add(String(t.category));
      }
    });
    return ["All", "Income", ...Array.from(categoriesSet)];
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

  const formattedHeaderDate = useMemo(() => {
    return formatWithCapitalMonth(new Date(), i18n.language, {
      month: "long",
      year: "numeric",
    });
  }, [i18n.language]);

  const handleCardPress = (item: Transaction) => {
    setSelectedTransaction(item);
    setIsEditing(false);
    setModalVisible(true);
  };

  const handleStartEdit = () => {
    if (!selectedTransaction) return;
    setEditDescription(selectedTransaction.title);
    setEditAmount(selectedTransaction.amount.toString());
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
    const isoDate = !isNaN(rawDateObj.getTime())
      ? rawDateObj.toISOString()
      : new Date().toISOString();

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
          date: isoDate,
        });
      } else {
        await api.put(`/api/v1/expenses/${rawId}`, {
          description: editDescription,
          value: parsedAmount,
          category: editCategory.toUpperCase(),
          dueDate: isoDate,
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
              setModalVisible(false);
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
    <View style={styles.headerWrapper}>
      <View style={styles.greenHeaderContainer}>
        <Text style={styles.headerTitle}>
          {t("transactions", "Transactions")}
        </Text>
        <Text style={styles.headerSubtitle}>
          {formattedHeaderDate} • {allTransactions.length}{" "}
          {t("records", "records")}
        </Text>

        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>{t("in", "IN")}</Text>
            <Text style={styles.summaryValue}>
              +$
              {totalIn.toLocaleString(i18n.language, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </Text>
          </View>

          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>{t("out", "OUT")}</Text>
            <Text style={styles.summaryValue}>
              -$
              {totalOut.toLocaleString(i18n.language, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </Text>
          </View>

          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>{t("net", "NET")}</Text>
            <Text style={styles.summaryValue}>
              {netBalance >= 0 ? "+" : "-"}$
              {Math.abs(netBalance).toLocaleString(i18n.language, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </Text>
          </View>
        </View>
      </View>

      {/* Category Filter Pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterListContainer}
      >
        {filterCategories.map((item) => {
          const isActive =
            selectedFilter.toLowerCase() === String(item).toLowerCase();
          return (
            <TouchableOpacity
              key={String(item)}
              style={[styles.filterChip, isActive && styles.filterChipActive]}
              onPress={() => setSelectedFilter(String(item))}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.filterChipText,
                  isActive && styles.filterChipTextActive,
                ]}
              >
                {getFilterLabel(String(item))}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Payment Method Filter Pills */}
      {filterCards.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[
            styles.filterListContainer,
            { paddingTop: 0 },
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
                  isActive && styles.filterChipActive,
                ]}
                onPress={() => setSelectedCardFilter(cardStr)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.filterChipText,
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
          const paymentMethodName = item.paymentMethod || "Cash";
          const formattedDate = formatDate(
            item.rawDate,
            i18n.language,
            t("recent", "Recent"),
          );

          return (
            <TouchableOpacity
              style={styles.card}
              activeOpacity={0.7}
              onPress={() => handleCardPress(item)}
            >
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
                      {translateCategory(item.category)}
                    </Text>
                  </View>

                  {!isIncome && (
                    <View style={styles.paymentBadge}>
                      <Text style={styles.paymentBadgeText}>
                        {getPaymentIcon(paymentMethodName)}{" "}
                        {translatePaymentMethod(paymentMethodName)}
                      </Text>
                    </View>
                  )}

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
                  ? `+${item.amount.toFixed(2).replace(".", ",")}`
                  : `-${item.amount.toFixed(2).replace(".", ",")}`}
              </Text>
            </TouchableOpacity>
          );
        }}
      />

      {/* Details & In-Modal Edit */}
      <Modal
        statusBarTranslucent={true}
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => {
          Keyboard.dismiss();
          setModalVisible(false);
        }}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => {
            Keyboard.dismiss();
            setModalVisible(false);
          }}
        >
          <Pressable
            style={styles.modalContent}
            onPress={() => Keyboard.dismiss()}
          >
            <KeyboardAwareScrollView
              enableOnAndroid={true}
              extraScrollHeight={Platform.OS === "ios" ? 20 : 0}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              style={styles.modalScrollView}
              contentContainerStyle={[
                styles.modalScrollViewContent,
                { paddingBottom: 60 },
              ]}
            >
              {selectedTransaction && (
                <>
                  {!isEditing ? (
                    /* VIEW MODE */
                    <>
                      <Text style={styles.modalTitle}>
                        {selectedTransaction.title}
                      </Text>
                      <Text style={styles.modalAmount}>
                        $
                        {selectedTransaction.amount
                          .toFixed(2)
                          .replace(".", ",")}
                      </Text>

                      <View style={styles.modalDetailRow}>
                        <Text style={styles.modalDetailLabel}>
                          {t("category", "Category")}:
                        </Text>
                        <Text style={styles.modalDetailValue}>
                          {translateCategory(selectedTransaction.category)}
                        </Text>
                      </View>

                      {selectedTransaction.type === "EXPENSE" && (
                        <View style={styles.modalDetailRow}>
                          <Text style={styles.modalDetailLabel}>
                            {t("paymentMethod", "Payment Method")}:
                          </Text>
                          <Text style={styles.modalDetailValue}>
                            {getPaymentIcon(
                              selectedTransaction.paymentMethod || "Cash",
                            )}{" "}
                            {translatePaymentMethod(
                              selectedTransaction.paymentMethod || "Cash",
                            )}
                          </Text>
                        </View>
                      )}

                      <View style={styles.modalActions}>
                        <TouchableOpacity
                          style={[styles.actionBtn, styles.editBtn]}
                          onPress={handleStartEdit}
                        >
                          <Text style={styles.btnText}>
                            {t("edit", "Edit")}
                          </Text>
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

                      <TouchableOpacity
                        style={styles.closeBtn}
                        onPress={() => {
                          Keyboard.dismiss();
                          setModalVisible(false);
                        }}
                      >
                        <Text style={styles.closeBtnText}>
                          {t("close", "Close")}
                        </Text>
                      </TouchableOpacity>
                    </>
                  ) : (
                    /* EDIT MODE */
                    <>
                      <Text style={styles.modalTitle}>
                        {t("edit", "Edit")}{" "}
                        {selectedTransaction.type === "INCOME"
                          ? t("income_transaction", "Deposit")
                          : t("expense", "Expense")}
                      </Text>

                      <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>
                          {t("description", "Description")}
                        </Text>
                        <TextInput
                          style={styles.input}
                          value={editDescription}
                          onChangeText={setEditDescription}
                          placeholder={t("description", "Description")}
                        />
                      </View>

                      <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>
                          {t("amount", "Amount")}
                        </Text>
                        <TextInput
                          style={styles.input}
                          value={editAmount}
                          onChangeText={(text) => {
                            const normalized = text
                              .replace(/,/g, ".")
                              .replace(/(\.\d{2})\d+$/, "$1");
                            setEditAmount(normalized);
                          }}
                          keyboardType="decimal-pad"
                          placeholder="0.00"
                        />
                      </View>

                      {selectedTransaction.type === "EXPENSE" && (
                        <>
                          <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>
                              {t("category", "Category")}
                            </Text>
                            <View style={styles.categoryContainer}>
                              {CATEGORIES.map((cat) => {
                                const isSelected =
                                  editCategory.toLowerCase() ===
                                  cat.toLowerCase();
                                return (
                                  <TouchableOpacity
                                    key={cat}
                                    style={[
                                      styles.categoryChip,
                                      isSelected && styles.categoryChipSelected,
                                    ]}
                                    onPress={() => setEditCategory(cat)}
                                    activeOpacity={0.7}
                                  >
                                    <Text
                                      style={[
                                        styles.categoryChipText,
                                        isSelected &&
                                          styles.categoryChipTextSelected,
                                      ]}
                                    >
                                      {String(
                                        t(cat.toLowerCase(), {
                                          defaultValue: cat,
                                        }),
                                      )}
                                    </Text>
                                  </TouchableOpacity>
                                );
                              })}
                            </View>
                          </View>

                          <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>
                              {t("paymentMethod", "Payment Method")}
                            </Text>
                            <View style={styles.categoryContainer}>
                              {(["CASH", "CARD"] as const).map((type) => {
                                const isDisabled =
                                  type === "CARD" && userCards.length === 0;

                                return (
                                  <TouchableOpacity
                                    key={type}
                                    disabled={isDisabled}
                                    style={[
                                      styles.categoryChip,
                                      paymentType === type &&
                                        styles.categoryChipSelected,
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
                                          defaultValue:
                                            type === "CASH" ? "Cash" : "Card",
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
                              })}
                            </View>

                            {paymentType === "CARD" && userCards.length > 0 && (
                              <>
                                <Text
                                  style={[styles.inputLabel, { marginTop: 12 }]}
                                >
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
                              </>
                            )}
                          </View>
                        </>
                      )}

                      <View style={styles.modalActions}>
                        <TouchableOpacity
                          style={[styles.actionBtn, styles.cancelBtn]}
                          onPress={() => setIsEditing(false)}
                        >
                          <Text style={styles.cancelBtnText}>
                            {t("cancel", "Cancel")}
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.actionBtn, styles.editBtn]}
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
            </KeyboardAwareScrollView>
            <View style={styles.bottomExtension} />
          </Pressable>
        </Pressable>
      </Modal>
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
    paddingVertical: 12,
    backgroundColor: "#F4F1EA",
  },
  filterChip: {
    backgroundColor: "#EBE6DD",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
  },
  cardFilterChip: {
    backgroundColor: "#E0DDD5",
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
    gap: 6,
    flexWrap: "wrap",
  },
  categoryBadge: {
    backgroundColor: "#EFECE6",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  categoryBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6E6B64",
  },
  paymentBadge: {
    backgroundColor: "#E2ECE9",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  paymentBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#204B4C",
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
    color: colors.expenseText,
  },
  incomeAmount: {
    color: colors.depositText,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: Platform.OS === "ios" ? 34 : 24,
    maxHeight: "85%",
    width: "100%",
  },
  bottomExtension: {
    position: "absolute",
    bottom: -1000,
    left: 0,
    right: 0,
    height: 1000,
    backgroundColor: "#FFFFFF",
  },
  modalScrollView: {
    width: "100%",
  },
  modalScrollViewContent: {
    alignItems: "center",
    paddingBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1C1C1E",
    marginBottom: 8,
  },
  modalAmount: {
    fontSize: 28,
    fontWeight: "700",
    color: "#204B4C",
    marginVertical: 12,
  },
  modalDetailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    paddingVertical: 8,
  },
  modalDetailLabel: {
    color: "#8E8E93",
    fontSize: 14,
  },
  modalDetailValue: {
    fontWeight: "600",
    fontSize: 14,
    color: "#1C1C1E",
  },
  inputGroup: {
    width: "100%",
    marginTop: 12,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6E6B64",
    marginBottom: 4,
  },
  input: {
    backgroundColor: "#F4F1EA",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 16,
    color: "#1C1C1E",
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 20,
    width: "100%",
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
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
  },
  cancelBtnText: {
    color: "#4A4A4A",
    fontWeight: "700",
  },
  closeBtn: {
    marginTop: 16,
    paddingVertical: 8,
  },
  closeBtnText: {
    color: "#8E8E93",
    fontWeight: "600",
  },
  categoryContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 6,
  },
  categoryChip: {
    backgroundColor: "#EBE6DD",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
  },
  categoryChipSelected: {
    backgroundColor: "#204B4C",
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#4A4A4A",
  },
  categoryChipTextSelected: {
    color: "#FFFFFF",
  },
});
