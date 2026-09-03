import { moderateScale, scale, verticalScale } from "@/utils/scaling";
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
import { useAppTheme } from "../constants/theme";
import api from "../services/api";

export interface UserProfile {
  id: string;
  name: string;
  monthlyIncome: number;
  email?: string;
}

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "pt", label: "Português" },
  { code: "es", label: "Español" },
  { code: "ja", label: "日本語" },
  { code: "ko", label: "한국어" },
  { code: "zh", label: "中文" },
  { code: "fr", label: "Français" },
];

export default function SettingsScreen() {
  const { t, i18n } = useTranslation();
  const { signOut, token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  const [modalLanguageVisible, setModalLanguageVisible] = useState(false);
  const { colors, isDark, setDarkMode } = useAppTheme();
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
    i18n.changeLanguage(langCode);
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

  const activeLangCode = i18n.language ? i18n.language.split(/[-_]/)[0] : "en";
  const currentLanguageLabel =
    LANGUAGES.find((l) => l.code === activeLangCode)?.label || "English";

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.headerBackground }]}
      edges={["top"]}
    >
      <StatusBar
        barStyle={colors.statusBarStyle}
        backgroundColor={colors.headerBackground}
      />

      {/* FIXED HEADER SECTION */}
      <View
        style={[styles.header, { backgroundColor: colors.headerBackground }]}
      >
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

      {/* SCROLLABLE BODY CONTAINER */}
      <View
        style={[
          styles.bodyContainer,
          { backgroundColor: colors.screenBackground },
        ]}
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          <View
            style={[styles.body, { backgroundColor: colors.screenBackground }]}
          >
            {loading ? (
              <ActivityIndicator
                size="large"
                color={colors.primaryTeal}
                style={{ marginTop: 40 }}
              />
            ) : (
              <>
                {/* ACCOUNT SECTION */}
                <Text
                  style={[styles.sectionTitle, { color: colors.textSecondary }]}
                >
                  {t("account", "ACCOUNT")}
                </Text>
                <View
                  style={[
                    styles.card,
                    { backgroundColor: colors.cardBackground },
                  ]}
                >
                  <TouchableOpacity style={styles.row}>
                    <View
                      style={[
                        styles.iconBox,
                        { backgroundColor: colors.iconBoxBg },
                      ]}
                    >
                      <Ionicons
                        name="person"
                        size={18}
                        color={colors.textPrimary}
                      />
                    </View>
                    <Text
                      style={[styles.rowLabel, { color: colors.textPrimary }]}
                    >
                      {t("personalInfo", "Personal Info")}
                    </Text>
                    <Ionicons
                      name="chevron-forward"
                      size={18}
                      color={colors.textSecondary}
                    />
                  </TouchableOpacity>

                  <View
                    style={[
                      styles.divider,
                      { backgroundColor: colors.divider },
                    ]}
                  />

                  <TouchableOpacity style={styles.row}>
                    <View
                      style={[
                        styles.iconBox,
                        { backgroundColor: colors.iconBoxBg },
                      ]}
                    >
                      <Ionicons
                        name="lock-closed"
                        size={18}
                        color={colors.textPrimary}
                      />
                    </View>
                    <Text
                      style={[styles.rowLabel, { color: colors.textPrimary }]}
                    >
                      {t("changePassword", "Change Password")}
                    </Text>
                    <Ionicons
                      name="chevron-forward"
                      size={18}
                      color={colors.textSecondary}
                    />
                  </TouchableOpacity>

                  <View
                    style={[
                      styles.divider,
                      { backgroundColor: colors.divider },
                    ]}
                  />

                  <TouchableOpacity style={styles.row}>
                    <View
                      style={[
                        styles.iconBox,
                        { backgroundColor: colors.iconBoxBg },
                      ]}
                    >
                      <Ionicons
                        name="card"
                        size={18}
                        color={colors.textPrimary}
                      />
                    </View>
                    <Text
                      style={[styles.rowLabel, { color: colors.textPrimary }]}
                    >
                      {t("paymentMethods", "Payment Methods")}
                    </Text>
                    <Ionicons
                      name="chevron-forward"
                      size={18}
                      color={colors.textSecondary}
                    />
                  </TouchableOpacity>

                  <View
                    style={[
                      styles.divider,
                      { backgroundColor: colors.divider },
                    ]}
                  />

                  <TouchableOpacity style={styles.row}>
                    <View
                      style={[
                        styles.iconBox,
                        { backgroundColor: colors.iconBoxBg },
                      ]}
                    >
                      <Ionicons
                        name="stats-chart"
                        size={18}
                        color={colors.textPrimary}
                      />
                    </View>
                    <Text
                      style={[styles.rowLabel, { color: colors.textPrimary }]}
                    >
                      {t("monthlyBudget", "Monthly Budget")}
                    </Text>
                    <Text
                      style={[styles.rowValue, { color: colors.textSecondary }]}
                    >
                      $
                      {monthlyBudget.toLocaleString("en-US", {
                        minimumFractionDigits: 0,
                      })}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* PREFERENCES SECTION */}
                <Text
                  style={[styles.sectionTitle, { color: colors.textSecondary }]}
                >
                  {t("preferences", "PREFERENCES")}
                </Text>
                <View
                  style={[
                    styles.card,
                    { backgroundColor: colors.cardBackground },
                  ]}
                >
                  <View style={styles.row}>
                    <View
                      style={[
                        styles.iconBox,
                        { backgroundColor: colors.iconBoxBg },
                      ]}
                    >
                      <Ionicons
                        name="moon"
                        size={18}
                        color={colors.textPrimary}
                      />
                    </View>
                    <Text
                      style={[styles.rowLabel, { color: colors.textPrimary }]}
                    >
                      {t("darkMode", "Dark Mode")}
                    </Text>
                    <Switch
                      value={isDark}
                      onValueChange={(val) => setDarkMode(val)}
                      trackColor={{
                        false: colors.divider,
                        true: colors.primaryTeal,
                      }}
                      thumbColor="#FFFFFF"
                    />
                  </View>

                  <View
                    style={[
                      styles.divider,
                      { backgroundColor: colors.divider },
                    ]}
                  />

                  <TouchableOpacity
                    style={styles.row}
                    onPress={() => setModalLanguageVisible(true)}
                  >
                    <View
                      style={[
                        styles.iconBox,
                        { backgroundColor: colors.iconBoxBg },
                      ]}
                    >
                      <Ionicons
                        name="globe-outline"
                        size={18}
                        color={colors.textPrimary}
                      />
                    </View>
                    <Text
                      style={[styles.rowLabel, { color: colors.textPrimary }]}
                    >
                      {t("language", "Language")}
                    </Text>
                    <Text
                      style={[styles.rowValue, { color: colors.textSecondary }]}
                    >
                      {currentLanguageLabel}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* ACCOUNT ACTIONS */}
                <Text
                  style={[styles.sectionTitle, { color: colors.textSecondary }]}
                >
                  {t("accountActions", "ACCOUNT ACTIONS")}
                </Text>
                <View
                  style={[
                    styles.card,
                    { backgroundColor: colors.cardBackground },
                  ]}
                >
                  <TouchableOpacity style={styles.row} onPress={handleSignOut}>
                    <View
                      style={[
                        styles.iconBox,
                        { backgroundColor: isDark ? "#3A1E1E" : "#FFF5F5" },
                      ]}
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
                    <Ionicons
                      name="chevron-forward"
                      size={18}
                      color={colors.textSecondary}
                    />
                  </TouchableOpacity>

                  <View
                    style={[
                      styles.divider,
                      { backgroundColor: colors.divider },
                    ]}
                  />

                  <TouchableOpacity
                    style={styles.row}
                    onPress={handleDeleteAccount}
                  >
                    <View
                      style={[
                        styles.iconBox,
                        { backgroundColor: isDark ? "#3A1E1E" : "#FFF5F5" },
                      ]}
                    >
                      <Ionicons
                        name="trash-outline"
                        size={18}
                        color="#E53E3E"
                      />
                    </View>
                    <Text style={[styles.rowLabel, { color: "#E53E3E" }]}>
                      {t("deleteAccount", "Delete Account")}
                    </Text>
                    <Ionicons
                      name="chevron-forward"
                      size={18}
                      color={colors.textSecondary}
                    />
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </ScrollView>
      </View>

      {/* LANGUAGE SELECTION MODAL */}
      <Modal visible={modalLanguageVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              { backgroundColor: colors.cardBackground },
            ]}
          >
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
              {t("selectLanguage", "Select Language")}
            </Text>

            <View style={{ marginVertical: 12 }}>
              {LANGUAGES.map((lang) => {
                const isSelected = activeLangCode === lang.code;
                return (
                  <TouchableOpacity
                    key={lang.code}
                    style={[
                      styles.languageOption,
                      { backgroundColor: colors.iconBoxBg },
                      isSelected && {
                        backgroundColor: isDark ? "#1E3838" : "#E6F0F0",
                        borderWidth: 1,
                        borderColor: colors.primaryTeal,
                      },
                    ]}
                    onPress={() => handleLanguageSelect(lang.code)}
                  >
                    <Text
                      style={[
                        styles.languageOptionText,
                        { color: colors.textPrimary },
                        isSelected && {
                          color: colors.primaryTeal,
                          fontWeight: "bold",
                        },
                      ]}
                    >
                      {lang.label}
                    </Text>
                    {isSelected && (
                      <Ionicons
                        name="checkmark-circle"
                        size={20}
                        color={colors.primaryTeal}
                      />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              style={[
                styles.cancelButton,
                { backgroundColor: colors.iconBoxBg },
              ]}
              onPress={() => setModalLanguageVisible(false)}
            >
              <Text
                style={[styles.cancelButtonText, { color: colors.textPrimary }]}
              >
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
  container: {
    flex: 1,
  },
  bodyContainer: {
    flex: 1,
    paddingBottom: verticalScale(40),
    borderTopLeftRadius: scale(24),
    borderTopRightRadius: scale(24),
    overflow: "hidden",
  },
  header: {
    paddingHorizontal: scale(20),
    paddingTop: verticalScale(16),
    paddingBottom: verticalScale(28),
  },
  headerTitle: {
    fontSize: moderateScale(32),
    fontWeight: "bold",
    color: "#FFFFFF",
    fontFamily: Platform.OS === "ios" ? "Georgia" : "serif",
    marginBottom: verticalScale(16),
  },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    borderRadius: scale(20),
    padding: scale(16),
  },
  avatar: {
    width: scale(48),
    height: scale(48),
    borderRadius: scale(24),
    backgroundColor: "#E09B67",
    justifyContent: "center",
    alignItems: "center",
    marginRight: scale(14),
  },
  avatarText: {
    color: "#FFFFFF",
    fontSize: moderateScale(20),
    fontWeight: "bold",
  },
  profileInfo: { flex: 1 },
  profileName: {
    color: "#FFFFFF",
    fontSize: moderateScale(17),
    fontWeight: "bold",
  },
  profileEmail: {
    color: "rgba(255, 255, 255, 0.7)",
    fontSize: moderateScale(13),
    marginTop: verticalScale(2),
  },
  editButton: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(8),
    borderRadius: scale(14),
  },
  editButtonText: {
    color: "#FFFFFF",
    fontSize: moderateScale(13),
    fontWeight: "600",
  },
  body: {
    flex: 1,
    paddingHorizontal: scale(20),
    paddingTop: verticalScale(16),
    paddingBottom: verticalScale(80),
    borderTopLeftRadius: scale(24),
    borderTopRightRadius: scale(24),
    minHeight: verticalScale(600),
  },
  sectionTitle: {
    fontSize: moderateScale(12),
    fontWeight: "700",
    letterSpacing: scale(1.2),
    marginTop: verticalScale(20),
    marginBottom: verticalScale(10),
    marginLeft: scale(4),
  },
  card: {
    borderRadius: scale(20),
    paddingHorizontal: scale(16),
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: verticalScale(14),
  },
  iconBox: {
    width: scale(38),
    height: scale(38),
    borderRadius: scale(12),
    justifyContent: "center",
    alignItems: "center",
    marginRight: scale(14),
  },
  rowLabel: {
    flex: 1,
    fontSize: moderateScale(16),
    fontWeight: "600",
  },
  rowValue: {
    fontSize: moderateScale(15),
    fontFamily: Platform.OS === "ios" ? "Georgia" : "serif",
  },
  divider: { height: 1, marginLeft: scale(52) },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    padding: scale(24),
    borderTopLeftRadius: scale(24),
    borderTopRightRadius: scale(24),
    paddingBottom: verticalScale(60),
  },
  modalTitle: {
    fontSize: moderateScale(20),
    fontWeight: "bold",
    marginBottom: verticalScale(8),
  },
  languageOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: verticalScale(14),
    paddingHorizontal: scale(16),
    borderRadius: scale(12),
    marginBottom: verticalScale(8),
  },
  languageOptionText: {
    fontSize: moderateScale(16),
    fontWeight: "600",
  },
  cancelButton: {
    paddingVertical: verticalScale(14),
    borderRadius: scale(12),
    alignItems: "center",
    marginTop: verticalScale(8),
  },
  cancelButtonText: {
    fontWeight: "600",
    fontSize: moderateScale(15),
  },
});
