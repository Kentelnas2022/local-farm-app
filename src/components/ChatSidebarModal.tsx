import { useAppTheme } from "@/context/theme-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export interface ChatSidebarModalProps {
  isVisible: boolean;
  onClose: () => void;
  activeItem?: string;
  onSelectItem?: (item: string) => void;
}

const MENU_ITEMS = [
  "Messages",
  "Message Request",
  "Spam",
  "Archived",
  "Restricted Accounts",
];

const ROUTE_MAP: Record<string, string> = {
  Messages: "/user/Chats",
  "Message Request": "/user/MessageRequests",
  Spam: "/user/SpamMessages",
  Archived: "/user/ArchivedMessages",
  "Restricted Accounts": "/user/RestrictedAccounts",
};

export default function ChatSidebarModal({
  isVisible,
  onClose,
  activeItem: controlledActiveItem,
  onSelectItem,
}: ChatSidebarModalProps) {
  const { themeColor } = useAppTheme();
  const router = useRouter();
  const [internalActiveItem, setInternalActiveItem] = useState("Messages");
  const activeItem = controlledActiveItem ?? internalActiveItem;

  const handleSelectItem = (item: string) => {
    setInternalActiveItem(item);
    if (onSelectItem) {
      onSelectItem(item);
    }
    onClose();

    if (item === activeItem) return;

    const targetRoute = ROUTE_MAP[item];
    if (targetRoute) {
      try {
        router.push(targetRoute as any);
      } catch (e) {
        console.warn("Navigation error", e);
      }
    }
  };

  return (
    <Modal
      visible={isVisible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent={true}
    >
      <View className="flex-1 relative" style={{ flex: 1 }}>
        {/* Full-bleed Gradient Backdrop (Dark Gradient Black) */}
        <Pressable onPress={onClose} style={StyleSheet.absoluteFill}>
          <View style={StyleSheet.absoluteFill}>
            <LinearGradient
              colors={[
                "rgba(0, 0, 0, 0.78)",
                "rgba(0, 0, 0, 0.58)",
                "rgba(0, 0, 0, 0.38)",
              ]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
          </View>
        </Pressable>

        {/* Mobile Responsive Sidebar Drawer */}
        <Pressable
          onPress={(e) => e.stopPropagation()}
          className="h-full w-[78%] max-w-[320px] bg-white flex-col dark:bg-[#242424] "
          style={{
            height: "100%",
            width: "78%",
            maxWidth: 320,
            backgroundColor: themeColor("#FFFFFF", "#242424"),
            elevation: 24,
            shadowColor: "#000000",
            shadowOffset: { width: 4, height: 0 },
            shadowOpacity: 0.25,
            shadowRadius: 16,
          }}
        >
          <SafeAreaView
            className="flex-1 bg-white dark:bg-[#181818] "
            edges={["top", "bottom", "left"]}
          >
            {/* Header Section (Placed at Top Corners) */}
            <View className="flex-row justify-between items-center px-5 pt-3 pb-3.5 border-b border-gray-100 mb-3 dark:border-[#414141] ">
              <Text className="text-2xl font-bold text-gray-900 dark:text-[#E6E6E6] ">
                Chats
              </Text>
              <TouchableOpacity
                onPress={onClose}
                className="p-1 -mr-1 active:opacity-70"
                accessibilityRole="button"
                accessibilityLabel="Close sidebar"
              >
                <Ionicons name="close" size={26} color={themeColor("#34594A", "#E6E6E6")} />
              </TouchableOpacity>
            </View>

            {/* Menu Items List */}
            <ScrollView
              className="flex-1 px-3"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ gap: 6, paddingBottom: 28 }}
            >
              {MENU_ITEMS.map((item) => {
                const isActive = activeItem === item;

                return (
                  <TouchableOpacity
                    key={item}
                    onPress={() => handleSelectItem(item)}
                    activeOpacity={0.8}
                    className={`py-3.5 px-4 rounded-xl flex-row items-center ${
                      isActive
                        ? "bg-[#34594A] dark:bg-[#E6E6E6] "
                        : "bg-transparent active:bg-gray-100 dark:active:bg-[#181818] "
                    }`}
                  >
                    <Text
                      className={`text-base pl-1 ${
                        isActive
                          ? "font-bold text-white dark:text-[#181818] "
                          : "font-medium text-gray-800 dark:text-[#E6E6E6] "
                      }`}
                    >
                      {item}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </SafeAreaView>
        </Pressable>
      </View>
    </Modal>
  );
}
