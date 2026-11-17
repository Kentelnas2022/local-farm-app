import { useAppTheme } from "@/context/theme-context";
import { useToast } from "@/context/toast-context";
import {
  cancelFriendRequestApi,
  getSuggestionsApi,
  sendFriendRequestApi,
  SuggestionUserItem,
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

export default function Suggestions() {
  const { themeColor } = useAppTheme();
  const { showToast } = useToast();
  const [isSidebarVisible, setSidebarVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<SuggestionUserItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [suggestionStates, setSuggestionStates] = useState<
    Record<string, "added" | "hidden" | "loading" | undefined>
  >({});

  const fetchSuggestions = async (isPull = false) => {
    if (isPull) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      const data = await getSuggestionsApi();
      setSuggestions(data);
    } catch (err) {
      console.log("Failed to fetch suggestions:", err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSuggestions();
  }, []);

  const handleAddFriend = async (item: SuggestionUserItem) => {
    setSuggestionStates((prev) => ({ ...prev, [item.id]: "loading" }));
    try {
      await sendFriendRequestApi(item.id);
      setSuggestionStates((prev) => ({ ...prev, [item.id]: "added" }));
      showToast(`Friend request sent to ${item.name}!`, "success");
    } catch (err: any) {
      if (err?.message?.toLowerCase().includes("already pending")) {
        setSuggestionStates((prev) => ({ ...prev, [item.id]: "added" }));
        showToast("Friend request is already pending.", "info");
      } else {
        setSuggestionStates((prev) => ({ ...prev, [item.id]: undefined }));
        showToast(err?.message || "Failed to send friend request.", "error");
      }
    }
  };

  const handleCancelRequest = async (item: SuggestionUserItem) => {
    setSuggestionStates((prev) => ({ ...prev, [item.id]: "loading" }));
    try {
      await cancelFriendRequestApi(item.id);
      setSuggestionStates((prev) => ({ ...prev, [item.id]: undefined }));
      showToast("Friend request canceled.", "info");
    } catch (err: any) {
      setSuggestionStates((prev) => ({ ...prev, [item.id]: "added" }));
      showToast(err?.message || "Failed to cancel request.", "error");
    }
  };

  const handleNotInterested = (id: string) => {
    setSuggestionStates((prev) => ({ ...prev, [id]: "hidden" }));
  };

  const filteredSuggestions = suggestions.filter((user) => {
    if (suggestionStates[user.id] === "hidden") return false;
    return (
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.username &&
        user.username.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  });

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
      {/* 1. Header Section */}
      <View className="px-5 pt-4 pb-2">
        <Text className="text-3xl font-bold text-gray-900 dark:text-[#E6E6E6] ">Connection</Text>
      </View>

      {/* 2. Search Bar Section (With Sidebar Trigger) */}
      <View className="flex-row items-center px-5 py-3 gap-3 mb-1">
        <TouchableOpacity
          onPress={() => setSidebarVisible(true)}
          className="p-1 active:opacity-70"
          accessibilityRole="button"
          accessibilityLabel="Open sidebar menu"
        >
          <Ionicons name="person-add-outline" size={26} color={themeColor("#34594A", "#E6E6E6")} />
        </TouchableOpacity>

        {/* Search Input Container */}
        <View className="flex-1 flex-row items-center bg-gray-100 rounded-full px-4 h-11 border border-gray-100 dark:bg-[#181818] dark:border-[#414141] ">
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search suggestions..."
            placeholderTextColor={themeColor("#9CA3AF", "#ADADAD")}
            className="flex-1 text-base text-gray-800 pr-2 h-full font-medium dark:text-[#E6E6E6] "
            autoCapitalize="none"
          />
          <Ionicons name="search-outline" size={20} color={themeColor("#34594A", "#E6E6E6")} />
        </View>
      </View>

      {/* 3. Sub-Header Section */}
      <View className="px-5 mb-3 flex-row justify-between items-center">
        <Text className="text-lg font-semibold text-gray-800 dark:text-[#E6E6E6] ">
          Suggestions{" "}
          <Text className="text-[#34594A] font-bold dark:text-[#E6E6E6] ">
            ({filteredSuggestions.length})
          </Text>
        </Text>
      </View>

      {/* 4. Suggestions List (Cards) */}
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
            onRefresh={() => fetchSuggestions(true)}
            colors={["#34594A"]}
            tintColor="#34594A"
          />
        }
      >
        {isLoading ? (
          <View className="py-16 items-center justify-center">
            <ActivityIndicator size="large" color={themeColor("#34594A", "#E6E6E6")} />
            <Text className="text-sm text-gray-500 mt-2 font-medium dark:text-[#ADADAD] ">
              Finding farmer suggestions...
            </Text>
          </View>
        ) : filteredSuggestions.length === 0 ? (
          <View className="py-16 items-center justify-center px-6">
            <View className="w-16 h-16 rounded-full bg-gray-100 items-center justify-center mb-3 dark:bg-[#181818] ">
              <Ionicons name="sparkles-outline" size={32} color={themeColor("#34594A", "#E6E6E6")} />
            </View>
            <Text className="text-base font-bold text-gray-800 mb-1 dark:text-[#E6E6E6] ">
              No Suggestions Right Now
            </Text>
            <Text className="text-xs text-gray-500 text-center dark:text-[#ADADAD] ">
              You are connected with or have requested all available users.
            </Text>
          </View>
        ) : (
          <View className="px-5">
            {filteredSuggestions.map((item) => {
              const state = suggestionStates[item.id];

              return (
                <View
                  key={item.id}
                  className="py-3.5 border-b border-gray-100 flex-row items-start justify-between dark:border-[#414141] "
                >
                  {/* Avatar */}
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

                  {/* Info & Action Buttons Container */}
                  <View className="flex-1">
                    <Text className="font-bold  text-gray-900 text-sm leading-tight mb-1 dark:text-[#E6E6E6] ">
                      {item.name}
                    </Text>

                    {/* Mutual Friends Info */}
                    <View className="flex-row items-center mb-3">
                      <Ionicons
                        name="people"
                        size={13}
                        color={themeColor("#34594A", "#E6E6E6")}
                        style={{ marginRight: 4 }}
                      />
                      <Text className="text-sm font-semibold text-gray-500 dark:text-[#ADADAD] ">
                        {item.mutualFriends || "Local Farm member"}
                      </Text>
                    </View>

                    {/* Action Buttons */}
                    {state === "added" ? (
                      <TouchableOpacity
                        onPress={() => handleCancelRequest(item)}
                        className="w-full bg-gray-100 border border-gray-300 py-2.5 rounded-xl items-center justify-center active:bg-gray-200 dark:bg-[#181818] dark:border-[#414141] dark:active:bg-[#181818] "
                        activeOpacity={0.8}
                        accessibilityRole="button"
                        accessibilityLabel="Cancel friend request"
                      >
                        <Text className="text-gray-700 font-semibold text-xs sm:text-sm dark:text-[#E6E6E6] ">
                          Cancel Request
                        </Text>
                      </TouchableOpacity>
                    ) : (
                      <View className="flex-row items-center gap-2">
                        {/* Add Friend Button */}
                        <TouchableOpacity
                          onPress={() => handleAddFriend(item)}
                          disabled={state === "loading"}
                          className="flex-1 bg-[#34594A] py-2.5 px-3 rounded-xl flex-row items-center justify-center active:bg-[#2A4F3E] shadow-2xs dark:bg-[#E6E6E6] dark:active:bg-[#E6E6E6] "
                          activeOpacity={0.8}
                          accessibilityRole="button"
                          accessibilityLabel={`Add ${item.name} as friend`}
                        >
                          {state === "loading" ? (
                            <ActivityIndicator size="small" color={themeColor("#FFFFFF", "#181818")} />
                          ) : (
                            <Text className="text-white font-bold text-sm sm:text-sm dark:text-[#181818] ">
                              Add friend
                            </Text>
                          )}
                        </TouchableOpacity>

                        {/* Not Interested Button */}
                        <TouchableOpacity
                          onPress={() => handleNotInterested(item.id)}
                          className="flex-1 bg-gray-200 py-2.5 px-2 rounded-xl flex-row items-center justify-center active:bg-gray-300 dark:bg-[#181818] dark:active:bg-[#303030] "
                          activeOpacity={0.8}
                          accessibilityRole="button"
                          accessibilityLabel="Not interested"
                        >
                          <Text
                            className="text-gray-700 font-semibold text-sm sm:text-sm text-center dark:text-[#E6E6E6] "
                            numberOfLines={1}
                          >
                            Not Interested
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Bottom Navigation Component */}
      <BottomNavBar accentColor="#34594A" activeTab="Connection" showFab={false} />

      {/* Reusable Sidebar Drawer Menu */}
      <SidebarMenu
        isVisible={isSidebarVisible}
        onClose={() => setSidebarVisible(false)}
        activeTab="Suggestions"
      />
    </SafeAreaView>
  );
}
