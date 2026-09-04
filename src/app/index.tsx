import api from "@/services/api";
import { moderateScale, scale, verticalScale } from "@/utils/scaling";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  Keyboard,
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
import {
  colors_sign_register,
  dark_colors_sign_register,
  useAppTheme,
} from "../constants/theme";
import { useAuth } from "./_layout";

export default function LoginScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { signIn } = useAuth();
  const insets = useSafeAreaInsets();
  const { isDark, toggleTheme } = useAppTheme();

  const themeColors = isDark ? dark_colors_sign_register : colors_sign_register;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

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

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert(t("missingInformation"), t("fillAllFields"));
      return;
    }

    setLoading(true);
    setErrorMessage("");

    try {
      const response = await api.post("/api/v1/auth/login", {
        email: email.trim().toLowerCase(),
        password: password,
      });

      const { token, accessToken, refreshToken } = response.data;
      const jwtToken = token || accessToken;

      if (jwtToken && refreshToken) {
        await signIn(jwtToken, refreshToken);
      } else {
        setErrorMessage("Invalid server response. Missing security tokens.");
      }
    } catch (error: any) {
      console.error("Login failed:", error);

      let userFriendlyMessage =
        "Unable to connect to server. Please try again.";

      if (error.code === "ECONNABORTED" || error.message?.includes("timeout")) {
        userFriendlyMessage =
          "Waking up the server. Please try again in a few seconds!";
      } else if (error.response?.data?.message) {
        userFriendlyMessage = error.response.data.message;
      }

      setErrorMessage(
        typeof userFriendlyMessage === "string"
          ? userFriendlyMessage
          : "Login failed.",
      );
    } finally {
      setLoading(false);
    }
  };

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
          showsHorizontalScrollIndicator={false}
          enableOnAndroid
          extraScrollHeight={verticalScale(20)}
          contentContainerStyle={[
            styles.scrollContainer,
            { paddingBottom: insets.bottom + verticalScale(24) },
          ]}
        >
          <View
            style={[
              styles.header,
              {
                paddingTop: insets.top + verticalScale(20),
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
            {/* Theme Toggle Button */}
            <TouchableOpacity
              style={styles.themeToggle}
              onPress={toggleTheme}
              accessibilityLabel="Toggle Theme"
            >
              <Ionicons
                name={isDark ? "sunny-outline" : "moon-outline"}
                size={moderateScale(22)}
                color={themeColors.textLight}
              />
            </TouchableOpacity>
            <Text
              style={[styles.headerTitle, { color: themeColors.textLight }]}
            >
              {t("welcome")}
            </Text>
            <Text
              style={[
                styles.headerSubtitle,
                { color: themeColors.textLightMuted },
              ]}
            >
              {t("signInToAccount")}
            </Text>
          </View>

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

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: themeColors.textMuted }]}>
                {t("emailLabel")}
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: themeColors.cardBackground,
                    borderColor: themeColors.inputBorder,
                    color: themeColors.textDark,
                  },
                ]}
                value={email}
                placeholder={t("emailPlaceholder")}
                placeholderTextColor={themeColors.textMuted}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!loading}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: themeColors.textMuted }]}>
                {t("passwordLabel")}
              </Text>
              <View
                style={[
                  styles.passwordContainer,
                  {
                    backgroundColor: themeColors.cardBackground,
                    borderColor: themeColors.inputBorder,
                  },
                ]}
              >
                <TextInput
                  style={[
                    styles.passwordInput,
                    { color: themeColors.textDark },
                  ]}
                  value={password}
                  onChangeText={setPassword}
                  placeholder={t("loginPasswordPlaceholder")}
                  placeholderTextColor={themeColors.textMuted}
                  secureTextEntry={!showPassword}
                  editable={!loading}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  disabled={loading}
                >
                  <Text
                    style={[styles.showText, { color: themeColors.textMuted }]}
                  >
                    {showPassword ? t("hide") : t("show")}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity style={styles.forgotContainer} disabled={loading}>
              <Text
                style={[styles.forgotText, { color: themeColors.accentOrange }]}
              >
                {t("forgotPassword")}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.signInButton,
                { backgroundColor: themeColors.primaryTeal },
                loading && styles.buttonDisabled,
              ]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={themeColors.textLight} />
              ) : (
                <Text
                  style={[
                    styles.signInButtonText,
                    { color: themeColors.textLight },
                  ]}
                >
                  {t("signIn")}
                </Text>
              )}
            </TouchableOpacity>

            <View style={styles.dividerRow}>
              <View
                style={[
                  styles.dividerLine,
                  { backgroundColor: themeColors.inputBorder },
                ]}
              />
              <Text
                style={[styles.dividerText, { color: themeColors.textMuted }]}
              >
                {t("orContinueWith")}
              </Text>
              <View
                style={[
                  styles.dividerLine,
                  { backgroundColor: themeColors.inputBorder },
                ]}
              />
            </View>

            <View style={styles.socialRow}>
              <TouchableOpacity
                style={[
                  styles.socialButton,
                  {
                    backgroundColor: themeColors.cardBackground,
                    borderColor: themeColors.inputBorder,
                  },
                ]}
                disabled={loading}
              >
                <Ionicons
                  name="logo-google"
                  size={moderateScale(18)}
                  color={themeColors.textDark}
                  style={styles.socialIcon}
                />
                <Text
                  style={[
                    styles.socialButtonText,
                    { color: themeColors.textDark },
                  ]}
                >
                  Google
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.socialButton,
                  {
                    backgroundColor: themeColors.cardBackground,
                    borderColor: themeColors.inputBorder,
                  },
                ]}
                disabled={loading}
              >
                <Ionicons
                  name="logo-apple"
                  size={moderateScale(20)}
                  color={themeColors.textDark}
                  style={styles.socialIcon}
                />
                <Text
                  style={[
                    styles.socialButtonText,
                    { color: themeColors.textDark },
                  ]}
                >
                  Apple
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.footerRow}>
              <Text
                style={[styles.footerText, { color: themeColors.textMuted }]}
              >
                {t("dontHaveAccount")}
              </Text>
              <TouchableOpacity
                onPress={() => router.push("/register")}
                disabled={loading}
              >
                <Text
                  style={[
                    styles.signupText,
                    { color: themeColors.accentOrange },
                  ]}
                >
                  {t("signUp")}
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
  container: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
  },
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
  themeToggle: {
    alignSelf: "flex-end",
    padding: scale(8),
    borderRadius: scale(20),
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    marginBottom: verticalScale(12),
  },
  headerTitle: {
    fontSize: moderateScale(34),
    fontWeight: "700",
    lineHeight: moderateScale(40),
  },
  headerSubtitle: {
    fontSize: moderateScale(14),
    marginTop: verticalScale(8),
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
    marginBottom: verticalScale(20),
  },
  label: {
    fontSize: moderateScale(11),
    fontWeight: "700",
    letterSpacing: scale(1),
    marginBottom: verticalScale(8),
  },
  input: {
    borderRadius: scale(14),
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(14),
    fontSize: moderateScale(15),
    borderWidth: 1,
  },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: scale(14),
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(14),
    borderWidth: 1,
  },
  passwordInput: {
    flex: 1,
    fontSize: moderateScale(15),
  },
  showText: {
    fontSize: moderateScale(13),
    fontWeight: "500",
  },
  forgotContainer: {
    alignSelf: "flex-end",
    marginBottom: verticalScale(24),
  },
  forgotText: {
    fontSize: moderateScale(13),
    fontWeight: "600",
  },
  signInButton: {
    borderRadius: scale(14),
    paddingVertical: verticalScale(16),
    alignItems: "center",
    marginBottom: verticalScale(28),
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  signInButtonText: {
    fontSize: moderateScale(16),
    fontWeight: "700",
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: verticalScale(24),
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: moderateScale(12),
    paddingHorizontal: scale(12),
  },
  socialRow: {
    flexDirection: "row",
    gap: scale(12),
    marginBottom: verticalScale(32),
  },
  socialButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: scale(14),
    paddingVertical: verticalScale(14),
    borderWidth: 1,
  },
  socialIcon: {
    marginRight: scale(8),
  },
  socialButtonText: {
    fontSize: moderateScale(15),
    fontWeight: "600",
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  footerText: {
    fontSize: moderateScale(14),
  },
  signupText: {
    fontSize: moderateScale(14),
    fontWeight: "700",
  },
});
