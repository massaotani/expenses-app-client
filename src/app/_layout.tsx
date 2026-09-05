import { ThemeProvider } from "@/constants/theme";
import api, { setOnTokenRefreshed, setOnUnauthenticated } from "@/services/api";
import "@/services/i18n";
import { deleteItem, getItem, setItem } from "@/utils/storage";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { Slot, useRouter, useSegments } from "expo-router";
import { createContext, useContext, useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { colors_sign_register } from "../constants/theme";

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

export const useAuth = () => useContext(AuthContext);

function InitialLayout() {
  const { token, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inTabsGroup = segments[0] === "(tabs)";

    if (token && !inTabsGroup) {
      router.replace("/(tabs)/overview");
    } else if (!token && inTabsGroup) {
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

  const signOut = async () => {
    delete api.defaults.headers.common["Authorization"];
    await deleteItem("userToken");
    await deleteItem("refreshToken");
    setToken(null);
  };

  const signIn = async (accessToken: string, refreshToken: string) => {
    api.defaults.headers.common["Authorization"] = `Bearer ${accessToken}`;
    await setItem("userToken", accessToken);
    await setItem("refreshToken", refreshToken);
    setToken(accessToken);
  };

  useEffect(() => {
    setOnUnauthenticated(() => {
      signOut();
    });

    setOnTokenRefreshed((newToken) => {
      setToken(newToken);
    });

    const checkToken = async () => {
      try {
        const storedToken = await getItem("userToken");
        if (storedToken) {
          api.defaults.headers.common["Authorization"] =
            `Bearer ${storedToken}`;
          setToken(storedToken);
        }
      } catch (error) {
        if (__DEV__) {
          console.error("Error reading auth token:", error);
        }
      } finally {
        setIsLoading(false);
      }
    };

    checkToken();
  }, []);

  return (
    <GestureHandlerRootView style={styles.container}>
      <ThemeProvider>
        <AuthContext.Provider value={{ token, isLoading, signIn, signOut }}>
          <BottomSheetModalProvider>
            <InitialLayout />
          </BottomSheetModalProvider>
        </AuthContext.Provider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors_sign_register.screenBackground || "#FFFFFF",
  },
});
