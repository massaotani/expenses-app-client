import { deleteItem, getItem, setItem } from "@/utils/storage";
import { Slot, useRouter, useSegments } from "expo-router";
import { createContext, useContext, useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { colors_sign_register } from "../constants/theme";

// Auth Context Type Definition
type AuthContextType = {
  token: string | null;
  isLoading: boolean;
  signIn: (accessToken: string, refreshToken: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  token: null,
  isLoading: true,
  signIn: async () => {},
  signOut: async () => {},
});

// Custom hook to use Auth Context
export const useAuth = () => useContext(AuthContext);

function InitialLayout() {
  const { token, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inTabsGroup = segments[0] === "(tabs)";

    if (token && !inTabsGroup) {
      // User is authenticated -> redirect to main tabs
      router.replace("/(tabs)/overview");
    } else if (!token && inTabsGroup) {
      // User is unauthenticated -> redirect to login screen
      router.replace("/");
    }
  }, [token, isLoading, segments]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator
          size="large"
          color={colors_sign_register.primaryTeal || "#008080"}
        />
      </View>
    );
  }

  return <Slot />;
}

export default function RootLayout() {
  const [isLoading, setIsLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const checkToken = async () => {
      try {
        const storedToken = await getItem("userToken");
        setToken(storedToken);
      } catch (error) {
        console.error("Error reading auth token:", error);
      } finally {
        setIsLoading(false);
      }
    };

    checkToken();
  }, []);

  const signIn = async (accessToken: string, refreshToken: string) => {
    await setItem("userToken", accessToken);
    await setItem("refreshToken", refreshToken);
    setToken(accessToken);
  };

  const signOut = async () => {
    await deleteItem("userToken");
    setToken(null);
  };

  return (
    <AuthContext.Provider value={{ token, isLoading, signIn, signOut }}>
      <InitialLayout />
    </AuthContext.Provider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors_sign_register.screenBackground || "#FFFFFF",
  },
});
