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

  let str = input.trim().replace(/[^0-9.,-]/g, "");
  if (!str) return NaN;

  if (str.includes(".") && str.includes(",")) {
    if (str.lastIndexOf(",") > str.lastIndexOf(".")) {
      str = str.replace(/\./g, "").replace(",", ".");
    } else {
      str = str.replace(/,/g, "");
    }
  } else if (str.includes(",")) {
    str = str.replace(/,/g, ".");
  }

  str = str.replace(/(\.\d{2})\d+$/, "$1");

  return parseFloat(str);
};
