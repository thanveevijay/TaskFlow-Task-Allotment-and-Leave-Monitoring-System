import axios from "axios";
import { getAuthToken, clearAuthToken } from "../lib/authToken";
import { clearStoredUserProfile } from "../lib/userProfile";

const baseURL = (import.meta as any).env?.VITE_API_BASE_URL || "http://localhost:5000";

export function getApiBaseUrl(): string {
  return String(baseURL).replace(/\/$/, "");
}

export const api = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (config.data instanceof FormData) {
    delete (config.headers as Record<string, unknown>)["Content-Type"];
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = String(error.config?.url || "");
    if (error.response?.status === 401 && !url.includes("/auth/login")) {
      clearAuthToken();
      clearStoredUserProfile();
      localStorage.removeItem("accessRole");
      localStorage.removeItem("employeeId");
      if (typeof window !== "undefined" && window.location.pathname !== "/") {
        window.location.href = "/";
      }
    }
    return Promise.reject(error);
  }
);

