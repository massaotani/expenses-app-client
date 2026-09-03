import { useAuth } from "@/app/_layout";
import { moderateScale, scale, verticalScale } from "@/utils/scaling";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  colors_sign_register,
  dark_colors_sign_register,
  useAppTheme,
} from "../constants/theme";
import api from "../services/api";

export default function RegisterScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { signIn } = useAuth();
  const insets = useSafeAreaInsets();
  const { isDark } = useAppTheme();

  const themeColors = isDark ? dark_colors_sign_register : colors_sign_register;

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [monthlyIncome, setMonthlyIncome] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleRegister = async () => {
    if (!fullName.trim() || !email.trim() || !password || !confirmPassword) {
      Alert.alert(t("missingInformation"), t("fillAllFields"));
      return;
    }

    if (password.length < 8) {
      Alert.alert(t("weakPassword"), t("weakPasswordDesc"));
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert(t("passwordMismatch"), t("passwordsDoNotMatch"));
      return;
    }

    if (!agreeTerms) {
      Alert.alert(t("termsRequired"), t("agreeTermsToProceed"));
      return;
    }

    const cleanIncome = monthlyIncome.replace(",", ".");
    const parsedIncome = isNaN(parseFloat(cleanIncome))
      ? 0
      : parseFloat(cleanIncome);

    setLoading(true);
    setErrorMessage("");

    try {
      const response = await api.post("/api/v1/auth/register", {
        name: fullName.trim(),
        email: email.trim().toLowerCase(),
        password: password,
        monthlyIncome: parsedIncome,
        accountRole: "NORMAL",
      });

      const accessToken = response.data.accessToken || response.data.token;
      const refreshToken = response.data.refreshToken;

      if (accessToken && refreshToken) {
        await signIn(accessToken, refreshToken);
      } else {
        setErrorMessage("Invalid server response. Missing security tokens.");
      }
    } catch (error: any) {
      let backendMessage = "Registration failed. Please check your inputs.";

      if (error.response?.data) {
        const data = error.response.data;
        if (typeof data === "string") {
          backendMessage = data;
        } else if (data.message) {
          backendMessage = data.message;
        } else if (data.errors && Array.isArray(data.errors)) {
          backendMessage = data.errors
            .map((e: any) => e.defaultMessage || e.message)
            .join(", ");
        }
      }

      setErrorMessage(backendMessage);
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

        <View
          style={[
            styles.header,
            {
              paddingTop: insets.top + verticalScale(16),
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
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            disabled={loading}
          >
            <Ionicons
              name="arrow-back"
              size={moderateScale(16)}
              color={themeColors.textLight}
            />
            <Text
              style={[styles.backButtonText, { color: themeColors.textLight }]}
            >
              {t("back")}
            </Text>
          </TouchableOpacity>

          <Text style={[styles.headerTitle, { color: themeColors.textLight }]}>
            {t("createYourAccount")}
          </Text>
          <Text
            style={[
              styles.headerSubtitle,
              { color: themeColors.textLightMuted },
            ]}
          >
            {t("startTrackingExpenses")}
          </Text>
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
        >
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={[
              styles.scrollContainer,
              { paddingBottom: insets.bottom + verticalScale(40) },
            ]}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            scrollEventThrottle={16}
            nestedScrollEnabled={true}
            canCancelContentTouches={true}
            showsVerticalScrollIndicator={false}
          >
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
                  {t("fullName")}
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
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder={t("fullNamePlaceholder")}
                  placeholderTextColor={themeColors.textMuted}
                  editable={!loading}
                />
              </View>

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
                  onChangeText={setEmail}
                  placeholder={t("emailPlaceholder")}
                  placeholderTextColor={themeColors.textMuted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  editable={!loading}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: themeColors.textMuted }]}>
                  {t("monthlyIncomeLabel")}
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
                  value={monthlyIncome}
                  onChangeText={(text) =>
                    setMonthlyIncome(
                      text.replace(/\./g, ",").replace(/(,\d{2})\d+$/, "$1"),
                    )
                  }
                  placeholder={t("incomePlaceholder")}
                  placeholderTextColor={themeColors.textMuted}
                  keyboardType="decimal-pad"
                  editable={!loading}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: themeColors.textMuted }]}>
                  {t("passwordLabel")}
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
                      },
                    ]}
                    value={password}
                    onChangeText={setPassword}
                    placeholder={t("passwordPlaceholder")}
                    placeholderTextColor={themeColors.textMuted}
                    secureTextEntry={!showPassword}
                    editable={!loading}
                  />
                  <TouchableOpacity
                    style={styles.showButton}
                    onPress={() => setShowPassword(!showPassword)}
                    disabled={loading}
                  >
                    <Text
                      style={[
                        styles.showText,
                        { color: themeColors.textMuted },
                      ]}
                    >
                      {showPassword ? t("hide") : t("show")}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: themeColors.textMuted }]}>
                  {t("confirmPasswordLabel")}
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
                      },
                    ]}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder={t("confirmPasswordPlaceholder")}
                    placeholderTextColor={themeColors.textMuted}
                    secureTextEntry={!showConfirmPassword}
                    editable={!loading}
                  />
                  <TouchableOpacity
                    style={styles.showButton}
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    disabled={loading}
                  >
                    <Text
                      style={[
                        styles.showText,
                        { color: themeColors.textMuted },
                      ]}
                    >
                      {showConfirmPassword ? t("hide") : t("show")}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity
                style={styles.checkboxContainer}
                onPress={() => setAgreeTerms(!agreeTerms)}
                activeOpacity={0.8}
                disabled={loading}
              >
                <View
                  style={[
                    styles.checkbox,
                    {
                      borderColor: themeColors.inputBorder,
                      backgroundColor: themeColors.cardBackground,
                    },
                    agreeTerms && {
                      backgroundColor: themeColors.primaryTeal,
                      borderColor: themeColors.primaryTeal,
                    },
                  ]}
                >
                  {agreeTerms && (
                    <Ionicons
                      name="checkmark"
                      size={moderateScale(12)}
                      color={themeColors.textLight}
                    />
                  )}
                </View>
                <Text
                  style={[styles.checkboxText, { color: themeColors.textDark }]}
                >
                  {t("agreeTo")}
                  <Text
                    style={[
                      styles.linkText,
                      { color: themeColors.accentOrange },
                    ]}
                  >
                    {t("termsOfService")}
                  </Text>
                  {t("and")}
                  <Text
                    style={[
                      styles.linkText,
                      { color: themeColors.accentOrange },
                    ]}
                  >
                    {t("privacyPolicy")}
                  </Text>
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.createButton,
                  {
                    backgroundColor:
                      agreeTerms && !loading
                        ? themeColors.primaryTeal
                        : themeColors.buttonDisabled,
                  },
                ]}
                disabled={!agreeTerms || loading}
                onPress={handleRegister}
              >
                {loading ? (
                  <ActivityIndicator color={themeColors.textLight} />
                ) : (
                  <Text
                    style={[
                      styles.createButtonText,
                      {
                        color: agreeTerms
                          ? themeColors.textLight
                          : themeColors.textDisabled,
                      },
                    ]}
                  >
                    {t("createAccount")}
                  </Text>
                )}
              </TouchableOpacity>

              <View style={styles.footerRow}>
                <Text
                  style={[styles.footerText, { color: themeColors.textMuted }]}
                >
                  {t("alreadyHaveAccount")}
                </Text>
                <TouchableOpacity
                  onPress={() => router.back()}
                  disabled={loading}
                >
                  <Text
                    style={[
                      styles.signinText,
                      { color: themeColors.accentOrange },
                    ]}
                  >
                    {t("signIn")}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
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
    paddingBottom: verticalScale(36),
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
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.18)",
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(8),
    borderRadius: scale(10),
    alignSelf: "flex-start",
    marginBottom: verticalScale(24),
  },
  backButtonText: {
    fontSize: moderateScale(13),
    fontWeight: "600",
    marginLeft: scale(4),
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
    marginBottom: verticalScale(18),
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
    position: "relative",
    justifyContent: "center",
  },
  passwordInput: {
    paddingRight: scale(60),
  },
  showButton: {
    position: "absolute",
    right: scale(16),
    height: "100%",
    justifyContent: "center",
  },
  showText: {
    fontSize: moderateScale(13),
    fontWeight: "600",
  },
  checkboxContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: verticalScale(6),
    marginBottom: verticalScale(28),
  },
  checkbox: {
    width: scale(20),
    height: scale(20),
    borderRadius: scale(6),
    borderWidth: 1.5,
    justifyContent: "center",
    alignItems: "center",
    marginRight: scale(10),
  },
  checkboxText: {
    fontSize: moderateScale(13),
    flex: 1,
  },
  linkText: {
    fontWeight: "700",
  },
  createButton: {
    borderRadius: scale(14),
    paddingVertical: verticalScale(16),
    alignItems: "center",
    marginBottom: verticalScale(24),
  },
  createButtonText: {
    fontSize: moderateScale(16),
    fontWeight: "700",
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  footerText: {
    fontSize: moderateScale(14),
  },
  signinText: {
    fontSize: moderateScale(14),
    fontWeight: "700",
  },
});
