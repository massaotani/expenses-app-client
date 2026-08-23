import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../app/_layout";
import { colors } from "../constants/theme";
import api from "../services/api";

export interface UserProfile {
  id: string;
  name: string;
  monthlyIncome: number;
  email?: string;
}

// Map language codes to display names
const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "pt", label: "Português" },
  { code: "es", label: "Español" },
  { code: "ja", label: "日本語" },
];

export default function SettingsScreen() {
  const { t, i18n } = useTranslation();
  const { signOut, token } = useAuth();
  const [darkMode, setDarkMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  // Language Modal State
  const [modalLanguageVisible, setModalLanguageVisible] = useState(false);

  useEffect(() => {
    if (token) {
      fetchUserProfile();
    }
  }, [token]);

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      const res = await api.get<UserProfile>("/api/v1/users/me");
      setUserProfile(res.data);
    } catch (error: any) {
      console.error("Failed to fetch settings user profile:", error);
      if (error?.response?.status === 401) {
        Alert.alert(
          t("sessionExpired", "Session Expired"),
          t("pleaseLogInAgain", "Please log in again."),
        );
        await signOut();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLanguageSelect = (langCode: string) => {
    i18n.changeLanguage(langCode); // Triggers re-renders across all screens
    setModalLanguageVisible(false);
  };

  const handleSignOut = () => {
    Alert.alert(
      t("signOut", "Sign Out"),
      t("signOutConfirm", "Are you sure you want to sign out?"),
      [
        { text: t("cancel", "Cancel"), style: "cancel" },
        {
          text: t("signOut", "Sign Out"),
          style: "destructive",
          onPress: () => signOut(),
        },
      ],
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      t("deleteAccount", "Delete Account"),
      t(
        "deleteAccountConfirm",
        "Are you sure you want to permanently delete your account?",
      ),
      [
        { text: t("cancel", "Cancel"), style: "cancel" },
        {
          text: t("delete", "Delete"),
          style: "destructive",
          onPress: async () => {
            try {
              await api.delete("/api/v1/users/me");
              await signOut();
            } catch (error) {
              Alert.alert(
                t("error", "Error"),
                t("couldNotDeleteAccount", "Could not delete account."),
              );
            }
          },
        },
      ],
    );
  };

  const name = userProfile?.name || t("user", "User");
  const email = userProfile?.email || "";
  const monthlyBudget = userProfile?.monthlyIncome || 0;

  // Get current active language label
  const currentLanguageLabel =
    LANGUAGES.find((l) => l.code === i18n.language)?.label || "English";

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={colors.headerBackground || "#1E4D4F"}
      />

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* HEADER SECTION */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{t("settings", "Settings")}</Text>

          <View style={styles.profileCard}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {name.charAt(0).toUpperCase()}
              </Text>
            </View>

            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{name}</Text>
              {email ? <Text style={styles.profileEmail}>{email}</Text> : null}
            </View>

            <TouchableOpacity style={styles.editButton}>
              <Text style={styles.editButtonText}>{t("edit", "Edit")}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* BODY CONTENT */}
        <View style={styles.body}>
          {loading ? (
            <ActivityIndicator
              size="large"
              color={colors.primaryTeal || "#1E4D4F"}
              style={{ marginTop: 40 }}
            />
          ) : (
            <>
              {/* ACCOUNT SECTION */}
              <Text style={styles.sectionTitle}>{t("account", "ACCOUNT")}</Text>
              <View style={styles.card}>
                <TouchableOpacity style={styles.row}>
                  <View style={styles.iconBox}>
                    <Ionicons name="person" size={18} color="#4A5568" />
                  </View>
                  <Text style={styles.rowLabel}>
                    {t("personalInfo", "Personal Info")}
                  </Text>
                  <Ionicons name="chevron-forward" size={18} color="#A0AEC0" />
                </TouchableOpacity>

                <View style={styles.divider} />

                <TouchableOpacity style={styles.row}>
                  <View style={styles.iconBox}>
                    <Ionicons name="lock-closed" size={18} color="#4A5568" />
                  </View>
                  <Text style={styles.rowLabel}>
                    {t("changePassword", "Change Password")}
                  </Text>
                  <Ionicons name="chevron-forward" size={18} color="#A0AEC0" />
                </TouchableOpacity>

                <View style={styles.divider} />

                <TouchableOpacity style={styles.row}>
                  <View style={styles.iconBox}>
                    <Ionicons name="card" size={18} color="#4A5568" />
                  </View>
                  <Text style={styles.rowLabel}>
                    {t("paymentMethods", "Payment Methods")}
                  </Text>
                  <Ionicons name="chevron-forward" size={18} color="#A0AEC0" />
                </TouchableOpacity>

                <View style={styles.divider} />

                <TouchableOpacity style={styles.row}>
                  <View style={styles.iconBox}>
                    <Ionicons name="stats-chart" size={18} color="#4A5568" />
                  </View>
                  <Text style={styles.rowLabel}>
                    {t("monthlyBudget", "Monthly Budget")}
                  </Text>
                  <Text style={styles.rowValue}>
                    $
                    {monthlyBudget.toLocaleString("en-US", {
                      minimumFractionDigits: 0,
                    })}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* PREFERENCES SECTION */}
              <Text style={styles.sectionTitle}>
                {t("preferences", "PREFERENCES")}
              </Text>
              <View style={styles.card}>
                <View style={styles.row}>
                  <View style={styles.iconBox}>
                    <Ionicons name="moon" size={18} color="#4A5568" />
                  </View>
                  <Text style={styles.rowLabel}>
                    {t("darkMode", "Dark Mode")}
                  </Text>
                  <Switch
                    value={darkMode}
                    onValueChange={setDarkMode}
                    trackColor={{
                      false: "#E2E8F0",
                      true: colors.primaryTeal || "#1E4D4F",
                    }}
                    thumbColor="#FFFFFF"
                  />
                </View>

                <View style={styles.divider} />

                <TouchableOpacity style={styles.row}>
                  <View style={styles.iconBox}>
                    <Ionicons name="wallet" size={18} color="#4A5568" />
                  </View>
                  <Text style={styles.rowLabel}>
                    {t("currency", "Currency")}
                  </Text>
                  <Text style={styles.rowValue}>USD $</Text>
                </TouchableOpacity>

                <View style={styles.divider} />

                {/* Language Option */}
                <TouchableOpacity
                  style={styles.row}
                  onPress={() => setModalLanguageVisible(true)}
                >
                  <View style={styles.iconBox}>
                    <Ionicons name="globe-outline" size={18} color="#4A5568" />
                  </View>
                  <Text style={styles.rowLabel}>
                    {t("language", "Language")}
                  </Text>
                  <Text style={styles.rowValue}>{currentLanguageLabel}</Text>
                </TouchableOpacity>
              </View>

              {/* ACCOUNT ACTIONS */}
              <Text style={styles.sectionTitle}>
                {t("accountActions", "ACCOUNT ACTIONS")}
              </Text>
              <View style={styles.card}>
                <TouchableOpacity style={styles.row} onPress={handleSignOut}>
                  <View
                    style={[styles.iconBox, { backgroundColor: "#FFF5F5" }]}
                  >
                    <Ionicons
                      name="log-out-outline"
                      size={18}
                      color="#E53E3E"
                    />
                  </View>
                  <Text style={[styles.rowLabel, { color: "#E53E3E" }]}>
                    {t("signOut", "Sign Out")}
                  </Text>
                  <Ionicons name="chevron-forward" size={18} color="#A0AEC0" />
                </TouchableOpacity>

                <View style={styles.divider} />

                <TouchableOpacity
                  style={styles.row}
                  onPress={handleDeleteAccount}
                >
                  <View
                    style={[styles.iconBox, { backgroundColor: "#FFF5F5" }]}
                  >
                    <Ionicons name="trash-outline" size={18} color="#E53E3E" />
                  </View>
                  <Text style={[styles.rowLabel, { color: "#E53E3E" }]}>
                    {t("deleteAccount", "Delete Account")}
                  </Text>
                  <Ionicons name="chevron-forward" size={18} color="#A0AEC0" />
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </ScrollView>

      {/* LANGUAGE SELECTION MODAL */}
      <Modal visible={modalLanguageVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {t("selectLanguage", "Select Language")}
            </Text>

            <View style={{ marginVertical: 12 }}>
              {LANGUAGES.map((lang) => {
                const isSelected = i18n.language === lang.code;
                return (
                  <TouchableOpacity
                    key={lang.code}
                    style={[
                      styles.languageOption,
                      isSelected && styles.languageOptionSelected,
                    ]}
                    onPress={() => handleLanguageSelect(lang.code)}
                  >
                    <Text
                      style={[
                        styles.languageOptionText,
                        isSelected && styles.languageOptionTextSelected,
                      ]}
                    >
                      {lang.label}
                    </Text>
                    {isSelected && (
                      <Ionicons
                        name="checkmark-circle"
                        size={20}
                        color={colors.primaryTeal || "#1E4D4F"}
                      />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setModalLanguageVisible(false)}
            >
              <Text style={styles.cancelButtonText}>
                {t("cancel", "Cancel")}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.headerBackground || "#1E4D4F" },
  header: {
    backgroundColor: colors.headerBackground || "#1E4D4F",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 28,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#FFFFFF",
    fontFamily: Platform.OS === "ios" ? "Georgia" : "serif",
    marginBottom: 20,
  },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    borderRadius: 20,
    padding: 16,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#E09B67",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  avatarText: { color: "#FFFFFF", fontSize: 20, fontWeight: "bold" },
  profileInfo: { flex: 1 },
  profileName: { color: "#FFFFFF", fontSize: 17, fontWeight: "bold" },
  profileEmail: {
    color: "rgba(255, 255, 255, 0.7)",
    fontSize: 13,
    marginTop: 2,
  },
  editButton: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 14,
  },
  editButtonText: { color: "#FFFFFF", fontSize: 13, fontWeight: "600" },
  body: {
    flex: 1,
    backgroundColor: colors.screenBackground || "#F3EFEA",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 40,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    minHeight: 600,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#8C857B",
    letterSpacing: 1.2,
    marginTop: 20,
    marginBottom: 10,
    marginLeft: 4,
  },
  card: { backgroundColor: "#FFFFFF", borderRadius: 20, paddingHorizontal: 16 },
  row: { flexDirection: "row", alignItems: "center", paddingVertical: 14 },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#F5F0EB",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  rowLabel: { flex: 1, fontSize: 16, fontWeight: "600", color: "#2D3748" },
  rowValue: {
    fontSize: 15,
    color: "#718096",
    fontFamily: Platform.OS === "ios" ? "Georgia" : "serif",
  },
  divider: { height: 1, backgroundColor: "#F0ECE6", marginLeft: 52 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    padding: 24,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#2D3748",
    marginBottom: 8,
  },
  languageOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: "#F5F0EB",
    marginBottom: 8,
  },
  languageOptionSelected: {
    backgroundColor: "#E6F0F0",
    borderWidth: 1,
    borderColor: colors.primaryTeal || "#1E4D4F",
  },
  languageOptionText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2D3748",
  },
  languageOptionTextSelected: {
    color: colors.primaryTeal || "#1E4D4F",
    fontWeight: "bold",
  },
  cancelButton: {
    backgroundColor: "#F5F0EB",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 8,
  },
  cancelButtonText: {
    color: "#2D3748",
    fontWeight: "600",
    fontSize: 15,
  },
});
