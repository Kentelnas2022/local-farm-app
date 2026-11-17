import { useAppTheme } from "@/context/theme-context";
import CalmEntrance from "./CalmEntrance";
import {
  deleteNotificationApi,
  getNotificationsApi,
  markAllNotificationsAsReadApi,
  markNotificationAsReadApi,
  NotificationItem,
} from "@/services/notification-service";
import { useAuth } from "@/hooks/use-auth";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

export { NotificationItem };
export const INITIAL_NOTIFICATIONS: NotificationItem[] = [];

interface NotificationModalProps {
  visible: boolean;
  onClose: () => void;
  onUnreadCountChange?: (count: number) => void;
}

export const NotificationModal: React.FC<NotificationModalProps> = ({
  visible,
  onClose,
  onUnreadCountChange,
}) => {
  const { themeColor } = useAppTheme();
  const styles = createStyles(themeColor);
  const [optionsItem, setOptionsItem] = useState<NotificationItem | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [optionBusy, setOptionBusy] = useState(false);
  const [optionError, setOptionError] = useState("");
  const router = useRouter();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<
    NotificationItem["announcement"] | null
  >(null);

  const loadNotifications = useCallback(async () => {
    try {
      const { notifications: list } = await getNotificationsApi();
      // Filter out self-notifications (e.g. user commented/liked/shared their own post)
      const filtered = list.filter((n) => {
        if (!user) return true;
        // Keep announcements and official system alerts
        if (
          n.type === "announcement" ||
          n.type === "scam_alert" ||
          n.type === "emergency" ||
          n.id.startsWith("announcement_")
        ) {
          return true;
        }
        const isSelfActorId =
          n.user?.id && String(n.user.id) === String(user.id);
        const isSelfActorName =
          user.name &&
          n.user?.name &&
          n.user.name.trim().toLowerCase() === user.name.trim().toLowerCase();
        return !isSelfActorId && !isSelfActorName;
      });
      setNotifications(filtered);
      if (onUnreadCountChange) {
        onUnreadCountChange(filtered.filter((n) => n.isUnread).length);
      }
    } catch (err) {
      console.warn("[NotificationModal] Load error:", err);
    }
  }, [onUnreadCountChange, user]);

  useEffect(() => {
    if (visible) {
      setIsLoading(true);
      loadNotifications().finally(() => setIsLoading(false));
    } else {
      setShowSearch(false);
      setSearchQuery("");
      setSelectedAnnouncement(null);
    }
  }, [visible, loadNotifications]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadNotifications();
    setIsRefreshing(false);
  };

  const handleMarkAllAsRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isUnread: false })));
    if (onUnreadCountChange) {
      onUnreadCountChange(0);
    }
    await markAllNotificationsAsReadApi();
  };

  const handleNotificationPress = async (item: NotificationItem) => {
    if (item.isUnread) {
      setNotifications((prev) => {
        const updated = prev.map((n) =>
          n.id === item.id ? { ...n, isUnread: false } : n,
        );
        if (onUnreadCountChange) {
          onUnreadCountChange(updated.filter((n) => n.isUnread).length);
        }
        return updated;
      });
      await markNotificationAsReadApi(item.id);
    }

    if (
      item.type === "announcement" ||
      item.type === "scam_alert" ||
      item.type === "emergency" ||
      item.id.startsWith("announcement_") ||
      item.announcement
    ) {
      setSelectedAnnouncement(
        item.announcement || {
          id: item.id,
          title: item.title || "Official Notice",
          content: item.content,
          category:
            item.entityName ||
            (item.type === "scam_alert" ? "Scam Alert" : "General Notice"),
          priority:
            item.type === "emergency"
              ? "Urgent"
              : item.type === "scam_alert"
              ? "Urgent"
              : "Normal",
          createdAt: item.createdAt || new Date().toISOString(),
          author: item.user?.name || "Local Farm Admin",
        },
      );
      return;
    }

    if (item.type === "friend_request" || item.type === "friend_accepted") {
      onClose();
      router.push("/user/Friends" as any);
    } else if (
      item.type === "tag" ||
      item.type === "like" ||
      item.type === "comment"
    ) {
      onClose();
    }
  };

  const handleOptionsPress = (item: NotificationItem) => {
    setOptionsItem(item);
    setConfirmDelete(false);
    setOptionError("");
  };

  const applyNotificationAction = async (action: "read" | "delete") => {
    if (!optionsItem || optionBusy) return;
    setOptionBusy(true);
    setOptionError("");
    try {
      const success =
        action === "delete"
          ? await deleteNotificationApi(optionsItem.id)
          : await markNotificationAsReadApi(optionsItem.id);
      if (!success) throw new Error("Request failed");
      const updated =
        action === "delete"
          ? notifications.filter((item) => item.id !== optionsItem.id)
          : notifications.map((item) =>
              item.id === optionsItem.id ? { ...item, isUnread: false } : item,
            );
      setNotifications(updated);
      onUnreadCountChange?.(updated.filter((item) => item.isUnread).length);
      setOptionsItem(null);
    } catch {
      setOptionError("Unable to update this notification. Please try again.");
    } finally {
      setOptionBusy(false);
    }
  };

  const getUserReactionBadge = (type: NotificationItem["type"]) => {
    switch (type) {
      case "like":
        return (
          <View style={[styles.badgePill, { backgroundColor: "#EF4444" }]}>
            <Ionicons name="heart" size={10} color={themeColor("#FFFFFF", "#E6E6E6")} />
          </View>
        );
      case "comment":
        return (
          <View style={[styles.badgePill, { backgroundColor: "#10B981" }]}>
            <Ionicons name="chatbubble" size={10} color={themeColor("#FFFFFF", "#E6E6E6")} />
          </View>
        );
      case "friend_request":
      case "friend_accepted":
        return (
          <View style={[styles.badgePill, { backgroundColor: "#1877F2" }]}>
            <Ionicons name="person-add" size={10} color={themeColor("#FFFFFF", "#E6E6E6")} />
          </View>
        );
      case "tag":
      case "mention":
        return (
          <View style={[styles.badgePill, { backgroundColor: themeColor("#2E7D32", "#E6E6E6") }]}>
            <Ionicons name="at" size={10} color={themeColor("#FFFFFF", "#E6E6E6")} />
          </View>
        );
      default:
        return null;
    }
  };

  const getCleanEyebrow = (item: NotificationItem) => {
    if (item.type === "scam_alert") return "Scam Alert";
    if (item.type === "emergency") return "Emergency Notice";
    if (item.entityName) {
      const clean = item.entityName.trim();
      if (clean.toLowerCase() === "official notice") return "Official Notice";
      return clean;
    }
    return "Official Notice";
  };

  const filteredNotifications = searchQuery.trim()
    ? notifications.filter((n) => {
        const q = searchQuery.toLowerCase();
        return (
          n.user.name.toLowerCase().includes(q) ||
          n.content.toLowerCase().includes(q) ||
          (n.entityName && n.entityName.toLowerCase().includes(q))
        );
      })
    : notifications;

  const unreadCount = notifications.filter((n) => n.isUnread).length;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      statusBarTranslucent={true}
      onRequestClose={onClose}
    >
      <SafeAreaProvider>
        <View style={styles.screen}>
          <SafeAreaView style={styles.screen} edges={["top", "bottom", "left", "right"]}>
            <CalmEntrance visible={visible}>
              {/* Minimalist White Header */}
              <View style={styles.header}>
                <TouchableOpacity
                  onPress={onClose}
                  style={styles.backButton}
                  accessibilityRole="button"
                  accessibilityLabel="Back"
                  activeOpacity={0.7}
                >
                  <Ionicons name="chevron-back" size={22} color={themeColor("#111827", "#E6E6E6")} />
                </TouchableOpacity>

                <Text style={styles.headerTitle}>Notifications</Text>

                <View style={styles.headerActions}>
                  {unreadCount > 0 && (
                    <TouchableOpacity
                      onPress={handleMarkAllAsRead}
                      style={styles.markAllReadBtn}
                      accessibilityRole="button"
                      activeOpacity={0.7}
                    >
                      <Text style={styles.markAllReadText}>Mark all read</Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    onPress={() => setShowSearch((prev) => !prev)}
                    style={styles.searchToggleBtn}
                    accessibilityRole="button"
                    accessibilityLabel="Search notifications"
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={showSearch ? "close" : "search-outline"}
                      size={20}
                      color={themeColor("#374151", "#E6E6E6")}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Minimal Search Bar */}
              {showSearch && (
                <View style={styles.searchBarContainer}>
                  <Ionicons name="search-outline" size={17} color={themeColor("#9CA3AF", "#ADADAD")} />
                  <TextInput
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholder="Search notifications..."
                    placeholderTextColor={themeColor("#9CA3AF", "#ADADAD")}
                    style={styles.searchInput}
                    autoFocus={true}
                    clearButtonMode="while-editing"
                  />
                  {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchQuery("")} style={{ padding: 4 }}>
                      <Ionicons name="close-circle" size={16} color={themeColor("#9CA3AF", "#ADADAD")} />
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {/* Minimalist White Notification List */}
              {isLoading ? (
                <View style={styles.centerLoading}>
                  <ActivityIndicator size="small" color={themeColor("#2E523E", "#E6E6E6")} />
                  <Text style={styles.loadingText}>Loading notifications...</Text>
                </View>
              ) : (
                <ScrollView
                  style={styles.scrollArea}
                  contentContainerStyle={{ paddingBottom: 32 }}
                  showsVerticalScrollIndicator={false}
                  refreshControl={
                    <RefreshControl
                      refreshing={isRefreshing}
                      onRefresh={handleRefresh}
                      colors={["#2E523E"]}
                      tintColor="#2E523E"
                    />
                  }
                >
                  {filteredNotifications.length === 0 ? (
                    <View style={styles.emptyContainer}>
                      <Ionicons name="notifications-outline" size={42} color={themeColor("#D1D5DB", "#E6E6E6")} />
                      <Text style={styles.emptyTitle}>
                        {searchQuery ? "No matching notifications" : "No notifications yet"}
                      </Text>
                      <Text style={styles.emptySubtitle}>
                        {searchQuery ? "Try searching for another keyword" : "You're all caught up."}
                      </Text>
                    </View>
                  ) : (
                    filteredNotifications.map((item) => {
                      const isNotice =
                        item.type === "announcement" ||
                        item.type === "scam_alert" ||
                        item.type === "emergency" ||
                        Boolean(item.announcement);

                      let cleanBody = item.content || "";
                      if (
                        item.user.name &&
                        cleanBody.toLowerCase().startsWith(item.user.name.toLowerCase())
                      ) {
                        cleanBody = cleanBody.slice(item.user.name.length).trim();
                      }

                      const showEntityName =
                        item.entityName &&
                        !["connection", "post"].includes(item.entityName.toLowerCase());

                      return (
                        <TouchableOpacity
                          key={item.id}
                          onPress={() => handleNotificationPress(item)}
                          style={styles.notificationItem}
                          activeOpacity={0.65}
                        >
                          {/* Left Avatar / Icon */}
                          <View style={styles.avatarWrap}>
                            {item.type === "scam_alert" ? (
                              <View style={[styles.avatarCircle, { backgroundColor: themeColor("#FEE2E2", "#181818") }]}>
                                <Ionicons name="warning-outline" size={19} color="#DC2626" />
                              </View>
                            ) : item.type === "emergency" ? (
                              <View style={[styles.avatarCircle, { backgroundColor: "#FEF3C7" }]}>
                                <Ionicons name="alert-circle-outline" size={19} color="#D97706" />
                              </View>
                            ) : isNotice ? (
                              <View style={[styles.avatarCircle, { backgroundColor: themeColor("#F2F6F3", "#181818") }]}>
                                <Ionicons name="megaphone-outline" size={18} color={themeColor("#2E523E", "#E6E6E6")} />
                              </View>
                            ) : (
                              <View style={[styles.avatarCircle, { backgroundColor: themeColor("#F3F4F6", "#181818") }]}>
                                {item.user.avatarUrl ? (
                                  <Image
                                    source={{ uri: item.user.avatarUrl }}
                                    style={styles.avatarImage}
                                    resizeMode="cover"
                                  />
                                ) : (
                                  <Ionicons name="person" size={20} color={themeColor("#9CA3AF", "#ADADAD")} />
                                )}
                              </View>
                            )}

                            {getUserReactionBadge(item.type)}
                          </View>

                          {/* Center Content */}
                          <View style={styles.contentWrap}>
                            {isNotice ? (
                              <>
                                <View style={styles.noticeMetaRow}>
                                  <Text
                                    style={[
                                      styles.eyebrowText,
                                      item.type === "scam_alert" && { color: "#DC2626" },
                                      item.type === "emergency" && { color: "#D97706" },
                                    ]}
                                  >
                                    {getCleanEyebrow(item)}
                                  </Text>
                                  <Text style={styles.metaDot}>•</Text>
                                  <Text style={styles.timestampText}>{item.time}</Text>
                                </View>
                                <Text
                                  style={[
                                    styles.itemTitle,
                                    item.isUnread && styles.itemTitleUnread,
                                  ]}
                                  numberOfLines={2}
                                >
                                  {item.title}
                                </Text>
                                {Boolean(item.content) && (
                                  <Text style={styles.itemDescription} numberOfLines={2}>
                                    {item.content}
                                  </Text>
                                )}
                              </>
                            ) : (
                              <>
                                <Text
                                  style={[
                                    styles.userNotificationText,
                                    item.isUnread && styles.itemTitleUnread,
                                  ]}
                                  numberOfLines={3}
                                >
                                  <Text style={styles.userNameHighlight}>{item.user.name}</Text>{" "}
                                  {cleanBody}
                                  {showEntityName ? (
                                    <Text style={styles.userNotifEntity}>
                                      {" "}
                                      {item.entityName}
                                    </Text>
                                  ) : null}
                                </Text>
                                <Text style={styles.timestampText}>{item.time}</Text>
                              </>
                            )}
                          </View>

                          {/* Right: Unread Dot Indicator & Options */}
                          <View style={styles.rightActionWrap}>
                            {item.isUnread && <View style={styles.unreadDot} />}
                            <TouchableOpacity
                              onPress={(e) => {
                                e.stopPropagation();
                                handleOptionsPress(item);
                              }}
                              style={styles.optionsButton}
                              activeOpacity={0.7}
                              accessibilityRole="button"
                              accessibilityLabel="Notification options"
                              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            >
                              <Ionicons name="ellipsis-horizontal" size={16} color={themeColor("#A0AAB2", "#ADADAD")} />
                            </TouchableOpacity>
                          </View>
                        </TouchableOpacity>
                      );
                    })
                  )}
                </ScrollView>
              )}

              {/* Minimalist Options Action Modal */}
              <Modal
                visible={visible && Boolean(optionsItem)}
                transparent
                animationType="fade"
                onRequestClose={() => {
                  if (!optionBusy) setOptionsItem(null);
                }}
              >
                <View style={styles.optionsModalOverlay}>
                  <TouchableOpacity
                    style={StyleSheet.absoluteFill}
                    activeOpacity={1}
                    onPress={() => {
                      if (!optionBusy) setOptionsItem(null);
                    }}
                  />
                  <View style={styles.optionsCard}>
                    <Text style={styles.optionsHeaderTitle}>
                      {confirmDelete ? "Delete notification?" : "Notification options"}
                    </Text>
                    <Text numberOfLines={2} style={styles.optionsSubtitle}>
                      {confirmDelete
                        ? "This notification will be permanently removed from your list."
                        : optionsItem?.title || "Manage this notification"}
                    </Text>

                    {Boolean(optionError) && (
                      <Text style={styles.optionsErrorText}>{optionError}</Text>
                    )}

                    {optionBusy ? (
                      <ActivityIndicator color={themeColor("#2E523E", "#E6E6E6")} style={{ padding: 18 }} />
                    ) : confirmDelete ? (
                      <TouchableOpacity
                        onPress={() => void applyNotificationAction("delete")}
                        style={styles.deleteConfirmBtn}
                      >
                        <Text style={styles.deleteConfirmBtnText}>Delete notification</Text>
                      </TouchableOpacity>
                    ) : (
                      <View style={{ gap: 8 }}>
                        {optionsItem?.isUnread && (
                          <TouchableOpacity
                            onPress={() => void applyNotificationAction("read")}
                            style={styles.optionActionBtn}
                          >
                            <Ionicons name="checkmark-done-outline" size={17} color={themeColor("#2E523E", "#E6E6E6")} />
                            <Text style={styles.optionActionText}>Mark as read</Text>
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity
                          onPress={() => setConfirmDelete(true)}
                          style={[styles.optionActionBtn, { backgroundColor: themeColor("#FDF2F0", "#181818") }]}
                        >
                          <Ionicons name="trash-outline" size={17} color="#DC2626" />
                          <Text style={[styles.optionActionText, { color: "#DC2626" }]}>
                            Delete notification
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}

                    <TouchableOpacity
                      disabled={optionBusy}
                      onPress={() => setOptionsItem(null)}
                      style={styles.optionsCancelBtn}
                    >
                      <Text style={styles.optionsCancelText}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </Modal>

              {/* Minimalist Announcement Detail Modal */}
              <Modal
                visible={Boolean(selectedAnnouncement)}
                transparent
                animationType="fade"
                onRequestClose={() => setSelectedAnnouncement(null)}
              >
                <View style={styles.announcementOverlay}>
                  <View style={styles.announcementCard}>
                    {/* Header */}
                    <View style={styles.announcementHeader}>
                      <View style={{ flex: 1, paddingRight: 8 }}>
                        <Text style={styles.announcementCategory}>
                          {selectedAnnouncement?.category || "Official Notice"}
                        </Text>
                        <Text style={styles.announcementTitle} numberOfLines={2}>
                          {selectedAnnouncement?.title}
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => setSelectedAnnouncement(null)}
                        style={styles.announcementCloseBtn}
                      >
                        <Ionicons name="close" size={18} color={themeColor("#4B5563", "#ADADAD")} />
                      </TouchableOpacity>
                    </View>

                    {/* Content */}
                    <ScrollView style={{ padding: 18, maxHeight: 380 }} showsVerticalScrollIndicator={false}>
                      <Text style={styles.announcementBodyText}>
                        {selectedAnnouncement?.content}
                      </Text>

                      <View style={styles.announcementMetaBox}>
                        <Text style={styles.announcementMetaLine}>
                          Issued by: {selectedAnnouncement?.author || "LocalFarm Administration"}
                        </Text>
                        <Text style={styles.announcementMetaLine}>
                          Published:{" "}
                          {selectedAnnouncement?.createdAt
                            ? new Date(selectedAnnouncement.createdAt).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })
                            : "Official Notice"}
                        </Text>
                      </View>
                    </ScrollView>

                    {/* Dismiss Button */}
                    <View style={styles.announcementFooter}>
                      <TouchableOpacity
                        onPress={() => setSelectedAnnouncement(null)}
                        style={styles.announcementDoneBtn}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.announcementDoneBtnText}>Dismiss</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </Modal>
            </CalmEntrance>
          </SafeAreaView>
        </View>
      </SafeAreaProvider>
    </Modal>
  );
};

