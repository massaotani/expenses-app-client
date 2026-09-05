import { moderateScale, scale, verticalScale } from "@/utils/scaling";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  PanResponder,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppTheme } from "../constants/theme";
import api from "../services/api";

export default function PersonalInfoScreen({ navigation }: any) {
  const router = useRouter();
  const { t } = useTranslation();
  const { colors } = useAppTheme();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return gestureState.dx > 30 && Math.abs(gestureState.dy) < 30;
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx > 80) {
          router.replace("/settings");
        }
      },
    }),
  ).current;

  useEffect(() => {
    fetchPersonalInfo();
  }, []);

  const fetchPersonalInfo = async () => {
    try {
      setLoading(true);
      const res = await api.get("/api/v1/users/me");
      const userData = res.data?.user || res.data?.data || res.data;

      setName(userData.name || "");
      setEmail(userData.email || "");
    } catch (error) {
      if (__DEV__) {
        console.error("Failed to fetch user info:", error);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert(
        t("error", "Error"),
        t("nameRequired", "Name cannot be empty."),
      );
      return;
    }

    if (!email.trim() || !email.includes("@")) {
      Alert.alert(
        t("error", "Error"),
        t("invalidEmail", "Please enter a valid email address."),
      );
      return;
    }

    try {
      setSaving(true);

      const res = await api.patch("/api/v1/users/me", {
        name: name.trim(),
        email: email.trim().toLowerCase(),
      });

      const updatedData = res.data?.user || res.data?.data || res.data;

      if (updatedData?.token) {
        await AsyncStorage.setItem("token", updatedData.token);
      }

      Alert.alert(
        t("success", "Success"),
        t("profileUpdated", "Personal info updated successfully."),
        [
          {
            text: "OK",
            onPress: () => router.replace("/settings"),
          },
        ],
      );
    } catch (error: any) {
      if (error?.response?.status === 409) {
        Alert.alert(
          t("error", "Error"),
          t("emailInUse", "This email address is already in use."),
        );
      } else {
        Alert.alert(
          t("error", "Error"),
          t("couldNotUpdate", "Could not update personal info."),
        );
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.headerBackground }]}
      edges={["top"]}
      {...panResponder.panHandlers}
    >
      <StatusBar
        barStyle={colors.statusBarStyle}
        backgroundColor={colors.headerBackground}
      />

      {/* HEADER */}
      <View
        style={[styles.header, { backgroundColor: colors.headerBackground }]}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.push("/settings")}
        >
          <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {t("personalInfo", "Personal Info")}
        </Text>
      </View>

      {/* BODY */}
      <View
        style={[
          styles.bodyContainer,
          { backgroundColor: colors.screenBackground },
        ]}
      >
        {loading ? (
          <ActivityIndicator
            size="large"
            color={colors.primaryTeal}
            style={{ marginTop: 40 }}
          />
        ) : (
          <ScrollView contentContainerStyle={styles.content}>
            <View
              style={[styles.card, { backgroundColor: colors.cardBackground }]}
            >
              {/* NAME INPUT */}
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                {t("fullName", "Full Name")}
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.iconBoxBg,
                    color: colors.textPrimary,
                    borderColor: colors.divider,
                  },
                ]}
                value={name}
                onChangeText={setName}
                placeholder={t("fullNamePlaceholder", "Enter full name")}
                placeholderTextColor={colors.textSecondary}
              />

              {/* EMAIL INPUT (EDITABLE) */}
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                {t("emailLabel", "Email Address")}
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.iconBoxBg,
                    color: colors.textPrimary,
                    borderColor: colors.divider,
                  },
                ]}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholder={t("emailPlaceholder", "Enter email address")}
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            {/* SAVE BUTTON */}
            <TouchableOpacity
              style={[
                styles.saveButton,
                { backgroundColor: colors.primaryTeal },
              ]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.saveButtonText}>
                  {t("save", "Save Changes")}
                </Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: scale(20),
    paddingTop: verticalScale(12),
    paddingBottom: verticalScale(20),
  },
  backButton: { marginRight: scale(12) },
  headerTitle: {
    fontSize: moderateScale(22),
    fontWeight: "bold",
    color: "#FFFFFF",
    fontFamily: Platform.OS === "ios" ? "Georgia" : "serif",
  },
  bodyContainer: {
    flex: 1,
    borderTopLeftRadius: scale(24),
    borderTopRightRadius: scale(24),
    overflow: "hidden",
  },
  content: { padding: scale(20) },
  card: {
    borderRadius: scale(20),
    padding: scale(16),
    marginBottom: verticalScale(20),
  },
  label: {
    fontSize: moderateScale(13),
    fontWeight: "600",
    marginBottom: verticalScale(6),
    marginTop: verticalScale(10),
  },
  input: {
    height: verticalScale(48),
    borderRadius: scale(12),
    borderWidth: 1,
    paddingHorizontal: scale(16),
    fontSize: moderateScale(15),
  },
  saveButton: {
    height: verticalScale(50),
    borderRadius: scale(14),
    justifyContent: "center",
    alignItems: "center",
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: moderateScale(16),
    fontWeight: "bold",
  },
});
