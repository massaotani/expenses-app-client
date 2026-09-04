import { moderateScale, scale, verticalScale } from "@/utils/scaling";
import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { ColorValue, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppTheme } from "../../constants/theme";

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useAppTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: [
          styles.tabBar,
          {
            backgroundColor: colors.cardBackground,
            height: verticalScale(40) + insets.bottom,
            paddingBottom: insets.bottom,
            shadowColor: isDark ? "#000000" : "#000000",
            borderTopColor: colors.divider,
          },
        ],
        tabBarActiveTintColor: colors.primaryTeal,
        tabBarInactiveTintColor: colors.textMuted || colors.textSecondary,
      }}
    >
      <Tabs.Screen
        name="overview"
        options={{
          title: "Home",
          tabBarIcon: ({ color, focused }) => (
            <CustomTabIcon
              icon="home"
              label=""
              color={color}
              focused={focused}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="transactions"
        options={{
          title: "Transactions",
          tabBarIcon: ({ color, focused }) => (
            <CustomTabIcon
              icon="list"
              label=""
              color={color}
              focused={focused}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="analytics"
        options={{
          title: "Analytics",
          tabBarIcon: ({ color, focused }) => (
            <CustomTabIcon
              icon="bar-chart"
              label=""
              color={color}
              focused={focused}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color, focused }) => (
            <CustomTabIcon
              icon="settings"
              label=""
              color={color}
              focused={focused}
            />
          ),
        }}
      />

      {/* HIDE FROM BOTTOM TAB MENU */}
      <Tabs.Screen
        name="personalinfo"
        options={{
          href: null,
        }}
      />

      <Tabs.Screen
        name="paymentmethods"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}

const CustomTabIcon = ({
  icon,
  label,
  color,
  focused,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color: ColorValue;
  focused: boolean;
}) => {
  const iconName = focused
    ? icon
    : (`${icon}-outline` as keyof typeof Ionicons.glyphMap);

  return (
    <View style={styles.iconContainer}>
      <Ionicons name={iconName} size={moderateScale(22)} color={color} />
      {label ? (
        <Text
          style={[
            styles.tabLabel,
            { color, fontWeight: focused ? "600" : "400" },
          ]}
        >
          {label}
        </Text>
      ) : null}
      <View
        style={[
          styles.activeDot,
          { backgroundColor: focused ? color : "transparent" },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    borderTopLeftRadius: scale(24),
    borderTopRightRadius: scale(24),
    position: "absolute",
    borderTopWidth: 0,
    elevation: 10,
    shadowOpacity: 0.1,
    shadowRadius: scale(10),
    shadowOffset: { width: 0, height: verticalScale(-5) },
  },
  iconContainer: {
    alignItems: "center",
    justifyContent: "center",
    top: verticalScale(15),
  },
  tabLabel: {
    fontSize: moderateScale(6),
  },
  activeDot: {
    width: scale(5),
    height: scale(5),
    borderRadius: scale(3),
  },
});
