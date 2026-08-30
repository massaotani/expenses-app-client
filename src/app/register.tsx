import { useAuth } from "@/app/_layout";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
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
import { colors_sign_register } from "../constants/theme";
import api from "../services/api";

export default function RegisterScreen() {
  const router = useRouter();
  const { signIn } = useAuth();
  const insets = useSafeAreaInsets();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleRegister = async () => {
    if (!fullName.trim() || !email.trim() || !password || !confirmPassword) {
      Alert.alert("Missing Information", "Please fill in all fields.");
      return;
    }

    if (password.length < 8) {
      Alert.alert(
        "Weak Password",
        "Password must be at least 8 characters long.",
      );
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert(
        "Password Mismatch",
        "Passwords do not match. Please verify and try again.",
      );
      return;
    }

    if (!agreeTerms) {
      Alert.alert(
        "Terms Required",
        "Please agree to the Terms of Service to proceed.",
      );
      return;
    }

    setLoading(true);
    setErrorMessage("");
    try {
      const response = await api.post("/api/v1/auth/register", {
        name: fullName.trim(),
        email: email.trim().toLowerCase(),
        password: password,
        monthlyIncome: 0,
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
      console.log(
        "FULL SPRING RESPONSE:",
        JSON.stringify(error.response?.data, null, 2),
      );

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
      <View style={styles.container}>
        <StatusBar
          barStyle="light-content"
          backgroundColor="transparent"
          translucent
        />
        <KeyboardAwareScrollView
          contentContainerStyle={[
            styles.scrollContainer,
            { paddingBottom: insets.bottom + 40 },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          enableOnAndroid={true}
          extraScrollHeight={20}
        >
          <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
            <View style={styles.headerCircle} />

            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
              disabled={loading}
            >
              <Ionicons
                name="arrow-back"
                size={16}
                color={colors_sign_register.textLight}
              />
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>

            <Text style={styles.headerTitle}>Create your{"\n"}account.</Text>
            <Text style={styles.headerSubtitle}>
              Start tracking your expenses today
            </Text>
          </View>

          <View style={styles.form}>
            {errorMessage !== "" && (
              <View style={styles.errorContainer}>
                <Ionicons
                  name="alert-circle"
                  size={18}
                  color="#D9383A"
                  style={{ marginRight: 6 }}
                />
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>FULL NAME</Text>
              <TextInput
                style={styles.input}
                value={fullName}
                onChangeText={setFullName}
                placeholder="e.g. Massao Tani"
                placeholderTextColor={colors_sign_register.textMuted}
                editable={!loading}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>EMAIL</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="e.g. massao@gmail.com"
                placeholderTextColor={colors_sign_register.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!loading}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>PASSWORD</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={[styles.input, styles.passwordInput]}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Min. 8 characters"
                  placeholderTextColor={colors_sign_register.textMuted}
                  secureTextEntry={!showPassword}
                  editable={!loading}
                />
                <TouchableOpacity
                  style={styles.showButton}
                  onPress={() => setShowPassword(!showPassword)}
                  disabled={loading}
                >
                  <Text style={styles.showText}>
                    {showPassword ? "hide" : "show"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>CONFIRM PASSWORD</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={[styles.input, styles.passwordInput]}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Repeat your password"
                  placeholderTextColor={colors_sign_register.textMuted}
                  secureTextEntry={!showConfirmPassword}
                  editable={!loading}
                />
                <TouchableOpacity
                  style={styles.showButton}
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={loading}
                >
                  <Text style={styles.showText}>
                    {showConfirmPassword ? "hide" : "show"}
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
                style={[styles.checkbox, agreeTerms && styles.checkboxChecked]}
              >
                {agreeTerms && (
                  <Ionicons
                    name="checkmark"
                    size={12}
                    color={colors_sign_register.textLight}
                  />
                )}
              </View>
              <Text style={styles.checkboxText}>
                I agree to the{" "}
                <Text style={styles.linkText}>Terms of Service</Text> and{" "}
                <Text style={styles.linkText}>Privacy Policy</Text>
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.createButton,
                agreeTerms && !loading
                  ? styles.createButtonActive
                  : styles.createButtonDisabled,
              ]}
              disabled={!agreeTerms || loading}
              onPress={handleRegister}
            >
              {loading ? (
                <ActivityIndicator color={colors_sign_register.textLight} />
              ) : (
                <Text
                  style={[
                    styles.createButtonText,
                    agreeTerms
                      ? styles.createButtonTextActive
                      : styles.createButtonTextDisabled,
                  ]}
                >
                  Create Account
                </Text>
              )}
            </TouchableOpacity>

            <View style={styles.footerRow}>
              <Text style={styles.footerText}>Already have an account? </Text>
              <TouchableOpacity
                onPress={() => router.back()}
                disabled={loading}
              >
                <Text style={styles.signinText}>Sign in</Text>
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
    backgroundColor: colors_sign_register.screenBackground,
  },
  scrollContainer: {
    flexGrow: 1,
  },
  header: {
    backgroundColor: colors_sign_register.headerBackground,
    paddingHorizontal: 28,
    paddingBottom: 36,
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
    position: "relative",
    overflow: "hidden",
  },
  headerCircle: {
    position: "absolute",
    top: -40,
    right: -30,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: colors_sign_register.headerCircleOverlay,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.18)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    alignSelf: "flex-start",
    marginBottom: 24,
  },
  backButtonText: {
    color: colors_sign_register.textLight,
    fontSize: 13,
    fontWeight: "600",
    marginLeft: 4,
  },
  headerTitle: {
    fontSize: 34,
    fontWeight: "700",
    color: colors_sign_register.textLight,
    lineHeight: 40,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors_sign_register.textLightMuted,
    marginTop: 8,
  },
  form: {
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 32,
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FDE8E8",
    borderColor: "#F8B4B4",
    borderWidth: 1,
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  errorText: {
    color: "#D9383A",
    fontSize: 13,
    fontWeight: "500",
    flex: 1,
  },
  inputGroup: {
    marginBottom: 18,
  },
  label: {
    fontSize: 11,
    fontWeight: "700",
    color: colors_sign_register.textMuted,
    letterSpacing: 1,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors_sign_register.cardBackground,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: colors_sign_register.textDark,
    borderWidth: 1,
    borderColor: colors_sign_register.inputBorder,
  },
  passwordContainer: {
    position: "relative",
    justifyContent: "center",
  },
  passwordInput: {
    paddingRight: 60,
  },
  showButton: {
    position: "absolute",
    right: 16,
    height: "100%",
    justifyContent: "center",
  },
  showText: {
    fontSize: 13,
    color: colors_sign_register.textMuted,
    fontWeight: "600",
  },
  checkboxContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    marginBottom: 28,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors_sign_register.inputBorder,
    backgroundColor: colors_sign_register.cardBackground,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  checkboxChecked: {
    backgroundColor: colors_sign_register.primaryTeal,
    borderColor: colors_sign_register.primaryTeal,
  },
  checkboxText: {
    fontSize: 13,
    color: colors_sign_register.textDark,
    flex: 1,
  },
  linkText: {
    fontWeight: "700",
    color: colors_sign_register.accentOrange,
  },
  createButton: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 24,
  },
  createButtonDisabled: {
    backgroundColor: colors_sign_register.buttonDisabled,
  },
  createButtonActive: {
    backgroundColor: colors_sign_register.primaryTeal,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: "700",
  },
  createButtonTextDisabled: {
    color: colors_sign_register.textDisabled,
  },
  createButtonTextActive: {
    color: colors_sign_register.textLight,
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  footerText: {
    fontSize: 14,
    color: colors_sign_register.textMuted,
  },
  signinText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors_sign_register.accentOrange,
  },
});
