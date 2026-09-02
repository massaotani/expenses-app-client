import { deleteItem, getItem, setItem } from "@/utils/storage";
import axios, { AxiosInstance, InternalAxiosRequestConfig } from "axios";
import { Platform } from "react-native";

const DEV_FALLBACK =
  Platform.OS === "android" ? "http://10.0.2.2:8080" : "http://localhost:8080";

const API_BASE_URL: string = process.env.EXPO_PUBLIC_API_URL || DEV_FALLBACK;

let onUnauthenticatedCallback: (() => void) | null = null;

export const setOnUnauthenticated = (callback: () => void) => {
  onUnauthenticatedCallback = callback;
};

// 1. ADD DECLARATION AND SETTER HERE:
let onTokenRefreshedCallback: ((newToken: string) => void) | null = null;

export const setOnTokenRefreshed = (callback: (newToken: string) => void) => {
  onTokenRefreshedCallback = callback;
};

const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 45000,
});

const refreshApi: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 45000,
});

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((promise) => {
    if (error) {
      promise.reject(error);
    } else if (token) {
      promise.resolve(token);
    }
  });
  failedQueue = [];
};

// Request Interceptor: Ensure token presence before sending
api.interceptors.request.use(
  async (config) => {
    if (!config.headers.has("Authorization")) {
      const token = await getItem("userToken");
      if (token) {
        config.headers.set("Authorization", `Bearer ${token}`);
      }
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Response Interceptor
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    if (!originalRequest) {
      return Promise.reject(error);
    }

    const isLoginOrRegister =
      originalRequest.url?.includes("/api/v1/auth/login") ||
      originalRequest.url?.includes("/api/v1/auth/register") ||
      originalRequest.url?.includes("/api/v1/auth/refresh");

    const isAuthError =
      error.response?.status === 401 || error.response?.status === 403;

    if (isAuthError && !originalRequest._retry && !isLoginOrRegister) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((newToken) => {
            originalRequest.headers.set("Authorization", `Bearer ${newToken}`);
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const storedRefreshToken = await getItem("refreshToken");

        if (!storedRefreshToken) {
          throw new Error("No refresh token found in storage");
        }

        const response = await refreshApi.post("/api/v1/auth/refresh", {
          refreshToken: storedRefreshToken,
        });

        const accessToken = response.data.token || response.data.accessToken;
        const newRefreshToken = response.data.refreshToken;

        if (!accessToken) {
          throw new Error(
            "Invalid access token returned from refresh endpoint",
          );
        }

        if (newRefreshToken) {
          await setItem("refreshToken", newRefreshToken);
        }

        await setItem("userToken", accessToken);

        api.defaults.headers.common["Authorization"] = `Bearer ${accessToken}`;
        originalRequest.headers.set("Authorization", `Bearer ${accessToken}`);

        // 2. ADD TRIGGER HERE (Right after updating headers and before processing the queue):
        if (onTokenRefreshedCallback) {
          onTokenRefreshedCallback(accessToken);
        }

        processQueue(null, accessToken);
        return api(originalRequest);
      } catch (refreshError: any) {
        processQueue(refreshError, null);

        await deleteItem("userToken");
        await deleteItem("refreshToken");
        delete api.defaults.headers.common["Authorization"];

        if (onUnauthenticatedCallback) {
          onUnauthenticatedCallback();
        }

        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

export default api;
