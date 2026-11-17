import { useAppTheme } from "@/context/theme-context";
import { useAuth } from "@/hooks/use-auth";
import { getBadgeCountsApi } from "@/services/badge-service";
import { getRSBSAApplication, RSBSAApplication } from "@/services/rsbsa-service";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Image, Text, TouchableOpacity, View } from "react-native";
import { NotificationModal } from "./NotificationModal";
import { SearchModal } from "./SearchModal";

const UserHeader = ({ premium = false }: { premium?: boolean }) => {
  const { themeColor } = useAppTheme();
  const router = useRouter();
  const { user } = useAuth();
  const [isNotifOpen, setNotifOpen] = useState(false);
  const [isSearchOpen, setSearchOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [rsbsaApp, setRsbsaApp] = useState<RSBSAApplication | null>(null);

  const loadBadgeCounts = useCallback(async () => {
    try {
      const counts = await getBadgeCountsApi();
      setUnreadCount(counts.unreadNotificationsCount || 0);
    } catch {
      // ignore
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;
      getRSBSAApplication()
        .then((app) => {
          if (isMounted) setRsbsaApp(app);
        })
        .catch((err) => console.log("[UserHeader] Failed to load RSBSA:", err));

      loadBadgeCounts();

      return () => {
        isMounted = false;
      };
    }, [loadBadgeCounts])
  );

  useEffect(() => {
    const timer = setInterval(loadBadgeCounts, 10000);
    return () => clearInterval(timer);
  }, [loadBadgeCounts]);

  const isRSBSAVerified = rsbsaApp?.status === "verified";

  return (
    <>
      <View className="flex-row justify-between items-center px-4 py-3 bg-white border-b border-gray-100 z-30 dark:bg-[#242424] dark:border-[#414141] " style={premium ? { backgroundColor: themeColor("#faf9f5", "#181818"), borderBottomWidth: 0, paddingHorizontal: 22, paddingVertical: 10 } : undefined}>
      {/* Left: Brand Logo */}
      <View className="flex-row items-center">
        {premium ? <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}><Ionicons name="leaf" size={20} color={themeColor("#49684b", "#E6E6E6")}/><Text style={{ color: themeColor("#30483b", "#E6E6E6"), fontSize: 19, fontWeight: "600", letterSpacing: -.7 }}>localfarm</Text></View> : <Image
          source={require("../../assets/images/LF3.png")}
          className="h-9 w-36"
          style={{ width: 135, height: 36 }}
          resizeMode="contain"
        />}
      </View>

      {/* Right Side: Action Icons */}
      <View className="flex-row items-center gap-4">
        {/* Notification Bell Trigger */}
        <TouchableOpacity
          onPress={() => setNotifOpen(true)}
          className="relative p-1.5 rounded-full active:bg-gray-100 dark:active:bg-[#181818] "
          accessibilityRole="button"
          accessibilityLabel="Notifications"
        >
          <Ionicons name={premium ? "notifications-outline" : "notifications"} size={22} color={themeColor(premium ? "#4c6556" : "#72AF5B", "#E6E6E6")} />
          {unreadCount > 0 && (
            <View className="absolute -top-0.5 -right-0.5 bg-red-500 rounded-full w-4 h-4 items-center justify-center border border-white dark:border-[#414141] ">
              <Text className="text-white text-[10px] font-bold dark:text-[#E6E6E6] ">
                {unreadCount > 9 ? "9+" : unreadCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Search Icon */}
        <TouchableOpacity
          onPress={() => setSearchOpen(true)}
          className="p-1.5 rounded-full active:bg-gray-100 dark:active:bg-[#181818] "
          accessibilityRole="button"
          accessibilityLabel="Search"
        >
          <Ionicons name="search-outline" size={22} color={themeColor(premium ? "#4c6556" : "#333333", "#E6E6E6")} />
        </TouchableOpacity>

        {/* User Profile Avatar Icon */}
        <TouchableOpacity
          onPress={() =>
            router.push({
              pathname: "/user/UserProfile",
              params: {
                userId: user?.id,
                userName: user?.name || user?.username || "Local Farmer",
                userAvatar: user?.avatarUrl,
                userRole: isRSBSAVerified ? "RSBSA Verified Farmer" : (user as any)?.role || "Farmer",
                isVerified: isRSBSAVerified ? "true" : "false",
              },
            } as any)
          }
          className="relative w-8 h-8 rounded-full border border-[#72AF5B] items-center justify-center overflow-visible active:opacity-80 bg-gray-100 dark:border-[#414141] dark:bg-[#181818] "
          accessibilityRole="button"
          accessibilityLabel="Profile"
        >
          <View className="w-full h-full rounded-full overflow-hidden items-center justify-center">
            {user?.avatarUrl ? (
              <Image
                source={{ uri: user.avatarUrl }}
                style={{ width: "100%", height: "100%" }}
                resizeMode="cover"
              />
            ) : (
              <Ionicons name="person-outline" size={18} color={themeColor("#333333", "#E6E6E6")} />
            )}
          </View>
          {isRSBSAVerified && (
            <View className="absolute -bottom-1 -right-1 bg-white rounded-full w-3.5 h-3.5 items-center justify-center shadow-xs border border-white dark:bg-[#242424] dark:border-[#414141] ">
              <Ionicons name="checkmark-circle" size={13} color="#10B981" />
            </View>
          )}
        </TouchableOpacity>
      </View>

      </View>

      {/* Separated Notifications Modal Component */}
      <NotificationModal
        visible={isNotifOpen}
        onClose={() => {
          setNotifOpen(false);
          loadBadgeCounts();
        }}
        onUnreadCountChange={setUnreadCount}
      />

      {/* Global Produce & Farmers Search Modal */}
      <SearchModal
        visible={isSearchOpen}
        onClose={() => setSearchOpen(false)}
      />
    </>
  );
};

export default UserHeader;
