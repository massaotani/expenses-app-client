import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { ColorValue, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "../../constants/theme";

export default function TabLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: [
          styles.tabBar,
          {
            // Dynamically increase height and bottom padding when the Android navigation bar is visible
            height: 55 + insets.bottom,
            paddingBottom: insets.bottom,
          },
        ],
        tabBarActiveTintColor: colors.primaryTeal || "#008080",
        tabBarInactiveTintColor: colors.textMuted || "#999999",
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
      <Ionicons name={iconName} size={22} color={color} />
      <Text
        style={[
          styles.tabLabel,
          { color, fontWeight: focused ? "600" : "400" },
        ]}
      >
        {label}
      </Text>
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
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    position: "absolute",
    borderTopWidth: 0,
    elevation: 10,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: -5 },
  },
  iconContainer: {
    alignItems: "center",
    justifyContent: "center",
    top: 15,
  },
  tabLabel: {
    fontSize: 6,
  },
  activeDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
});
