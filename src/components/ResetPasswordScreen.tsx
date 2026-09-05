import {
  colors_sign_register,
  dark_colors_sign_register,
  useAppTheme,
} from "@/constants/theme";
import api from "@/services/api";
import { moderateScale, scale, verticalScale } from "@/utils/scaling";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function ResetPasswordScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDark } = useAppTheme();
  const { email } = useLocalSearchParams<{ email: string }>();

  const themeColors = isDark ? dark_colors_sign_register : colors_sign_register;

  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    const showSubscription = Keyboard.addListener("keyboardDidShow", () => {
      setIsKeyboardVisible(true);
    });
    const hideSubscription = Keyboard.addListener("keyboardDidHide", () => {
      setIsKeyboardVisible(false);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  const handleVerifyCode = async () => {
    if (!code.trim() || code.length < 6) {
      Alert.alert(t("missingInformation"), t("enterVerificationCode"));
      return;
    }

    setLoading(true);
    setErrorMessage("");

    try {
      await api.post("/api/v1/auth/verify-reset-code", {
        email,
        code: code.trim(),
      });
      setIsVerified(true);
    } catch (error: any) {
      setErrorMessage(error.response?.data?.message || t("genericError"));
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword.trim()) {
      Alert.alert(t("missingInformation"), t("enterNewPassword"));
      return;
    }

    setLoading(true);
    setErrorMessage("");

    try {
      await api.post("/api/v1/auth/reset-password", {
        email,
        code: code.trim(),
        newPassword,
      });

      Alert.alert(t("success"), t("passwordResetSuccess"), [
        { text: t("ok"), onPress: () => router.replace("/") },
      ]);
    } catch (error: any) {
      setErrorMessage(error.response?.data?.message || t("genericError"));
    } finally {
      setLoading(false);
    }
  };

  const codeDigits = Array.from({ length: 6 }, (_, index) => code[index] || "");

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View
        style={[
          styles.container,
          { backgroundColor: themeColors.screenBackground },
        ]}
      >
        <StatusBar
          barStyle="light-content"
          backgroundColor="transparent"
          translucent
        />
        <KeyboardAwareScrollView
          scrollEnabled={isKeyboardVisible}
          showsVerticalScrollIndicator={false}
          enableOnAndroid
          extraScrollHeight={verticalScale(20)}
          contentContainerStyle={[
            styles.scrollContainer,
            { paddingBottom: insets.bottom + verticalScale(24) },
          ]}
        >
          {/* Top Header */}
          <View
            style={[
              styles.header,
              {
                paddingTop: insets.top + verticalScale(12),
                backgroundColor: themeColors.headerBackground,
              },
            ]}
          >
            <View
              style={[
                styles.headerCircle,
                { backgroundColor: themeColors.headerCircleOverlay },
              ]}
            />
            <View style={styles.topBar}>
              <TouchableOpacity
                style={styles.iconButton}
                onPress={() => router.back()}
                accessibilityLabel="Go Back"
              >
                <Ionicons
                  name="arrow-back-outline"
                  size={moderateScale(22)}
                  color={themeColors.textLight}
                />
              </TouchableOpacity>
            </View>

            <Text
              style={[styles.headerTitle, { color: themeColors.textLight }]}
            >
              {isVerified ? t("setNewPassword") : t("resetPassword")}
            </Text>
            <Text
              style={[
                styles.headerSubtitle,
                { color: themeColors.textLightMuted },
              ]}
            >
              {isVerified
                ? t("setNewPasswordSubtitle")
                : t("resetPasswordSubtitle")}
            </Text>
          </View>

          {/* Form Area */}
          <View style={styles.form}>
            {errorMessage !== "" && (
              <View style={styles.errorContainer}>
                <Ionicons
                  name="alert-circle"
                  size={moderateScale(18)}
                  color="#D9383A"
                  style={{ marginRight: scale(6) }}
                />
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            )}

            {/* Step 1: Verification Code Input (Evenly Spaced Dashed Card Slots) */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: themeColors.textMuted }]}>
                {t("verificationCode")}
              </Text>

              <Pressable
                style={styles.codeSlotsRow}
                onPress={() => inputRef.current?.focus()}
              >
                {codeDigits.map((digit, index) => {
                  const isFilled = digit !== "";
                  const isFocused =
                    code.length === index || (code.length === 6 && index === 5);

                  return (
                    <View
                      key={index}
                      style={[
                        styles.dashedSlot,
                        {
                          borderColor:
                            isFocused || isFilled
                              ? themeColors.primaryTeal
                              : themeColors.inputBorder,
                          backgroundColor: isFilled
                            ? `${themeColors.primaryTeal}10`
                            : themeColors.cardBackground,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.slotText,
                          { color: themeColors.primaryTeal },
                        ]}
                      >
                        {digit}
                      </Text>
                    </View>
                  );
                })}
              </Pressable>

              {/* Hidden text input for handling keyboard events */}
              <TextInput
                ref={inputRef}
                style={styles.hiddenInput}
                value={code}
                onChangeText={setCode}
                keyboardType="number-pad"
                maxLength={6}
                editable={!loading && !isVerified}
              />
            </View>

            {/* Step 2: New Password Input (Shown only after code verification) */}
            {isVerified && (
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: themeColors.textMuted }]}>
                  {t("newPassword")}
                </Text>
                <View style={styles.passwordContainer}>
                  <TextInput
                    style={[
                      styles.input,
                      styles.passwordInput,
                      {
                        backgroundColor: themeColors.cardBackground,
                        borderColor: themeColors.inputBorder,
                        color: themeColors.textDark,
                        letterSpacing: 0,
                      },
                    ]}
                    value={newPassword}
                    placeholder={t("newPasswordPlaceholder")}
                    placeholderTextColor={themeColors.textMuted}
                    onChangeText={setNewPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    editable={!loading}
                  />
                  <TouchableOpacity
                    style={styles.eyeIcon}
                    onPress={() => setShowPassword(!showPassword)}
                  >
                    <Ionicons
                      name={showPassword ? "eye-off-outline" : "eye-outline"}
                      size={moderateScale(20)}
                      color={themeColors.textMuted}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Action Button */}
            <TouchableOpacity
              style={[
                styles.actionButton,
                { backgroundColor: themeColors.primaryTeal },
                loading && styles.buttonDisabled,
              ]}
              onPress={isVerified ? handleResetPassword : handleVerifyCode}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={themeColors.textLight} />
              ) : (
                <Text
                  style={[
                    styles.actionButtonText,
                    { color: themeColors.textLight },
                  ]}
                >
                  {isVerified ? t("updatePassword") : t("verifyCode")}
                </Text>
              )}
            </TouchableOpacity>

            <View style={styles.footerRow}>
              <Text
                style={[styles.footerText, { color: themeColors.textMuted }]}
              >
                {t("rememberPassword")}
              </Text>
              <TouchableOpacity
                onPress={() => router.replace("/")}
                disabled={loading}
              >
                <Text
                  style={[
                    styles.signInText,
                    { color: themeColors.accentOrange },
                  ]}
                >
                  {t("signIn")}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAwareScrollView>
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContainer: { flexGrow: 1 },
  header: {
    paddingHorizontal: scale(28),
    paddingBottom: verticalScale(40),
    borderBottomLeftRadius: scale(36),
    borderBottomRightRadius: scale(36),
    position: "relative",
    overflow: "hidden",
  },
  headerCircle: {
    position: "absolute",
    top: verticalScale(-40),
    right: scale(-30),
    width: scale(160),
    height: scale(160),
    borderRadius: scale(80),
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: verticalScale(20),
  },
  iconButton: {
    padding: scale(8),
    borderRadius: scale(20),
    backgroundColor: "rgba(255, 255, 255, 0.15)",
  },
  headerTitle: {
    fontSize: moderateScale(30),
    fontWeight: "700",
    lineHeight: moderateScale(36),
  },
  headerSubtitle: {
    fontSize: moderateScale(14),
    marginTop: verticalScale(8),
    lineHeight: moderateScale(20),
  },
  form: {
    paddingHorizontal: scale(24),
    paddingTop: verticalScale(28),
    paddingBottom: verticalScale(32),
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FDE8E8",
    borderColor: "#F8B4B4",
    borderWidth: 1,
    padding: scale(12),
    borderRadius: scale(12),
    marginBottom: verticalScale(16),
  },
  errorText: {
    color: "#D9383A",
    fontSize: moderateScale(13),
    fontWeight: "500",
    flex: 1,
  },
  inputGroup: {
    marginBottom: verticalScale(24),
  },
  label: {
    fontSize: moderateScale(11),
    fontWeight: "700",
    letterSpacing: scale(1),
    marginBottom: verticalScale(12),
  },
  codeSlotsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
  },
  dashedSlot: {
    width: scale(46),
    height: verticalScale(56),
    borderRadius: scale(12),
    borderWidth: 1.5,
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
  },
  slotText: {
    fontSize: moderateScale(22),
    fontWeight: "700",
  },
  hiddenInput: {
    position: "absolute",
    width: 1,
    height: 1,
    opacity: 0,
  },
  input: {
    borderRadius: scale(14),
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(14),
    fontSize: moderateScale(15),
    borderWidth: 1,
  },
  passwordContainer: {
    position: "relative",
    justifyContent: "center",
  },
  passwordInput: {
    paddingRight: scale(48),
  },
  eyeIcon: {
    position: "absolute",
    right: scale(16),
  },
  actionButton: {
    borderRadius: scale(14),
    paddingVertical: verticalScale(16),
    alignItems: "center",
    marginTop: verticalScale(8),
    marginBottom: verticalScale(28),
  },
  buttonDisabled: { opacity: 0.7 },
  actionButtonText: {
    fontSize: moderateScale(16),
    fontWeight: "700",
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: scale(6),
  },
  footerText: { fontSize: moderateScale(14) },
  signInText: {
    fontSize: moderateScale(14),
    fontWeight: "700",
  },
});
