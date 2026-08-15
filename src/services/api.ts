import { getItem } from "@/utils/storage";
import axios, { AxiosInstance } from "axios";

const API_BASE_URL: string = process.env.EXPO_PUBLIC_API_URL || "";

const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 100000, // timeout in-seconds safeguard
});

// Interceptor: Runs before EVERY outgoing request
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

export default api;
