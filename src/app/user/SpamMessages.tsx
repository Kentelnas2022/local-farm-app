import { useAppTheme } from "@/context/theme-context";
import { ConversationItem, getConversationsApi } from "@/services/chat-service";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
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

import ChatSidebarModal from "../../components/ChatSidebarModal";
import BottomNavBar from "../../components/Navigation";

function SpamListItem({
  item,
  onPress,
}: {
  item: ConversationItem;
  onPress?: () => void;
}) {
  const { themeColor } = useAppTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      className="flex-row items-center px-4 py-3.5 border-b border-gray-100 active:bg-gray-50 dark:border-[#414141] dark:active:bg-[#242424] "
      activeOpacity={0.7}
    >
      {/* Left Avatar */}
      <View className="w-13 h-13 rounded-full bg-gray-200 mr-3.5 items-center justify-center overflow-hidden border border-gray-200 dark:bg-[#181818] dark:border-[#414141] ">
        {item.avatarUrl ? (
          <Image
            source={{ uri: item.avatarUrl }}
            className="w-full h-full"
            resizeMode="cover"
          />
        ) : (
          <Ionicons name="person" size={26} color={themeColor("#34594A", "#E6E6E6")} />
        )}
      </View>

      {/* Middle Content */}
      <View className="flex-1 min-w-0 pr-2">
        <Text
          className="text-base font-bold text-gray-900 mb-0.5 leading-tight dark:text-[#E6E6E6] "
          numberOfLines={1}
        >
          {item.name}
        </Text>
        <Text
          className="text-sm text-gray-500 font-medium truncate dark:text-[#ADADAD] "
          numberOfLines={1}
        >
          {item.snippet || "Flagged conversation"}
        </Text>
      </View>

      {/* Right: Time & Unread Badge */}
      <View className="items-end justify-center min-w-[56px] flex-shrink-0 gap-1">
        <Text className="text-xs text-gray-400 font-medium dark:text-[#ADADAD] ">{item.time}</Text>
        {item.unread > 0 && (
          <View className="bg-red-600 h-5 min-w-[20px] rounded-full items-center justify-center px-1.5 shadow-2xs">
            <Text className="text-white text-[11px] font-bold text-center leading-tight dark:text-[#E6E6E6] ">
              {item.unread}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

export default function SpamMessages() {
  const { themeColor } = useAppTheme();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [isSidebarVisible, setSidebarVisible] = useState(false);
  const [spamList, setSpamList] = useState<ConversationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchSpam = async (isPull = false) => {
    if (isPull) setIsRefreshing(true);
    else if (spamList.length === 0) setIsLoading(true);

    try {
      const data = await getConversationsApi({ category: "spam" });
      setSpamList(data);
    } catch (err) {
      console.warn("Failed to fetch spam conversations:", err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchSpam(false);
    }, [])
  );

  const filteredSpam = spamList.filter(
    (item) =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.snippet.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <SafeAreaView
      className="flex-1 bg-white relative h-full dark:bg-[#181818] "
      style={{ flex: 1, position: "relative", minHeight: "100%" }}
    >
      {/* 1. Header */}
      <View className="flex-row items-center justify-between px-5 pt-4 pb-2 bg-white dark:bg-[#242424] ">
        <Text className="text-3xl font-bold text-gray-900 tracking-tight dark:text-[#E6E6E6] ">
          Chats
        </Text>
      </View>

      {/* 2. Search Bar Container */}
      <View className="flex-row items-center px-5 py-3 gap-3">
        <TouchableOpacity
          onPress={() => setSidebarVisible(true)}
          className="p-1 active:opacity-70"
          accessibilityRole="button"
          accessibilityLabel="Open menu"
        >
          <Ionicons name="menu-outline" size={28} color={themeColor("#34594A", "#E6E6E6")} />
        </TouchableOpacity>

        {/* Search Input Box */}
        <View className="flex-1 flex-row items-center bg-gray-100 rounded-full px-4 h-11 border border-gray-100 dark:bg-[#181818] dark:border-[#414141] ">
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search..."
            placeholderTextColor={themeColor("#9CA3AF", "#ADADAD")}
            className="flex-1 text-base text-gray-800 pr-2 h-full font-medium dark:text-[#E6E6E6] "
            autoCapitalize="none"
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery("")} className="p-1 mr-1">
              <Ionicons name="close-circle" size={18} color={themeColor("#34594A", "#E6E6E6")} />
            </TouchableOpacity>
          ) : null}
          <Ionicons name="search-outline" size={20} color={themeColor("#34594A", "#E6E6E6")} />
        </View>
      </View>

      {/* Section Title */}
      <View className="px-5 py-2 flex-row items-center justify-between border-b border-gray-50 dark:border-[#414141] ">
        <Text className="text-lg font-bold text-gray-900 dark:text-[#E6E6E6] ">Spam</Text>
        <Text className="text-xs text-gray-400 font-medium dark:text-[#ADADAD] ">
          {spamList.length} {spamList.length === 1 ? "conversation" : "conversations"}
        </Text>
      </View>

      {/* Spam Scroll List */}
      <ScrollView
        className="flex-1 bg-white dark:bg-[#181818] "
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 110 }}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => fetchSpam(true)}
            colors={["#34594A"]}
            tintColor="#34594A"
          />
        }
      >
        {isLoading ? (
          <View className="py-16 items-center justify-center">
            <ActivityIndicator size="large" color={themeColor("#34594A", "#E6E6E6")} />
            <Text className="text-sm text-gray-500 mt-2 font-medium dark:text-[#ADADAD] ">
              Loading spam messages...
            </Text>
          </View>
        ) : filteredSpam.length > 0 ? (
          filteredSpam.map((item) => (
            <SpamListItem
              key={item.id}
              item={item}
              onPress={() => {
                router.push({
                  pathname: "/user/SpamChatConversation",
                  params: {
                    conversationId: item.id,
                    userId: item.otherUserId,
                    name: item.name,
                    avatarUrl: item.avatarUrl || "",
                  },
                } as any);
              }}
            />
          ))
        ) : (
          <View className="items-center justify-center py-20 px-6">
            <View className="w-16 h-16 rounded-full bg-gray-100 items-center justify-center mb-3 dark:bg-[#181818] ">
              <Ionicons
                name="shield-checkmark-outline"
                size={36}
                color={themeColor("#34594A", "#E6E6E6")}
              />
            </View>
            <Text className="text-gray-800 font-bold text-base mb-1 dark:text-[#E6E6E6] ">
              No Spam Messages
            </Text>
            <Text className="text-gray-500 text-xs text-center max-w-xs dark:text-[#ADADAD] ">
              Your spam folder is clean. Any conversations marked as spam will appear here.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Bottom Navigation Bar */}
      <BottomNavBar accentColor="#34594A" showFab={false} activeTab="Chat" />

      {/* Sidebar Drawer */}
      <ChatSidebarModal
        isVisible={isSidebarVisible}
        onClose={() => setSidebarVisible(false)}
        activeItem="Spam"
      />
    </SafeAreaView>
  );
}
