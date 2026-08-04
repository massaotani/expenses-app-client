import axios, { AxiosInstance } from 'axios';

const API_BASE_URL: string = process.env.EXPO_PUBLIC_API_URL;

const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10-second timeout safeguard
});

export default api;