const createStyles = (themeColor: (light: string, dark: string) => string) => StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: themeColor("#FFFFFF", "#242424"),
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 13,
    backgroundColor: themeColor("#FFFFFF", "#242424"),
    borderBottomWidth: 1,
    borderBottomColor: themeColor("#F3F4F6", "#414141"),
  },
  backButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: themeColor("#111827", "#E6E6E6"),
    letterSpacing: -0.3,
    flex: 1,
    marginLeft: 4,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  markAllReadBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  markAllReadText: {
    fontSize: 12.5,
    fontWeight: "600",
    color: themeColor("#2E523E", "#E6E6E6"),
  },
  searchToggleBtn: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
  },

  // Search
  searchBarContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: themeColor("#FFFFFF", "#242424"),
    borderBottomWidth: 1,
    borderBottomColor: themeColor("#F3F4F6", "#414141"),
  },
  searchInput: {
    flex: 1,
    fontSize: 13.5,
    color: themeColor("#111827", "#E6E6E6"),
    marginLeft: 8,
    paddingVertical: 0,
  },

  // Scroll & Empty
  scrollArea: {
    flex: 1,
    backgroundColor: themeColor("#FFFFFF", "#242424"),
  },
  centerLoading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  loadingText: {
    fontSize: 12.5,
    color: themeColor("#6B7280", "#ADADAD"),
    marginTop: 8,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 72,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: themeColor("#374151", "#E6E6E6"),
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 12.5,
    color: themeColor("#9CA3AF", "#ADADAD"),
    marginTop: 4,
  },

  // Minimal Notification Row (Pure White)
  notificationItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: themeColor("#FFFFFF", "#242424"),
    borderBottomWidth: 1,
    borderBottomColor: themeColor("#F3F4F6", "#414141"),
  },
  avatarWrap: {
    position: "relative",
    marginRight: 12,
    paddingTop: 1,
  },
  avatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  badgePill: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: themeColor("#FFFFFF", "#414141"),
    alignItems: "center",
    justifyContent: "center",
  },

  // Content
  contentWrap: {
    flex: 1,
    paddingRight: 8,
  },
  noticeMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 3,
  },
  eyebrowText: {
    fontSize: 11,
    fontWeight: "700",
    color: themeColor("#5B7062", "#E6E6E6"),
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  metaDot: {
    fontSize: 11,
    color: themeColor("#D1D5DB", "#E6E6E6"),
  },
  timestampText: {
    fontSize: 11.5,
    color: themeColor("#9CA3AF", "#ADADAD"),
    marginTop: 2,
  },
  itemTitle: {
    fontSize: 13.5,
    lineHeight: 19,
    color: themeColor("#374151", "#E6E6E6"),
  },
  itemTitleUnread: {
    color: themeColor("#111827", "#E6E6E6"),
    fontWeight: "700",
  },
  itemDescription: {
    fontSize: 12.5,
    lineHeight: 17,
    color: themeColor("#6B7280", "#ADADAD"),
    marginTop: 2,
  },
  userNotificationText: {
    fontSize: 13.5,
    lineHeight: 19,
    color: themeColor("#374151", "#E6E6E6"),
  },
  userNameHighlight: {
    fontWeight: "700",
    color: themeColor("#111827", "#E6E6E6"),
  },
  userNotifEntity: {
    fontWeight: "600",
    color: themeColor("#1F2937", "#E6E6E6"),
  },

  // Right Actions (Unread dot & options)
  rightActionWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingTop: 4,
  },
  unreadDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: themeColor("#2E7D32", "#E6E6E6"),
  },
  optionsButton: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },

  // Options Modal
  optionsModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(17, 24, 39, 0.4)",
    justifyContent: "center",
    padding: 24,
  },
  optionsCard: {
    backgroundColor: themeColor("#FFFFFF", "#242424"),
    borderRadius: 20,
    padding: 20,
    width: "100%",
    maxWidth: 380,
    alignSelf: "center",
  },
  optionsHeaderTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: themeColor("#111827", "#E6E6E6"),
    marginBottom: 4,
  },
  optionsSubtitle: {
    fontSize: 12.5,
    color: themeColor("#6B7280", "#ADADAD"),
    lineHeight: 18,
    marginBottom: 16,
  },
  optionsErrorText: {
    fontSize: 12,
    color: "#DC2626",
    marginBottom: 10,
  },
  optionActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 13,
    borderRadius: 12,
    backgroundColor: themeColor("#F4F6F4", "#181818"),
  },
  optionActionText: {
    fontSize: 13.5,
    fontWeight: "600",
    color: themeColor("#2E523E", "#E6E6E6"),
  },
  deleteConfirmBtn: {
    padding: 13,
    borderRadius: 12,
    backgroundColor: themeColor("#FEE2E2", "#181818"),
    alignItems: "center",
  },
  deleteConfirmBtnText: {
    fontSize: 13.5,
    fontWeight: "700",
    color: "#DC2626",
  },
  optionsCancelBtn: {
    padding: 12,
    alignItems: "center",
    marginTop: 6,
  },
  optionsCancelText: {
    fontSize: 13,
    color: themeColor("#6B7280", "#ADADAD"),
    fontWeight: "500",
  },

  // Announcement Modal
  announcementOverlay: {
    flex: 1,
    backgroundColor: "rgba(17, 24, 39, 0.45)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  announcementCard: {
    backgroundColor: themeColor("#FFFFFF", "#242424"),
    borderRadius: 20,
    width: "100%",
    maxWidth: 420,
    overflow: "hidden",
  },
  announcementHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: themeColor("#F3F4F6", "#414141"),
  },
  announcementCategory: {
    fontSize: 11,
    fontWeight: "700",
    color: themeColor("#2E523E", "#E6E6E6"),
    textTransform: "uppercase",
    letterSpacing: 0.3,
    marginBottom: 3,
  },
  announcementTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: themeColor("#111827", "#E6E6E6"),
    lineHeight: 21,
  },
  announcementCloseBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: themeColor("#F3F4F6", "#181818"),
    alignItems: "center",
    justifyContent: "center",
  },
  announcementBodyText: {
    fontSize: 13.5,
    lineHeight: 22,
    color: themeColor("#374151", "#E6E6E6"),
    marginBottom: 16,
  },
  announcementMetaBox: {
    backgroundColor: themeColor("#F9FAFB", "#242424"),
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: themeColor("#F3F4F6", "#414141"),
    gap: 4,
  },
  announcementMetaLine: {
    fontSize: 12,
    color: themeColor("#6B7280", "#ADADAD"),
  },
  announcementFooter: {
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: themeColor("#F3F4F6", "#414141"),
  },
  announcementDoneBtn: {
    backgroundColor: themeColor("#2E523E", "#E6E6E6"),
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  announcementDoneBtnText: {
    fontSize: 13.5,
    fontWeight: "700",
    color: themeColor("#FFFFFF", "#E6E6E6"),
  },
});

export default NotificationModal;

