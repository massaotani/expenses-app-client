import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

export const setItem = async (key: string, value: string): Promise<void> => {
  if (Platform.OS === "web") {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      console.error("Local storage error:", e);
    }
  } else {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch (e) {
      if (__DEV__) {
        console.error("SecureStore setItem error:", e);
      }
    }
  }
};

export const getItem = async (key: string): Promise<string | null> => {
  if (Platform.OS === "web") {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      return null;
    }
  } else {
    try {
      return await SecureStore.getItemAsync(key);
    } catch (e) {
      if (__DEV__) {
        console.error("SecureStore getItem error:", e);
      }
      return null;
    }
  }
};

export const deleteItem = async (key: string): Promise<void> => {
  if (Platform.OS === "web") {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      if (__DEV__) {
        console.error("Local storage error:", e);
      }
    }
  } else {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch (e) {
      if (__DEV__) {
        console.error("SecureStore deleteItem error:", e);
      }
    }
  }
};
export const parseFlexibleNumber = (input: string): number => {
  if (!input || typeof input !== "string") return NaN;

  // Remove currency symbols, spaces, or invalid characters
  let str = input.trim().replace(/[^0-9.,-]/g, "");
  if (!str) return NaN;

  // Case 1: Both dot and comma exist (e.g. "1.234,56" or "1,234.56")
  if (str.includes(".") && str.includes(",")) {
    if (str.lastIndexOf(",") > str.lastIndexOf(".")) {
      // European format: 1.234,56 -> 1234.56
      str = str.replace(/\./g, "").replace(",", ".");
    } else {
      // US format: 1,234.56 -> 1234.56
      str = str.replace(/,/g, "");
    }
  } else if (str.includes(",")) {
    // Case 2: Only comma exists (e.g. "143,44")
    str = str.replace(/,/g, ".");
  }

  // Truncate to a maximum of 2 decimal places (e.g., "143.3353" -> "143.33")
  str = str.replace(/(\.\d{2})\d+$/, "$1");

  return parseFloat(str);
};
