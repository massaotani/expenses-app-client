import AsyncStorage from "@react-native-async-storage/async-storage";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { NativeModules, Platform } from "react-native";
import { resources } from "../locales/translations";

const LANGUAGE_KEY = "@user_language";

// Get device language without any native module packages
const getDeviceLanguage = (): string => {
  const appLocale =
    Platform.OS === "ios"
      ? NativeModules.SettingsManager?.settings?.AppleLocale ||
        NativeModules.SettingsManager?.settings?.AppleLanguages?.[0]
      : NativeModules.I18nManager?.localeIdentifier;

  if (!appLocale) return "en";

  const langCode = appLocale.split(/[-_]/)[0].toLowerCase();

  // Handle Chinese locale variants (e.g. zh-CN, zh-TW)
  if (langCode === "zh") return "zh";

  return langCode;
};

const languageDetector = {
  type: "languageDetector" as const,
  async: true,
  detect: async (callback: (lng: string) => void) => {
    try {
      const savedLang = await AsyncStorage.getItem(LANGUAGE_KEY);
      if (savedLang) {
        callback(savedLang);
        return;
      }

      callback(getDeviceLanguage());
    } catch {
      callback("en");
    }
  },
  init: () => {},
  cacheUserLanguage: async (lng: string) => {
    try {
      await AsyncStorage.setItem(LANGUAGE_KEY, lng);
    } catch (e) {
      console.error(e);
    }
  },
};

i18n
  .use(languageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: "en",
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  });

export default i18n;
