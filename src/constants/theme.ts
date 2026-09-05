import React, { createContext, useContext, useState } from "react";
import { useColorScheme } from "react-native";
interface ThemeContextType {
  colors: typeof lightColors;
  isDark: boolean;
  setDarkMode: (isDark: boolean) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const systemScheme = useColorScheme(); //
  const [isDark, setIsDark] = useState(systemScheme === "dark"); //[cite: 14]

  const setDarkMode = (value: boolean) => {
    setIsDark(value); //[cite: 14]
  };

  const toggleTheme = () => {
    setIsDark((prev) => !prev); //[cite: 14]
  };

  const colors = isDark ? darkColors : lightColors; //[cite: 14]

  return React.createElement(
    ThemeContext.Provider,
    { value: { colors, isDark, setDarkMode, toggleTheme } },
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
