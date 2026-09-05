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
  TouchableOpacity,
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
    lang.startsWith("pt") || lang.startsWith("es") ? "pt-BR" : "en-US";

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
  incomeGreen: "#23c960",
  expenseRed: "#EF4444",
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

const CARD_COLOR_LIGHT = "#1E4D4F";
const CASH_COLOR_LIGHT = COLORS.expenseOrange;
const CARD_COLOR_DARK = "#00D2FF";
const CASH_COLOR_DARK = "#FF4081";

export default function AnalyticsScreen() {
  const { colors, isDark } = useAppTheme();
  const { t, i18n } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [incomes, setIncomes] = useState<IncomeItem[]>([]);
  const [userCards, setUserCards] = useState<UserCard[]>([]);
  const [baseMonthlyIncome, setBaseMonthlyIncome] = useState<number>(0);

  // Reference date for dynamic month navigation
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  // Selected index within the calculated 6-month window (5 is the focused active month)
  const [selectedMonthIndex, setSelectedMonthIndex] = useState<number>(2);

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
      if (__DEV__) {
        console.error("Error fetching analytics data:", error);
      }
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

  const changeMonth = (offset: number) => {
    setSelectedDate(
      (prev) => new Date(prev.getFullYear(), prev.getMonth() + offset, 1),
    );
  };

  const incomeColor = isDark ? COLORS.incomeGreen : colors.primaryTeal;
  const expenseColor = isDark ? COLORS.expenseRed : COLORS.expenseOrange;
  const cardColor = isDark ? CARD_COLOR_DARK : CARD_COLOR_LIGHT;
  const cashColor = isDark ? CASH_COLOR_DARK : CASH_COLOR_LIGHT;

  // Generates 6 months ending at selectedDate
  const calculated6Months = useMemo(() => {
    const months = [];
    const targetYear = selectedDate.getFullYear();
    const targetMonth = selectedDate.getMonth();

    // Generate 6 months centered around selectedDate (e.g., 2 months before, active month, 3 months after)
    for (let i = -2; i <= 3; i++) {
      const d = new Date(targetYear, targetMonth + i, 1);
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
  }, [selectedDate, i18n.language]);

  const selectedMonth = useMemo(() => {
    return (
      calculated6Months[selectedMonthIndex] ||
      calculated6Months[calculated6Months.length - 1]
    );
  }, [calculated6Months, selectedMonthIndex]);

  const monthlyData = useMemo(() => {
    return calculated6Months.map((m) => {
      let registeredIncome = 0;
      let monthExpense = 0;

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

      const monthIncome = baseMonthlyIncome + registeredIncome;

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
        monthIndex: m.monthIndex,
        year: m.year,
      };
    });
  }, [expenses, incomes, baseMonthlyIncome, calculated6Months]);

  const currentMonthSummary = useMemo(() => {
    return (
      monthlyData[selectedMonthIndex] ||
      monthlyData[monthlyData.length - 1] || {
        income: 0,
        expenses: 0,
        net: 0,
        month: "",
      }
    );
  }, [monthlyData, selectedMonthIndex]);

  const categorySpending = useMemo(() => {
    const targetMonth = selectedMonth.monthIndex;
    const targetYear = selectedMonth.year;
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
        color: getCategoryColor(category, isDark),
      }));

    return { totals, sortedEntries, totalSpending };
  }, [expenses, selectedMonth, isDark]);

  const paymentTypeBreakdown = useMemo(() => {
    const targetMonth = selectedMonth.monthIndex;
    const targetYear = selectedMonth.year;

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
  }, [expenses, selectedMonth]);

  const cardUsageBreakdown = useMemo(() => {
    const targetMonth = selectedMonth.monthIndex;
    const targetYear = selectedMonth.year;

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
  }, [expenses, userCards, paymentTypeBreakdown.card, selectedMonth]);

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
      style={[styles.container, { backgroundColor: colors.headerBackground }]}
      edges={["top", "left", "right"]}
    >
      <StatusBar
        barStyle={colors.statusBarStyle}
        backgroundColor={colors.headerBackground}
      />

      {/* Fixed Header with Navigation Controls */}
      <View
        style={[
          styles.headerContainer,
          { backgroundColor: colors.headerBackground },
        ]}
      >
        <Text style={styles.headerTitle}>{t("analytics", "Analytics")}</Text>
        <View style={styles.monthSelectorRow}>
          <TouchableOpacity
            onPress={() => changeMonth(-1)}
            style={styles.monthNavButton}
          >
            <Text style={styles.monthNavText}>{"‹"}</Text>
          </TouchableOpacity>

          <Text style={styles.headerSubtitle}>
            {t("spendingInsights", "Spending insights")} ·{" "}
            {(() => {
              const rawDate = selectedDate.toLocaleDateString(
                i18n.language || "en",
                {
                  month: "long",
                  year: "numeric",
                },
              );
              return rawDate.charAt(0).toUpperCase() + rawDate.slice(1);
            })()}
          </Text>

          <TouchableOpacity
            onPress={() => changeMonth(1)}
            style={styles.monthNavButton}
          >
            <Text style={styles.monthNavText}>{"›"}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Body Container */}
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
                {selectedMonth.label} {selectedMonth.year}
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
                      scale(40) + index * ((chartWidth - scale(50)) / 6);
                    const incomeH =
                      (d.income / maxBarValue) * verticalScale(140);
                    const expenseH =
                      (d.expenses / maxBarValue) * verticalScale(140);
                    const isSelected = index === selectedMonthIndex;

                    return (
                      <React.Fragment key={`${d.month}-${d.year}`}>
                        {isSelected && (
                          <Rect
                            x={groupX - scale(8)}
                            y={verticalScale(10)}
                            width={scale(30)}
                            height={verticalScale(180)}
                            fill={colors.primaryTeal}
                            opacity={0.12}
                            rx={scale(6)}
                          />
                        )}
                        <Rect
                          x={groupX}
                          y={verticalScale(160) - incomeH}
                          width={scale(6)}
                          height={Math.max(incomeH, verticalScale(2))}
                          fill={incomeColor}
                          rx={scale(3)}
                          onPress={() => setSelectedMonthIndex(index)}
                        />
                        <Rect
                          x={groupX + scale(8)}
                          y={verticalScale(160) - expenseH}
                          width={scale(6)}
                          height={Math.max(expenseH, verticalScale(2))}
                          fill={expenseColor}
                          rx={scale(3)}
                          onPress={() => setSelectedMonthIndex(index)}
                        />
                        <SvgText
                          x={groupX + scale(7)}
                          y={verticalScale(180)}
                          fill={
                            isSelected ? colors.primaryTeal : COLORS.textMuted
                          }
                          fontSize={moderateScale(11)}
                          fontWeight={isSelected ? "700" : "400"}
                          textAnchor="middle"
                          onPress={() => setSelectedMonthIndex(index)}
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
                        { backgroundColor: incomeColor },
                      ]}
                    />
                    <Text
                      style={[styles.legendText, { color: colors.textPrimary }]}
                    >
                      {t("income", "Incomes")}
                    </Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View
                      style={[
                        styles.legendBox,
                        { backgroundColor: expenseColor },
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
                {selectedMonth.label} {selectedMonth.year} ·{" "}
                {t("cardVsCash", "Card vs. Cash")}
              </Text>

              <View style={styles.stackedBarContainer}>
                <View
                  style={[
                    styles.stackedSegment,
                    {
                      width: `${paymentTypeBreakdown.cardPct}%`,
                      backgroundColor: cardColor,
                    },
                  ]}
                />
                <View
                  style={[
                    styles.stackedSegment,
                    {
                      width: `${paymentTypeBreakdown.cashPct}%`,
                      backgroundColor: cashColor,
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
                      style={[styles.legendBox, { backgroundColor: cardColor }]}
                    />
                    <Text
                      numberOfLines={2}
                      adjustsFontSizeToFit
                      style={styles.paymentTypeLabel}
                    >
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
                      style={[styles.legendBox, { backgroundColor: cashColor }]}
                    />
                    <Text
                      numberOfLines={2}
                      adjustsFontSizeToFit
                      style={styles.paymentTypeLabel}
                    >
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
                              { color: colors.textPrimary },
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
                {t("spendingByCategory", "Spending by Category")}
              </Text>
              <Text style={styles.cardSubtitle}>
                {selectedMonth.label} {selectedMonth.year} ·{" "}
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
                {selectedMonth.label} {selectedMonth.year} ·{" "}
                {t("income", "Incomes")} – {t("expenses", "Expenses")}
              </Text>

              <View style={styles.netMetricRow}>
                <View
                  style={[
                    styles.netMetricBox,
                    isDark && { backgroundColor: "#2A2A2A" },
                  ]}
                >
                  <Text
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.75}
                    style={styles.netMetricLabel}
                  >
                    {t("income", "Incomes")}
                  </Text>
                  <Text
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    style={[
                      styles.netIncomeText,
                      {
                        color: isDark ? COLORS.incomeGreen : colors.primaryTeal,
                      },
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
                  <Text
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    style={[
                      styles.netExpenseText,
                      {
                        color: isDark
                          ? COLORS.expenseRed
                          : COLORS.expenseOrange,
                      },
                    ]}
                  >
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
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    style={[
                      styles.netValueText,
                      {
                        color:
                          currentMonthSummary.net >= 0
                            ? isDark
                              ? COLORS.incomeGreen
                              : colors.primaryTeal
                            : isDark
                              ? COLORS.expenseRed
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

                    const lineColor = isDark ? "#4A8B8D" : COLORS.tealLight;

                    return (
                      <React.Fragment>
                        <Path
                          d={pathD}
                          fill="none"
                          stroke={lineColor}
                          strokeWidth={2.5}
                        />
                        {points.map((p, i) => {
                          const isSelected = i === selectedMonthIndex;
                          return (
                            <React.Fragment key={i}>
                              {/* Background ring for active month to make it stand out */}
                              {isSelected && (
                                <Circle
                                  cx={p.x}
                                  cy={p.y}
                                  r={scale(9)}
                                  fill={COLORS.expenseOrange}
                                  opacity={0.3}
                                />
                              )}
                              <Circle
                                cx={p.x}
                                cy={p.y}
                                r={isSelected ? scale(6) : scale(4)}
                                fill={
                                  isSelected ? COLORS.expenseOrange : lineColor
                                }
                                stroke={isSelected ? "#FFFFFF" : "transparent"}
                                strokeWidth={isSelected ? 1.5 : 0}
                                onPress={() => setSelectedMonthIndex(i)}
                              />
                              <SvgText
                                x={p.x}
                                y={verticalScale(160)}
                                fill={
                                  isSelected
                                    ? colors.primaryTeal
                                    : COLORS.textMuted
                                }
                                fontSize={moderateScale(11)}
                                fontWeight={isSelected ? "700" : "400"}
                                textAnchor="middle"
                                onPress={() => setSelectedMonthIndex(i)}
                              >
                                {p.month}
                              </SvgText>
                            </React.Fragment>
                          );
                        })}
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
  },
  monthSelectorRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: verticalScale(8),
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
  cardsWrapper: {
    paddingHorizontal: scale(20),
    paddingTop: verticalScale(20),
    paddingBottom: verticalScale(40),
    gap: verticalScale(16),
  },
  monthSelectorContainer: {
    gap: scale(8),
    paddingBottom: verticalScale(4),
  },
  monthChip: {
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(8),
    borderRadius: scale(20),
    borderWidth: 1,
  },
  monthChipText: {
    fontSize: moderateScale(13),
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
    paddingVertical: verticalScale(16),
    paddingHorizontal: scale(14),
    borderRadius: scale(14),
    borderWidth: 1,
    borderColor: COLORS.borderColor,
  },
  paymentHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(8),
    marginBottom: verticalScale(10),
    flexWrap: "wrap",
  },
  paymentTypeLabel: {
    fontSize: moderateScale(12),
    fontWeight: "600",
    color: COLORS.textMuted,
    flexShrink: 1,
  },
  paymentValueText: {
    fontSize: moderateScale(16),
    fontWeight: "700",
    color: COLORS.textDark,
    marginBottom: verticalScale(4),
  },
  paymentPercentageText: {
    fontSize: moderateScale(11),
    color: COLORS.textMuted,
    // marginTop: verticalScale(2),
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
    flex: 1,
    paddingRight: scale(8),
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
    flexShrink: 1,
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
    gap: scale(6),
    marginBottom: verticalScale(16),
  },
  netMetricBox: {
    flex: 1,
    backgroundColor: "#F9F8F5",
    paddingVertical: scale(10),
    paddingHorizontal: scale(4),
    borderRadius: scale(12),
    borderWidth: 1,
    borderColor: COLORS.borderColor,
    alignItems: "center",
    justifyContent: "center",
  },
  netMetricLabel: {
    fontSize: moderateScale(11),
    fontWeight: "600",
    color: COLORS.textMuted,
    marginBottom: verticalScale(4),
    textAlign: "center",
    flexShrink: 1,
  },
  netIncomeText: {
    fontSize: moderateScale(12),
    fontWeight: "700",
    color: COLORS.tealDark,
  },
  netExpenseText: {
    fontSize: moderateScale(12),
    fontWeight: "700",
    color: COLORS.expenseOrange,
  },
  netValueText: {
    fontSize: moderateScale(12),
    fontWeight: "700",
  },
});
