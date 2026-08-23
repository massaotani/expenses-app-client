import api from "@/services/api";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
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

  // Modal & Edit States
  const [selectedTransaction, setSelectedTransaction] =
    useState<Transaction | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editDescription, setEditDescription] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editCategory, setEditCategory] = useState("");

  const router = useRouter();

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
    let inSum = 0; // Removed monthlyIncome static baseline
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
      if (!category) return "";

      const normalized = category.toLowerCase();

      // Explicitly handle income transactions
      if (normalized === "income" || normalized === "income_transaction") {
        return t("income_transaction", { defaultValue: "Income" });
      }

      return t(normalized, { defaultValue: category });
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
    setIsEditing(false); // Reset to view mode on open
    setModalVisible(true);
  };

  const handleStartEdit = () => {
    if (!selectedTransaction) return;
    setEditDescription(selectedTransaction.title);
    setEditAmount(selectedTransaction.amount.toString());
    setEditCategory(selectedTransaction.category);
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedTransaction) return;

    const isIncome = selectedTransaction.type === "INCOME";
    const rawId = selectedTransaction.id.replace(
      isIncome ? "inc-" : "exp-",
      "",
    );
    const parsedAmount = parseFloat(editAmount);

    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      Alert.alert(
        t("error", "Error"),
        t("invalidAmount", "Please enter a valid amount."),
      );
      return;
    }

    // Pass complete ISO string for Jackson LocalDateTime parsing
    const rawDateObj = new Date(selectedTransaction.rawDate);
    const isoDate = !isNaN(rawDateObj.getTime())
      ? rawDateObj.toISOString()
      : new Date().toISOString();

    try {
      if (isIncome) {
        await api.put(`/api/v1/incomes/${rawId}`, {
          description: editDescription,
          value: parsedAmount,
          amount: parsedAmount,
          date: isoDate,
        });
      } else {
        // Matches ExpenseRequest.java DTO requirements exactly
        await api.put(`/api/v1/expenses/${rawId}`, {
          description: editDescription,
          value: parsedAmount,
          category: editCategory.toUpperCase(), // FOOD, RENT, HOUSING, UTILITIES, ENTERTAINMENT, TRANSPORTATION, OTHERS
          dueDate: isoDate, // Jackson requires LocalDateTime compatible ISO timestamp
          paymentType: "CASH",
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
            </TouchableOpacity>
          );
        }}
      />

      {/* Details & In-Modal Edit */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setModalVisible(false)}
        >
          <Pressable
            style={styles.modalContent}
            onPress={(e) => e.stopPropagation()}
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
                      ${selectedTransaction.amount.toFixed(2)}
                    </Text>

                    <View style={styles.modalDetailRow}>
                      <Text style={styles.modalDetailLabel}>
                        {t("category", "Category")}:
                      </Text>
                      <Text style={styles.modalDetailValue}>
                        {translateCategory(selectedTransaction.category)}
                      </Text>
                    </View>

                    {/* Show Actions for BOTH Income & Expense */}
                    <View style={styles.modalActions}>
                      <TouchableOpacity
                        style={[styles.actionBtn, styles.editBtn]}
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

                    <TouchableOpacity
                      style={styles.closeBtn}
                      onPress={() => setModalVisible(false)}
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
                        onChangeText={setEditAmount}
                        keyboardType="decimal-pad"
                        placeholder="0.00"
                      />
                    </View>

                    {/* Only show Category Chips when editing EXPENSES */}
                    {selectedTransaction.type === "EXPENSE" && (
                      <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>
                          {t("category", "Category")}
                        </Text>
                        <View style={styles.categoryContainer}>
                          {CATEGORIES.map((cat) => {
                            const isSelected =
                              editCategory.toLowerCase() === cat.toLowerCase();
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
                                    t(cat.toLowerCase(), { defaultValue: cat }),
                                  )}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      </View>
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
                          {t("saveCard", "Save")}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </>
                )}
              </>
            )}
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    alignItems: "center",
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
