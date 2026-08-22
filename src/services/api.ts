import { deleteItem, getItem, setItem } from "@/utils/storage";
import axios, { AxiosInstance, InternalAxiosRequestConfig } from "axios";
import { Platform } from "react-native";

// 1. Read EXPO_PUBLIC_API_URL from .env with fallback for local testing
const DEV_FALLBACK =
  Platform.OS === "android" ? "http://10.0.2.2:8080" : "http://localhost:8080";

const API_BASE_URL: string = process.env.EXPO_PUBLIC_API_URL || DEV_FALLBACK;

let onUnauthenticatedCallback: (() => void) | null = null;

export const setOnUnauthenticated = (callback: () => void) => {
  onUnauthenticatedCallback = callback;
};

// 2. Render instances spin down after inactivity; 45,000ms prevents
// premature client timeouts during initial cold start wake-ups.
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

// 3. Request Interceptor: Attach token if missing from headers
api.interceptors.request.use(
  async (config) => {
    if (!config.headers.Authorization) {
      const token = await getItem("userToken");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// 4. Response Interceptor: Manage 401 & token refreshes
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // Ignore 401 handling for /auth routes (login, register, refresh)
    const isAuthEndpoint = originalRequest.url?.includes("/api/v1/auth/");

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !isAuthEndpoint
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((newToken) => {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const storedRefreshToken = await getItem("refreshToken");

        if (!storedRefreshToken) {
          throw new Error("No refresh token found");
        }

        const response = await refreshApi.post("/api/v1/auth/refresh", {
          refreshToken: storedRefreshToken,
        });

        const accessToken = response.data.accessToken || response.data.token;
        const newRefreshToken = response.data.refreshToken;

        if (!accessToken) {
          throw new Error("Invalid token received from refresh endpoint");
        }

        await setItem("userToken", accessToken);
        if (newRefreshToken) {
          await setItem("refreshToken", newRefreshToken);
        }

        api.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;

        processQueue(null, accessToken);
        return api(originalRequest);
      } catch (refreshError) {
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
