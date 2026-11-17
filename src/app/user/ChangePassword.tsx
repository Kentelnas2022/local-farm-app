import { useAppTheme } from "@/context/theme-context";
import { useToast } from "@/context/toast-context";
import { changePasswordApi } from "@/services/auth-service";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import Navigation from "../../components/Navigation";

export default function ChangePassword() {
  const { themeColor } = useAppTheme();
  const { showToast } = useToast();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [focusedField, setFocusedField] = useState<
    "current" | "new" | "confirm" | null
  >(null);

  // Live Password Criteria
  const hasMinLength = newPassword.length >= 8;
  const hasNumber = /\d/.test(newPassword);
  const hasUppercase = /[A-Z]/.test(newPassword);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(newPassword);

  const strengthScore = useMemo(() => {
    if (!newPassword) return 0;
    let score = 0;
    if (hasMinLength) score += 1;
    if (hasNumber) score += 1;
    if (hasUppercase) score += 1;
    if (hasSpecial) score += 1;
    return score;
  }, [hasMinLength, hasNumber, hasUppercase, hasSpecial, newPassword]);

  const strengthInfo = useMemo(() => {
    switch (strengthScore) {
      case 1:
        return { label: "Weak", color: "#EF4444" };
      case 2:
        return { label: "Fair", color: "#F59E0B" };
      case 3:
        return { label: "Good", color: "#84CC16" };
      case 4:
        return { label: "Strong", color: "#72AF5B" };
      default:
        return { label: "", color: "#E5E7EB" };
    }
  }, [strengthScore]);

  const isMatching =
    confirmPassword.length > 0 && newPassword === confirmPassword;
  const isMismatch =
    confirmPassword.length > 0 && newPassword !== confirmPassword;

  const handleBack = () => {
    try {
      if (router.canGoBack()) {
        router.back();
      } else {
        router.push("/user/Security" as any);
      }
    } catch {
      router.push("/user/Security" as any);
    }
  };

  const handleSubmit = async () => {
    if (!currentPassword.trim()) {
      showToast("Please enter your current password.", "warning");
      return;
    }
    if (!newPassword.trim()) {
      showToast("Please enter a new password.", "warning");
      return;
    }
    if (!hasMinLength) {
      showToast("New password must be at least 8 characters long.", "warning");
      return;
    }
    if (!hasUppercase) {
      showToast(
        "New password must contain at least one uppercase letter (A–Z).",
        "warning",
      );
      return;
    }
    if (!hasNumber) {
      showToast(
        "New password must contain at least one number (0–9).",
        "warning",
      );
      return;
    }
    if (!hasSpecial) {
      showToast(
        "New password must contain at least one special character (!@#$).",
        "warning",
      );
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast("New passwords do not match.", "warning");
      return;
    }
    if (currentPassword === newPassword) {
      showToast(
        "New password cannot be the same as your current password.",
        "warning",
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await changePasswordApi(currentPassword, newPassword);
      showToast(
        res.message || "Password updated! Other devices have been logged out.",
        "success",
      );
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => {
        handleBack();
      }, 1000);
    } catch (err: any) {
      showToast(err?.message || "Failed to change password.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView
      className="flex-1 bg-[#F8F9FA] relative dark:bg-[#181818] "
      style={{ flex: 1, backgroundColor: themeColor("#F8F9FA", "#181818") }}
    >
      {/* Top Header */}
      <View className="relative items-center justify-center pt-3 pb-4 px-4 bg-white border-b border-gray-100 dark:bg-[#242424] dark:border-[#414141] ">
        <TouchableOpacity
          onPress={handleBack}
          className="absolute left-4 top-3 p-1"
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-undo" size={28} color={themeColor("#000000", "#E6E6E6")} />
        </TouchableOpacity>

        <Text className="text-xl font-bold text-gray-900 dark:text-[#E6E6E6] ">Change Password</Text>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        <ScrollView
          className="flex-1 px-4 pt-4"
          showsVerticalScrollIndicator={false}
          bounces={false}
          overScrollMode="never"
          contentContainerStyle={{ paddingBottom: 110 }}
        >
          {/* Security Context Banner */}
          <View className="bg-white rounded-2xl p-4 mb-5 border border-gray-100 shadow-2xs flex-row items-center gap-3.5 dark:bg-[#242424] dark:border-[#414141] ">
            <View className="w-12 h-12 rounded-2xl bg-[#72AF5B]/10 items-center justify-center  dark:bg-[#E6E6E6]/10 ">
              <Ionicons name="shield-checkmark" size={24} color={themeColor("#72AF5B", "#E6E6E6")} />
            </View>
            <View className="flex-1">
              <Text className="text-sm font-bold text-gray-900 dark:text-[#E6E6E6] ">
                Keep Your Account Secure
              </Text>
              <Text className="text-xs text-gray-500 mt-0.5 leading-4.5 dark:text-[#ADADAD] ">
                Choose a strong, unique password to protect your farm listings,
                harvest orders, and personal data.
              </Text>
            </View>
          </View>

          {/* Form Card */}
          <View className="bg-white rounded-3xl p-5 mb-5 border border-gray-100 shadow-xs dark:bg-[#242424] dark:border-[#414141] ">
            {/* 1. Current Password */}
            <View className="mb-4">
              <View className="flex-row items-center justify-between mb-1.5">
                <Text className="text-xs font-bold text-gray-700 uppercase tracking-wider dark:text-[#E6E6E6] ">
                  Current Password
                </Text>
                <TouchableOpacity
                  onPress={() => router.push("/auth/ForgotPassword" as any)}
                  activeOpacity={0.7}
                ></TouchableOpacity>
              </View>

              <View
                className={`flex-row items-center bg-white border rounded-2xl px-4 py-3  dark:bg-[#242424] ${
                  focusedField === "current"
                    ? "border-[#72AF5B] bg-[#72AF5B]/[0.02] dark:border-[#414141] dark:bg-[#E6E6E6]/[0.02] "
                    : "border-gray-200 dark:border-[#414141] "
                }`}
              >
                <Ionicons
                  name="key-outline"
                  size={20}
                  color={focusedField === "current" ? "#72AF5B" : "#9CA3AF"}
                  style={{ marginRight: 10 }}
                />
                <TextInput
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  placeholder="Enter your current password"
                  placeholderTextColor={themeColor("#9CA3AF", "#ADADAD")}
                  secureTextEntry={!showCurrent}
                  onFocus={() => setFocusedField("current")}
                  onBlur={() => setFocusedField(null)}
                  className="flex-1 text-sm text-gray-900 p-0 font-medium dark:text-[#E6E6E6] "
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  onPress={() => setShowCurrent((prev) => !prev)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  accessibilityRole="button"
                  accessibilityLabel={
                    showCurrent ? "Hide password" : "Show password"
                  }
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={showCurrent ? "eye-outline" : "eye-off-outline"}
                    size={20}
                    color={themeColor("#9CA3AF", "#ADADAD")}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Subtle Divider */}
            <View className="h-[1px] bg-gray-100 my-2 dark:bg-[#181818] " />

            {/* 2. New Password */}
            <View className="my-2">
              <View className="flex-row items-center justify-between mb-1.5">
                <Text className="text-xs font-bold text-gray-700 uppercase tracking-wider dark:text-[#E6E6E6] ">
                  New Password
                </Text>
                {newPassword.length > 0 && (
                  <Text
                    className="text-xs font-bold"
                    style={{ color: strengthInfo.color }}
                  >
                    {strengthInfo.label}
                  </Text>
                )}
              </View>

              <View
                className={`flex-row items-center bg-white border rounded-2xl px-4 py-3  dark:bg-[#242424] ${
                  focusedField === "new"
                    ? "border-[#72AF5B] bg-[#72AF5B]/[0.02] dark:border-[#414141] dark:bg-[#E6E6E6]/[0.02] "
                    : "border-gray-200 dark:border-[#414141] "
                }`}
              >
                <Ionicons
                  name="lock-closed-outline"
                  size={20}
                  color={focusedField === "new" ? "#72AF5B" : "#9CA3AF"}
                  style={{ marginRight: 10 }}
                />
                <TextInput
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="At least 8 characters"
                  placeholderTextColor={themeColor("#9CA3AF", "#ADADAD")}
                  secureTextEntry={!showNew}
                  onFocus={() => setFocusedField("new")}
                  onBlur={() => setFocusedField(null)}
                  className="flex-1 text-sm text-gray-900 p-0 font-medium dark:text-[#E6E6E6] "
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  onPress={() => setShowNew((prev) => !prev)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  accessibilityRole="button"
                  accessibilityLabel={
                    showNew ? "Hide password" : "Show password"
                  }
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={showNew ? "eye-outline" : "eye-off-outline"}
                    size={20}
                    color={themeColor("#9CA3AF", "#ADADAD")}
                  />
                </TouchableOpacity>
              </View>

              {/* Password Strength Meter Bar */}
              {newPassword.length > 0 && (
                <View className="flex-row gap-1.5 mt-2 px-0.5">
                  {[1, 2, 3, 4].map((step) => (
                    <View
                      key={step}
                      className="flex-1 h-1.5 rounded-full"
                      style={{
                        backgroundColor:
                          strengthScore >= step
                            ? strengthInfo.color
                            : "#E5E7EB",
                      }}
                    />
                  ))}
                </View>
              )}
            </View>

            {/* 3. Confirm New Password */}
            <View className="mt-3 mb-2">
              <View className="flex-row items-center justify-between mb-1.5">
                <Text className="text-xs font-bold text-gray-700 uppercase tracking-wider dark:text-[#E6E6E6] ">
                  Confirm New Password
                </Text>
                {isMatching && (
                  <View className="flex-row items-center gap-1">
                    <Ionicons
                      name="checkmark-circle"
                      size={14}
                      color={themeColor("#72AF5B", "#E6E6E6")}
                    />
                    <Text className="text-xs font-semibold text-[#72AF5B] dark:text-[#E6E6E6] ">
                      Passwords match
                    </Text>
                  </View>
                )}
                {isMismatch && (
                  <View className="flex-row items-center gap-1">
                    <Ionicons name="alert-circle" size={14} color="#EF4444" />
                    <Text className="text-xs font-semibold text-red-500">
                      Does not match
                    </Text>
                  </View>
                )}
              </View>

              <View
                className={`flex-row items-center bg-white border rounded-2xl px-4 py-3  dark:bg-[#242424] ${
                  focusedField === "confirm"
                    ? "border-[#72AF5B] bg-[#72AF5B]/[0.02] dark:border-[#414141] dark:bg-[#E6E6E6]/[0.02] "
                    : isMismatch
                      ? "border-red-300"
                      : isMatching
                        ? "border-[#72AF5B] dark:border-[#414141] "
                        : "border-gray-200 dark:border-[#414141] "
                }`}
              >
                <Ionicons
                  name="shield-outline"
                  size={20}
                  color={
                    focusedField === "confirm"
                      ? "#72AF5B"
                      : isMatching
                        ? "#72AF5B"
                        : "#9CA3AF"
                  }
                  style={{ marginRight: 10 }}
                />
                <TextInput
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Re-type your new password"
                  placeholderTextColor={themeColor("#9CA3AF", "#ADADAD")}
                  secureTextEntry={!showConfirm}
                  onFocus={() => setFocusedField("confirm")}
                  onBlur={() => setFocusedField(null)}
                  className="flex-1 text-sm text-gray-900 p-0 font-medium dark:text-[#E6E6E6] "
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  onPress={() => setShowConfirm((prev) => !prev)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  accessibilityRole="button"
                  accessibilityLabel={
                    showConfirm ? "Hide password" : "Show password"
                  }
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={showConfirm ? "eye-outline" : "eye-off-outline"}
                    size={20}
                    color={themeColor("#9CA3AF", "#ADADAD")}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Live Requirements Checklist */}
            <View className="mt-4 pt-4 border-t border-gray-100 bg-[#F9FAFB] -mx-5 -mb-5 p-4 rounded-b-3xl dark:border-[#414141] dark:bg-[#242424] ">
              <Text className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2.5 dark:text-[#ADADAD] ">
                Password Requirements
              </Text>
              <View className="gap-2">
                {[
                  { label: "At least 8 characters long", met: hasMinLength },
                  {
                    label: "At least one uppercase letter (A–Z)",
                    met: hasUppercase,
                  },
                  { label: "At least one number (0–9)", met: hasNumber },
                  {
                    label: "At least one symbol or special character (!@#$)",
                    met: hasSpecial,
                  },
                ].map((req, idx) => (
                  <View key={idx} className="flex-row items-center gap-2">
                    <Ionicons
                      name={
                        req.met
                          ? "checkmark-circle"
                          : "radio-button-off-outline"
                      }
                      size={15}
                      color={req.met ? "#72AF5B" : "#9CA3AF"}
                    />
                    <Text
                      className={`text-xs ${
                        req.met ? "text-gray-800 font-medium dark:text-[#E6E6E6] " : "text-gray-500 dark:text-[#ADADAD] "
                      }`}
                    >
                      {req.label}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </View>

          {/* Submit Action Button */}
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={isSubmitting}
            activeOpacity={0.8}
            className="w-full bg-[#72AF5B] py-4 rounded-2xl items-center justify-center shadow-sm flex-row gap-2 active:bg-[#5f974b] mb-4 dark:bg-[#E6E6E6] dark:active:bg-[#E6E6E6] "
          >
            {isSubmitting ? (
              <ActivityIndicator color={themeColor("#FFFFFF", "#181818")} size="small" />
            ) : (
              <>
                <Ionicons name="lock-closed" size={18} color={themeColor("#FFFFFF", "#181818")} />
                <Text className="text-base font-bold text-white dark:text-[#181818] ">
                  Update Password
                </Text>
              </>
            )}
          </TouchableOpacity>

          {/* Security Tip Note */}
          <View className="flex-row items-start gap-2 px-1">
            <Ionicons
              name="information-circle-outline"
              size={16}
              color={themeColor("#9CA3AF", "#ADADAD")}
              style={{ marginTop: 1 }}
            />
            <Text className="text-xs text-gray-500 leading-4.5 flex-1 dark:text-[#ADADAD] ">
              For your safety, avoid reusing passwords from other apps. You will
              remain logged in on this device.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Bottom Navigation */}
      <Navigation activeTab="Menu" showFab={false} />
    </SafeAreaView>
  );
}
