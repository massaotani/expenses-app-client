import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";

const CURRENCY_STORAGE_KEY = "@user_currency_preference";

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
    // Load persisted currency on app startup
    const loadCurrency = async () => {
      try {
        const storedCurrency = await AsyncStorage.getItem(CURRENCY_STORAGE_KEY);
        if (storedCurrency) {
          setCurrencyState(storedCurrency);
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
