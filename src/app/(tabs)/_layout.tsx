import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { ColorValue, StyleSheet, Text, View } from "react-native";
import { colors } from "../../constants/theme";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: styles.tabBar,
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
              label="Home"
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
              label="Transactions"
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
              label="Analytics"
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
              label="Settings"
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
    height: 80,
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
    top: 6,
  },
  tabLabel: {
    fontSize: 10,
    marginTop: 2,
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 3,
  },
});
