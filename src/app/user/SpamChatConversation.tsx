import { useAppTheme } from "@/context/theme-context";
import {
  archiveConversationApi,
  ChatMessage,
  deleteConversationApi,
  getMessagesApi,
  spamConversationApi,
} from "@/services/chat-service";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function SpamChatConversation() {
  const { themeColor } = useAppTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{
    conversationId?: string;
    userId?: string;
    name?: string;
    avatarUrl?: string;
  }>();

  const conversationId = params.conversationId;
  const otherUserId = params.userId;
  const otherUserName = params.name || "User";
  const otherUserAvatar = params.avatarUrl || "";

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isActionTaken, setIsActionTaken] = useState<string | null>(null);

  const fetchMessages = async () => {
    try {
      setIsLoading(true);
      const data = await getMessagesApi({
        conversationId: conversationId || undefined,
        userId: otherUserId,
      });
      setMessages(data.messages || []);
    } catch (e) {
      console.warn("Failed to load spam messages:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, [conversationId, otherUserId]);

  const handleVisitProfile = () => {
    router.push({
      pathname: "/user/UserProfile",
      params: {
        userId: otherUserId ? String(otherUserId) : undefined,
        userName: otherUserName,
        userAvatar: otherUserAvatar || "",
      },
    } as any);
  };

  const handleBack = () => {
    try {
      if (router.canGoBack()) {
        router.back();
      } else {
        router.push("/user/SpamMessages" as any);
      }
    } catch {
      router.push("/user/SpamMessages" as any);
    }
  };

  const handleArchive = async () => {
    try {
      setIsActionTaken("Archived");
      if (conversationId) {
        await Promise.all([
          archiveConversationApi(conversationId, true),
          spamConversationApi(conversationId, false),
        ]);
      }
      setTimeout(handleBack, 300);
    } catch {
      setIsActionTaken(null);
    }
  };

  const handleDelete = async () => {
    const confirmMsg = `Delete conversation with ${otherUserName}?`;
    const doDelete = async () => {
      try {
        setIsActionTaken("Delete");
        await deleteConversationApi({
          conversationId: conversationId || undefined,
          userId: otherUserId,
        });
        setTimeout(handleBack, 300);
      } catch {
        setIsActionTaken(null);
      }
    };

    if (Platform.OS === "web") {
      if (typeof window !== "undefined" && window.confirm(confirmMsg)) {
        doDelete();
      }
    } else {
      Alert.alert("Delete Conversation", confirmMsg, [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: doDelete },
      ]);
    }
  };

  const handleAccept = async () => {
    try {
      setIsActionTaken("Accept");
      if (conversationId) {
        await spamConversationApi(conversationId, false);
      }
      if (Platform.OS === "web") {
        window.alert("Conversation moved to Messages inbox.");
      } else {
        Alert.alert("Restored", "Conversation moved to Messages inbox.");
      }
      setTimeout(() => {
        router.replace("/user/Chats" as any);
      }, 300);
    } catch {
      setIsActionTaken(null);
    }
  };

  return (
    <SafeAreaView
      className="flex-1 bg-white dark:bg-[#181818] "
      style={{ flex: 1, backgroundColor: themeColor("#FFFFFF", "#242424") }}
    >
      {/* Top Header */}
      <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-gray-100 shadow-2xs z-10 dark:bg-[#242424] dark:border-[#414141] ">
        <View className="flex-row items-center gap-3 flex-1 pr-2">
          <TouchableOpacity
            onPress={handleBack}
            className="p-1 -ml-2 active:opacity-70"
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="chevron-back" size={28} color={themeColor("#000000", "#E6E6E6")} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleVisitProfile}
            activeOpacity={0.7}
            className="flex-row items-center gap-3 flex-1"
            accessibilityRole="button"
            accessibilityLabel={`View ${otherUserName}'s profile`}
          >
            <View className="w-10 h-10 rounded-full bg-gray-200 items-center justify-center overflow-hidden border border-gray-200 dark:bg-[#181818] dark:border-[#414141] ">
              {otherUserAvatar ? (
                <Image
                  source={{ uri: otherUserAvatar }}
                  className="w-full h-full"
                  resizeMode="cover"
                />
              ) : (
                <Ionicons name="person" size={22} color={themeColor("#34594A", "#E6E6E6")} />
              )}
            </View>

            <View className="flex-1">
              <Text
                className="text-base font-bold text-gray-900 leading-tight dark:text-[#E6E6E6] "
                numberOfLines={1}
              >
                {otherUserName}
              </Text>
              <Text className="text-xs text-amber-600 font-medium">
                Spam Conversation
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* Messages List */}
      <ScrollView
        className="flex-1 bg-[#F9F9F9] px-4 pt-4 dark:bg-[#181818] "
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: messages.length === 0 ? "center" : "flex-end",
          paddingBottom: 24,
        }}
      >
        {isLoading ? (
          <View className="items-center justify-center py-12">
            <ActivityIndicator size="small" color={themeColor("#34594A", "#E6E6E6")} />
          </View>
        ) : messages.length === 0 ? (
          <View className="items-center justify-center py-12">
            <Text className="text-xs text-gray-400 dark:text-[#ADADAD] ">No messages found.</Text>
          </View>
        ) : (
          messages.map((m) => {
            const isUser = m.sender === "user";
            return (
              <View
                key={m.id}
                className={`flex-row items-end mb-2.5 ${isUser ? "justify-end" : "justify-start"}`}
              >
                {!isUser && (
                  <TouchableOpacity
                    onPress={handleVisitProfile}
                    activeOpacity={0.7}
                    className="mr-2 active:opacity-70"
                    accessibilityRole="button"
                    accessibilityLabel={`View ${otherUserName}'s profile`}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <View className="w-7 h-7 rounded-full bg-gray-300 items-center justify-center overflow-hidden border border-gray-200 dark:bg-[#303030] dark:border-[#414141] ">
                      {otherUserAvatar ? (
                        <Image
                          source={{ uri: otherUserAvatar }}
                          className="w-full h-full"
                          resizeMode="cover"
                        />
                      ) : (
                        <Ionicons name="person" size={14} color={themeColor("#FFFFFF", "#E6E6E6")} />
                      )}
                    </View>
                  </TouchableOpacity>
                )}
                <View
                  className={`px-4 py-2.5 max-w-[76%] rounded-2xl ${
                    isUser
                      ? "bg-[#34594A] rounded-br-xs dark:bg-[#E6E6E6] "
                      : "bg-[#F0F0F0] rounded-bl-xs shadow-2xs dark:bg-[#181818] "
                  }`}
                >
                  <Text
                    className={`text-sm leading-snug ${isUser ? "text-white dark:text-[#181818] " : "text-gray-900 dark:text-[#E6E6E6] "}`}
                  >
                    {m.text ||
                      (m.type === "image" ? "📷 [Photo]" : "Shared attachment")}
                  </Text>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Bottom Action Area */}
      <View className="flex-row justify-between px-4 pt-3.5 pb-6 bg-white border-t border-gray-100 gap-3 dark:bg-[#242424] dark:border-[#414141] ">
        {/* Button 1: Archived */}
        <TouchableOpacity
          onPress={handleArchive}
          disabled={Boolean(isActionTaken)}
          className="flex-1 bg-gray-50 border border-[#34594A] rounded-xl py-3 items-center justify-center shadow-2xs active:bg-gray-100 dark:bg-[#181818] dark:border-[#414141] dark:active:bg-[#181818] "
          activeOpacity={0.8}
        >
          <Text className="text-sm font-bold text-[#34594A] text-center dark:text-[#E6E6E6] ">
            {isActionTaken === "Archived" ? "Archived ✓" : "Archive"}
          </Text>
        </TouchableOpacity>

        {/* Button 2: Delete */}
        <TouchableOpacity
          onPress={handleDelete}
          disabled={Boolean(isActionTaken)}
          className="flex-1 bg-gray-50 border border-[#E63946] rounded-xl py-3 items-center justify-center shadow-2xs active:bg-red-50 dark:bg-[#181818] dark:active:bg-[#181818] "
          activeOpacity={0.8}
        >
          <Text className="text-sm font-bold text-[#E63946] text-center">
            {isActionTaken === "Delete" ? "Deleted ✓" : "Delete"}
          </Text>
        </TouchableOpacity>

        {/* Button 3: Accept / Not Spam */}
        <TouchableOpacity
          onPress={handleAccept}
          disabled={Boolean(isActionTaken)}
          className="flex-1 bg-[#34594A] rounded-xl py-3 items-center justify-center active:opacity-85 shadow-2xs dark:bg-[#E6E6E6] "
          activeOpacity={0.8}
        >
          <Text className="text-sm font-bold text-white text-center dark:text-[#181818] ">
            {isActionTaken === "Accept" ? "Accepted ✓" : "Not Spam"}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
