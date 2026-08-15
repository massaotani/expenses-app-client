import React from "react";
import { View, Text, SafeAreaView } from "react-native";
import { colors } from "../../constants/theme";

export default function AnalyticsScreen() {
  return (
    <SafeAreaView
      style={{
        flex: 1,
        backgroundColor: colors.screenBackground,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Text style={{ fontSize: 20, color: colors.textDark }}>
        Analytics Screen
      </Text>
    </SafeAreaView>
  );
}
