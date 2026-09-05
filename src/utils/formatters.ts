// Map each currency code to a locale that enforces its native formatting convention
const CURRENCY_LOCALE_MAP: Record<string, string> = {
  USD: "en-US", // Uses '.' for decimal separator
  GBP: "en-GB", // Uses '.' for decimal separator
  JPY: "ja-JP", // Standard Japanese formatting
  BRL: "pt-BR", // Uses ',' for decimal separator
  EUR: "de-DE", // Uses ',' for decimal separator
  KRW: "ko-KR", // Standard Korean formatting
  CNY: "zh-CN", // Standard Chinese formatting
};

export const formatCurrency = (
  amount: number,
  currencyCode: string = "USD",
  locale?: string,
) => {
  try {
    // Resolve locale from currency map; fallback to provided locale or default 'en-US'
    const targetLocale = CURRENCY_LOCALE_MAP[currencyCode] || locale || "en-US";

    return new Intl.NumberFormat(targetLocale, {
      style: "currency",
      currency: currencyCode,
      currencyDisplay: "narrowSymbol",
      minimumFractionDigits: ["JPY", "KRW"].includes(currencyCode) ? 0 : 2,
    }).format(amount);
  } catch (error) {
    return `${currencyCode} ${amount.toFixed(2)}`;
  }
};

/**
 * Helper to get the correct decimal separator ('.' or ',') for a given currency
 */
export const getCurrencyDecimalSeparator = (
  currencyCode: string = "USD",
): string => {
  const locale = CURRENCY_LOCALE_MAP[currencyCode] || "en-US";
  return (1.1).toLocaleString(locale).replace(/\d/g, "") || ".";
};
