import api from "@/services/api";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors_sign_register } from "../constants/theme";
import { useAuth } from "./_layout";

export default function LoginScreen() {
  const router = useRouter();
  const { signIn } = useAuth();
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert("Missing Information", "Please fill in all fields.");
      return;
    }

    setLoading(true);
    setErrorMessage("");

    try {
      const response = await api.post("/api/v1/auth/login", {
        email: email.trim().toLowerCase(),
        password: password,
      });

      const { accessToken, token, refreshToken } = response.data;
      const jwtAccessToken = accessToken || token;

      if (jwtAccessToken && refreshToken) {
        await signIn(jwtAccessToken, refreshToken);
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
    <View style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent
      />
      <KeyboardAwareScrollView
        contentContainerStyle={[
          styles.scrollContainer,
          { paddingBottom: insets.bottom + 24 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid={true}
        extraScrollHeight={20}
      >
        <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
          <View style={styles.headerCircle} />
          <Text style={styles.headerTitle}>Welcome.{"\n"}</Text>
          <Text style={styles.headerSubtitle}>
            Sign in to your Ledger account
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
            <Text style={styles.label}>EMAIL</Text>
            <TextInput
              style={styles.input}
              value={email}
              placeholder="e.g. youremail@mail.com"
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!loading}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>PASSWORD</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                value={password}
                onChangeText={setPassword}
                placeholder="Password"
                secureTextEntry={!showPassword}
                editable={!loading}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                disabled={loading}
              >
                <Text style={styles.showText}>
                  {showPassword ? "hide" : "show"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity style={styles.forgotContainer} disabled={loading}>
            <Text style={styles.forgotText}>Forgot password?</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.signInButton, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors_sign_register.textLight} />
            ) : (
              <Text style={styles.signInButtonText}>Sign In</Text>
            )}
          </TouchableOpacity>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or continue with</Text>
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.socialRow}>
            <TouchableOpacity style={styles.socialButton} disabled={loading}>
              <Ionicons
                name="logo-google"
                size={18}
                color={colors_sign_register.textDark}
                style={styles.socialIcon}
              />
              <Text style={styles.socialButtonText}>Google</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.socialButton} disabled={loading}>
              <Ionicons
                name="logo-apple"
                size={20}
                color={colors_sign_register.textDark}
                style={styles.socialIcon}
              />
              <Text style={styles.socialButtonText}>Apple</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <TouchableOpacity
              onPress={() => router.push("/register")}
              disabled={loading}
            >
              <Text style={styles.signupText}>Sign up</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAwareScrollView>
    </View>
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
    paddingBottom: 40,
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
    marginBottom: 20,
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
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors_sign_register.cardBackground,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: colors_sign_register.inputBorder,
  },
  passwordInput: {
    flex: 1,
    fontSize: 15,
    color: colors_sign_register.textDark,
  },
  showText: {
    fontSize: 13,
    color: colors_sign_register.textMuted,
    fontWeight: "500",
  },
  forgotContainer: {
    alignSelf: "flex-end",
    marginBottom: 24,
  },
  forgotText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors_sign_register.accentOrange,
  },
  signInButton: {
    backgroundColor: colors_sign_register.primaryTeal,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 28,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  signInButtonText: {
    color: colors_sign_register.textLight,
    fontSize: 16,
    fontWeight: "700",
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors_sign_register.inputBorder,
  },
  dividerText: {
    fontSize: 12,
    color: colors_sign_register.textMuted,
    paddingHorizontal: 12,
  },
  socialRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 32,
  },
  socialButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors_sign_register.cardBackground,
    borderRadius: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: colors_sign_register.inputBorder,
  },
  socialIcon: {
    marginRight: 8,
  },
  socialButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: colors_sign_register.textDark,
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
  signupText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors_sign_register.accentOrange,
  },
});
