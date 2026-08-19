import { deleteItem, getItem, setItem } from "@/utils/storage";
import axios, { AxiosInstance, InternalAxiosRequestConfig } from "axios";

const API_BASE_URL: string = process.env.EXPO_PUBLIC_API_URL || "";

// Standard Axios instance for authenticated app requests
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 100000,
});

// Separate instance for refresh calls to avoid infinite interceptor loops
const refreshApi: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
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

// 1. Request Interceptor: Attach Current Access Token
api.interceptors.request.use(
  async (config) => {
    const token = await getItem("userToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// 2. Response Interceptor: Handle 401 & Refresh Logic
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // If request failed with 401 and hasn't been retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      // If a refresh is ALREADY in progress, queue this request
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

        // Call your backend refresh endpoint
        const response = await refreshApi.post("/api/v1/auth/refresh", {
          refreshToken: storedRefreshToken,
        });

        const { accessToken, refreshToken: newRefreshToken } = response.data;

        // Save new tokens to SecureStore
        await setItem("userToken", accessToken);
        if (newRefreshToken) {
          await setItem("refreshToken", newRefreshToken);
        }

        // Update default header and original request header
        api.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;

        // Retry queued requests
        processQueue(null, accessToken);

        // Retry current failed request
        return api(originalRequest);
      } catch (refreshError) {
        // If refresh fails, reject all queued requests and log the user out
        processQueue(refreshError, null);
        await deleteItem("userToken");
        await deleteItem("refreshToken");

        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

export default api;
