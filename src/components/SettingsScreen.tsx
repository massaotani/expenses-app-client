import { moderateScale, scale, verticalScale } from "@/utils/scaling";
import { Ionicons } from "@expo/vector-icons";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetTextInput,
} from "@gorhom/bottom-sheet";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
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
  const router = useRouter();

  // Form states
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Toggle state for password visibility
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Gorhom Bottom Sheet Refs & Snap Points
  const languageModalRef = useRef<BottomSheetModal>(null);
  const passwordModalRef = useRef<BottomSheetModal>(null);

  const langSnapPoints = useMemo(() => ["60%"], []);
  const passwordSnapPoints = useMemo(() => ["68%"], []);

  const { colors, isDark, setDarkMode } = useAppTheme();

  const switchAnim = useRef(new Animated.Value(isDark ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(switchAnim, {
      toValue: isDark ? 1 : 0,
      duration: 150,
      useNativeDriver: false,
    }).start();
  }, [isDark]);

  useFocusEffect(
    useCallback(() => {
      if (token) {
        fetchUserProfile();
      }
    }, [token]),
  );

  const thumbTranslateX = switchAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, scale(24)],
  });

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

  // Handlers for opening modals
  const handleOpenLanguageModal = () => languageModalRef.current?.present();
  const handleOpenPasswordModal = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    passwordModalRef.current?.present();
  };

  const handleLanguageSelect = (langCode: string) => {
    i18n.changeLanguage(langCode);
    languageModalRef.current?.dismiss();
  };

  // Change Password API Call
  const handleSavePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert(
        t("error", "Error"),
        t("fillAllFields", "Please fill in all password fields."),
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert(
        t("error", "Error"),
        t("passwordsDoNotMatch", "New passwords do not match."),
      );
      return;
    }

    try {
      setIsSubmitting(true);
      await api.post("/api/v1/auth/change-password", {
        currentPassword,
        newPassword,
      });
      Alert.alert(
        t("success", "Success"),
        t("passwordChanged", "Your password has been changed successfully."),
      );
      passwordModalRef.current?.dismiss();
    } catch (error) {
      Alert.alert(
        t("error", "Error"),
        t(
          "couldNotChangePassword",
          "Failed to change password. Please check current password.",
        ),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
      />
    ),
    [],
  );

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
                  <TouchableOpacity
                    style={styles.row}
                    onPress={() => router.push("/personalinfo")}
                  >
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

                  {/* CHANGE PASSWORD ROW */}
                  <TouchableOpacity
                    style={styles.row}
                    onPress={handleOpenPasswordModal}
                  >
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

                  <TouchableOpacity
                    style={styles.row}
                    onPress={() => router.push("/paymentmethods")}
                  >
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
                        name={isDark ? "moon" : "sunny"}
                        size={18}
                        color={colors.textPrimary}
                      />
                    </View>
                    <Text
                      style={[styles.rowLabel, { color: colors.textPrimary }]}
                    >
                      {isDark
                        ? t("darkMode", "Dark Mode")
                        : t("lightMode", "Light Mode")}
                    </Text>
                    <TouchableOpacity
                      activeOpacity={0.9}
                      onPress={() => setDarkMode(!isDark)}
                      style={[
                        styles.customSwitchTrack,
                        {
                          backgroundColor: isDark
                            ? colors.primaryTeal
                            : colors.divider,
                        },
                      ]}
                    >
                      <Animated.View
                        style={[
                          styles.customSwitchThumb,
                          {
                            transform: [{ translateX: thumbTranslateX }],
                          },
                        ]}
                      />
                    </TouchableOpacity>
                  </View>

                  <View
                    style={[
                      styles.divider,
                      { backgroundColor: colors.divider },
                    ]}
                  />

                  <TouchableOpacity
                    style={styles.row}
                    onPress={handleOpenLanguageModal}
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

      {/* LANGUAGE SELECTION BOTTOM SHEET MODAL */}
      <BottomSheetModal
        ref={languageModalRef}
        snapPoints={langSnapPoints}
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: colors.cardBackground }}
        handleIndicatorStyle={{ backgroundColor: colors.textSecondary }}
      >
        <BottomSheetScrollView contentContainerStyle={styles.sheetContent}>
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
                      backgroundColor: isDark ? "#1A1A1A" : "#E6F0F0",
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
        </BottomSheetScrollView>
      </BottomSheetModal>

      {/* CHANGE PASSWORD BOTTOM SHEET MODAL */}
      <BottomSheetModal
        ref={passwordModalRef}
        snapPoints={passwordSnapPoints}
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: colors.cardBackground }}
        handleIndicatorStyle={{ backgroundColor: colors.textSecondary }}
      >
        <BottomSheetScrollView contentContainerStyle={styles.sheetContent}>
          <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
            {t("changePassword", "Change Password")}
          </Text>

          <View style={{ marginVertical: verticalScale(12) }}>
            {/* CURRENT PASSWORD */}
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
              {t("currentPassword", "Current Password")}
            </Text>
            <View
              style={[
                styles.passwordContainer,
                {
                  backgroundColor: colors.iconBoxBg,
                  borderColor: colors.divider,
                },
              ]}
            >
              <BottomSheetTextInput
                style={[styles.passwordInput, { color: colors.textPrimary }]}
                secureTextEntry={!showCurrentPassword}
                value={currentPassword}
                onChangeText={setCurrentPassword}
                placeholder={t(
                  "currentPasswordPlaceholder",
                  "Enter current password",
                )}
                placeholderTextColor={colors.textSecondary}
              />
              <TouchableOpacity
                onPress={() => setShowCurrentPassword(!showCurrentPassword)}
                style={styles.eyeIconContainer}
              >
                <Ionicons
                  name={showCurrentPassword ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
            </View>

            {/* NEW PASSWORD */}
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
              {t("newPassword", "New Password")}
            </Text>
            <View
              style={[
                styles.passwordContainer,
                {
                  backgroundColor: colors.iconBoxBg,
                  borderColor: colors.divider,
                },
              ]}
            >
              <BottomSheetTextInput
                style={[styles.passwordInput, { color: colors.textPrimary }]}
                secureTextEntry={!showNewPassword}
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder={t("newPasswordPlaceholder", "Enter new password")}
                placeholderTextColor={colors.textSecondary}
              />
              <TouchableOpacity
                onPress={() => setShowNewPassword(!showNewPassword)}
                style={styles.eyeIconContainer}
              >
                <Ionicons
                  name={showNewPassword ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
            </View>

            {/* CONFIRM NEW PASSWORD */}
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
              {t("confirmNewPassword", "Confirm New Password")}
            </Text>
            <View
              style={[
                styles.passwordContainer,
                {
                  backgroundColor: colors.iconBoxBg,
                  borderColor: colors.divider,
                },
              ]}
            >
              <BottomSheetTextInput
                style={[styles.passwordInput, { color: colors.textPrimary }]}
                secureTextEntry={!showConfirmPassword}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder={t(
                  "confirmPasswordPlaceholder",
                  "Re-enter new password",
                )}
                placeholderTextColor={colors.textSecondary}
              />
              <TouchableOpacity
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                style={styles.eyeIconContainer}
              >
                <Ionicons
                  name={showConfirmPassword ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={[
              styles.primaryButton,
              { backgroundColor: colors.primaryTeal },
            ]}
            onPress={handleSavePassword}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryButtonText}>
                {t("updatePassword", "Update Password")}
              </Text>
            )}
          </TouchableOpacity>
        </BottomSheetScrollView>
      </BottomSheetModal>
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
  customSwitchTrack: {
    width: scale(62),
    height: verticalScale(30),
    borderRadius: scale(15),
    padding: scale(3),
    justifyContent: "center",
    alignSelf: "center",
  },
  customSwitchThumb: {
    width: scale(32),
    height: scale(24),
    borderRadius: scale(12),
    backgroundColor: "#FFFFFF",
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
  sheetContent: {
    padding: scale(24),
    paddingBottom: verticalScale(40),
  },
  modalTitle: {
    fontSize: moderateScale(20),
    fontWeight: "bold",
    marginBottom: verticalScale(4),
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
  inputLabel: {
    fontSize: moderateScale(13),
    fontWeight: "600",
    marginTop: verticalScale(10),
    marginBottom: verticalScale(6),
  },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    height: verticalScale(48),
    borderRadius: scale(12),
    borderWidth: 1,
    marginBottom: verticalScale(12),
    paddingHorizontal: scale(16),
  },
  passwordInput: {
    flex: 1,
    height: "100%",
    fontSize: moderateScale(16),
  },
  eyeIconContainer: {
    padding: scale(4),
  },
  primaryButton: {
    height: verticalScale(50),
    borderRadius: scale(14),
    justifyContent: "center",
    alignItems: "center",
    marginTop: verticalScale(16),
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: moderateScale(16),
    fontWeight: "bold",
  },
});
