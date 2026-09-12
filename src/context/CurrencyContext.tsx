import AsyncStorage from "@react-native-async-storage/async-storage";
import { getLocales } from "expo-localization";
import React, { createContext, useContext, useEffect, useState } from "react";

const CURRENCY_STORAGE_KEY = "@user_currency_preference";
const SUPPORTED_CURRENCIES = ["USD", "BRL", "GBP", "JPY", "EUR", "KRW", "CNY"];

const getDeviceCurrency = (): string => {
  try {
    const deviceLocales = getLocales();
    const primaryLocale = deviceLocales[0];

    // 1. Try direct currency code from device settings
    const deviceCurrency = primaryLocale?.currencyCode;
    if (deviceCurrency && SUPPORTED_CURRENCIES.includes(deviceCurrency)) {
      return deviceCurrency;
    }

    // 2. Fallback: Map region code to currency code
    const regionCode = primaryLocale?.regionCode;
    const regionCurrencyMap: Record<string, string> = {
      BR: "BRL",
      GB: "GBP",
      JP: "JPY",
      KR: "KRW",
      CN: "CNY",
      US: "USD",
      DE: "EUR",
      FR: "EUR",
      ES: "EUR",
      IT: "EUR",
      PT: "EUR",
    };

    if (regionCode && regionCurrencyMap[regionCode]) {
      return regionCurrencyMap[regionCode];
    }
  } catch (error) {
    if (__DEV__) console.error("Error detecting device currency:", error);
  }

  // 3. Final default fallback
  return "USD";
};

interface CurrencyContextType {
  currency: string;
  setCurrency: (code: string) => Promise<void>;
  isLoading: boolean;
}

const CurrencyContext = createContext<CurrencyContextType>({
  currency: "USD",
  setCurrency: async () => {},
  isLoading: true,
});

export const CurrencyProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [currency, setCurrencyState] = useState<string>("USD");
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const loadCurrency = async () => {
      try {
        const storedCurrency = await AsyncStorage.getItem(CURRENCY_STORAGE_KEY);
        if (storedCurrency) {
          // User already set a preference manually, keep it
          setCurrencyState(storedCurrency);
        } else {
          // First launch: detect location/locale default
          const defaultCurrency = getDeviceCurrency();
          setCurrencyState(defaultCurrency);
        }
      } catch (error) {
        console.error("Failed to load currency preference", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadCurrency();
  }, []);

  const setCurrency = async (code: string) => {
    try {
      setCurrencyState(code);
      await AsyncStorage.setItem(CURRENCY_STORAGE_KEY, code);
    } catch (error) {
      console.error("Failed to save currency preference", error);
    }
  };

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, isLoading }}>
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = () => useContext(CurrencyContext);
