const CURRENCY_LOCALE_MAP: Record<string, string> = {
  USD: "en-US",
  GBP: "en-GB",
  JPY: "ja-JP",
  BRL: "pt-BR",
  EUR: "de-DE",
  KRW: "ko-KR",
  CNY: "zh-CN",
};

export const formatCurrency = (
  amount: number,
  currencyCode: string = "USD",
  locale?: string,
) => {
  try {
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

export const parseAmount = (
  value: string | number | undefined | null,
): number => {
  if (typeof value === "number") return value;
  if (!value) return 0;

  const cleaned = String(value).replace(/[^0-9.-]+/g, "");
  const parsed = parseFloat(cleaned);

  return isNaN(parsed) ? 0 : parsed;
};

export const getCurrencyDecimalSeparator = (
  currencyCode: string = "USD",
): string => {
  const locale = CURRENCY_LOCALE_MAP[currencyCode] || "en-US";
  return (1.1).toLocaleString(locale).replace(/\d/g, "") || ".";
};

export const toLocalISOString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
};

export const parseLocalDateTime = (
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

export const formatSystemDate = (date: Date) => {
  try {
    return new Intl.DateTimeFormat(undefined, {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);
  } catch {
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }
};

export const formatWithCapitalMonth = (
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
