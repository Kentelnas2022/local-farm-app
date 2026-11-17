import { useAppTheme } from "@/context/theme-context";
import { SearchedUserItem, searchUsersToConnectApi } from "@/services/connection-service";
import { getPostsApi, PostItem } from "@/services/post-service";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  ActivityIndicator,
  Animated,
  FlatList,
  Image,
  Keyboard,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface SearchModalProps {
  visible: boolean;
  onClose: () => void;
}

type TabType = "people" | "posts";

export const SearchModal: React.FC<SearchModalProps> = ({ visible, onClose }) => {
  const { themeColor } = useAppTheme();
  const styles = createStyles(themeColor);
  const router = useRouter();
  const inputRef = useRef<TextInput>(null);
  const requestId = useRef(0);
  const [reveal] = useState(() => new Animated.Value(0));

  const [activeTab, setActiveTab] = useState<TabType>("people");
  const [searchQuery, setSearchQuery] = useState("");
  const [people, setPeople] = useState<SearchedUserItem[]>([]);
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [selectedPost, setSelectedPost] = useState<PostItem | null>(null);

  const query = searchQuery.trim();

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => {
        if (mounted) setReduceMotion(value);
      })
      .catch(() => {});
    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduceMotion);
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (!visible) return;
    reveal.setValue(reduceMotion ? 1 : 0);
    const animation = Animated.timing(reveal, {
      toValue: 1,
      duration: reduceMotion ? 0 : 220,
      useNativeDriver: Platform.OS !== "web",
    });
    animation.start();
    return () => animation.stop();
  }, [visible, reveal, reduceMotion]);

  // Search effect: only executes when query is not empty
  // When query is empty, do NOT load suggestions — hide everything.
  useEffect(() => {
    if (!visible) return;

    if (!query) {
      setPeople([]);
      setPosts([]);
      setLoading(false);
      setError(false);
      return;
    }

    const id = ++requestId.current;
    let cancelled = false;
    setLoading(true);
    setError(false);

    const timer = setTimeout(async () => {
      try {
        const [peopleResults, postsResults] = await Promise.all([
          searchUsersToConnectApi(query).catch(() => []),
          getPostsApi(undefined, undefined, query).catch(() => []),
        ]);

        if (!cancelled && requestId.current === id) {
          setPeople(peopleResults);
          setPosts(postsResults);
        }
      } catch {
        if (!cancelled && requestId.current === id) {
          setError(true);
        }
      } finally {
        if (!cancelled && requestId.current === id) {
          setLoading(false);
        }
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, visible, retry]);

  const close = () => {
    requestId.current++;
    Keyboard.dismiss();
    setSearchQuery("");
    setPeople([]);
    setPosts([]);
    setLoading(false);
    setSelectedPost(null);
    onClose();
  };

  const openPerson = (person: { id: string; name: string; avatarUrl?: string; role?: string }) => {
    close();
    router.push({
      pathname: "/user/UserProfile",
      params: {
        userId: person.id,
        userName: person.name,
        userAvatar: person.avatarUrl,
        userRole: person.role,
      },
    });
  };

  const openPersonFromPost = (post: PostItem) => {
    close();
    router.push({
      pathname: "/user/UserProfile",
      params: {
        userId: post.userId,
        userName: post.authorName,
        userAvatar: post.avatarUri,
        userRole: post.authorRole,
      },
    });
  };

  const getPostMedia = (post: PostItem): string | undefined => {
    if (Array.isArray(post.images) && post.images.length > 0 && post.images[0]) {
      return post.images[0];
    }
    if (post.imageUrl) return post.imageUrl;
    if (post.originalPost?.imageUrl) return post.originalPost.imageUrl;
    return undefined;
  };

  return (
    <Modal
      visible={visible}
      animationType={reduceMotion ? "none" : "fade"}
      onRequestClose={close}
      onShow={() => inputRef.current?.focus()}
    >
      <SafeAreaView style={styles.screen}>
        {/* Top Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={close}
            accessibilityRole="button"
            accessibilityLabel="Close search"
            style={styles.iconButton}
          >
            <Ionicons name="arrow-back" size={22} color={themeColor("#283C33", "#E6E6E6")} />
          </TouchableOpacity>

          <View style={styles.searchField}>
            <Ionicons name="search-outline" size={19} color={themeColor("#657C6C", "#E6E6E6")} />
            <TextInput
              ref={inputRef}
              value={searchQuery}
              onChangeText={(text) => {
                setSearchQuery(text);
                if (text.trim()) setLoading(true);
              }}
              placeholder={activeTab === "people" ? "Search people..." : "Search posts..."}
              placeholderTextColor={themeColor("#88938D", "#E6E6E6")}
              accessibilityLabel="Search people or posts"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
              onSubmitEditing={() => Keyboard.dismiss()}
              style={styles.input}
            />
            {query.length > 0 && (
              <TouchableOpacity
                onPress={() => {
                  setSearchQuery("");
                  setPeople([]);
      setPosts([]);
                  setPosts([]);
                  setLoading(false);
                  inputRef.current?.focus();
                }}
                accessibilityRole="button"
                accessibilityLabel="Clear search"
                style={styles.clearButton}
              >
                <Ionicons name="close" size={18} color={themeColor("#77857D", "#E6E6E6")} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Tab Selector (People | Posts) */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            onPress={() => setActiveTab("people")}
            activeOpacity={0.7}
            style={[styles.tabButton, activeTab === "people" && styles.tabButtonActive]}
          >
            <Ionicons
              name={activeTab === "people" ? "people" : "people-outline"}
              size={17}
              color={activeTab === "people" ? "#FFFFFF" : "#556B5D"}
            />
            <Text style={[styles.tabText, activeTab === "people" && styles.tabTextActive]}>
              People
            </Text>
            {query.length > 0 && !loading && (
              <View
                style={[
                  styles.tabBadge,
                  activeTab === "people" ? styles.tabBadgeActive : styles.tabBadgeInactive,
                ]}
              >
                <Text
                  style={[
                    styles.tabBadgeText,
                    activeTab === "people"
                      ? styles.tabBadgeTextActive
                      : styles.tabBadgeTextInactive,
                  ]}
                >
                  {people.length}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveTab("posts")}
            activeOpacity={0.7}
            style={[styles.tabButton, activeTab === "posts" && styles.tabButtonActive]}
          >
            <Ionicons
              name={activeTab === "posts" ? "newspaper" : "newspaper-outline"}
              size={17}
              color={activeTab === "posts" ? "#FFFFFF" : "#556B5D"}
            />
            <Text style={[styles.tabText, activeTab === "posts" && styles.tabTextActive]}>
              Posts
            </Text>
            {query.length > 0 && !loading && (
              <View
                style={[
                  styles.tabBadge,
                  activeTab === "posts" ? styles.tabBadgeActive : styles.tabBadgeInactive,
                ]}
              >
                <Text
                  style={[
                    styles.tabBadgeText,
                    activeTab === "posts"
                      ? styles.tabBadgeTextActive
                      : styles.tabBadgeTextInactive,
                  ]}
                >
                  {posts.length}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Search Results Area */}
        <Animated.View
          style={[
            styles.content,
            {
              opacity: reveal,
              transform: [
                {
                  translateY: reveal.interpolate({
                    inputRange: [0, 1],
                    outputRange: [8, 0],
                  }),
                },
              ],
            },
          ]}
        >
          {/* Header count when query exists */}
          {query.length > 0 && (
          <View style={styles.heading}>
              <Text style={styles.title}>
                {activeTab === "people" ? "People" : "Posts"}
                {!loading && !error && (
                  <Text style={styles.count}>
                    {" "}
                    ({activeTab === "people" ? people.length : posts.length})
                  </Text>
                )}
              </Text>
            </View>
          )}

          {activeTab === "people" ? (
            <FlatList
              data={loading || !query ? [] : people}
              keyExtractor={(person) => String(person.id)}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              contentContainerStyle={styles.list}
              ItemSeparatorComponent={() => <View style={styles.divider} />}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => openPerson(item)}
                  activeOpacity={0.65}
                  accessibilityRole="button"
                  accessibilityLabel={`View ${item.name}'s profile`}
                  style={styles.personRow}
                >
                  <View style={styles.avatar}>
                    {item.avatarUrl ? (
                      <Image source={{ uri: item.avatarUrl }} style={styles.avatarImage} />
                    ) : (
                      <Ionicons name="person" size={24} color={themeColor("#34594A", "#E6E6E6")} />
                    )}
                  </View>
                  <View style={styles.personInfo}>
                    <Text numberOfLines={2} style={styles.name}>
                      {item.name}
                    </Text>
                    <Text numberOfLines={1} style={styles.subtitle}>
                      {item.username ? `@${item.username}` : item.role || "LocalFarm member"}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={themeColor("#A0ACA4", "#E6E6E6")} />
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={styles.empty} accessibilityLiveRegion="polite">
                  {loading ? (
                    <>
                      <ActivityIndicator color={themeColor("#52735E", "#E6E6E6")} size="small" />
                      <Text style={styles.emptyTitle}>Searching people…</Text>
                    </>
                  ) : error ? (
                    <>
                      <View style={styles.emptyIcon}>
                        <Ionicons name="cloud-offline-outline" size={28} color={themeColor("#708776", "#E6E6E6")} />
                      </View>
                      <Text style={styles.emptyTitle}>Search is unavailable</Text>
                      <Text style={styles.emptyDescription}>Please try again in a moment.</Text>
                      <TouchableOpacity
                        accessibilityRole="button"
                        onPress={() => setRetry((v) => v + 1)}
                        style={styles.retry}
                      >
                        <Text style={styles.retryText}>Try again</Text>
                      </TouchableOpacity>
                    </>
                  ) : query ? (
                    <>
                      <View style={styles.emptyIcon}>
                        <Ionicons name="people-outline" size={28} color={themeColor("#708776", "#E6E6E6")} />
                      </View>
                      <Text style={styles.emptyTitle}>No results found</Text>
                      <Text style={styles.emptyDescription}>
                        Try searching with another name or username.
                      </Text>
                    </>
                  ) : (
                    <>
                      <View style={styles.emptyIcon}>
                        <Ionicons name="search-outline" size={28} color={themeColor("#708776", "#E6E6E6")} />
                      </View>
                      <Text style={styles.emptyTitle}>Find people</Text>
                      <Text style={styles.emptyDescription}>
                        Type a name or username above to search members and farmers.
                      </Text>
                    </>
                  )}
                </View>
              }
            />
          ) : (
            <FlatList
              data={loading || !query ? [] : posts}
              keyExtractor={(post) => String(post.id)}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              contentContainerStyle={styles.postList}
              ItemSeparatorComponent={() => <View style={styles.postSeparator} />}
              renderItem={({ item }) => {
                const mediaUrl = getPostMedia(item);
                return (
                  <TouchableOpacity
                    onPress={() => setSelectedPost(item)}
                    activeOpacity={0.8}
                    style={styles.postCard}
                  >
                    {/* Post Author Info */}
                    <View style={styles.postCardHeader}>
                      <TouchableOpacity
                        onPress={() => openPersonFromPost(item)}
                        style={styles.postAuthorButton}
                        activeOpacity={0.7}
                      >
                        <View style={styles.postAvatar}>
                          {item.avatarUri ? (
                            <Image source={{ uri: item.avatarUri }} style={styles.avatarImage} />
                          ) : (
                            <Ionicons name="person" size={18} color={themeColor("#34594A", "#E6E6E6")} />
                          )}
                        </View>
                        <View style={styles.postAuthorInfo}>
                          <View style={styles.authorNameRow}>
                            <Text numberOfLines={1} style={styles.postAuthorName}>
                              {item.authorName}
                            </Text>
                            {item.isVerified && (
                              <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                            )}
                          </View>
                          <Text numberOfLines={1} style={styles.postMeta}>
                            {item.timeAgo || "Recently"}
                            {item.location ? ` • ${item.location}` : ""}
                          </Text>
                        </View>
                      </TouchableOpacity>

                      {item.cropName ? (
                        <View style={styles.cropBadge}>
                          <Text style={styles.cropBadgeText}>{item.cropName}</Text>
                        </View>
                      ) : null}
                    </View>

                    {/* Post Text */}
                    {Boolean(item.content) && (
                      <Text numberOfLines={3} style={styles.postContentText}>
                        {item.content}
                      </Text>
                    )}

                    {/* Post Image Thumbnail */}
                    {Boolean(mediaUrl) && (
                      <View style={styles.postImageWrapper}>
                        <Image
                          source={{ uri: mediaUrl }}
                          style={styles.postThumbnail}
                          resizeMode="cover"
                        />
                      </View>
                    )}

                    {/* Post Footer Stats */}
                    <View style={styles.postFooter}>
                      <View style={styles.postStat}>
                        <Ionicons name="heart-outline" size={15} color={themeColor("#697A70", "#E6E6E6")} />
                        <Text style={styles.postStatText}>{item.likes || 0}</Text>
                      </View>
                      <View style={styles.postStat}>
                        <Ionicons name="chatbubble-outline" size={14} color={themeColor("#697A70", "#E6E6E6")} />
                        <Text style={styles.postStatText}>{item.comments || 0}</Text>
                      </View>
                      {Boolean(item.category) && (
                        <View style={styles.categoryBadge}>
                          <Text style={styles.categoryBadgeText}>{item.category}</Text>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <View style={styles.empty} accessibilityLiveRegion="polite">
                  {loading ? (
                    <>
                      <ActivityIndicator color={themeColor("#52735E", "#E6E6E6")} size="small" />
                      <Text style={styles.emptyTitle}>Searching posts…</Text>
                    </>
                  ) : error ? (
                    <>
                      <View style={styles.emptyIcon}>
                        <Ionicons name="cloud-offline-outline" size={28} color={themeColor("#708776", "#E6E6E6")} />
                      </View>
                      <Text style={styles.emptyTitle}>Search is unavailable</Text>
                      <Text style={styles.emptyDescription}>Please try again in a moment.</Text>
                      <TouchableOpacity
                        accessibilityRole="button"
                        onPress={() => setRetry((v) => v + 1)}
                        style={styles.retry}
                      >
                        <Text style={styles.retryText}>Try again</Text>
                      </TouchableOpacity>
                    </>
                  ) : query ? (
                    <>
                      <View style={styles.emptyIcon}>
                        <Ionicons name="newspaper-outline" size={28} color={themeColor("#708776", "#E6E6E6")} />
                      </View>
                      <Text style={styles.emptyTitle}>No posts found</Text>
                      <Text style={styles.emptyDescription}>
                        Try searching with different keywords, crop names, or topics.
                      </Text>
                    </>
                  ) : (
                    <>
                      <View style={styles.emptyIcon}>
                        <Ionicons name="newspaper-outline" size={28} color={themeColor("#708776", "#E6E6E6")} />
                      </View>
                      <Text style={styles.emptyTitle}>Find posts</Text>
                      <Text style={styles.emptyDescription}>
                        Type keywords above to search discussions, harvest updates, and farm posts.
                      </Text>
                    </>
                  )}
                </View>
              }
            />
          )}
        </Animated.View>

        {/* Selected Post Detail Modal */}
        <Modal
          visible={!!selectedPost}
          animationType="slide"
          onRequestClose={() => setSelectedPost(null)}
        >
          <SafeAreaView style={styles.screen}>
            <View style={styles.modalHeader}>
              <TouchableOpacity
                onPress={() => setSelectedPost(null)}
                accessibilityRole="button"
                accessibilityLabel="Close post"
                style={styles.iconButton}
              >
                <Ionicons name="arrow-back" size={22} color={themeColor("#283C33", "#E6E6E6")} />
              </TouchableOpacity>
              <Text style={styles.modalHeaderTitle}>Post Details</Text>
              <View style={{ width: 40 }} />
            </View>

            {selectedPost && (
              <ScrollView
                style={styles.modalScroll}
                contentContainerStyle={styles.modalScrollContent}
                showsVerticalScrollIndicator={false}
              >
                {/* Author row */}
                <TouchableOpacity
                  onPress={() => {
                    const post = selectedPost;
                    setSelectedPost(null);
                    openPersonFromPost(post);
                  }}
                  activeOpacity={0.7}
                  style={styles.modalAuthorRow}
                >
                  <View style={styles.modalAvatar}>
                    {selectedPost.avatarUri ? (
                      <Image
                        source={{ uri: selectedPost.avatarUri }}
                        style={styles.avatarImage}
                      />
                    ) : (
                      <Ionicons name="person" size={22} color={themeColor("#34594A", "#E6E6E6")} />
                    )}
                  </View>
                  <View style={styles.modalAuthorInfo}>
                    <View style={styles.authorNameRow}>
                      <Text style={styles.modalAuthorName}>{selectedPost.authorName}</Text>
                      {selectedPost.isVerified && (
                        <Ionicons name="checkmark-circle" size={15} color="#10B981" />
                      )}
                    </View>
                    <Text style={styles.modalAuthorSubtext}>
                      {selectedPost.authorRole || "Member"} • {selectedPost.timeAgo || "Recently"}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={themeColor("#A0ACA4", "#E6E6E6")} />
                </TouchableOpacity>

                {/* Badges */}
                <View style={styles.modalBadgesRow}>
                  {Boolean(selectedPost.cropName) && (
                    <View style={styles.modalCropBadge}>
                      <Text style={styles.modalCropBadgeText}>🌾 {selectedPost.cropName}</Text>
                    </View>
                  )}
                  {Boolean(selectedPost.category) && (
                    <View style={styles.modalCategoryBadge}>
                      <Text style={styles.modalCategoryBadgeText}>
                        {selectedPost.category}
                      </Text>
                    </View>
                  )}
                  {Boolean(selectedPost.location) && (
                    <View style={styles.modalLocationBadge}>
                      <Ionicons name="location-outline" size={13} color={themeColor("#556B5D", "#E6E6E6")} />
                      <Text style={styles.modalLocationText}>{selectedPost.location}</Text>
                    </View>
                  )}
                </View>

                {/* Post Content */}
                {Boolean(selectedPost.content) && (
                  <Text style={styles.modalContentText}>{selectedPost.content}</Text>
                )}

                {/* Post Media */}
                {Boolean(getPostMedia(selectedPost)) && (
                  <View style={styles.modalImageContainer}>
                    <Image
                      source={{ uri: getPostMedia(selectedPost) }}
                      style={styles.modalImage}
                      resizeMode="cover"
                    />
                  </View>
                )}

                {/* Stats */}
                <View style={styles.modalStatsRow}>
                  <View style={styles.modalStatItem}>
                    <Ionicons name="heart" size={18} color="#D9534F" />
                    <Text style={styles.modalStatValue}>{selectedPost.likes || 0} likes</Text>
                  </View>
                  <View style={styles.modalStatItem}>
                    <Ionicons name="chatbubble" size={17} color={themeColor("#52735E", "#E6E6E6")} />
                    <Text style={styles.modalStatValue}>
                      {selectedPost.comments || 0} comments
                    </Text>
                  </View>
                </View>

                {/* Action button */}
                <TouchableOpacity
                  onPress={() => {
                    const post = selectedPost;
                    setSelectedPost(null);
                    openPersonFromPost(post);
                  }}
                  activeOpacity={0.8}
                  style={styles.viewProfileBtn}
                >
                  <Ionicons name="person-circle-outline" size={19} color={themeColor("#FFFFFF", "#181818")} />
                  <Text style={styles.viewProfileBtnText}>
                    View {selectedPost.authorName}'s Profile
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </SafeAreaView>
        </Modal>
      </SafeAreaView>
    </Modal>
  );
};

const createStyles = (themeColor: (light: string, dark: string) => string) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: themeColor("#FFFFFF", "#242424") },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: themeColor("#EDF0EB", "#414141"),
  },
  iconButton: {
    width: 40,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  searchField: {
    flex: 1,
    height: 44,
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 14,
    borderRadius: 12,
    backgroundColor: themeColor("#F1F4EF", "#181818"),
    borderWidth: 1,
    borderColor: themeColor("#E5EAE2", "#414141"),
  },
  input: {
    flex: 1,
    minWidth: 0,
    height: 44,
    marginLeft: 9,
    paddingVertical: 0,
    fontSize: 14,
    color: themeColor("#273B30", "#E6E6E6"),
  },
  clearButton: {
    width: 38,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  tabsContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
    backgroundColor: themeColor("#FAFBF9", "#242424"),
    borderBottomWidth: 1,
    borderBottomColor: themeColor("#EEF2EC", "#414141"),
  },
  tabButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: themeColor("#EDF1EB", "#181818"),
    gap: 6,
  },
  tabButtonActive: {
    backgroundColor: themeColor("#2E523E", "#E6E6E6"),
  },
  tabText: {
    fontSize: 13,
    fontWeight: "600",
    color: themeColor("#465B4E", "#E6E6E6"),
  },
  tabTextActive: {
    color: themeColor("#FFFFFF", "#E6E6E6"),
  },
  tabBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  tabBadgeActive: {
    backgroundColor: "rgba(255, 255, 255, 0.25)",
  },
  tabBadgeInactive: {
    backgroundColor: themeColor("#D9E2D8", "#303030"),
  },
  tabBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  tabBadgeTextActive: {
    color: themeColor("#FFFFFF", "#E6E6E6"),
  },
  tabBadgeTextInactive: {
    color: themeColor("#3F5647", "#E6E6E6"),
  },
  content: { flex: 1 },
  heading: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 15,
    fontWeight: "600",
    color: themeColor("#293647", "#E6E6E6"),
  },
  count: {
    fontSize: 15,
    fontWeight: "600",
    color: themeColor("#34594A", "#E6E6E6"),
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  personRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 14,
  },
  avatar: {
    height: 46,
    width: 46,
    borderRadius: 23,
    backgroundColor: themeColor("#E5E7EB", "#181818"),
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImage: {
    height: "100%",
    width: "100%",
  },
  personInfo: {
    flex: 1,
    gap: 3,
  },
  name: {
    fontSize: 14,
    fontWeight: "600",
    color: themeColor("#2C3D32", "#E6E6E6"),
  },
  subtitle: {
    fontSize: 12,
    color: themeColor("#859087", "#E6E6E6"),
  },
  divider: {
    height: 1,
    backgroundColor: themeColor("#EEF1EB", "#181818"),
    marginLeft: 60,
  },
  empty: {
    alignItems: "center",
    paddingHorizontal: 28,
    paddingVertical: 56,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 24,
    backgroundColor: themeColor("#F0F4EC", "#181818"),
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: themeColor("#394E3F", "#E6E6E6"),
    marginTop: 18,
    textAlign: "center",
  },
  emptyDescription: {
    fontSize: 13,
    lineHeight: 19,
    color: themeColor("#7E8C82", "#E6E6E6"),
    marginTop: 6,
    textAlign: "center",
  },
  retry: {
    paddingHorizontal: 20,
    paddingVertical: 11,
    marginTop: 16,
    borderRadius: 10,
    backgroundColor: themeColor("#EAF0E6", "#181818"),
  },
  retryText: {
    fontSize: 13,
    fontWeight: "600",
    color: themeColor("#52735E", "#E6E6E6"),
  },

  // Post List & Card Styles
  postList: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 32,
  },
  postSeparator: {
    height: 12,
  },
  postCard: {
    backgroundColor: themeColor("#FFFFFF", "#242424"),
    borderRadius: 14,
    borderWidth: 1,
    borderColor: themeColor("#E6ECE4", "#414141"),
    padding: 14,
    ...Platform.select({
      web: {
        boxShadow: "0 1px 3px rgba(0, 0, 0, 0.04)",
      },
      default: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 3,
        elevation: 1,
      },
    }),
  },
  postCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  postAuthorButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  postAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: themeColor("#EAF0E7", "#181818"),
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  postAuthorInfo: {
    flex: 1,
  },
  authorNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  postAuthorName: {
    fontSize: 13,
    fontWeight: "600",
    color: themeColor("#273A2E", "#E6E6E6"),
  },
  postMeta: {
    fontSize: 11,
    color: themeColor("#849288", "#E6E6E6"),
    marginTop: 1,
  },
  cropBadge: {
    backgroundColor: themeColor("#EBF3E8", "#181818"),
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  cropBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: themeColor("#355E40", "#E6E6E6"),
  },
  postContentText: {
    fontSize: 13,
    lineHeight: 19,
    color: themeColor("#34453A", "#E6E6E6"),
    marginBottom: 10,
  },
  postImageWrapper: {
    width: "100%",
    height: 160,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: themeColor("#F2F5F0", "#181818"),
    marginBottom: 10,
  },
  postThumbnail: {
    width: "100%",
    height: "100%",
  },
  postFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: themeColor("#F2F5F0", "#414141"),
  },
  postStat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  postStatText: {
    fontSize: 12,
    color: themeColor("#6D7E73", "#E6E6E6"),
    fontWeight: "500",
  },
  categoryBadge: {
    marginLeft: "auto",
    backgroundColor: themeColor("#F0F4EF", "#181818"),
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  categoryBadgeText: {
    fontSize: 10,
    color: themeColor("#5B7062", "#E6E6E6"),
    fontWeight: "500",
  },

  // Modal Detail Styles
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: themeColor("#EDF0EB", "#414141"),
  },
  modalHeaderTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: themeColor("#283C33", "#E6E6E6"),
  },
  modalScroll: {
    flex: 1,
  },
  modalScrollContent: {
    padding: 18,
    paddingBottom: 40,
  },
  modalAuthorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: themeColor("#EDF1EB", "#414141"),
  },
  modalAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: themeColor("#EBF0E8", "#181818"),
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  modalAuthorInfo: {
    flex: 1,
  },
  modalAuthorName: {
    fontSize: 15,
    fontWeight: "700",
    color: themeColor("#24372B", "#E6E6E6"),
  },
  modalAuthorSubtext: {
    fontSize: 12,
    color: themeColor("#7E8C82", "#E6E6E6"),
    marginTop: 2,
  },
  modalBadgesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 14,
    marginBottom: 12,
  },
  modalCropBadge: {
    backgroundColor: themeColor("#E8F2E4", "#181818"),
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  modalCropBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: themeColor("#2F5938", "#E6E6E6"),
  },
  modalCategoryBadge: {
    backgroundColor: themeColor("#EDF2EC", "#181818"),
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  modalCategoryBadgeText: {
    fontSize: 12,
    fontWeight: "500",
    color: themeColor("#4A6152", "#E6E6E6"),
  },
  modalLocationBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: themeColor("#F4F7F2", "#181818"),
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  modalLocationText: {
    fontSize: 12,
    color: themeColor("#556B5D", "#E6E6E6"),
  },
  modalContentText: {
    fontSize: 15,
    lineHeight: 23,
    color: themeColor("#2C3E33", "#E6E6E6"),
    marginBottom: 16,
  },
  modalImageContainer: {
    width: "100%",
    height: 260,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: themeColor("#F1F5EF", "#181818"),
    marginBottom: 16,
  },
  modalImage: {
    width: "100%",
    height: "100%",
  },
  modalStatsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: themeColor("#EEF2EC", "#414141"),
    marginBottom: 20,
  },
  modalStatItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  modalStatValue: {
    fontSize: 13,
    fontWeight: "600",
    color: themeColor("#3F5647", "#E6E6E6"),
  },
  viewProfileBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: themeColor("#2E523E", "#E6E6E6"),
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  viewProfileBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: themeColor("#FFFFFF", "#E6E6E6"),
  },
});
