import { useAppTheme } from "@/context/theme-context";
import { useAuth } from "@/hooks/use-auth";
import { ActiveSession } from "@/services/device-service";
import { getClientDeviceInfo } from "@/utils/device-info";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function CurrentDeviceDetails() {
  const { themeColor } = useAppTheme();
  const { signOut } = useAuth();
  const params = useLocalSearchParams<{ session?: string }>();

  const [session, setSession] = useState<ActiveSession | null>(() => {
    if (params.session) {
      try {
        return JSON.parse(params.session);
      } catch {}
    }
    return null;
  });

  const [detectedOs, setDetectedOs] = useState("");
  const [detectedName, setDetectedName] = useState("");

  useEffect(() => {
    getClientDeviceInfo().then((info) => {
      setDetectedName(info.deviceName);
      setDetectedOs(`${info.osName} ${info.osVersion}`.trim());
    });
  }, []);

  const handleBack = () => {
    try {
      if (router.canGoBack()) {
        router.back();
      } else {
        router.push("/user/ManageDevices" as any);
      }
    } catch {
      router.push("/user/ManageDevices" as any);
    }
  };

  const handleLocationExplanationPress = () => {
    Alert.alert(
      "How Locations & Times are Determined",
      "Locations are approximate and determined based on your cellular or Wi-Fi IP address. Network routing may show a neighboring municipality or telecom center.\n\nTimestamps reflect when your device last contacted Local Farm servers to sync harvest listings, messages, or notifications.",
      [{ text: "Understood", style: "default" }],
    );
  };

  const handleLogoutThisDevice = () => {
    const doLogout = async () => {
      try {
        await signOut();
        router.replace("/auth/Login" as any);
      } catch (e) {
        console.warn("Logout error:", e);
        router.replace("/auth/Login" as any);
      }
    };

    if (Platform.OS === "web") {
      if (typeof window !== "undefined" && window.confirm("Are you sure you want to log out of this device?")) {
        doLogout();
      }
      return;
    }

    Alert.alert(
      "Log Out of This Device",
      "Are you sure you want to log out? You will need your email and password to sign back in.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Log Out",
          style: "destructive",
          onPress: doLogout,
        },
      ],
    );
  };

  const getDeviceIcon = (
    type?: "phone" | "tablet" | "desktop",
  ): keyof typeof Ionicons.glyphMap => {
    if (type === "desktop") return "laptop-outline";
    if (type === "tablet") return "tablet-portrait-outline";
    return "phone-portrait-outline";
  };

  const displayName =
    session?.deviceName || session?.name || detectedName || "This Device";
  const displayOs =
    (session?.osName ? `${session.osName} ${session.osVersion || ""}`.trim() : "") ||
    detectedOs ||
    "Mobile OS";
  const displayApp = session?.browserOrApp || "LocalFarm Mobile App";
  const displayLocation = session?.location || "Iligan City, Lanao Del Norte";
  const displayIp = session?.ipAddress || "127.0.0.1";
  const displayDate = session?.createdAt
    ? new Date(session.createdAt).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "numeric",
      })
    : "Current Session";

  return (
    <SafeAreaView
      className="flex-1 bg-[#F8F9FA] relative h-full dark:bg-[#181818] "
      style={{ flex: 1, backgroundColor: themeColor("#F8F9FA", "#181818") }}
    >
      {/* Top Header */}
      <View className="relative items-center justify-center pt-3 pb-4 px-4 bg-white border-b border-gray-100 dark:bg-[#242424] dark:border-[#414141] ">
        <TouchableOpacity
          onPress={handleBack}
          activeOpacity={0.7}
          className="absolute left-4 top-3 p-1"
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-undo" size={28} color={themeColor("#000000", "#E6E6E6")} />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-gray-900 dark:text-[#E6E6E6] ">Device Details</Text>
      </View>

      <ScrollView
        className="flex-1 px-4 pt-4"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 60 }}
      >
        {/* Hero Device Identity Card */}
        <View className="bg-white rounded-3xl p-5 mb-5 border border-gray-100 shadow-2xs dark:bg-[#242424] dark:border-[#414141] ">
          <View className="flex-row items-center mb-3.5">
            {/* Device Icon Badge */}
            <View className="w-14 h-14 rounded-2xl bg-[#72AF5B] items-center justify-center mr-4 shadow-xs dark:bg-[#E6E6E6] ">
              <Ionicons
                name={getDeviceIcon(session?.deviceType)}
                size={28}
                color={themeColor("#FFFFFF", "#181818")}
              />
            </View>

            {/* Device Specs & Status */}
            <View className="flex-1">
              <Text className="text-xl font-bold text-gray-900 leading-tight dark:text-[#E6E6E6] ">
                {displayName}
              </Text>

              {/* Status Badges */}
              <View className="flex-row items-center gap-2 mt-1">
                <View className="flex-row items-center gap-1 bg-white px-2 py-0.5 rounded-md border border-[#72AF5B] dark:bg-[#242424] dark:border-[#414141] ">
                  <Ionicons name="checkmark-circle" size={12} color={themeColor("#72AF5B", "#E6E6E6")} />
                  <Text className="text-sm font-bold text-[#72AF5B] dark:text-[#E6E6E6] ">
                    {session?.deviceType === "desktop"
                      ? "This PC"
                      : session?.deviceType === "tablet"
                      ? "This Tablet"
                      : "This Phone"}
                  </Text>
                </View>

                <View className="flex-row items-center gap-1.5 bg-[#72AF5B]/10 px-2 py-0.5 rounded-full dark:bg-[#E6E6E6]/10 ">
                  <View className="w-2 h-2 rounded-full bg-[#72AF5B] dark:bg-[#E6E6E6] " />
                  <Text className="text-sm font-bold text-[#2D4F28] dark:text-[#E6E6E6] ">
                    Active Now
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Device Security Summary Note */}
          <View className="bg-[#72AF5B]/[0.06] rounded-xl p-3 border border-[#72AF5B]/20 flex-row items-center gap-2.5 dark:bg-[#E6E6E6]/[0.06] dark:border-[#414141]/20 ">
            <Ionicons name="shield-checkmark" size={18} color={themeColor("#72AF5B", "#E6E6E6")} />
            <Text className="text-xs text-[#2D4F28] flex-1 font-medium leading-4.5 dark:text-[#E6E6E6] ">
              This device is currently authorized with full grower & buyer
              marketplace privileges.
            </Text>
          </View>
        </View>

        {/* Section 1: Session Technical Details */}
        <View className="mb-5">
          <Text className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2.5 px-1 dark:text-[#ADADAD] ">
            Session Details
          </Text>

          <View className="bg-white rounded-2xl border border-gray-100 shadow-2xs overflow-hidden dark:bg-[#242424] dark:border-[#414141] ">
            {/* Row 1: Operating System & Client */}
            <View className="p-4 flex-row items-center justify-between border-b border-gray-50 dark:border-[#414141] ">
              <View className="flex-row items-center gap-3">
                <View className="w-8 h-8 rounded-xl bg-gray-100 items-center justify-center dark:bg-[#181818] ">
                  <Ionicons name="hardware-chip-outline" size={18} color={themeColor("#72AF5B", "#E6E6E6")} />
                </View>
                <View>
                  <Text className="text-xs text-gray-500 font-medium dark:text-[#ADADAD] ">
                    System & Application
                  </Text>
                  <Text className="text-sm font-bold text-gray-900 mt-0.5 dark:text-[#E6E6E6] ">
                    {displayOs}
                  </Text>
                  <Text className="text-[11px] text-gray-400 dark:text-[#ADADAD] ">
                    {displayApp}
                  </Text>
                </View>
              </View>
            </View>

            {/* Row 2: Approximate Location */}
            <View className="p-4 flex-row items-center justify-between border-b border-gray-50 dark:border-[#414141] ">
              <View className="flex-row items-center gap-3">
                <View className="w-8 h-8 rounded-xl bg-gray-100 items-center justify-center dark:bg-[#181818] ">
                  <Ionicons name="location-outline" size={18} color={themeColor("#72AF5B", "#E6E6E6")} />
                </View>
                <View>
                  <Text className="text-xs text-gray-500 font-medium dark:text-[#ADADAD] ">
                    Approximate Location
                  </Text>
                  <Text className="text-sm font-bold text-gray-900 mt-0.5 dark:text-[#E6E6E6] ">
                    {displayLocation}
                  </Text>
                  <Text className="text-[11px] text-gray-400 dark:text-[#ADADAD] ">
                    IP Address: {displayIp}
                  </Text>
                </View>
              </View>
            </View>

            {/* Row 3: Initial Sign-in */}
            <View className="p-4 flex-row items-center justify-between">
              <View className="flex-row items-center gap-3">
                <View className="w-8 h-8 rounded-xl bg-gray-100 items-center justify-center dark:bg-[#181818] ">
                  <Ionicons name="calendar-outline" size={18} color={themeColor("#72AF5B", "#E6E6E6")} />
                </View>
                <View>
                  <Text className="text-xs text-gray-500 font-medium dark:text-[#ADADAD] ">
                    Authorized At
                  </Text>
                  <Text className="text-sm font-bold text-gray-900 mt-0.5 dark:text-[#E6E6E6] ">
                    {displayDate}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Section 2: Recent Activity Timeline */}
        <View className="mb-5">
          <Text className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2.5 px-1 dark:text-[#ADADAD] ">
            Recent Activity on this Device
          </Text>

          <View className="bg-white rounded-2xl p-4 border border-gray-100 shadow-2xs dark:bg-[#242424] dark:border-[#414141] ">
            {/* Activity 1 */}
            <View className="flex-row items-start gap-3 mb-4">
              <View className="w-2.5 h-2.5 rounded-full bg-[#72AF5B] mt-1.5 dark:bg-[#E6E6E6] " />
              <View className="flex-1">
                <Text className="text-sm font-bold text-gray-900 dark:text-[#E6E6E6] ">
                  Active Session
                </Text>
                <Text className="text-xs text-gray-600 mt-0.5 dark:text-[#ADADAD] ">
                  {displayLocation} • Just now
                </Text>
              </View>
            </View>

            {/* Helper Link */}
            <TouchableOpacity
              onPress={handleLocationExplanationPress}
              activeOpacity={0.7}
              className="pt-2 border-t border-gray-50 flex-row items-center gap-1 dark:border-[#414141] "
              accessibilityRole="button"
              accessibilityLabel="How locations and times are determined"
            >
              <Ionicons
                name="information-circle-outline"
                size={14}
                color={themeColor("#72AF5B", "#E6E6E6")}
              />
              <Text className="text-xs font-semibold text-[#72AF5B] dark:text-[#E6E6E6] ">
                How locations and times are determined
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Section 3: Security Actions */}
        <View className="mb-4">
          <Text className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2.5 px-1 dark:text-[#ADADAD] ">
            Security Actions
          </Text>

          <View className="gap-3">
            {/* Action 1: Change Password */}
            <TouchableOpacity
              onPress={() => router.push("/user/ChangePassword" as any)}
              activeOpacity={0.8}
              className="bg-white border border-[#72AF5B] py-3.5 px-4 rounded-2xl flex-row items-center justify-center gap-2 active:bg-[#72AF5B]/5 shadow-2xs dark:bg-[#242424] dark:border-[#414141] dark:active:bg-[#E6E6E6]/5 "
            >
              <Ionicons name="key-outline" size={18} color={themeColor("#72AF5B", "#E6E6E6")} />
              <Text className="text-sm font-bold text-[#72AF5B] dark:text-[#E6E6E6] ">
                Change Password
              </Text>
            </TouchableOpacity>

            {/* Action 2: Logout This Device */}
            <TouchableOpacity
              onPress={handleLogoutThisDevice}
              activeOpacity={0.8}
              className="bg-red-50 border border-red-100 py-3.5 px-4 rounded-2xl flex-row items-center justify-center gap-2 active:bg-red-100 dark:bg-[#181818] dark:border-[#414141] dark:active:bg-[#181818] "
            >
              <Ionicons name="log-out-outline" size={18} color="#DC2626" />
              <Text className="text-sm font-bold text-red-600">
                Log Out of This Device
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
