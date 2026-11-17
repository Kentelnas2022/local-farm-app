import { useAppTheme } from "@/context/theme-context";
import { useToast } from "@/context/toast-context";
import {
  cancelFriendRequestApi,
  getSentRequestsApi,
  SentRequestItem,
} from "@/services/connection-service";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import BottomNavBar from "../../components/Navigation";
import SidebarMenu from "../../components/SidebarMenu";

export default function SentRequests() {
  const { themeColor } = useAppTheme();
  const { showToast } = useToast();
  const [isSidebarVisible, setSidebarVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sentRequests, setSentRequests] = useState<SentRequestItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [cancellingIds, setCancellingIds] = useState<Record<string, boolean>>(
    {},
  );

  const fetchSentRequests = async (isPull = false) => {
    if (isPull) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      const data = await getSentRequestsApi();
      setSentRequests(data);
    } catch (err) {
      console.log("Failed to fetch sent requests:", err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSentRequests();
  }, []);

  const handleCancelRequest = async (item: SentRequestItem) => {
    setCancellingIds((prev) => ({ ...prev, [item.id]: true }));
    try {
      await cancelFriendRequestApi(item.userId, item.id);
      setSentRequests((prev) => prev.filter((r) => r.id !== item.id));
      showToast("Friend request canceled.", "info");
    } catch (err: any) {
      showToast(err?.message || "Failed to cancel request.", "error");
    } finally {
      setCancellingIds((prev) => ({ ...prev, [item.id]: false }));
    }
  };

  const filteredRequests = sentRequests.filter(
    (item) =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.username &&
        item.username.toLowerCase().includes(searchQuery.toLowerCase())),
  );

  return (
    <SafeAreaView
      className="flex-1 bg-white relative h-full dark:bg-[#181818] "
      style={{
        flex: 1,
        position: "relative",
        minHeight: "100%",
        overflow: "hidden",
      }}
    >
      {/* Main Scrollable Content */}
      <ScrollView
        className="flex-1 bg-white dark:bg-[#181818] "
        showsVerticalScrollIndicator={false}
        bounces={false}
        overScrollMode="never"
        alwaysBounceVertical={false}
        alwaysBounceHorizontal={false}
        directionalLockEnabled={true}
        contentContainerStyle={{ paddingBottom: 110 }}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => fetchSentRequests(true)}
            colors={["#34594A"]}
            tintColor="#34594A"
          />
        }
      >
        {/* Header Section */}
        <View className="px-5 pt-4 pb-2">
          <Text className="text-3xl font-bold text-gray-900 dark:text-[#E6E6E6] ">Connection</Text>
        </View>

        {/* Search Bar */}
        <View className="flex-row items-center px-5 py-3 gap-3 mb-1">
          <TouchableOpacity
            onPress={() => setSidebarVisible(true)}
            className="p-1 active:opacity-70"
            accessibilityRole="button"
            accessibilityLabel="Open sidebar menu"
          >
            <Ionicons name="person-add-outline" size={26} color={themeColor("#34594A", "#E6E6E6")} />
          </TouchableOpacity>

          {/* Search Input */}
          <View className="flex-1 flex-row items-center bg-gray-100 rounded-full px-4 h-11 border border-gray-100 dark:bg-[#181818] dark:border-[#414141] ">
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search sent requests..."
              placeholderTextColor={themeColor("#9CA3AF", "#ADADAD")}
              className="flex-1 text-base text-gray-800 pr-2 h-full font-medium dark:text-[#E6E6E6] "
              autoCapitalize="none"
            />
            <Ionicons name="search-outline" size={20} color={themeColor("#34594A", "#E6E6E6")} />
          </View>
        </View>

        {/* Sub-Header */}
        <View className="flex-row items-center px-5 py-2 mb-2">
          <Text className="text-lg font-semibold text-gray-900 dark:text-[#E6E6E6] ">
            Sent Request <Text className="text-gray-400 dark:text-[#ADADAD] ">·</Text>{" "}
            <Text className="text-[#34594A] font-bold dark:text-[#E6E6E6] ">
              {filteredRequests.length}
            </Text>
          </Text>
        </View>

        {/* Loading State */}
        {isLoading ? (
          <View className="py-16 items-center justify-center">
            <ActivityIndicator size="large" color={themeColor("#34594A", "#E6E6E6")} />
            <Text className="text-sm text-gray-500 mt-2 font-medium dark:text-[#ADADAD] ">
              Loading sent requests...
            </Text>
          </View>
        ) : filteredRequests.length === 0 ? (
          <View className="py-16 items-center justify-center px-6">
            <View className="w-16 h-16 rounded-full bg-gray-100 items-center justify-center mb-3 dark:bg-[#181818] ">
              <Ionicons name="paper-plane-outline" size={32} color={themeColor("#34594A", "#E6E6E6")} />
            </View>
            <Text className="text-base font-bold text-gray-800 mb-1 dark:text-[#E6E6E6] ">
              No Sent Requests
            </Text>
            <Text className="text-xs text-gray-500 text-center dark:text-[#ADADAD] ">
              You have not sent any pending friend requests.
            </Text>
          </View>
        ) : (
          /* Sent Request List */
          <View className="px-5">
            {filteredRequests.map((item) => {
              const isCancelling = cancellingIds[item.id];

              return (
                <View
                  key={item.id}
                  className="py-3.5 border-b border-gray-100 flex-row items-start justify-between dark:border-[#414141] "
                >
                  {/* Circular Avatar */}
                  <View className="h-14 w-14 rounded-full bg-gray-200 items-center justify-center mr-3.5 border border-gray-200 overflow-hidden dark:bg-[#181818] dark:border-[#414141] ">
                    {item.avatarUrl ? (
                      <Image
                        source={{ uri: item.avatarUrl }}
                        className="w-full h-full"
                        resizeMode="cover"
                      />
                    ) : (
                      <Ionicons name="person" size={28} color={themeColor("#34594A", "#E6E6E6")} />
                    )}
                  </View>

                  {/* Main Info */}
                  <View className="flex-1">
                    <View className="flex-row justify-between items-start">
                      <View className="flex-1 pr-2">
                        <Text className="font-bold text-gray-900 text-base leading-tight mb-1 dark:text-[#E6E6E6] ">
                          {item.name}
                        </Text>
                        <View className="flex-row items-center mb-2.5">
                          <Ionicons
                            name="people"
                            size={13}
                            color={themeColor("#34594A", "#E6E6E6")}
                            style={{ marginRight: 4 }}
                          />
                          <Text className="text-gray-500 text-sm font-medium dark:text-[#ADADAD] ">
                            {item.friendsCount || "Local Farm member"}
                          </Text>
                        </View>
                      </View>

                      {/* Time Sent */}
                      <Text className="text-[#34594A] font-medium text-sm dark:text-[#E6E6E6] ">
                        {item.timeAgo || "Recently"}
                      </Text>
                    </View>

                    {/* Cancel Request Button */}
                    <TouchableOpacity
                      onPress={() => handleCancelRequest(item)}
                      disabled={isCancelling}
                      className="w-full bg-gray-50 border border-gray-300 py-2.5 rounded-lg items-center justify-center active:bg-gray-200 dark:bg-[#242424] dark:border-[#414141] dark:active:bg-[#181818] "
                      activeOpacity={0.8}
                      accessibilityRole="button"
                      accessibilityLabel="Cancel sent request"
                    >
                      {isCancelling ? (
                        <ActivityIndicator size="small" color={themeColor("#6B7280", "#ADADAD")} />
                      ) : (
                        <Text className="text-gray-700 font-semibold text-sm sm:text-sm dark:text-[#E6E6E6] ">
                          Cancel Request
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      <BottomNavBar accentColor="#34594A" activeTab="Connection" showFab={false} />
      <SidebarMenu
        isVisible={isSidebarVisible}
        onClose={() => setSidebarVisible(false)}
        activeTab="Sent Request"
      />
    </SafeAreaView>
  );
}
