import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";
import { useColorScheme } from "react-native";

const THEME_STORAGE_KEY = "@user_theme_preference";

interface ThemeContextType {
  colors: typeof lightColors;
  isDark: boolean;
  isLoading: boolean;
  setDarkMode: (isDark: boolean) => Promise<void>;
  toggleTheme: () => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const systemScheme = useColorScheme();
  const [isDark, setIsDark] = useState(systemScheme === "dark");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (savedTheme !== null) {
          setIsDark(savedTheme === "dark");
        } else {
          setIsDark(systemScheme === "dark");
        }
      } catch (error) {
        if (__DEV__) {
          console.error("Failed to load theme preference", error);
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadTheme();
  }, [systemScheme]);

  const setDarkMode = async (value: boolean) => {
    try {
      setIsDark(value);
      await AsyncStorage.setItem(THEME_STORAGE_KEY, value ? "dark" : "light");
    } catch (error) {
      if (__DEV__) {
        console.error("Failed to save theme preference", error);
      }
    }
  };

  const toggleTheme = async () => {
    await setDarkMode(!isDark);
  };

  const colors = isDark ? darkColors : lightColors;

  return React.createElement(
    ThemeContext.Provider,
    { value: { colors, isDark, isLoading, setDarkMode, toggleTheme } },
    children,
  );
};

export const useAppTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useAppTheme must be used within a ThemeProvider");
  }
  return context;
};

export const getCategoryColor = (
  cat: string,
  isDark: boolean = false,
): string => {
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

export const lightColors = {
  headerBackground: "#1E4D4F",
  screenBackground: "#F3EFEA",
  cardBackground: "#FFFFFF",
  primaryTeal: "#1E4D4F",
  textPrimary: "#2D3748",
  textSecondary: "#718096",
  textMuted: "#999999",
  iconBoxBg: "#F5F0EB",
  regCardsBg: "#c5c5c5",
  addButtonBg: "#486E68",
  divider: "#F0ECE6",
  typeCard: "#71717A",
  graphicLine: "#C85A32",
  monthlyAmount: "#1A1A1A",
  neutral: "#FFFFFF",
  statusBarStyle: "light-content" as const,
  seeAll: "#C86D51",
};

export const darkColors = {
  headerBackground: "#1F1A24",
  screenBackground: "#121212",
  cardBackground: "#1E1E1E",
  primaryTeal: "#FF8C00",
  textPrimary: "#F3EFEA",
  textSecondary: "#A0AEC0",
  textMuted: "#71717A",
  iconBoxBg: "#2A2A2A",
  regCardsBg: "#c5c5c5",
  addButtonBg: "#FF8C00",
  divider: "#2D2D2D",
  typeCard: "#6E6B64",
  graphicLine: "#FF8C00",
  monthlyAmount: "#FFFFFF",
  neutral: "#EFECE6",
  statusBarStyle: "light-content" as const,
  seeAll: "#FF8C00",
};

export const colors = {
  headerBackground: "#284E4C",
  headerCardOverlay: "rgba(255, 255, 255, 0.15)",
  screenBackground: "#F4F4F0",
  cardBackground: "#FFFFFF",
  modalBackground: "rgba(255, 255, 255, 0.15)",

  textDark: "#1C1C1E",
  textMuted: "#71717A",
  textLight: "#FFFFFF",
  textLightMuted: "rgba(255, 255, 255, 0.7)",

  primaryOrange: "#C86D51",
  primaryTeal: "#284E4C",
  sageTeal: "#729B96",
  softOrange: "#E29C82",
  goldenOchre: "#D9A05B",
  deepOchre: "#96652C",
  terracotta: "#B86B53",
  amber: "#E8A855",
  deepSage: "#486E68",
  neutral: "#9A8B85",

  depositText: "#16A34A",
  expenseText: "#EF4444",

  progressTrack: "#EFEFEA",
  border: "#E8E8E3",
};

export const colors_sign_register = {
  headerBackground: "#245353",
  headerCircleOverlay: "rgba(255, 255, 255, 0.08)",
  screenBackground: "#F5F3EF",
  cardBackground: "#FFFFFF",
  inputBorder: "#E6E2DC",
  primaryTeal: "#245353",
  accentOrange: "#C85A32",
  textDark: "#1A1A1A",
  textMuted: "#7C756B",
  textLight: "#FFFFFF",
  textLightMuted: "#A3B8B8",
  buttonDisabled: "#E6E2DC",
  textDisabled: "#7C756B",
};

export const dark_colors_sign_register = {
  headerBackground: "#1F1A24",
  headerCircleOverlay: "rgba(255, 255, 255, 0.04)",
  screenBackground: "#121212",
  cardBackground: "#1E1E1E",
  inputBorder: "#2D2D2D",
  primaryTeal: "#FF8C00",
  accentOrange: "#FF8C00",
  textDark: "#F3EFEA",
  textMuted: "#A0AEC0",
  textLight: "#FFFFFF",
  textLightMuted: "#A0AEC0",
  buttonDisabled: "#2D2D2D",
  textDisabled: "#71717A",
};

export const colors_setting = {
  headerBackground: "#284E4C",
  headerCardOverlay: "rgba(255, 255, 255, 0.15)",
  screenBackground: "#F4F4F0",
  cardBackground: "#FFFFFF",

  textDark: "#1C1C1E",
  textMuted: "#71717A",
  textLight: "#FFFFFF",
  textLightMuted: "rgba(255, 255, 255, 0.7)",
  logOutText: "rgba(255, 0, 0, 0.7)",
};
