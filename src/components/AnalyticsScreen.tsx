import api from "@/services/api";
import { useFocusEffect } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Dimensions,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, {
  Circle,
  Line,
  Path,
  Rect,
  Text as SvgText,
} from "react-native-svg";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface UserCard {
  id: string;
  name: string;
  cardType: "CREDIT" | "DEBIT" | string;
}

interface ExpenseItem {
  id: string;
  description?: string;
  value?: number | string;
  amount?: number | string;
  category: string;
  paymentType?: "CASH" | "CARD" | string;
  paymentMethod?: string;
  cardId?: string | null;
  card?: { id: string; name: string } | string;
  dueDate?: string;
  paidAt?: string;
  date?: string;
  createdAt?: string;
}

interface IncomeItem {
  id: string;
  description?: string;
  value?: number | string;
  amount?: number | string;
  createdAt?: string;
  date?: string;
}

interface UserProfile {
  monthlyIncome?: number | string;
}

const parseAmount = (val: any): number => {
  if (typeof val === "number") return isNaN(val) ? 0 : val;
  if (typeof val === "string") {
    const normalized = val.replace(",", ".");
    const parsed = parseFloat(normalized);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
};

const formatAmount = (val: number): string => {
  return (isNaN(val) ? 0 : val).toFixed(2).replace(".", ",");
};

const COLORS = {
  tealDark: "#204B4C",
  tealLight: "#356566",
  expenseOrange: "#D87A53",
  expenseLightOrange: "#E89B74",
  cashColor: "#E5A982",
  cardColor: "#204B4C",
  backgroundCream: "#F4F1EA",
  cardWhite: "#FFFFFF",
  borderColor: "#EAE6DF",
  textDark: "#1C1C1E",
  textMuted: "#8E8E93",
  categoryColors: {
    Housing: "#284E4C", // primaryTeal
    Food: "#C86D51", // primaryOrange
    "Fixed Expenses": "#96652C", // deepOchre
    Fixed_Expenses: "#96652C", // deepOchre (alias)
    Transportation: "#729B96", // sageTeal
    Entertainment: "#D9A05B", // goldenOchre
    Healthcare: "#E29C82", // softOrange
    Clothing: "#B86B53", // terracotta accent
    PET: "#E8A855", // warm amber accent
    Travel: "#486E68", // deep sage accent
    Others: "#9A8B85", // neutral taupe
  } as Record<string, string>,
};

const FALLBACK_PALETTE = [
  "#204B4C",
  "#D87A53",
  "#7A9A95",
  "#E5A982",
  "#4E8773",
  "#D1B28C",
  "#6C5B7B",
  "#356566",
  "#A26B6B",
];

const getCategoryColor = (cat: string, index: number): string => {
  const normalizedKey = Object.keys(COLORS.categoryColors).find(
    (k) => k.toLowerCase() === cat.trim().toLowerCase(),
  );
  if (normalizedKey) return COLORS.categoryColors[normalizedKey];
  return FALLBACK_PALETTE[index % FALLBACK_PALETTE.length];
};

export default function AnalyticsScreen() {
  const { t, i18n } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [incomes, setIncomes] = useState<IncomeItem[]>([]);
  const [userCards, setUserCards] = useState<UserCard[]>([]);
  const [baseMonthlyIncome, setBaseMonthlyIncome] = useState<number>(0);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const fetchData = async () => {
    try {
      const [expensesRes, incomesRes, userRes, cardsRes] =
        await Promise.allSettled([
          api.get<ExpenseItem[]>("/api/v1/expenses"),
          api.get<IncomeItem[]>("/api/v1/incomes"),
          api.get<UserProfile>("/api/v1/users/me"),
          api.get<UserCard[]>("/api/v1/cards"),
        ]);

      setExpenses(
        expensesRes.status === "fulfilled" &&
          Array.isArray(expensesRes.value.data)
          ? expensesRes.value.data
          : [],
      );
      setIncomes(
        incomesRes.status === "fulfilled" &&
          Array.isArray(incomesRes.value.data)
          ? incomesRes.value.data
          : [],
      );
      setUserCards(
        cardsRes.status === "fulfilled" && Array.isArray(cardsRes.value.data)
          ? cardsRes.value.data
          : [],
      );

      if (userRes.status === "fulfilled" && userRes.value.data?.monthlyIncome) {
        setBaseMonthlyIncome(parseAmount(userRes.value.data.monthlyIncome));
      }
    } catch (error) {
      console.error("Error fetching analytics data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, []),
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, []);

  const last6Months = useMemo(() => {
    const months = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const rawLabel = d.toLocaleDateString(i18n.language || "en", {
        month: "short",
      });
      const capitalizedLabel =
        rawLabel.charAt(0).toUpperCase() + rawLabel.slice(1);

      months.push({
        label: capitalizedLabel,
        year: d.getFullYear(),
        monthIndex: d.getMonth(),
      });
    }
    return months;
  }, [i18n.language]);

  const monthlyData = useMemo(() => {
    return last6Months.map((m) => {
      let registeredIncome = 0;
      let hasIncomeEntries = false;
      let monthExpense = 0;

      incomes.forEach((inc) => {
        const d = new Date(inc.createdAt || inc.date || "");
        if (
          !isNaN(d.getTime()) &&
          d.getMonth() === m.monthIndex &&
          d.getFullYear() === m.year
        ) {
          registeredIncome += parseAmount(inc.value ?? inc.amount);
          hasIncomeEntries = true;
        }
      });

      const monthIncome = hasIncomeEntries
        ? registeredIncome
        : baseMonthlyIncome;

      expenses.forEach((exp) => {
        const d = new Date(
          exp.dueDate || exp.paidAt || exp.date || exp.createdAt || "",
        );
        if (
          !isNaN(d.getTime()) &&
          d.getMonth() === m.monthIndex &&
          d.getFullYear() === m.year
        ) {
          monthExpense += parseAmount(exp.value ?? exp.amount);
        }
      });

      return {
        month: m.label,
        income: monthIncome,
        expenses: monthExpense,
        net: monthIncome - monthExpense,
      };
    });
  }, [expenses, incomes, baseMonthlyIncome, last6Months]);

  const currentMonthSummary = useMemo(() => {
    return (
      monthlyData[monthlyData.length - 1] || {
        income: 0,
        expenses: 0,
        net: 0,
        month: "",
      }
    );
  }, [monthlyData]);

  const categorySpending = useMemo(() => {
    const targetMonth = selectedDate.getMonth();
    const targetYear = selectedDate.getFullYear();
    const totals: Record<string, number> = {};

    expenses.forEach((exp) => {
      const rawDate =
        exp.paidAt || exp.dueDate || exp.date || exp.createdAt || "";
      const d = new Date(rawDate);

      const isTargetMonth =
        !isNaN(d.getTime()) &&
        d.getMonth() === targetMonth &&
        d.getFullYear() === targetYear;

      if (isTargetMonth) {
        const catName = exp.category ? exp.category.trim() : "General";
        totals[catName] =
          (totals[catName] || 0) + parseAmount(exp.value ?? exp.amount);
      }
    });

    const totalSpending = Object.values(totals).reduce((a, b) => a + b, 0);

    const sortedEntries = Object.entries(totals)
      .filter(([_, amt]) => amt > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([category, amount], index) => ({
        category,
        amount,
        percentage:
          totalSpending > 0 ? Math.round((amount / totalSpending) * 100) : 0,
        color: getCategoryColor(category, index),
      }));

    return { totals, sortedEntries, totalSpending };
  }, [expenses, selectedDate]);

  const changeMonth = (offset: number) => {
    setSelectedDate(
      (prev) => new Date(prev.getFullYear(), prev.getMonth() + offset, 1),
    );
  };

  const paymentTypeBreakdown = useMemo(() => {
    let cashSum = 0;
    let cardSum = 0;

    expenses.forEach((exp) => {
      const val = parseAmount(exp.value ?? exp.amount);
      if (exp.paymentType?.toUpperCase() === "CASH") {
        cashSum += val;
      } else {
        cardSum += val;
      }
    });

    const total = cashSum + cardSum || 1;
    return {
      cash: cashSum,
      card: cardSum,
      total: cashSum + cardSum,
      cashPct: Math.round((cashSum / total) * 100),
      cardPct: Math.round((cardSum / total) * 100),
    };
  }, [expenses]);

  const cardUsageBreakdown = useMemo(() => {
    const cardTotals: Record<string, { card: UserCard; totalSpent: number }> =
      {};

    userCards.forEach((c) => {
      cardTotals[c.id] = { card: c, totalSpent: 0 };
    });

    let unassignedCardSpending = 0;

    expenses.forEach((exp) => {
      if (exp.paymentType?.toUpperCase() === "CASH") return;

      const val = parseAmount(exp.value ?? exp.amount);
      const targetCardId =
        exp.cardId ||
        (typeof exp.card === "object" ? exp.card?.id : null) ||
        userCards.find(
          (c) =>
            c.id === exp.paymentMethod ||
            c.name.toLowerCase() === exp.paymentMethod?.toLowerCase(),
        )?.id;

      if (targetCardId && cardTotals[targetCardId]) {
        cardTotals[targetCardId].totalSpent += val;
      } else {
        unassignedCardSpending += val;
      }
    });

    const totalCardSpent = paymentTypeBreakdown.card;

    const cardsList = Object.values(cardTotals)
      .map(({ card, totalSpent }) => ({
        card,
        totalSpent,
        percentage:
          totalCardSpent > 0
            ? Math.round((totalSpent / totalCardSpent) * 100)
            : 0,
      }))
      .sort((a, b) => b.totalSpent - a.totalSpent);

    return { cardsList, unassignedCardSpending, totalCardSpent };
  }, [expenses, userCards, paymentTypeBreakdown.card]);

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.tealDark} />
      </SafeAreaView>
    );
  }

  const chartWidth = SCREEN_WIDTH - 80;
  const maxBarValue = Math.max(
    ...monthlyData.flatMap((d) => [d.income, d.expenses]),
    1000,
  );
  const barGridSteps = [0, 0.25, 0.5, 0.75, 1].map((p) =>
    Math.round(maxBarValue * p),
  );

  const minNetValue = Math.min(...monthlyData.map((d) => d.net), 0);
  const maxNetValue = Math.max(...monthlyData.map((d) => d.net), 1000);
  const netRange = maxNetValue - minNetValue || 1;

  const netGridSteps = [0, 0.25, 0.5, 0.75, 1].map((p) =>
    Math.round(minNetValue + netRange * p),
  );

  const CIRCUMFERENCE = 2 * Math.PI * 35;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.tealDark} />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#FFFFFF"
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerContainer}>
          <Text style={styles.headerTitle}>{t("analytics", "Analytics")}</Text>
          <Text style={styles.headerSubtitle}>
            {t("spendingInsights", "Spending insights")} ·{" "}
            {(() => {
              const rawDate = new Date().toLocaleDateString(
                i18n.language || "en",
                {
                  month: "long",
                  year: "numeric",
                },
              );
              return rawDate.charAt(0).toUpperCase() + rawDate.slice(1);
            })()}
          </Text>
        </View>

        <View style={styles.cardsWrapper}>
          {/* 1. Income vs. Expenses Bar Chart */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              {t("incomeVsExpenses", "Income vs. Expenses")}
            </Text>
            <Text style={styles.cardSubtitle}>
              {t("last6Months", "Last 6 months")}
            </Text>

            <View style={styles.chartWrapper}>
              <Svg height={200} width={chartWidth}>
                {barGridSteps.map((val) => {
                  const y = 160 - (val / maxBarValue) * 140;
                  return (
                    <React.Fragment key={val}>
                      <Line
                        x1={40}
                        y1={y}
                        x2={chartWidth}
                        y2={y}
                        stroke="#EBE8E1"
                        strokeWidth={1}
                        strokeDasharray="3,3"
                      />
                      <SvgText
                        x={32}
                        y={y + 4}
                        fill={COLORS.textMuted}
                        fontSize={10}
                        textAnchor="end"
                      >
                        {val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val}
                      </SvgText>
                    </React.Fragment>
                  );
                })}

                {monthlyData.map((d, index) => {
                  const groupX = 48 + index * ((chartWidth - 58) / 6);
                  const incomeH = (d.income / maxBarValue) * 140;
                  const expenseH = (d.expenses / maxBarValue) * 140;

                  return (
                    <React.Fragment key={d.month}>
                      <Rect
                        x={groupX}
                        y={160 - incomeH}
                        width={6}
                        height={Math.max(incomeH, 2)}
                        fill={COLORS.tealDark}
                        rx={3}
                      />
                      <Rect
                        x={groupX + 8}
                        y={160 - expenseH}
                        width={6}
                        height={Math.max(expenseH, 2)}
                        fill={COLORS.expenseOrange}
                        rx={3}
                      />
                      <SvgText
                        x={groupX + 7}
                        y={180}
                        fill={COLORS.textMuted}
                        fontSize={11}
                        textAnchor="middle"
                      >
                        {d.month}
                      </SvgText>
                    </React.Fragment>
                  );
                })}
              </Svg>

              <View style={styles.legendRow}>
                <View style={styles.legendItem}>
                  <View
                    style={[
                      styles.legendBox,
                      { backgroundColor: COLORS.expenseOrange },
                    ]}
                  />
                  <Text style={styles.legendText}>
                    {t("expenses", "Expenses")}
                  </Text>
                </View>
                <View style={styles.legendItem}>
                  <View
                    style={[
                      styles.legendBox,
                      { backgroundColor: COLORS.tealDark },
                    ]}
                  />
                  <Text style={styles.legendText}>{t("income", "Income")}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* 2. Cash vs. Card Breakdown */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              {t("paymentMethodBreakdown", "Payment Method Breakdown")}
            </Text>
            <Text style={styles.cardSubtitle}>
              {t("cardVsCash", "Card vs. Cash")}
            </Text>

            <View style={styles.stackedBarContainer}>
              <View
                style={[
                  styles.stackedSegment,
                  {
                    width: `${paymentTypeBreakdown.cardPct}%`,
                    backgroundColor: COLORS.cardColor,
                  },
                ]}
              />
              <View
                style={[
                  styles.stackedSegment,
                  {
                    width: `${paymentTypeBreakdown.cashPct}%`,
                    backgroundColor: COLORS.cashColor,
                  },
                ]}
              />
            </View>

            <View style={styles.paymentMetricRow}>
              <View style={styles.paymentMetricBox}>
                <View style={styles.paymentHeader}>
                  <View
                    style={[
                      styles.legendBox,
                      { backgroundColor: COLORS.cardColor },
                    ]}
                  />
                  <Text style={styles.paymentTypeLabel}>
                    {t("cardExpenses", "Card Expenses")}
                  </Text>
                </View>
                <Text style={styles.paymentValueText}>
                  ${formatAmount(paymentTypeBreakdown.card)}
                </Text>
                <Text style={styles.paymentPercentageText}>
                  {paymentTypeBreakdown.cardPct}% {t("ofTotal", "of total")}
                </Text>
              </View>

              <View style={styles.paymentMetricBox}>
                <View style={styles.paymentHeader}>
                  <View
                    style={[
                      styles.legendBox,
                      { backgroundColor: COLORS.cashColor },
                    ]}
                  />
                  <Text style={styles.paymentTypeLabel}>
                    {t("cashExpenses", "Cash Expenses")}
                  </Text>
                </View>
                <Text style={styles.paymentValueText}>
                  ${formatAmount(paymentTypeBreakdown.cash)}
                </Text>
                <Text style={styles.paymentPercentageText}>
                  {paymentTypeBreakdown.cashPct}% {t("ofTotal", "of total")}
                </Text>
              </View>
            </View>

            {/* Sub-breakdown per Card */}
            {cardUsageBreakdown.cardsList.length > 0 && (
              <View style={styles.cardBreakdownContainer}>
                <Text style={styles.cardBreakdownTitle}>
                  {t("cardsUsage", "Card Breakdown")}
                </Text>
                {cardUsageBreakdown.cardsList.map(
                  ({ card, totalSpent, percentage }) => (
                    <View key={card.id} style={styles.cardUsageRow}>
                      <View style={styles.cardUsageHeader}>
                        <View style={styles.cardNameContainer}>
                          <Text style={styles.cardIcon}>💳</Text>
                          <Text style={styles.cardNameText}>{card.name}</Text>
                          <View style={styles.cardTypeBadge}>
                            <Text style={styles.cardTypeBadgeText}>
                              {String(
                                t(card.cardType.toLowerCase(), {
                                  defaultValue: card.cardType,
                                }),
                              )}
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.cardSpentText}>
                          ${formatAmount(totalSpent)}
                        </Text>
                      </View>
                      <View style={styles.cardProgressBarTrack}>
                        <View
                          style={[
                            styles.cardProgressBarFill,
                            { width: `${percentage}%` },
                          ]}
                        />
                      </View>
                    </View>
                  ),
                )}
              </View>
            )}
          </View>

          {/* 3. Spending by Category */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              {t("spendingByCategory", "Spending by Category")}
            </Text>
            <Text style={styles.cardSubtitle}>
              {t("total", "Total")}: $
              {formatAmount(categorySpending.totalSpending)}
            </Text>

            <View style={styles.donutWrapper}>
              <Svg height={180} width={180} viewBox="0 0 100 100">
                {categorySpending.totalSpending === 0 ? (
                  <>
                    <Circle
                      cx={50}
                      cy={50}
                      r={35}
                      fill="transparent"
                      stroke="#EAE6DF"
                      strokeWidth={12}
                    />
                    <SvgText
                      x={50}
                      y={54}
                      fill={COLORS.textMuted}
                      fontSize={11}
                      fontWeight="600"
                      textAnchor="middle"
                    >
                      {t("noExpenses", "No Expenses")}
                    </SvgText>
                  </>
                ) : (
                  (() => {
                    let cumulativeAngle = 0;
                    return categorySpending.sortedEntries.map((item) => {
                      const strokeDasharray = `${(item.amount / categorySpending.totalSpending) * CIRCUMFERENCE} ${CIRCUMFERENCE}`;
                      const strokeDashoffset = -cumulativeAngle;
                      cumulativeAngle +=
                        (item.amount / categorySpending.totalSpending) *
                        CIRCUMFERENCE;

                      return (
                        <Circle
                          key={item.category}
                          cx={50}
                          cy={50}
                          r={35}
                          fill="transparent"
                          stroke={item.color}
                          strokeWidth={14}
                          strokeDasharray={strokeDasharray}
                          strokeDashoffset={strokeDashoffset}
                          transform="rotate(-90 50 50)"
                        />
                      );
                    });
                  })()
                )}
              </Svg>
            </View>

            <View style={styles.categoryListContainer}>
              {categorySpending.sortedEntries.map((item) => (
                <View key={item.category} style={styles.categoryRow}>
                  <View style={styles.categoryLeft}>
                    <View
                      style={[
                        styles.chipIndicator,
                        { backgroundColor: item.color },
                      ]}
                    />
                    <Text style={styles.categoryName}>
                      {String(
                        t(item.category.toLowerCase(), {
                          defaultValue: item.category,
                        }),
                      )}
                    </Text>
                  </View>
                  <Text style={styles.categoryValue}>
                    ${formatAmount(item.amount)}{" "}
                    <Text style={styles.categoryPercentage}>
                      ({item.percentage}%)
                    </Text>
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {/* 4. Net Savings Trend Line Chart */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              {t("netSavingsTrend", "Net Savings Trend")}
            </Text>
            <Text style={styles.cardSubtitle}>
              {t("income", "Income")} – {t("expenses", "Expenses")} (
              {currentMonthSummary.month})
            </Text>

            <View style={styles.netMetricRow}>
              <View style={styles.netMetricBox}>
                <Text style={styles.netMetricLabel}>
                  {t("income", "Income")}
                </Text>
                <Text style={styles.netIncomeText}>
                  ${formatAmount(currentMonthSummary.income)}
                </Text>
              </View>

              <View style={styles.netMetricBox}>
                <Text style={styles.netMetricLabel}>
                  {t("expenses", "Expenses")}
                </Text>
                <Text style={styles.netExpenseText}>
                  ${formatAmount(currentMonthSummary.expenses)}
                </Text>
              </View>

              <View style={styles.netMetricBox}>
                <Text style={styles.netMetricLabel}>
                  {t("netSavings", "Net Savings")}
                </Text>
                <Text
                  style={[
                    styles.netValueText,
                    {
                      color:
                        currentMonthSummary.net >= 0
                          ? COLORS.tealDark
                          : COLORS.expenseOrange,
                    },
                  ]}
                >
                  ${formatAmount(currentMonthSummary.net)}
                </Text>
              </View>
            </View>

            <View style={styles.chartWrapper}>
              <Svg height={180} width={chartWidth}>
                {netGridSteps.map((val) => {
                  const y = 140 - ((val - minNetValue) / netRange) * 110;
                  return (
                    <React.Fragment key={val}>
                      <Line
                        x1={35}
                        y1={y}
                        x2={chartWidth}
                        y2={y}
                        stroke="#EBE8E1"
                        strokeWidth={1}
                        strokeDasharray="3,3"
                      />
                      <SvgText
                        x={28}
                        y={y + 4}
                        fill={COLORS.textMuted}
                        fontSize={10}
                        textAnchor="end"
                      >
                        {Math.abs(val) >= 1000
                          ? `${(val / 1000).toFixed(1)}k`
                          : val}
                      </SvgText>
                    </React.Fragment>
                  );
                })}

                {(() => {
                  const points = monthlyData.map((d, i) => {
                    const x = 48 + i * ((chartWidth - 58) / 6) + 3;
                    const y = 140 - ((d.net - minNetValue) / netRange) * 110;
                    return { x, y, month: d.month };
                  });

                  const pathD = points.reduce(
                    (acc, p, i) =>
                      i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`,
                    "",
                  );

                  return (
                    <React.Fragment>
                      <Path
                        d={pathD}
                        fill="none"
                        stroke={COLORS.tealDark}
                        strokeWidth={2.5}
                      />
                      {points.map((p, i) => (
                        <React.Fragment key={i}>
                          <Circle
                            cx={p.x}
                            cy={p.y}
                            r={4}
                            fill={COLORS.tealDark}
                          />
                          <SvgText
                            x={p.x}
                            y={160}
                            fill={COLORS.textMuted}
                            fontSize={11}
                            textAnchor="middle"
                          >
                            {p.month}
                          </SvgText>
                        </React.Fragment>
                      ))}
                    </React.Fragment>
                  );
                })()}
              </Svg>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.tealDark,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.backgroundCream,
  },
  scrollContent: {
    backgroundColor: COLORS.backgroundCream,
    flexGrow: 1,
    paddingBottom: 40,
  },
  headerContainer: {
    backgroundColor: COLORS.tealDark,
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
  },
  cardsWrapper: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
    gap: 16,
  },
  card: {
    backgroundColor: COLORS.cardWhite,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.borderColor,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.textDark,
  },
  cardSubtitle: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 2,
    marginBottom: 16,
  },
  chartWrapper: {
    alignItems: "center",
  },
  legendRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 20,
    marginTop: 10,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendBox: {
    width: 12,
    height: 12,
    borderRadius: 3,
  },
  legendText: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textDark,
  },
  stackedBarContainer: {
    height: 16,
    borderRadius: 8,
    backgroundColor: "#EFECE6",
    flexDirection: "row",
    overflow: "hidden",
    marginBottom: 16,
  },
  stackedSegment: {
    height: "100%",
  },
  paymentMetricRow: {
    flexDirection: "row",
    gap: 12,
  },
  paymentMetricBox: {
    flex: 1,
    backgroundColor: "#F9F8F5",
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.borderColor,
  },
  paymentHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  paymentTypeLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.textMuted,
  },
  paymentValueText: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.textDark,
  },
  paymentPercentageText: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  cardBreakdownContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderColor,
    gap: 12,
  },
  cardBreakdownTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.textDark,
    marginBottom: 2,
  },
  cardUsageRow: {
    gap: 6,
  },
  cardUsageHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardNameContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  cardIcon: {
    fontSize: 14,
  },
  cardNameText: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textDark,
  },
  cardTypeBadge: {
    backgroundColor: "#EFECE6",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  cardTypeBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: COLORS.textMuted,
    textTransform: "uppercase",
  },
  cardSpentText: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.tealDark,
  },
  cardProgressBarTrack: {
    height: 6,
    backgroundColor: "#EFECE6",
    borderRadius: 3,
    overflow: "hidden",
  },
  cardProgressBarFill: {
    height: "100%",
    backgroundColor: COLORS.tealDark,
    borderRadius: 3,
  },
  donutWrapper: {
    alignItems: "center",
    marginVertical: 10,
  },
  categoryListContainer: {
    marginTop: 16,
    gap: 12,
    width: "100%",
  },
  categoryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 2,
  },
  categoryLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  chipIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  categoryName: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textDark,
  },
  categoryValue: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textDark,
  },
  categoryPercentage: {
    fontWeight: "400",
    color: COLORS.textMuted,
  },
  netMetricRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  netMetricBox: {
    flex: 1,
    backgroundColor: "#F9F8F5",
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.borderColor,
  },
  netMetricLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.textMuted,
    marginBottom: 4,
  },
  netIncomeText: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.tealDark,
  },
  netExpenseText: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.expenseOrange,
  },
  netValueText: {
    fontSize: 14,
    fontWeight: "700",
  },
});
