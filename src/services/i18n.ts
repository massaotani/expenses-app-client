import AsyncStorage from "@react-native-async-storage/async-storage";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { NativeModules, Platform } from "react-native";
import { resources } from "../locales/translations";

const LANGUAGE_KEY = "@user_language";

// Get device language without any native module packages
const getDeviceLanguage = (): string => {
  let appLocale: string | undefined;

  if (Platform.OS === "ios") {
    const settings = NativeModules.SettingsManager?.settings;
    // iOS 13+ uses AppleLanguages array primary entry
    appLocale = settings?.AppleLanguages?.[0] || settings?.AppleLocale;
  } else {
    appLocale = NativeModules.I18nManager?.localeIdentifier;
  }

  if (!appLocale) return "en";

  // Standardize formats like "en_US", "ja-JP", "es-ES" -> "en", "ja", "es"
  const cleanLocale = appLocale.replace("_", "-");
  const langCode = cleanLocale.split("-")[0].toLowerCase();

  // Match supported languages in your resources map, fallback to "en"
  const supportedLanguages = Object.keys(resources);
  if (supportedLanguages.includes(langCode)) {
    return langCode;
  }

  return "en";
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
      if (__DEV__) {
        console.error(e);
      }
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
