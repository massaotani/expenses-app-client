import { deleteItem, getItem, setItem } from "@/utils/storage";
import { createContext, useContext, useEffect, useState } from "react";

interface AuthContextType {
  token: string | null;
  isLoading: boolean;
  signIn: (newToken: string) => Promise<void>;
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

  useEffect(() => {
    const loadStoredToken = async () => {
      try {
        const storedToken = await getItem("userToken");
        setToken(storedToken);
      } catch (e) {
        console.error("Failed to load token:", e);
      } finally {
        setIsLoading(false);
      }
    };
    loadStoredToken();
  }, []);

  const signIn = async (newToken: string) => {
    await setItem("userToken", newToken);
    setToken(newToken); // ⚡ Updates state globally so RootLayout sees it immediately
  };

  const signOut = async () => {
    await deleteItem("userToken");
    setToken(null);
  };

  return (
    <AuthContext.Provider value={{ token, isLoading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
