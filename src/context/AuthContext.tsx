import { deleteItem, getItem, setItem } from "@/utils/storage";
import { createContext, useContext, useEffect, useState } from "react";
import api, { setOnUnauthenticated } from "../services/api";

interface AuthContextType {
  token: string | null;
  isLoading: boolean;
  signIn: (newToken: string, newRefreshToken: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  token: null,
  isLoading: true,
  signIn: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const signOut = async () => {
    delete api.defaults.headers.common["Authorization"];
    await deleteItem("userToken");
    await deleteItem("refreshToken");
    setToken(null);
  };

  const signIn = async (newToken: string, newRefreshToken: string) => {
    // Synchronously set header on Axios instance to beat storage race conditions
    api.defaults.headers.common["Authorization"] = `Bearer ${newToken}`;
    await setItem("userToken", newToken);
    await setItem("refreshToken", newRefreshToken);
    setToken(newToken);
  };

  useEffect(() => {
    setOnUnauthenticated(() => {
      signOut();
    });

    const loadStoredToken = async () => {
      try {
        const storedToken = await getItem("userToken");
        if (storedToken) {
          api.defaults.headers.common["Authorization"] =
            `Bearer ${storedToken}`;
          setToken(storedToken);
        }
      } catch (e) {
        console.error("Failed to load token:", e);
      } finally {
        setIsLoading(false);
      }
    };

    loadStoredToken();
  }, []);

  return (
    <AuthContext.Provider value={{ token, isLoading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
