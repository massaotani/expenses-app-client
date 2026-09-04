import { useAppTheme } from "@/constants/theme";
import api from "@/services/api";
import { moderateScale, scale, verticalScale } from "@/utils/scaling";
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

const formatAmount = (val: number, locale: string = "en"): string => {
  const num = isNaN(val) ? 0 : val;
  const lang = locale.toLowerCase();

  const targetLocale =
    lang.startsWith("pt") || lang.startsWith("es")
      ? "pt-BR" // Formats as 1.000,00
      : "en-US"; // Formats as 1,000.00 (EN & JA)

  return new Intl.NumberFormat(targetLocale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
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
    Housing: "#284E4C",
    Food: "#C86D51",
    "Fixed Expenses": "#96652C",
    Fixed_Expenses: "#96652C",
    Transportation: "#729B96",
    Entertainment: "#D9A05B",
    Healthcare: "#E29C82",
    Clothing: "#B86B53",
    PET: "#E8A855",
    Travel: "#486E68",
    Others: "#9A8B85",
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

export default function AnalyticsScreen() {
  const { colors, isDark } = useAppTheme();
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
      let monthExpense = 0;

      // Sum all deposit incomes created for this specific month
      incomes.forEach((inc) => {
        const rawDate = inc.createdAt || inc.date || "";
        const d = new Date(rawDate);
        if (
          !isNaN(d.getTime()) &&
          d.getMonth() === m.monthIndex &&
          d.getFullYear() === m.year
        ) {
          registeredIncome += parseAmount(inc.value ?? inc.amount);
        }
      });

      // Combine base monthly income budget with extra income deposits
      const monthIncome = baseMonthlyIncome + registeredIncome;

      // Filter expenses matching TransactionsScreen date resolution order
      expenses.forEach((exp) => {
        const rawDate =
          exp.dueDate || exp.paidAt || exp.date || exp.createdAt || "";
        const d = new Date(rawDate);

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
      .map(([category, amount]) => ({
        category,
        amount,
        percentage:
          totalSpending > 0 ? Math.round((amount / totalSpending) * 100) : 0,
        color: getCategoryColor(category, isDark), // Pass isDark here
      }));

    return { totals, sortedEntries, totalSpending };
  }, [expenses, selectedDate, isDark]);

  const paymentTypeBreakdown = useMemo(() => {
    const targetMonth = selectedDate.getMonth();
    const targetYear = selectedDate.getFullYear();

    let cashSum = 0;
    let cardSum = 0;

    expenses.forEach((exp) => {
      const rawDate =
        exp.paidAt || exp.dueDate || exp.date || exp.createdAt || "";
      const d = new Date(rawDate);

      const isTargetMonth =
        !isNaN(d.getTime()) &&
        d.getMonth() === targetMonth &&
        d.getFullYear() === targetYear;

      if (isTargetMonth) {
        const val = parseAmount(exp.value ?? exp.amount);
        if (exp.paymentType?.toUpperCase() === "CASH") {
          cashSum += val;
        } else {
          cardSum += val;
        }
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
  }, [expenses, selectedDate]);

  const cardUsageBreakdown = useMemo(() => {
    const targetMonth = selectedDate.getMonth();
    const targetYear = selectedDate.getFullYear();

    const cardTotals: Record<string, { card: UserCard; totalSpent: number }> =
      {};

    userCards.forEach((c) => {
      cardTotals[c.id] = { card: c, totalSpent: 0 };
    });

    let unassignedCardSpending = 0;

    expenses.forEach((exp) => {
      const rawDate =
        exp.paidAt || exp.dueDate || exp.date || exp.createdAt || "";
      const d = new Date(rawDate);

      const isTargetMonth =
        !isNaN(d.getTime()) &&
        d.getMonth() === targetMonth &&
        d.getFullYear() === targetYear;

      if (!isTargetMonth || exp.paymentType?.toUpperCase() === "CASH") return;

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
  }, [expenses, userCards, paymentTypeBreakdown.card, selectedDate]);

  if (loading && !refreshing) {
    return (
      <SafeAreaView
        style={[
          styles.loadingContainer,
          { backgroundColor: colors.screenBackground },
        ]}
      >
        <ActivityIndicator size="large" color={colors.primaryTeal} />
      </SafeAreaView>
    );
  }

  const chartWidth = SCREEN_WIDTH - scale(80);
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
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.primaryTeal }]}
      edges={["top", "left", "right"]}
    >
      <StatusBar
        barStyle="light-content"
        backgroundColor={colors.primaryTeal}
      />

      {/* Fixed Header */}
      <View
        style={[
          styles.headerContainer,
          { backgroundColor: colors.primaryTeal },
        ]}
      >
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

      {/* Scrollable Body Container with Dynamic Background */}
      <View
        style={[
          styles.bodyContainer,
          { backgroundColor: colors.screenBackground },
        ]}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primaryTeal}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.cardsWrapper}>
            {/* 1. Income vs. Expenses Bar Chart */}
            <View
              style={[styles.card, { backgroundColor: colors.cardBackground }]}
            >
              <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
                {t("incomeVsExpenses", "Income vs. Expenses")}
              </Text>
              <Text style={styles.cardSubtitle}>
                {t("last6Months", "Last 6 months")}
              </Text>

              <View style={styles.chartWrapper}>
                <Svg height={verticalScale(200)} width={chartWidth}>
                  {barGridSteps.map((val) => {
                    const y =
                      verticalScale(160) -
                      (val / maxBarValue) * verticalScale(140);
                    return (
                      <React.Fragment key={val}>
                        <Line
                          x1={scale(40)}
                          y1={y}
                          x2={chartWidth}
                          y2={y}
                          stroke={isDark ? "#2D2D2D" : "#EBE8E1"}
                          strokeWidth={1}
                          strokeDasharray="3,3"
                        />
                        <SvgText
                          x={scale(32)}
                          y={y + verticalScale(4)}
                          fill={COLORS.textMuted}
                          fontSize={moderateScale(10)}
                          textAnchor="end"
                        >
                          {val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val}
                        </SvgText>
                      </React.Fragment>
                    );
                  })}

                  {monthlyData.map((d, index) => {
                    const groupX =
                      scale(48) + index * ((chartWidth - scale(58)) / 6);
                    const incomeH =
                      (d.income / maxBarValue) * verticalScale(140);
                    const expenseH =
                      (d.expenses / maxBarValue) * verticalScale(140);

                    return (
                      <React.Fragment key={d.month}>
                        <Rect
                          x={groupX}
                          y={verticalScale(160) - incomeH}
                          width={scale(6)}
                          height={Math.max(incomeH, verticalScale(2))}
                          fill={colors.primaryTeal}
                          rx={scale(3)}
                        />
                        <Rect
                          x={groupX + scale(8)}
                          y={verticalScale(160) - expenseH}
                          width={scale(6)}
                          height={Math.max(expenseH, verticalScale(2))}
                          fill={COLORS.expenseOrange}
                          rx={scale(3)}
                        />
                        <SvgText
                          x={groupX + scale(7)}
                          y={verticalScale(180)}
                          fill={COLORS.textMuted}
                          fontSize={moderateScale(11)}
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
                        { backgroundColor: colors.primaryTeal },
                      ]}
                    />
                    <Text
                      style={[styles.legendText, { color: colors.textPrimary }]}
                    >
                      {t("income", "Income")}
                    </Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View
                      style={[
                        styles.legendBox,
                        { backgroundColor: COLORS.expenseOrange },
                      ]}
                    />
                    <Text
                      style={[styles.legendText, { color: colors.textPrimary }]}
                    >
                      {t("expenses", "Expenses")}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* 2. Cash vs. Card Breakdown */}
            <View
              style={[styles.card, { backgroundColor: colors.cardBackground }]}
            >
              <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
                {t("paymentMethodBreakdown", "Payment Method Breakdown")}
              </Text>
              <Text style={styles.cardSubtitle}>
                {t("cardVsCash", "Card vs. Cash")} •{" "}
                {(() => {
                  const rawMonth = selectedDate.toLocaleDateString(
                    i18n.language || "en",
                    {
                      month: "long",
                    },
                  );
                  return rawMonth.charAt(0).toUpperCase() + rawMonth.slice(1);
                })()}
              </Text>

              <View style={styles.stackedBarContainer}>
                <View
                  style={[
                    styles.stackedSegment,
                    {
                      width: `${paymentTypeBreakdown.cardPct}%`,
                      backgroundColor: colors.primaryTeal,
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
                <View
                  style={[
                    styles.paymentMetricBox,
                    isDark && { backgroundColor: "#2A2A2A" },
                  ]}
                >
                  <View style={styles.paymentHeader}>
                    <View
                      style={[
                        styles.legendBox,
                        { backgroundColor: colors.primaryTeal },
                      ]}
                    />
                    <Text style={styles.paymentTypeLabel}>
                      {t("cardExpenses", "Card Expenses")}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.paymentValueText,
                      { color: colors.textPrimary },
                    ]}
                  >
                    ${formatAmount(paymentTypeBreakdown.card, i18n.language)}
                  </Text>
                  <Text style={styles.paymentPercentageText}>
                    {paymentTypeBreakdown.cardPct}% {t("ofTotal", "of total")}
                  </Text>
                </View>

                <View
                  style={[
                    styles.paymentMetricBox,
                    isDark && { backgroundColor: "#2A2A2A" },
                  ]}
                >
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
                  <Text
                    style={[
                      styles.paymentValueText,
                      { color: colors.textPrimary },
                    ]}
                  >
                    ${formatAmount(paymentTypeBreakdown.cash, i18n.language)}
                  </Text>
                  <Text style={styles.paymentPercentageText}>
                    {paymentTypeBreakdown.cashPct}% {t("ofTotal", "of total")}
                  </Text>
                </View>
              </View>

              {cardUsageBreakdown.cardsList.length > 0 && (
                <View style={styles.cardBreakdownContainer}>
                  <Text
                    style={[
                      styles.cardBreakdownTitle,
                      { color: colors.textPrimary },
                    ]}
                  >
                    {t("cardsUsage", "Card Breakdown")}
                  </Text>
                  {cardUsageBreakdown.cardsList.map(
                    ({ card, totalSpent, percentage }) => (
                      <View key={card.id} style={styles.cardUsageRow}>
                        <View style={styles.cardUsageHeader}>
                          <View style={styles.cardNameContainer}>
                            <Text style={styles.cardIcon}>💳</Text>
                            <Text
                              style={[
                                styles.cardNameText,
                                { color: colors.textPrimary },
                              ]}
                            >
                              {card.name}
                            </Text>
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
                          <Text
                            style={[
                              styles.cardSpentText,
                              { color: colors.primaryTeal },
                            ]}
                          >
                            ${formatAmount(totalSpent, i18n.language)}
                          </Text>
                        </View>
                        <View
                          style={[
                            styles.cardProgressBarTrack,
                            { backgroundColor: colors.iconBoxBg },
                          ]}
                        >
                          <View
                            style={[
                              styles.cardProgressBarFill,
                              {
                                width: `${percentage}%`,
                                backgroundColor: colors.primaryTeal,
                              },
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
            <View
              style={[styles.card, { backgroundColor: colors.cardBackground }]}
            >
              <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
                {t("spendingByCategory", "Spending by Category")} •{" "}
                {(() => {
                  const rawMonth = selectedDate.toLocaleDateString(
                    i18n.language || "en",
                    {
                      month: "long",
                    },
                  );
                  return rawMonth.charAt(0).toUpperCase() + rawMonth.slice(1);
                })()}
              </Text>
              <Text style={styles.cardSubtitle}>
                {t("total", "Total")}: $
                {formatAmount(categorySpending.totalSpending, i18n.language)}
              </Text>

              <View style={styles.donutWrapper}>
                <Svg
                  height={verticalScale(180)}
                  width={scale(180)}
                  viewBox="0 0 100 100"
                >
                  {categorySpending.totalSpending === 0 ? (
                    <>
                      <Circle
                        cx={50}
                        cy={50}
                        r={35}
                        fill="transparent"
                        stroke={isDark ? "#2D2D2D" : "#EAE6DF"}
                        strokeWidth={12}
                      />
                      <SvgText
                        x={50}
                        y={54}
                        fill={COLORS.textMuted}
                        fontSize={moderateScale(11)}
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
                      <Text
                        style={[
                          styles.categoryName,
                          { color: colors.textPrimary },
                        ]}
                      >
                        {String(
                          t(item.category.toLowerCase(), {
                            defaultValue: item.category,
                          }),
                        )}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.categoryValue,
                        { color: colors.textPrimary },
                      ]}
                    >
                      ${formatAmount(item.amount, i18n.language)}{" "}
                      <Text style={styles.categoryPercentage}>
                        ({item.percentage}%)
                      </Text>
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            {/* 4. Net Savings Trend Line Chart */}
            <View
              style={[styles.card, { backgroundColor: colors.cardBackground }]}
            >
              <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
                {t("netSavingsTrend", "Net Savings Trend")}
              </Text>
              <Text style={styles.cardSubtitle}>
                {t("income", "Income")} – {t("expenses", "Expenses")} (
                {currentMonthSummary.month}.)
              </Text>

              <View style={styles.netMetricRow}>
                <View
                  style={[
                    styles.netMetricBox,
                    isDark && { backgroundColor: "#2A2A2A" },
                  ]}
                >
                  <Text style={styles.netMetricLabel}>
                    {t("income", "Income")}
                  </Text>
                  <Text
                    style={[
                      styles.netIncomeText,
                      { color: colors.primaryTeal },
                    ]}
                  >
                    ${formatAmount(currentMonthSummary.income, i18n.language)}
                  </Text>
                </View>

                <View
                  style={[
                    styles.netMetricBox,
                    isDark && { backgroundColor: "#2A2A2A" },
                  ]}
                >
                  <Text style={styles.netMetricLabel}>
                    {t("expenses", "Expenses")}
                  </Text>
                  <Text style={styles.netExpenseText}>
                    ${formatAmount(currentMonthSummary.expenses, i18n.language)}
                  </Text>
                </View>

                <View
                  style={[
                    styles.netMetricBox,
                    isDark && { backgroundColor: "#2A2A2A" },
                  ]}
                >
                  <Text style={styles.netMetricLabel}>
                    {t("netSavings", "Net Savings")}
                  </Text>
                  <Text
                    style={[
                      styles.netValueText,
                      {
                        color:
                          currentMonthSummary.net >= 0
                            ? colors.primaryTeal
                            : COLORS.expenseOrange,
                      },
                    ]}
                  >
                    ${formatAmount(currentMonthSummary.net, i18n.language)}
                  </Text>
                </View>
              </View>

              <View style={styles.chartWrapper}>
                <Svg height={verticalScale(180)} width={chartWidth}>
                  {netGridSteps.map((val) => {
                    const y =
                      verticalScale(140) -
                      ((val - minNetValue) / netRange) * verticalScale(110);
                    return (
                      <React.Fragment key={val}>
                        <Line
                          x1={scale(35)}
                          y1={y}
                          x2={chartWidth}
                          y2={y}
                          stroke={isDark ? "#2D2D2D" : "#EBE8E1"}
                          strokeWidth={1}
                          strokeDasharray="3,3"
                        />
                        <SvgText
                          x={scale(28)}
                          y={y + verticalScale(4)}
                          fill={COLORS.textMuted}
                          fontSize={moderateScale(10)}
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
                      const x =
                        scale(48) +
                        i * ((chartWidth - scale(58)) / 6) +
                        scale(3);
                      const y =
                        verticalScale(140) -
                        ((d.net - minNetValue) / netRange) * verticalScale(110);
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
                          stroke={colors.primaryTeal}
                          strokeWidth={2.5}
                        />
                        {points.map((p, i) => (
                          <React.Fragment key={i}>
                            <Circle
                              cx={p.x}
                              cy={p.y}
                              r={scale(4)}
                              fill={colors.primaryTeal}
                            />
                            <SvgText
                              x={p.x}
                              y={verticalScale(160)}
                              fill={COLORS.textMuted}
                              fontSize={moderateScale(11)}
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
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.tealDark,
  },
  bodyContainer: {
    flex: 1,
    backgroundColor: COLORS.backgroundCream,
    paddingBottom: verticalScale(40),
    marginTop: verticalScale(-20),
    paddingTop: verticalScale(20),
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.backgroundCream,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: verticalScale(40),
  },
  headerContainer: {
    backgroundColor: COLORS.tealDark,
    paddingHorizontal: scale(20),
    paddingTop: verticalScale(16),
    paddingBottom: verticalScale(28),
    borderBottomLeftRadius: scale(32),
    borderBottomRightRadius: scale(32),
    zIndex: 10,
    overflow: "hidden",
  },
  headerTitle: {
    fontSize: moderateScale(32),
    fontWeight: "700",
    color: "#FFFFFF",
  },
  headerSubtitle: {
    fontSize: moderateScale(14),
    color: "rgba(255, 255, 255, 0.7)",
    marginTop: verticalScale(4),
  },
  cardsWrapper: {
    paddingHorizontal: scale(20),
    paddingTop: verticalScale(20),
    paddingBottom: verticalScale(40),
    gap: verticalScale(16),
  },
  card: {
    backgroundColor: COLORS.cardWhite,
    borderRadius: scale(24),
    padding: scale(20),
    borderWidth: 1,
    borderColor: COLORS.borderColor,
  },
  cardTitle: {
    fontSize: moderateScale(18),
    fontWeight: "700",
    color: COLORS.textDark,
  },
  cardSubtitle: {
    fontSize: moderateScale(13),
    color: COLORS.textMuted,
    marginTop: verticalScale(2),
    marginBottom: verticalScale(16),
  },
  chartWrapper: {
    alignItems: "center",
  },
  legendRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: scale(20),
    marginTop: verticalScale(10),
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(6),
  },
  legendBox: {
    width: scale(12),
    height: scale(12),
    borderRadius: scale(3),
  },
  legendText: {
    fontSize: moderateScale(13),
    fontWeight: "600",
    color: COLORS.textDark,
  },
  stackedBarContainer: {
    height: verticalScale(16),
    borderRadius: scale(8),
    backgroundColor: "#EFECE6",
    flexDirection: "row",
    overflow: "hidden",
    marginBottom: verticalScale(16),
  },
  stackedSegment: {
    height: "100%",
  },
  paymentMetricRow: {
    flexDirection: "row",
    gap: scale(12),
  },
  paymentMetricBox: {
    flex: 1,
    backgroundColor: "#F9F8F5",
    padding: scale(12),
    borderRadius: scale(14),
    borderWidth: 1,
    borderColor: COLORS.borderColor,
  },
  paymentHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(6),
    marginBottom: verticalScale(6),
  },
  paymentTypeLabel: {
    fontSize: moderateScale(12),
    fontWeight: "600",
    color: COLORS.textMuted,
  },
  paymentValueText: {
    fontSize: moderateScale(16),
    fontWeight: "700",
    color: COLORS.textDark,
  },
  paymentPercentageText: {
    fontSize: moderateScale(11),
    color: COLORS.textMuted,
    marginTop: verticalScale(2),
  },
  cardBreakdownContainer: {
    marginTop: verticalScale(16),
    paddingTop: verticalScale(16),
    borderTopWidth: 1,
    borderTopColor: COLORS.borderColor,
    gap: verticalScale(12),
  },
  cardBreakdownTitle: {
    fontSize: moderateScale(14),
    fontWeight: "700",
    color: COLORS.textDark,
    marginBottom: verticalScale(2),
  },
  cardUsageRow: {
    gap: verticalScale(6),
  },
  cardUsageHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardNameContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(6),
  },
  cardIcon: {
    fontSize: moderateScale(14),
  },
  cardNameText: {
    fontSize: moderateScale(13),
    fontWeight: "600",
    color: COLORS.textDark,
  },
  cardTypeBadge: {
    backgroundColor: "#EFECE6",
    paddingHorizontal: scale(6),
    paddingVertical: verticalScale(2),
    borderRadius: scale(4),
  },
  cardTypeBadgeText: {
    fontSize: moderateScale(10),
    fontWeight: "600",
    color: COLORS.textMuted,
    textTransform: "uppercase",
  },
  cardSpentText: {
    fontSize: moderateScale(13),
    fontWeight: "700",
    color: COLORS.tealDark,
  },
  cardProgressBarTrack: {
    height: verticalScale(6),
    backgroundColor: "#EFECE6",
    borderRadius: scale(3),
    overflow: "hidden",
  },
  cardProgressBarFill: {
    height: "100%",
    backgroundColor: COLORS.tealDark,
    borderRadius: scale(3),
  },
  donutWrapper: {
    alignItems: "center",
    marginVertical: verticalScale(10),
  },
  categoryListContainer: {
    marginTop: verticalScale(16),
    gap: verticalScale(12),
    width: "100%",
  },
  categoryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: verticalScale(2),
  },
  categoryLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(10),
  },
  chipIndicator: {
    width: scale(10),
    height: scale(10),
    borderRadius: scale(5),
  },
  categoryName: {
    fontSize: moderateScale(14),
    fontWeight: "600",
    color: COLORS.textDark,
  },
  categoryValue: {
    fontSize: moderateScale(14),
    fontWeight: "600",
    color: COLORS.textDark,
  },
  categoryPercentage: {
    fontWeight: "400",
    color: COLORS.textMuted,
  },
  netMetricRow: {
    flexDirection: "row",
    gap: scale(8),
    marginBottom: verticalScale(16),
  },
  netMetricBox: {
    flex: 1,
    backgroundColor: "#F9F8F5",
    padding: scale(10),
    borderRadius: scale(12),
    borderWidth: 1,
    borderColor: COLORS.borderColor,
  },
  netMetricLabel: {
    fontSize: moderateScale(11),
    fontWeight: "600",
    color: COLORS.textMuted,
    marginBottom: verticalScale(4),
  },
  netIncomeText: {
    fontSize: moderateScale(14),
    fontWeight: "700",
    color: COLORS.tealDark,
  },
  netExpenseText: {
    fontSize: moderateScale(14),
    fontWeight: "700",
    color: COLORS.expenseOrange,
  },
  netValueText: {
    fontSize: moderateScale(14),
    fontWeight: "700",
  },
});
