import {
  colors_sign_register,
  dark_colors_sign_register,
  useAppTheme,
} from "@/constants/theme";
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

export default function ForgotPasswordScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDark } = useAppTheme();

  const themeColors = isDark ? dark_colors_sign_register : colors_sign_register;

  const [email, setEmail] = useState("");
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

  const handleSendReset = async () => {
    if (!email.trim()) {
      Alert.alert(t("missingInformation"), t("fillAllFields"));
      return;
    }

    setLoading(true);
    setErrorMessage("");

    const formattedEmail = email.trim().toLowerCase();

    try {
      await api.post("/api/v1/auth/forgot-password", {
        email: formattedEmail,
      });

      Alert.alert(t("success"), t("resetCodeSent"), [
        {
          text: t("ok"),
          onPress: () =>
            router.push({
              pathname: "/resetpassword",
              params: { email: formattedEmail },
            }),
        },
      ]);
    } catch (error: any) {
      setErrorMessage(error.response?.data?.message || t("genericError"));
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

            {/* Top Navigation Row: Back Button */}
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
              {t("forgotPassword")}
            </Text>
            <Text
              style={[
                styles.headerSubtitle,
                { color: themeColors.textLightMuted },
              ]}
            >
              {t("forgotPasswordSubtitle")}
            </Text>
          </View>

          {/* Form */}
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

            <TouchableOpacity
              style={[
                styles.actionButton,
                { backgroundColor: themeColors.primaryTeal },
                loading && styles.buttonDisabled,
              ]}
              onPress={handleSendReset}
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
                  {t("sendResetCode")}
                </Text>
              )}
            </TouchableOpacity>

            {/* Back to Sign In Link */}
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
    marginBottom: verticalScale(8),
  },
  input: {
    borderRadius: scale(14),
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(14),
    fontSize: moderateScale(15),
    borderWidth: 1,
    letterSpacing: 0,
  },
  actionButton: {
    borderRadius: scale(14),
    paddingVertical: verticalScale(16),
    alignItems: "center",
    marginBottom: verticalScale(28),
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  actionButtonText: {
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
  signInText: {
    fontSize: moderateScale(14),
    fontWeight: "700",
  },
});
