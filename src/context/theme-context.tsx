import AsyncStorage from "@react-native-async-storage/async-storage";
import { useColorScheme } from "nativewind";
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Colors } from "@/constants/theme";

type ThemeContextValue = {
  isDark: boolean;
  setDarkMode: (enabled: boolean) => void;
  themeColor: (light: string, dark: string) => string;
};
const ThemeContext = createContext<ThemeContextValue | null>(null);
const STORAGE_KEY = "localfarm.appearance";

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  const { colorScheme, setColorScheme } = useColorScheme();
  const [applyScheme] = useState(() => setColorScheme);
  const [ready, setReady] = useState(false);
  const changed = useRef(false);
  const pendingSave = useRef(Promise.resolve());
  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(STORAGE_KEY).then(value => {
      if (active && !changed.current && (value === "dark" || value === "light")) applyScheme(value);
    }).catch(() => {}).finally(() => { if (active) setReady(true); });
    return () => { active = false; };
  }, [applyScheme]);
  const isDark = colorScheme === "dark";
  const setDarkMode = useCallback((enabled: boolean) => {
    changed.current = true;
    const value = enabled ? "dark" : "light";
    applyScheme(value);
    pendingSave.current = pendingSave.current.catch(() => {}).then(() => AsyncStorage.setItem(STORAGE_KEY, value)).catch(() => { console.warn("Unable to save appearance preference"); });
  }, [applyScheme]);
  const themeColor = useCallback((light: string, dark: string) => isDark ? dark : light, [isDark]);
  if (!ready) return null;
  return <ThemeContext.Provider value={{ isDark, setDarkMode, themeColor }}>{children}</ThemeContext.Provider>;
}

export function useAppTheme() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error("useAppTheme must be used within AppThemeProvider");
  return { ...value, colors: value.isDark ? Colors.dark : Colors.light };
}
