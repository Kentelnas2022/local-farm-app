import { AppThemeProvider, useAppTheme } from "@/context/theme-context";
import "../global.css";
import { StatusBar } from "expo-status-bar";
import "react-native-gesture-handler";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import {
  DarkTheme,
  DefaultTheme,
  Slot,
  ThemeProvider,
  useRouter,
  useSegments,
} from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useState } from "react";
import { LogBox, Platform, View } from "react-native";

import { SafeAreaProvider } from "react-native-safe-area-context";

import { LoadingScreen } from "../components/LoadingScreen";
import { AnimatedSplashOverlay } from "../components/SplashScreen";
import { AuthProvider } from "@/context/auth-context";
import { useAuth } from "@/hooks/use-auth";

SplashScreen.preventAutoHideAsync().catch(() => {});

// Ignore non-fatal development warnings from transient Metro/HMR WebSocket drops and React 19 Fabric unmounted fiber checks
LogBox.ignoreLogs([
  "Cannot connect to Expo CLI",
  "Can't perform a React state update on a component that hasn't mounted yet",
  "Failed to fetch",
  "Authentication required",
  "connect ECONNREFUSED",
  "Failed to connect to",
  "The action 'GO_BACK' was not handled by any navigator",
  "Is there any screen to go back to?",
  '"shadow*" style props are deprecated',
  'style props are deprecated. Use "boxShadow"',
  "Blocked aria-hidden on an element",
  "props.pointerEvents is deprecated",
  "Animated: `useNativeDriver` is not supported",
  "TouchableWithoutFeedback is deprecated",
]);

if (Platform.OS === "web" && typeof console !== "undefined") {
  const originalWarn = console.warn;
  console.warn = (...args: any[]) => {
    const firstArg = typeof args[0] === "string" ? args[0] : "";
    if (
      firstArg.includes('"shadow*" style props are deprecated') ||
      firstArg.includes('style props are deprecated. Use "boxShadow"') ||
      firstArg.includes("props.pointerEvents is deprecated") ||
      firstArg.includes("Blocked aria-hidden on an element") ||
      firstArg.includes("Animated: `useNativeDriver` is not supported") ||
      firstArg.includes("TouchableWithoutFeedback is deprecated")
    ) {
      return;
    }
    originalWarn.apply(console, args);
  };
}

import { useToast } from "@/context/toast-context";

// Module-scoped flag: persists in memory across hot reload and Fast Refresh cycles
let hasCompletedStartup = false;

function RootNavigation() {
  const { themeColor } = useAppTheme();
  const { user, isLoading } = useAuth();
  const { showToast } = useToast();
  const segments = useSegments();
  const router = useRouter();
  const { isDark, colors } = useAppTheme();

  // Startup phase states: 'splash' -> 'loading' -> 'ready'
  // On hot reload, skip straight to 'ready' if initial startup was already completed
  const [appPhase, setAppPhase] = useState<"splash" | "loading" | "ready">(
    hasCompletedStartup ? "ready" : "splash",
  );

  useEffect(() => {
    if (hasCompletedStartup) {
      SplashScreen.hideAsync().catch(() => {});
      return;
    }

    // 1. Hide native splash and stay on custom Splash Screen for 1.2s
    const splashTimer = setTimeout(() => {
      SplashScreen.hideAsync().catch(() => {});
      setAppPhase("loading");
    }, 1200);

    return () => clearTimeout(splashTimer);
  }, []);

  useEffect(() => {
    if (hasCompletedStartup) return;

    // 2. Stay on Loading Screen until minimum 2.4s total time & auth session check finishes
    if (appPhase === "loading" && !isLoading) {
      const loadingTimer = setTimeout(() => {
        hasCompletedStartup = true;
        setAppPhase("ready");
      }, 1200);

      return () => clearTimeout(loadingTimer);
    }
  }, [appPhase, isLoading]);

  useEffect(() => {
    // Web: release focus from buttons on screen transition to prevent aria-hidden descendant focus errors
    if (Platform.OS === "web" && typeof document !== "undefined") {
      if (document.activeElement && document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
    }
  }, [segments]);

  useEffect(() => {
    // 3. Security guards after splash/loading phase
    if (appPhase !== "ready") return;
    if (isLoading) return;

    const firstSegment = (segments[0] as string) || "";
    const inAuthGroup = firstSegment === "auth";

    // A. Unauthenticated user trying to access ANY protected route
    if (!user && !inAuthGroup) {
      router.replace("/auth/Login" as any);
      return;
    }

    // B. Authenticated user visiting auth pages (Login/Signup/ForgotPassword)
    if (user && inAuthGroup) {
      router.replace("/user/NewsFeed" as any);
    }
  }, [appPhase, user, isLoading, segments]);

  // Phase 1: Green Splash Screen
  if (appPhase === "splash") {
    return <AnimatedSplashOverlay />;
  }

  // Phase 2: White Loading Screen with animated running green border
  if (appPhase === "loading") {
    return <LoadingScreen />;
  }

  // Phase 3: Route security guard (Prevent rendering protected content before redirect)
  const firstSegment = (segments[0] as string) || "";
  const inAuthGroup = firstSegment === "auth";

  if (!user && !inAuthGroup) {
    return <View style={{ flex: 1, backgroundColor: themeColor("#FFFFFF", "#242424") }} />;
  }

  return (
    <ThemeProvider value={{ ...(isDark ? DarkTheme : DefaultTheme), colors: { ...(isDark ? DarkTheme.colors : DefaultTheme.colors), background: colors.background, card: colors.backgroundElement, text: colors.text, primary: isDark ? "#E6E6E6" : "#34594A", border: isDark ? "#414141" : "#E5ECE6" } }}>
      <StatusBar style={isDark ? "light" : "dark"} />
      <Slot />
    </ThemeProvider>
  );
}

import { ToastProvider } from "@/context/toast-context";

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppThemeProvider>
      <SafeAreaProvider>
        <ToastProvider>
          <AuthProvider>
            <RootNavigation />
          </AuthProvider>
        </ToastProvider>
      </SafeAreaProvider>
      </AppThemeProvider>
    </GestureHandlerRootView>
  );
}
