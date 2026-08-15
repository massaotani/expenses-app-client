// utils/storage.ts
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

export const setItem = async (key: string, value: string): Promise<void> => {
  if (Platform.OS === "web") {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      console.error("Local storage unavailable", e);
    }
  } else {
    await SecureStore.setItemAsync(key, value);
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
    return await SecureStore.getItemAsync(key);
  }
};

export const deleteItem = async (key: string): Promise<void> => {
  if (Platform.OS === "web") {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.error("Local storage unavailable", e);
    }
  } else {
    await SecureStore.deleteItemAsync(key);
  }
};
