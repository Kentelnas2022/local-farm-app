import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as Device from "expo-device";
import { Platform } from "react-native";

function getDynamicHost(): string {
  // 1. Explicit environment variable configured in Vercel or .env (e.g. EXPO_PUBLIC_API_URL)
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envUrl) {
    return envUrl.endsWith("/api")
      ? envUrl
      : `${envUrl.replace(/\/+$/, "")}/api`;
  }

  // 2. Web browser environment
  if (Platform.OS === "web") {
    if (typeof window !== "undefined" && window.location) {
      const { hostname, origin } = window.location;
      // In production deployment on Vercel or custom domain, route to the deployment origin /api
      if (hostname && hostname !== "localhost" && hostname !== "127.0.0.1") {
        return `${origin}/api`;
      }
    }
    return "http://localhost:5000/api";
  }

  // 3. In Expo Go or Dev Client, Constants provides the IP of the machine running Metro
  const metroHost =
    Constants.expoConfig?.hostUri?.split(":")[0] ||
    (Constants as any).manifest2?.extra?.expoGo?.debuggerHost?.split(":")[0] ||
    (Constants as any).manifest?.debuggerHost?.split(":")[0];

  if (metroHost && metroHost !== "localhost" && metroHost !== "127.0.0.1") {
    return `http://${metroHost}:5000/api`;
  }

  // 4. Physical mobile device fallback
  if (Device.isDevice) {
    return "http://192.168.110.229:5000/api";
  }

  // 5. Android emulator loopback alias
  if (Platform.OS === "android") {
    return "http://10.0.2.2:5000/api";
  }

  return "http://localhost:5000/api";
}

const DEFAULT_HOST = getDynamicHost();

export const TOKEN_STORAGE_KEY = "localfarm_auth_token";
export const API_URL_STORAGE_KEY = "localfarm_api_url";

let currentBaseUrl = DEFAULT_HOST;

export function getApiBaseUrl(): string {
  return currentBaseUrl;
}

export function setApiBaseUrl(url: string) {
  currentBaseUrl = url.endsWith("/api") ? url : `${url}/api`;
}

// Token helper methods
export async function getAuthToken(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export async function setAuthToken(token: string): Promise<void> {
  try {
    await AsyncStorage.setItem(TOKEN_STORAGE_KEY, token);
  } catch (err) {
    console.error("Failed to save auth token", err);
  }
}

export async function removeAuthToken(): Promise<void> {
  try {
    await AsyncStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch (err) {
    console.error("Failed to remove auth token", err);
  }
  if (typeof window !== "undefined" && window.localStorage) {
    try {
      window.localStorage.removeItem(TOKEN_STORAGE_KEY);
      window.localStorage.removeItem("localfarm_cached_user");
    } catch {}
  }
}

// Universal API Fetcher
export async function apiFetch<T = any>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const token = await getAuthToken();
  const url = `${currentBaseUrl}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const errorMsg =
      data?.message ||
      data?.error ||
      `Server request failed (${response.status}: ${response.statusText})`;
    throw new Error(errorMsg);
  }

  return data as T;
}
