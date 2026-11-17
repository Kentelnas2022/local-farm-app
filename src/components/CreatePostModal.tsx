import { useAppTheme } from "@/context/theme-context";
import CalmEntrance from "./CalmEntrance";
import { useToast } from "@/context/toast-context";
import { useAuth } from "@/hooks/use-auth";
import {
  getFriendsApi,
  searchUsersToConnectApi,
} from "@/services/connection-service";
import {
  getCurrentDeviceLocation,
  LocationSearchResult,
  POPULAR_FARM_LOCATIONS,
  reverseGeocodeApi,
  searchLocationsApi,
} from "@/services/location-service";
import { createPostApi, PostItem } from "@/services/post-service";
import { uploadImageToSupabase } from "@/lib/storage";
import {
  getRSBSAApplication,
  RSBSAApplication,
  setRSBSAStatus,
} from "@/services/rsbsa-service";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AccessibilityInfo,
  ActivityIndicator,
  Animated,
  Dimensions,
  Image,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import LeafletMap from "./LeafletMap";
import DraggableToolRow from "./DraggableToolRow";
import LiveBroadcasterModal from "./LiveBroadcasterModal";

export interface CreatePostModalProps {
  isVisible: boolean;
  onClose: () => void;
  onPost?: (post: PostItem) => void;
}

type ViewMode =
  | "POST_FORM"
  | "PRIVACY"
  | "LIVE_PERMISSION"
  | "TAG_PEOPLE"
  | "ADD_LOCATION";

type PrivacyType = "Public" | "Friends" | "Only me";

interface PrivacyOption {
  id: PrivacyType;
  title: PrivacyType;
  icon: keyof typeof Ionicons.glyphMap;
}

interface Friend {
  id: string;
  fullName: string;
  firstName: string;
  username?: string;
  avatarUrl?: string;
}

const CATEGORIES = ["Field", "Wholesaler", "Temporary"];

export interface TemporaryDurationOption {
  label: string;
  value: number;
  icon: keyof typeof Ionicons.glyphMap;
  description: string;
}

export const TEMPORARY_DURATIONS: TemporaryDurationOption[] = [
  {
    label: "6 Hours",
    value: 6 * 3600 * 1000,
    icon: "sunny-outline",
    description: "Morning market stall or short pop-up",
  },
  {
    label: "10 Hours",
    value: 10 * 3600 * 1000,
    icon: "timer-outline",
    description: "Day-long farm stand or fresh batch",
  },
  {
    label: "12 Hours",
    value: 12 * 3600 * 1000,
    icon: "time-outline",
    description: "Same-day harvest & daily clearance",
  },
  {
    label: "24 Hours",
    value: 24 * 3600 * 1000,
    icon: "hourglass-outline",
    description: "Full-day agricultural post",
  },
];

const PRIVACY_OPTIONS: PrivacyOption[] = [
  {
    id: "Public",
    title: "Public",
    icon: "globe",
  },
  {
    id: "Friends",
    title: "Friends",
    icon: "people",
  },
  {
    id: "Only me",
    title: "Only me",
    icon: "lock-closed",
  },
];

export interface StaticFarmingLocation {
  id: string;
  name: string;
  barangay: string;
  latitude: number;
  longitude: number;
  type: string;
}

export const STATIC_POST_LOCATIONS: StaticFarmingLocation[] = [
  {
    id: "palao",
    name: "Pala-o, Iligan City",
    barangay: "Pala-o",
    latitude: 8.2283,
    longitude: 124.2452,
    type: "🌿 Farm Market",
  },
  {
    id: "tipanoy",
    name: "Tipanoy, Iligan City",
    barangay: "Tipanoy",
    latitude: 8.212,
    longitude: 124.254,
    type: "🥛 Dairy & Dragonfruit",
  },
  {
    id: "delcarmen",
    name: "Del Carmen, Iligan City",
    barangay: "Del Carmen",
    latitude: 8.2345,
    longitude: 124.243,
    type: "📦 Grains & Produce",
  },
  {
    id: "tubod",
    name: "Tubod, Iligan City",
    barangay: "Tubod",
    latitude: 8.209,
    longitude: 124.237,
    type: "🍌 Fruit Depot",
  },
  {
    id: "luinab",
    name: "Luinab, Iligan City",
    barangay: "Luinab",
    latitude: 8.2235,
    longitude: 124.261,
    type: "🌱 Herb Garden",
  },
  {
    id: "tambo",
    name: "Tambo, Iligan City",
    barangay: "Tambo",
    latitude: 8.2435,
    longitude: 124.254,
    type: "🚜 Wholesale Hub",
  },
  {
    id: "ditucalan",
    name: "Ditucalan, Iligan City",
    barangay: "Ditucalan",
    latitude: 8.1819,
    longitude: 124.1936,
    type: "🥚 Free-Range Poultry",
  },
  {
    id: "abuno",
    name: "Abuno, Iligan City",
    barangay: "Abuno",
    latitude: 8.2165,
    longitude: 124.2495,
    type: "🥭 Fruit Orchard",
  },
];

export default function CreatePostModal({
  isVisible,
  onClose,
  onPost,
}: CreatePostModalProps) {
  const { themeColor } = useAppTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [activeView, setActiveView] = useState<ViewMode>("POST_FORM");
  const [privacySetting, setPrivacySetting] = useState<PrivacyType>("Public");
  const [isDefaultAudience, setIsDefaultAudience] = useState(false);
  const [content, setContent] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Field");
  const [temporaryDuration, setTemporaryDuration] = useState<number>(
    24 * 3600 * 1000,
  );
  const [taggedUserIds, setTaggedUserIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [friendsList, setFriendsList] = useState<Friend[]>([]);
  const [isLoadingFriends, setIsLoadingFriends] = useState(false);
  const [searchedUsers, setSearchedUsers] = useState<Friend[]>([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);
  const [selectedPhotos, setSelectedPhotos] = useState<string[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [selectedCoordinates, setSelectedCoordinates] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [mapCoords, setMapCoords] = useState<{
    latitude: number;
    longitude: number;
  }>({ latitude: 8.2283, longitude: 124.2452 });
  const [locationSearch, setLocationSearch] = useState("Pala-o, Iligan City");
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const [searchResults, setSearchResults] = useState<LocationSearchResult[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isLocatingGps, setIsLocatingGps] = useState(false);
  const [rsbsaApp, setRsbsaApp] = useState<RSBSAApplication | null>(null);
  const [showRsbsaLockModal, setShowRsbsaLockModal] = useState(false);
  const [showLiveBroadcaster, setShowLiveBroadcaster] = useState(false);

  const loadFriends = useCallback(async () => {
    setIsLoadingFriends(true);
    try {
      const res = await getFriendsApi();
      setFriendsList(
        res.map((f) => ({
          id: f.id,
          fullName: f.name,
          firstName: f.name.split(" ")[0] || f.name,
          username: f.username,
          avatarUrl: f.avatarUrl,
        })),
      );
    } catch (e) {
      console.warn("Error fetching friends for tag:", e);
    } finally {
      setIsLoadingFriends(false);
    }
  }, []);

  useEffect(() => {
    if (isVisible) {
      loadFriends();
    }
  }, [isVisible, loadFriends]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchedUsers([]);
      return;
    }
    const timeout = setTimeout(async () => {
      setIsSearchingUsers(true);
      try {
        const results = await searchUsersToConnectApi(searchQuery.trim());
        setSearchedUsers(
          results.map((u) => ({
            id: u.id,
            fullName: u.name,
            firstName: u.name.split(" ")[0] || u.name,
            username: u.username,
            avatarUrl: u.avatarUrl,
          })),
        );
      } catch (e) {
        console.warn("User search error for tag:", e);
      } finally {
        setIsSearchingUsers(false);
      }
    }, 350);
    return () => clearTimeout(timeout);
  }, [searchQuery]);

  const filteredFriends = useMemo(() => {
    if (searchQuery.trim()) {
      const queryLower = searchQuery.toLowerCase();
      const matchedFriends = friendsList.filter(
        (f) =>
          f.fullName.toLowerCase().includes(queryLower) ||
          (f.username && f.username.toLowerCase().includes(queryLower)),
      );
      const friendIds = new Set(matchedFriends.map((f) => f.id));
      const matchedSearched = searchedUsers.filter((u) => !friendIds.has(u.id));
      return [...matchedFriends, ...matchedSearched];
    }
    return friendsList;
  }, [searchQuery, friendsList, searchedUsers]);

  const getFriendById = useCallback(
    (userId: string) => {
      return (
        friendsList.find((f) => f.id === userId) ||
        searchedUsers.find((f) => f.id === userId)
      );
    },
    [friendsList, searchedUsers],
  );

  // Debounced live location search
  useEffect(() => {
    if (!locationSearch || locationSearch.trim().length < 2) {
      setSearchResults([]);
      setIsSearchingLocation(false);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearchingLocation(true);
      try {
        const results = await searchLocationsApi(locationSearch);
        setSearchResults(results);
      } catch (err) {
        console.warn("Location search error:", err);
      } finally {
        setIsSearchingLocation(false);
      }
    }, 380);

    return () => clearTimeout(timer);
  }, [locationSearch]);

  const handleMapLocationSelect = async (lat: number, lng: number) => {
    setMapCoords({ latitude: lat, longitude: lng });
    setShowSearchResults(false);
    setIsGeocoding(true);
    try {
      const address = await reverseGeocodeApi(lat, lng);
      setLocationSearch(address);
    } catch (err) {
      console.warn("Reverse geocode error:", err);
      setLocationSearch(`Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
    } finally {
      setIsGeocoding(false);
    }
  };

  const handleSelectSearchResult = (result: LocationSearchResult) => {
    setMapCoords({ latitude: result.latitude, longitude: result.longitude });
    setLocationSearch(result.name || result.fullName);
    setShowSearchResults(false);
  };

  const handleUseCurrentLocation = async () => {
    setIsLocatingGps(true);
    try {
      const loc = await getCurrentDeviceLocation();
      if (loc) {
        setMapCoords({ latitude: loc.latitude, longitude: loc.longitude });
        setIsGeocoding(true);
        const resolved = await reverseGeocodeApi(loc.latitude, loc.longitude);
        setLocationSearch(resolved);
        setShowSearchResults(false);
        showToast("Centered on your current location!", "success");
      } else {
        showToast(
          "Could not detect your current location. Please ensure GPS/location permissions are enabled.",
          "warning",
        );
      }
    } catch (err: any) {
      showToast(err?.message || "Location request failed.", "error");
    } finally {
      setIsGeocoding(false);
      setIsLocatingGps(false);
    }
  };

  const [showPhotoOptions, setShowPhotoOptions] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      if (mounted) setReduceMotion(value);
    }).catch(() => {});
    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduceMotion);
    return () => { mounted = false; subscription.remove(); };
  }, []);
  // Swipe-down-to-dismiss animated gesture
  const [translateY] = useState(() => new Animated.Value(0));

  const handleClose = useCallback(() => {
    setShowPhotoOptions(false);
    setShowRsbsaLockModal(false);
    setActiveView("POST_FORM");
    translateY.setValue(0);
    onClose();
  }, [onClose, translateY]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, gestureState) => {
          return (
            gestureState.dy > 5 &&
            Math.abs(gestureState.dy) > Math.abs(gestureState.dx)
          );
        },
        onPanResponderMove: (_, gestureState) => {
          if (gestureState.dy > 0) {
            translateY.setValue(gestureState.dy);
          }
        },
        onPanResponderRelease: (_, gestureState) => {
          if (gestureState.dy > 120 || gestureState.vy > 0.8) {
            Animated.timing(translateY, {
              toValue: Dimensions.get("window").height,
              duration: 200,
              useNativeDriver: Platform.OS !== "web",
            }).start(() => handleClose());
          } else {
            Animated.spring(translateY, {
              toValue: 0,
              bounciness: 4,
              useNativeDriver: Platform.OS !== "web",
            }).start();
          }
        },
      }),
    [handleClose, translateY],
  );

  useEffect(() => {
    if (!isVisible) {
      translateY.setValue(0);
      setActiveView("POST_FORM");
    }
  }, [isVisible, translateY]);

  useEffect(() => {
    if (isVisible) {
      getRSBSAApplication()
        .then((app) => setRsbsaApp(app))
        .catch(() => setRsbsaApp(null));
    }
  }, [isVisible]);

  const isRSBSAVerified = rsbsaApp?.status === "verified";

  const handleOpenLive = () => {
    if (!isRSBSAVerified) {
      setShowRsbsaLockModal(true);
      return;
    }
    setActiveView("LIVE_PERMISSION");
  };

  const { showToast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePostSubmit = async () => {
    const trimmedContent = content.trim();
    if (!trimmedContent && selectedPhotos.length === 0) {
      showToast("Please enter some text or select a photo.", "info");
      return;
    }

    setIsSubmitting(true);
    try {
      const isTemp = selectedCategory === "Temporary";
      const expiresAt = isTemp ? Date.now() + temporaryDuration : null;
      const durationOpt = TEMPORARY_DURATIONS.find(
        (d) => d.value === temporaryDuration,
      );

      // Upload local images to Supabase 'posts' storage bucket
      const uploadedPhotos: string[] = [];
      for (const uri of selectedPhotos) {
        if (uri.startsWith("http")) {
          uploadedPhotos.push(uri);
        } else {
          try {
            const { publicUrl, error } = await uploadImageToSupabase("posts", uri);
            if (!error && publicUrl) {
              uploadedPhotos.push(publicUrl);
            } else {
              uploadedPhotos.push(uri);
            }
          } catch {
            uploadedPhotos.push(uri);
          }
        }
      }

      const newPost = await createPostApi({
        content: trimmedContent,
        category: selectedCategory,
        privacy: privacySetting,
        location: selectedLocation ? selectedLocation.trim() : null,
        latitude: selectedLocation
          ? (selectedCoordinates?.latitude ?? mapCoords.latitude)
          : null,
        longitude: selectedLocation
          ? (selectedCoordinates?.longitude ?? mapCoords.longitude)
          : null,
        photos: uploadedPhotos,
        images: uploadedPhotos,
        imageUrl: uploadedPhotos.length > 0 ? uploadedPhotos[0] : undefined,
        taggedUserIds: taggedUserIds.length > 0 ? taggedUserIds : undefined,
        expiresAt,
        temporaryDuration: isTemp ? temporaryDuration : undefined,
        durationLabel: isTemp ? durationOpt?.label : undefined,
      });

      // Augment returned post with static expiry data and tagged users for client-side rendering/filtering
      const clientPost = {
        ...newPost,
        category: selectedCategory,
        privacy: privacySetting,
        location: selectedLocation ? selectedLocation.trim() : newPost.location,
        imageUrl:
          newPost.imageUrl ||
          (selectedPhotos.length > 0 ? selectedPhotos[0] : ""),
        images:
          newPost.images && newPost.images.length > 0
            ? newPost.images
            : (selectedPhotos.length > 0 ? selectedPhotos : []),
        latitude:
          newPost.latitude ??
          (selectedLocation
            ? (selectedCoordinates?.latitude ?? mapCoords.latitude)
            : null),
        longitude:
          newPost.longitude ??
          (selectedLocation
            ? (selectedCoordinates?.longitude ?? mapCoords.longitude)
            : null),
        expiresAt: isTemp ? expiresAt : null,
        durationLabel: isTemp ? durationOpt?.label : undefined,
        taggedUsers:
          newPost.taggedUsers && newPost.taggedUsers.length > 0
            ? newPost.taggedUsers
            : taggedUserIds.map((id) => {
                const u = getFriendById(id);
                return {
                  id,
                  name: u?.fullName || "User",
                  username: u?.username,
                  avatarUrl: u?.avatarUrl,
                };
              }),
      };

      showToast(
        isTemp
          ? `Temporary post published (${durationOpt?.label})!`
          : "Post shared to community!",
        "success",
      );
      if (onPost) {
        onPost(clientPost);
      }
      setContent("");
      setTaggedUserIds([]);
      setSelectedPhotos([]);
      setSelectedLocation(null);
      setSelectedCoordinates(null);
      setTemporaryDuration(24 * 3600 * 1000);
      handleClose();
    } catch (err: any) {
      showToast(err?.message || "Failed to create post.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePublishLiveReplay = async (data: {
    content: string;
    durationLabel: string;
    location?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    viewerCount?: number;
    durationSeconds?: number;
  }) => {
    try {
      const newPost = await createPostApi({
        content: data.content,
        category: "Field",
        privacy: privacySetting,
        location: data.location || selectedLocation || null,
        latitude:
          data.latitude ?? (selectedCoordinates?.latitude ?? mapCoords.latitude),
        longitude:
          data.longitude ??
          (selectedCoordinates?.longitude ?? mapCoords.longitude),
        durationLabel: data.durationLabel,
        viewerCount: data.viewerCount,
        durationSeconds: data.durationSeconds,
        isLiveReplay: true,
      });

      const clientPost: PostItem = {
        ...newPost,
        category: "Field",
        privacy: privacySetting,
        durationLabel: data.durationLabel,
        location: data.location || selectedLocation || newPost.location || "",
        latitude:
          newPost.latitude ??
          data.latitude ??
          selectedCoordinates?.latitude ??
          null,
        longitude:
          newPost.longitude ??
          data.longitude ??
          selectedCoordinates?.longitude ??
          null,
      };

      if (onPost) {
        onPost(clientPost);
      }
      showToast("Live stream replay shared to your community!", "success");
      setShowLiveBroadcaster(false);
      handleClose();
    } catch (err: any) {
      showToast(err?.message || "Failed to share live replay.", "error");
      throw err;
    }
  };

  const toggleTagUser = (userId: string) => {
    setTaggedUserIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId],
    );
  };

  const handlePickPhotosFromGallery = async () => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        showToast(
          "Permission to access your gallery is required to choose photos.",
          "warning",
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsMultipleSelection: true,
        selectionLimit: 10,
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const pickedPhotos = result.assets.map((asset) => {
          if (asset.base64) {
            return `data:image/jpeg;base64,${asset.base64}`;
          }
          return asset.uri;
        });

        setSelectedPhotos((prev) => {
          const combined = [...prev];
          for (const photo of pickedPhotos) {
            if (!combined.includes(photo)) {
              combined.push(photo);
            }
          }
          return combined;
        });
      }
    } catch (err) {
      console.warn("Error picking photos from gallery:", err);
      showToast("Could not open gallery.", "error");
    }
  };

  const handleTakePhotoWithCamera = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        showToast(
          "Permission to access your camera is required to take photos.",
          "warning",
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const photo = asset.base64
          ? `data:image/jpeg;base64,${asset.base64}`
          : asset.uri;

        setSelectedPhotos((prev) => [...prev, photo]);
      }
    } catch (err) {
      console.warn("Error capturing photo with camera:", err);
      showToast("Could not open camera.", "error");
    }
  };

  const getPrivacyIcon = (
    setting: PrivacyType,
  ): keyof typeof Ionicons.glyphMap => {
    switch (setting) {
      case "Friends":
        return "people";
      case "Only me":
        return "lock-closed";
      case "Public":
      default:
        return "globe";
    }
  };

  return (
    <Modal
      visible={isVisible}
      transparent={true}
      animationType={reduceMotion ? "none" : "slide"}
      statusBarTranslucent={true}
      onRequestClose={() => {
        if (showRsbsaLockModal) {
          setShowRsbsaLockModal(false);
        } else if (activeView === "POST_FORM") {
          handleClose();
        } else {
          setActiveView("POST_FORM");
        }
      }}
    >
      {activeView === "POST_FORM" ? (
        <View 
          className="flex-1 justify-end"
          style={{
            flex: 1,
            backgroundColor: "rgba(24, 39, 31, 0.38)",
            justifyContent: "flex-end",
          }}
        >
          {/* Backdrop pressable to close when tapping outside */}
          <Pressable
            onPress={handleClose}
            className="absolute inset-0"
            style={StyleSheet.absoluteFill}
            accessibilityRole="button"
            accessibilityLabel="Close modal backdrop"
          />

          <Animated.View
            style={[
              {
                transform: [{ translateY }],
                backgroundColor: themeColor("#FDFEFC", "#242424"),
                borderTopLeftRadius: 32,
                borderTopRightRadius: 32,
                overflow: "hidden",
                width: "100%",
                maxHeight: "92%",
                shadowColor: "#000000",
                shadowOffset: { width: 0, height: -6 },
                shadowOpacity: 0.10,
                shadowRadius: 24,
                elevation: 25,
              },
            ]}
          >
            <View style={{ alignItems: "center", paddingTop: 10 }}><View style={{ width: 34, height: 4, borderRadius: 2, backgroundColor: themeColor("#DCE3DA", "#303030") }} /></View>
            {/* Header Section */}
            <View 
              {...panResponder.panHandlers}
              className="flex-row justify-between items-center px-5 pt-3 pb-4"
              style={{
                borderBottomWidth: 1,
                borderBottomColor: themeColor("#EDF0E9", "#414141"),
                backgroundColor: themeColor("#FDFEFC", "#242424"),
              }}
            >
              {/* Close Button X */}
              <TouchableOpacity
                onPress={handleClose}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                className="rounded-full active:opacity-70"
                style={{ width: 38, height: 38, backgroundColor: themeColor("#F0F3ED", "#181818"), alignItems: "center", justifyContent: "center" }}
                accessibilityRole="button"
                accessibilityLabel="Close"
              >
                <Ionicons name="close" size={20} color={themeColor("#526458", "#E6E6E6")} />
              </TouchableOpacity>

              {/* Title */}
              <Text className="font-semibold text-base text-[#2C4033] text-center dark:text-[#E6E6E6] ">
                Create Post
              </Text>

              {/* Post Button */}
              <TouchableOpacity
                onPress={handlePostSubmit}
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-xl active:opacity-80 flex-row items-center justify-center min-w-[68px]"
                style={{ backgroundColor: themeColor("#456B57", "#E6E6E6") }}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color={themeColor("#FDFEFC", "#E6E6E6")} />
                ) : (
                  <Text className="text-white font-bold text-sm dark:text-[#E6E6E6] ">Post</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Scrollable Content Area */}
            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              className="px-5 pt-5"
              style={{ flexShrink: 1 }}
              contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 20) }}
            >
              {/* User Profile & Badges */}
              <View className="flex-row items-center mb-5">
                {/* Avatar */}
                <View 
                  className="h-12 w-12 rounded-full items-center justify-center mr-3 overflow-hidden"
                  style={{ backgroundColor: themeColor("#E7EDE2", "#181818") }}
                >
                  {user?.avatarUrl ? (
                    <Image
                      source={{ uri: user.avatarUrl }}
                      style={{ width: "100%", height: "100%" }}
                      resizeMode="cover"
                    />
                  ) : (
                    <Ionicons name="person" size={24} color={themeColor("#68816B", "#E6E6E6")} />
                  )}
                </View>

                {/* Info Stack */}
                <View className="flex-1">
                  <Text className="font-bold text-base text-gray-900 leading-5 dark:text-[#E6E6E6] ">
                    {user?.name ||
                      user?.fullName ||
                      user?.username ||
                      "Juan Dela Cruz"}
                  </Text>

                  {taggedUserIds.length > 0 && (
                    <TouchableOpacity
                      onPress={() => setActiveView("TAG_PEOPLE")}
                      className="flex-row items-center mt-0.5"
                      activeOpacity={0.7}
                    >
                      <Ionicons name="pricetag" size={11} color={themeColor("#456B57", "#E6E6E6")} style={{ marginRight: 3 }} />
                      <Text className="text-xs text-[#456B57] font-semibold dark:text-[#E6E6E6] " numberOfLines={1}>
                        with {taggedUserIds.length} {taggedUserIds.length === 1 ? "person" : "people"} tagged
                      </Text>
                    </TouchableOpacity>
                  )}

                  {/* 3 Badges Row matching design */}
                  <DraggableToolRow horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={{ marginTop: 8 }} contentContainerStyle={{ alignItems: "center", gap: 6, paddingRight: 16 }}>

                    {/* Privacy Selector Trigger */}
                    <TouchableOpacity
                      onPress={() => setActiveView("PRIVACY")}
                      className="flex-row items-center px-2.5 py-1.5 rounded-lg gap-1 active:opacity-80"
                      style={{ backgroundColor: themeColor("#F0F3ED", "#181818"), borderWidth: 1, borderColor: themeColor("#E6EBE1", "#414141") }}
                    >
                      <Ionicons
                        name={getPrivacyIcon(privacySetting)}
                        size={12}
                        color={themeColor("#4B5563", "#ADADAD")}
                      />
                      <Text className="text-[11px] text-gray-700 font-medium dark:text-[#E6E6E6] ">
                        {privacySetting}
                      </Text>
                      <Ionicons name="chevron-down" size={10} color={themeColor("#4B5563", "#ADADAD")} />
                    </TouchableOpacity>

                    {/* Add Location Trigger */}
                    <TouchableOpacity
                      onPress={() => setActiveView("ADD_LOCATION")}
                      className="flex-row items-center px-2.5 py-1.5 rounded-lg gap-1 active:opacity-80 max-w-[140px]"
                      style={{ backgroundColor: themeColor("#F0F3ED", "#181818"), borderWidth: 1, borderColor: themeColor("#E6EBE1", "#414141") }}
                    >
                      <Ionicons
                        name="location-outline"
                        size={12}
                        color={themeColor("#4B5563", "#ADADAD")}
                      />
                      <Text
                        className="text-[11px] text-gray-700 font-medium dark:text-[#E6E6E6] "
                        numberOfLines={1}
                      >
                        {selectedLocation || "Add location"}
                      </Text>
                      {selectedLocation && (
                        <TouchableOpacity
                          onPress={(e) => {
                            e.stopPropagation();
                            setSelectedLocation(null);
                            setSelectedCoordinates(null);
                          }}
                          className="ml-0.5"
                          accessibilityRole="button"
                          accessibilityLabel="Remove location"
                        >
                          <Ionicons
                            name="close-circle"
                            size={12}
                            color={themeColor("#4B5563", "#ADADAD")}
                          />
                        </TouchableOpacity>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => setActiveView("TAG_PEOPLE")}
                      accessibilityRole="button"
                      accessibilityLabel="Add people"
                      className="flex-row items-center px-2.5 py-1.5 rounded-lg gap-1 active:opacity-80"
                      style={{ backgroundColor: themeColor("#F0F3ED", "#181818"), borderWidth: 1, borderColor: themeColor("#E6EBE1", "#414141") }}
                    >
                      <Ionicons name="people-outline" size={13} color={themeColor("#4B5563", "#ADADAD")} />
                      <Text className="text-[11px] text-gray-700 font-medium dark:text-[#E6E6E6] ">Add people{taggedUserIds.length ? ` (${taggedUserIds.length})` : ""}</Text>
                    </TouchableOpacity>
                    {/* Live Trigger */}
                    <TouchableOpacity
                      onPress={handleOpenLive}
                      className="flex-row items-center px-2.5 py-1.5 rounded-lg gap-1 active:opacity-80"
                      style={{ backgroundColor: themeColor("#F0F3ED", "#181818"), borderWidth: 1, borderColor: themeColor("#E6EBE1", "#414141") }}
                      accessibilityRole="button"
                      accessibilityLabel="Live"
                    >
                      <Ionicons
                        name="videocam-outline"
                        size={13}
                        color={themeColor("#4B5563", "#ADADAD")}
                      />
                      <Text className="text-[11px] text-gray-700 font-medium dark:text-[#E6E6E6] ">
                        Live
                      </Text>
                    </TouchableOpacity>


                  </DraggableToolRow>
                </View>
              </View>

              {/* One composed card: photo preview, description, then attachment control. */}
              <View style={{ marginBottom: 20, borderRadius: 18, backgroundColor: themeColor("#FFFFFF", "#242424"), borderWidth: 1, borderColor: themeColor("#E3E9DF", "#414141"), paddingBottom: 52 }}>
                {selectedPhotos.length > 0 && (
                  <View style={{ padding: 12, paddingBottom: 16 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                      <Text style={{ fontSize: 11, fontWeight: "500", color: themeColor("#7F8B79", "#E6E6E6") }}>{selectedPhotos.length === 1 ? "1 photo attached" : `${selectedPhotos.length} photos attached`}</Text>
                      <TouchableOpacity onPress={handlePickPhotosFromGallery} accessibilityRole="button" accessibilityLabel="Add more photos" activeOpacity={0.7} style={{ flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 9, paddingVertical: 7, borderRadius: 8, backgroundColor: themeColor("#F1F5ED", "#181818") }}>
                        <Ionicons name="add" size={14} color={themeColor("#526E49", "#E6E6E6")} />
                        <Text style={{ fontSize: 11, fontWeight: "500", color: themeColor("#526E49", "#E6E6E6") }}>Add photos</Text>
                      </TouchableOpacity>
                    </View>
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                      {selectedPhotos.map((photoUri, idx) => (
                        <View key={photoUri} style={{ width: selectedPhotos.length === 1 ? "100%" : "48%", flexGrow: 1, aspectRatio: selectedPhotos.length === 1 ? 1.25 : 1, borderRadius: 12, overflow: "hidden", backgroundColor: themeColor("#F0F2ED", "#181818") }}>
                          <Image source={{ uri: photoUri }} accessibilityLabel={`Attached photo ${idx + 1}`} style={{ width: "100%", height: "100%" }} resizeMode="contain" />
                          <TouchableOpacity
                            onPress={() => setSelectedPhotos((photos) => photos.filter((photo) => photo !== photoUri))}
                            accessibilityRole="button" accessibilityLabel={`Remove photo ${idx + 1}`}
                            activeOpacity={0.7}
                            style={{ position: "absolute", top: 8, right: 8, width: 32, height: 32, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.94)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(40,60,40,0.08)" }}
                          >
                            <Ionicons name="close" size={17} color={themeColor("#4A5C44", "#E6E6E6")} />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
                <View style={{ paddingHorizontal: 16, paddingTop: 16, borderTopWidth: selectedPhotos.length ? 1 : 0, borderTopColor: themeColor("#EDF0E9", "#414141") }}>
                  {selectedPhotos.length > 0 && <Text style={{ fontSize: 11, fontWeight: "600", color: themeColor("#617159", "#E6E6E6"), marginBottom: 9 }}>Description</Text>}
                  <TextInput
                    multiline value={content} onChangeText={setContent}
                    placeholder={selectedPhotos.length ? "Tell the story behind your photos…" : "Share a moment from your farm…"}
                    accessibilityLabel="Post description" placeholderTextColor={themeColor("#96A08F", "#E6E6E6")}
                    style={{ textAlignVertical: "top", fontSize: 14, lineHeight: 22, minHeight: selectedPhotos.length ? 66 : 110, padding: 0, paddingBottom: 10, color: themeColor("#354A3B", "#E6E6E6") }}
                  />
                </View>
                <TouchableOpacity
                  onPress={() => setShowPhotoOptions((open) => !open)}
                  accessibilityRole="button"
                  accessibilityLabel="Add photo or open camera"
                  accessibilityState={{ expanded: showPhotoOptions }}
                  activeOpacity={0.7}
                  style={{ position: "absolute", right: 12, bottom: 10, width: 40, height: 40, borderRadius: 12, backgroundColor: themeColor("#E8EEE1", "#303030"), alignItems: "center", justifyContent: "center" }}
                >
                  <Ionicons name={showPhotoOptions ? "close" : "image-outline"} size={21} color={themeColor("#526E49", "#E6E6E6")} />
                </TouchableOpacity>
                {showPhotoOptions && (
                  <View style={{ position: "absolute", right: 12, bottom: 56, padding: 5, borderRadius: 13, backgroundColor: themeColor("#FFFFFF", "#242424"), borderWidth: 1, borderColor: themeColor("#DEE7D6", "#414141"), shadowColor: "#30402C", shadowOpacity: 0.1, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 5 }}>
                    <TouchableOpacity accessibilityRole="button" onPress={() => { setShowPhotoOptions(false); void handlePickPhotosFromGallery(); }} style={{ flexDirection: "row", alignItems: "center", gap: 9, padding: 12 }}>
                      <Ionicons name="images-outline" size={18} color={themeColor("#526E49", "#E6E6E6")} />
                      <Text style={{ fontSize: 12, color: themeColor("#43583C", "#E6E6E6") }}>Choose photo</Text>
                    </TouchableOpacity>
                    <TouchableOpacity accessibilityRole="button" onPress={() => { setShowPhotoOptions(false); void handleTakePhotoWithCamera(); }} style={{ flexDirection: "row", alignItems: "center", gap: 9, padding: 12 }}>
                      <Ionicons name="camera-outline" size={18} color={themeColor("#526E49", "#E6E6E6")} />
                      <Text style={{ fontSize: 12, color: themeColor("#43583C", "#E6E6E6") }}>Open camera</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {/* Attached Location Leaflet Map Preview Card */}
              {selectedLocation && (
                <View className="mb-3 rounded-2xl overflow-hidden border border-gray-200 bg-white shadow-xs dark:border-[#414141] dark:bg-[#242424] ">
                  <View className="flex-row items-center justify-between px-3.5 py-2 bg-green-50/70 border-b border-green-100 dark:bg-[#181818]/70 dark:border-[#414141] ">
                    <View className="flex-row items-center gap-1.5 flex-1 mr-2">
                      <Ionicons name="location-sharp" size={15} color={themeColor("#456B57", "#E6E6E6")} />
                      <Text
                        className="text-xs font-bold text-gray-900 flex-1 dark:text-[#E6E6E6] "
                        numberOfLines={1}
                      >
                        {selectedLocation}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => {
                        setSelectedLocation(null);
                        setSelectedCoordinates(null);
                      }}
                      className="w-6 h-6 rounded-full bg-white border border-gray-200 items-center justify-center active:bg-gray-100 dark:bg-[#242424] dark:border-[#414141] dark:active:bg-[#181818] "
                      accessibilityRole="button"
                      accessibilityLabel="Remove location"
                    >
                      <Ionicons name="close" size={13} color={themeColor("#4B5563", "#ADADAD")} />
                    </TouchableOpacity>
                  </View>
                  <View style={{ width: "100%", height: 140 }}>
                    <LeafletMap
                      latitude={
                        selectedCoordinates?.latitude || mapCoords.latitude
                      }
                      longitude={
                        selectedCoordinates?.longitude || mapCoords.longitude
                      }
                      zoom={15}
                      locationTitle={selectedLocation}
                      interactive={false}
                    />
                  </View>
                </View>
              )}

              {/* Category Selection */}
              <View className="mb-3">
                <Text className="font-semibold text-xs text-[#75816F] mb-3 mt-1 dark:text-[#E6E6E6] ">
                  Category
                </Text>
                <View className="flex-row gap-2">
                  {CATEGORIES.map((cat) => {
                    const isSelected = selectedCategory === cat;
                    return (
                      <TouchableOpacity
                        key={cat}
                        onPress={() => setSelectedCategory(cat)}
                        accessibilityRole="button"
                        accessibilityState={{ selected: isSelected }}
                        className="flex-1 items-center py-3 rounded-xl border active:opacity-70"
                        style={{
                          backgroundColor: isSelected ? "#E6EEE0" : "#FDFEFC",
                          borderColor: isSelected ? "#B9CDB0" : "#E5EAE0",
                          borderWidth: 1,
                        }}
                      >
                        <Text className="text-sm font-semibold" style={{ color: isSelected ? "#3E6247" : "#7C8876" }}>{cat}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Duration choices wrap so every option remains readable. */}
                {selectedCategory === "Temporary" && (
                  <View style={{ marginTop: 14, padding: 14, borderRadius: 16, backgroundColor: themeColor("#F3F5EF", "#181818"), borderWidth: 1, borderColor: themeColor("#E6EADF", "#414141") }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
                      <Ionicons name="time-outline" size={16} color={themeColor("#61765D", "#E6E6E6")} />
                      <Text style={{ fontSize: 12, fontWeight: "600", color: themeColor("#40543D", "#E6E6E6") }}>Post duration</Text>
                    </View>
                    <Text style={{ fontSize: 11, lineHeight: 17, color: themeColor("#82907B", "#E6E6E6"), marginTop: 5, marginBottom: 12 }}>
                      Your post disappears automatically after this time.
                    </Text>
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                      {TEMPORARY_DURATIONS.map((opt) => {
                        const selected = temporaryDuration === opt.value;
                        return (
                          <TouchableOpacity
                            key={opt.value}
                            onPress={() => setTemporaryDuration(opt.value)}
                            accessibilityRole="button"
                            accessibilityState={{ selected }}
                            activeOpacity={0.65}
                            style={{ width: "47%", flexGrow: 1, minHeight: 42, paddingHorizontal: 10, paddingVertical: 10, borderRadius: 11, borderWidth: 1, borderColor: selected ? "#B4C7AA" : "#E3E8DD", backgroundColor: selected ? "#E1EAD9" : "#FDFEFC", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7 }}
                          >
                            <Ionicons name={selected ? "checkmark-circle" : opt.icon} size={14} color={selected ? "#476640" : "#8B9784"} />
                            <Text style={{ fontSize: 12, fontWeight: selected ? "600" : "400", color: selected ? "#3E5A38" : "#73816C" }}>{opt.label}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                )}
              </View>
            </ScrollView>
          </Animated.View>
        </View>
      ) : (
        <SafeAreaView
          className="flex-1"
          edges={
            activeView === "ADD_LOCATION"
              ? ["bottom", "left", "right"]
              : ["top", "bottom", "left", "right"]
          }
          style={{
            flex: 1,
            backgroundColor: themeColor("#FFFFFF", "#242424"),
          }}
        >
          {activeView === "PRIVACY" ? (
            <ScrollView style={{ flex: 1, backgroundColor: themeColor("#FDFEFC", "#242424") }} contentContainerStyle={{ padding: 24, paddingBottom: 32 }}>
              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 28 }}>
                <TouchableOpacity onPress={() => setActiveView("POST_FORM")} accessibilityRole="button" accessibilityLabel="Back to Create Post" style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: themeColor("#F0F3ED", "#181818"), alignItems: "center", justifyContent: "center", marginRight: 12 }}>
                  <Ionicons name="chevron-back" size={20} color={themeColor("#526B57", "#E6E6E6")} />
                </TouchableOpacity>
                <Text style={{ fontSize: 16, fontWeight: "600", color: themeColor("#304536", "#E6E6E6") }}>Post audience</Text>
              </View>
              <Text style={{ fontSize: 23, fontWeight: "600", color: themeColor("#304536", "#E6E6E6"), marginBottom: 8 }}>Choose your audience</Text>
              <Text style={{ fontSize: 13, lineHeight: 21, color: themeColor("#7F8B79", "#E6E6E6"), marginBottom: 24 }}>Select who can see this post.</Text>
              <View accessibilityRole="radiogroup" style={{ gap: 10 }}>
                {PRIVACY_OPTIONS.map((option) => {
                  const selected = privacySetting === option.title;
                  const description = option.title === "Public" ? "Anyone in the LocalFarm community" : option.title === "Friends" ? "Only people you are connected with" : "Visible only to you";
                  return (
                    <TouchableOpacity key={option.id} onPress={() => setPrivacySetting(option.title)} accessibilityRole="radio" accessibilityState={{ checked: selected }} activeOpacity={0.7} style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 16, borderRadius: 17, borderWidth: 1, borderColor: selected ? "#B9CDB0" : "#E6EBE1", backgroundColor: selected ? "#F0F5EA" : "#FFFFFF" }}>
                      <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: selected ? "#E1EBD9" : "#F3F5F0", alignItems: "center", justifyContent: "center" }}><Ionicons name={option.icon} size={18} color={themeColor("#617A59", "#E6E6E6")} /></View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 14, fontWeight: "600", color: themeColor("#3A5038", "#E6E6E6") }}>{option.title}</Text>
                        <Text style={{ fontSize: 11, lineHeight: 17, color: themeColor("#85907D", "#E6E6E6"), marginTop: 4 }}>{description}</Text>
                      </View>
                      <Ionicons name={selected ? "checkmark-circle" : "ellipse-outline"} size={21} color={selected ? "#52754A" : "#C7D1C0"} />
                    </TouchableOpacity>
                  );
                })}
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 24, marginTop: 8 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: "500", color: themeColor("#4B6045", "#E6E6E6") }}>Use as default audience</Text>
                  <Text style={{ fontSize: 11, color: themeColor("#8A9583", "#E6E6E6"), marginTop: 5 }}>Apply this choice to future posts.</Text>
                </View>
                <Switch accessibilityLabel="Use as default audience" value={isDefaultAudience} onValueChange={setIsDefaultAudience} trackColor={{ false: "#E4E9DF", true: "#7D9A70" }} thumbColor="#FFFFFF" />
              </View>
              <TouchableOpacity onPress={() => setActiveView("POST_FORM")} accessibilityRole="button" activeOpacity={0.75} style={{ backgroundColor: themeColor("#456B57", "#E6E6E6"), paddingVertical: 16, borderRadius: 14, alignItems: "center" }}>
                <Text style={{ color: themeColor("#FFFFFF", "#E6E6E6"), fontSize: 14, fontWeight: "600" }}>Confirm audience</Text>
              </TouchableOpacity>
            </ScrollView>
          ) : activeView === "LIVE_PERMISSION" && isRSBSAVerified ? (
            /* 3. GO LIVE CAMERA ACCESS PERMISSION VIEW */
            <View className="flex-1 bg-white justify-between px-5 pt-3 pb-3 h-full dark:bg-[#181818] ">
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{
                  flexGrow: 1,
                  justifyContent: "space-between",
                }}
              >
                {/* Header & Main Content */}
                <View>
                  {/* Header Section */}
                  <View className="flex-row items-center pt-1 pb-2">
                    <TouchableOpacity
                      onPress={() => setActiveView("POST_FORM")}
                      className="p-1 -ml-2 active:opacity-70"
                      accessibilityRole="button"
                      accessibilityLabel="Go back"
                    >
                      <Ionicons name="arrow-back" size={24} color={themeColor("#111827", "#E6E6E6")} />
                    </TouchableOpacity>
                    <Text className="text-xl font-bold text-gray-900 ml-3 dark:text-[#E6E6E6] ">
                      Live
                    </Text>
                  </View>

                  {/* Main Graphic */}
                  <View className="items-center mt-6">
                    <View className="bg-green-100 p-5 rounded-3xl items-center justify-center dark:bg-[#303030] ">
                      <Ionicons name="videocam" size={68} color="#16a34a" />
                    </View>
                  </View>

                  {/* Typography */}
                  <Text className="text-2xl font-bold text-center mt-5 text-gray-800 leading-8 dark:text-[#E6E6E6] ">
                    Access Your Camera{"\n"}to{" "}
                    <Text className="text-[#72AF5B] dark:text-[#E6E6E6] ">Cast Live</Text>
                  </Text>

                  {/* Verified Broadcaster Badge */}
                  <View className="flex-row items-center justify-center self-center bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full mt-2.5 dark:bg-[#181818] dark:border-[#414141] ">
                    <Ionicons
                      name="checkmark-circle"
                      size={15}
                      color="#10B981"
                    />
                    <Text className="text-xs font-semibold text-emerald-800 ml-1.5 dark:text-[#E6E6E6] ">
                      RSBSA Verified Broadcaster
                    </Text>
                  </View>

                  <Text className="text-sm text-gray-600 text-center px-4 mt-3 leading-5 dark:text-[#ADADAD] ">
                    Allow access to your camera to cast live and connect with
                    your friends in real time. Your privacy is important to us.
                  </Text>

                  {/* Feature Info Box */}
                  <View className="bg-gray-100 rounded-2xl mx-1 mt-6 p-4 dark:bg-[#181818] ">
                    {/* Feature 1 */}
                    <View className="flex-row items-start mb-4">
                      <View className="bg-gray-300 p-2 rounded-full mr-3.5 items-center justify-center dark:bg-[#303030] ">
                        <Ionicons name="videocam" size={16} color={themeColor("#374151", "#E6E6E6")} />
                      </View>
                      <View className="flex-1">
                        <Text className="text-sm font-bold text-gray-900 dark:text-[#E6E6E6] ">
                          Go Live with Friends
                        </Text>
                        <Text className="text-xs text-gray-500 mt-0.5 dark:text-[#ADADAD] ">
                          Stream live video and share moments instantly.
                        </Text>
                      </View>
                    </View>

                    {/* Feature 2 */}
                    <View className="flex-row items-start mb-4">
                      <View className="bg-gray-300 p-2 rounded-full mr-3.5 items-center justify-center dark:bg-[#303030] ">
                        <Ionicons
                          name="shield-checkmark"
                          size={16}
                          color={themeColor("#374151", "#E6E6E6")}
                        />
                      </View>
                      <View className="flex-1">
                        <Text className="text-sm font-bold text-gray-900 dark:text-[#E6E6E6] ">
                          Safe & Secure
                        </Text>
                        <Text className="text-xs text-gray-500 mt-0.5 dark:text-[#ADADAD] ">
                          We do not record or store your live videos.
                        </Text>
                      </View>
                    </View>

                    {/* Feature 3 */}
                    <View className="flex-row items-start">
                      <View className="bg-gray-300 p-2 rounded-full mr-3.5 items-center justify-center dark:bg-[#303030] ">
                        <Ionicons
                          name="lock-closed"
                          size={16}
                          color={themeColor("#374151", "#E6E6E6")}
                        />
                      </View>
                      <View className="flex-1">
                        <Text className="text-sm font-bold text-gray-900 dark:text-[#E6E6E6] ">
                          {"You're in Control"}
                        </Text>
                        <Text className="text-xs text-gray-500 mt-0.5 dark:text-[#ADADAD] ">
                          You can change or revoke camera access anytime in
                          settings.
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>

                {/* Bottom Action Buttons */}
                <View className="mt-6 pb-2">
                  {/* Allow Button */}
                  <TouchableOpacity
                    onPress={() => {
                      setActiveView("POST_FORM");
                      setShowLiveBroadcaster(true);
                    }}
                    className="w-full bg-[#72AF5B] rounded-xl py-3.5 flex-row justify-center items-center mb-3 active:opacity-80 shadow-xs dark:bg-[#E6E6E6] "
                    activeOpacity={0.8}
                  >
                    <Ionicons name="videocam" size={18} color={themeColor("#FFFFFF", "#181818")} />
                    <Text className="text-white font-bold text-base ml-2 dark:text-[#181818] ">
                      Allow camera access
                    </Text>
                  </TouchableOpacity>

                  {/* Not Now Button */}
                  <TouchableOpacity
                    onPress={() => setActiveView("POST_FORM")}
                    className="w-full bg-white rounded-xl py-3.5 items-center justify-center shadow-xs border border-gray-200 active:bg-gray-50 dark:bg-[#242424] dark:border-[#414141] dark:active:bg-[#242424] "
                    activeOpacity={0.8}
                  >
                    <Text className="text-gray-800 font-bold text-base dark:text-[#E6E6E6] ">
                      Not Now
                    </Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          ) : activeView === "TAG_PEOPLE" ? (
            <CalmEntrance>
            <View className="flex-1 bg-[#FDFEFC] h-full w-full relative dark:bg-[#181818] ">
              {/* Header Section */}
              <View className="flex-row items-center pt-3 pb-3 px-5 bg-[#FDFEFC] dark:bg-[#242424] ">
                <TouchableOpacity
                  onPress={() => setActiveView("POST_FORM")}
                  className="w-10 h-10 rounded-full bg-[#F0F3ED] items-center justify-center active:opacity-70 dark:bg-[#181818] "
                  accessibilityRole="button"
                  accessibilityLabel="Go back"
                >
                  <Ionicons name="chevron-back" size={24} color={themeColor("#304536", "#E6E6E6")} />
                </TouchableOpacity>
                <Text className="text-base font-semibold text-[#304536] flex-1 ml-3 dark:text-[#E6E6E6] ">
                  Tag and collaborate
                </Text>
              </View>

              {/* Tagged People Preview (Horizontal Scroll) */}
              {taggedUserIds.length > 0 && (
                <View className="mb-2">
                  <Text className="text-sm font-medium text-gray-700 px-5 mb-3 dark:text-[#E6E6E6] ">
                    Tagged People ({taggedUserIds.length})
                  </Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    className="px-5"
                  >
                    {taggedUserIds.map((userId) => {
                      const user = getFriendById(userId);
                      if (!user) return null;

                      return (
                        <View key={user.id} className="items-center mr-4" style={{ paddingTop: 8, paddingHorizontal: 5, minWidth: 66 }}>
                          <View className="bg-[#EAF0E3] h-12 w-12 rounded-full mb-1 items-center justify-center overflow-hidden border border-gray-300 dark:bg-[#181818] dark:border-[#414141] ">
                            {user.avatarUrl ? (
                              <Image
                                source={{ uri: user.avatarUrl }}
                                className="w-full h-full"
                                resizeMode="cover"
                              />
                            ) : (
                              <Ionicons
                                name="person"
                                size={22}
                                color={themeColor("#6B7280", "#ADADAD")}
                              />
                            )}
                          </View>
                          <TouchableOpacity
                            onPress={() => toggleTagUser(userId)}
                            accessibilityRole="button"
                            accessibilityLabel={`Remove ${user.fullName || user.firstName} from tagged people`}
                            hitSlop={6}
                            activeOpacity={0.7}
                            style={{ position: "absolute", top: 0, right: 0, width: 26, height: 26, borderRadius: 13, backgroundColor: themeColor("#FDFEFC", "#242424"), borderWidth: 1, borderColor: themeColor("#DCE5D4", "#414141"), alignItems: "center", justifyContent: "center" }}
                          >
                            <Ionicons name="close" size={15} color={themeColor("#526E49", "#E6E6E6")} />
                          </TouchableOpacity>
                          <Text className="text-xs text-gray-700 font-medium dark:text-[#E6E6E6] ">
                            {user.firstName}
                          </Text>
                        </View>
                      );
                    })}
                  </ScrollView>
                </View>
              )}

              {/* Search Bar */}
              <View className="bg-[#F3F6EF] rounded-2xl flex-row items-center px-4 py-2.5 mx-5 my-3 border border-[#E3E9DC] dark:bg-[#181818] dark:border-[#414141] ">
                <Ionicons name="search" size={20} color={themeColor("#8C9A82", "#E6E6E6")} />
                <TextInput
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Search members to tag..."
                  placeholderTextColor={themeColor("#8C9A82", "#E6E6E6")}
                  className="flex-1 ml-2 text-sm text-[#40543B] p-0 dark:text-[#E6E6E6] "
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery("")}>
                    <Ionicons name="close-circle" size={18} color={themeColor("#8C9A82", "#E6E6E6")} />
                  </TouchableOpacity>
                )}
              </View>

              {/* User List (Vertical Mapping) */}
              <ScrollView
                className="flex-1 px-5"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 120 }}
                keyboardShouldPersistTaps="handled"
              >
                {isLoadingFriends || isSearchingUsers ? (
                  <View className="py-12 items-center justify-center">
                    <ActivityIndicator size="small" color={themeColor("#456B57", "#E6E6E6")} />
                    <Text className="text-xs text-[#84917B] mt-2 dark:text-[#E6E6E6] ">
                      Loading members...
                    </Text>
                  </View>
                ) : filteredFriends.length === 0 ? (
                  <View className="py-12 items-center justify-center px-4">
                    <Ionicons name="people-outline" size={36} color={themeColor("#8C9A82", "#E6E6E6")} />
                    <Text className="text-sm font-semibold text-gray-600 mt-2 text-center dark:text-[#ADADAD] ">
                      {searchQuery
                        ? "No members found matching your search"
                        : "No members to tag yet"}
                    </Text>
                    <Text className="text-xs text-gray-400 mt-1 text-center dark:text-[#ADADAD] ">
                      {searchQuery
                        ? "Try searching by exact name or username."
                        : "Connect with farmers and friends or search their name above to tag them."}
                    </Text>
                  </View>
                ) : (
                  filteredFriends.map((friend) => {
                    const isSelected = taggedUserIds.includes(friend.id);

                    return (
                      <TouchableOpacity
                        key={friend.id}
                        onPress={() => toggleTagUser(friend.id)}
                        className="flex-row items-center bg-white rounded-2xl mb-2.5 p-3 border border-[#E7ECDF] active:opacity-80 dark:bg-[#242424] dark:border-[#414141] "
                        activeOpacity={0.7}
                      >
                        {/* Left (Avatar) */}
                        <View className="bg-[#EAF0E3] h-12 w-12 rounded-full mr-3 items-center justify-center overflow-hidden border border-gray-200 dark:bg-[#181818] dark:border-[#414141] ">
                          {friend.avatarUrl ? (
                            <Image
                              source={{ uri: friend.avatarUrl }}
                              className="w-full h-full"
                              resizeMode="cover"
                            />
                          ) : (
                            <Ionicons
                              name="person"
                              size={22}
                              color={themeColor("#6B7280", "#ADADAD")}
                            />
                          )}
                        </View>

                        {/* Middle (Info) */}
                        <View className="flex-1">
                          <Text className="text-sm font-semibold text-[#3A5038] dark:text-[#E6E6E6] ">
                            {friend.fullName}
                          </Text>
                          <Text className="text-xs text-[#84917B] mt-0.5 dark:text-[#E6E6E6] ">
                            {friend.username
                              ? `@${friend.username}`
                              : "Member"}
                          </Text>
                        </View>

                        {/* Right (Checkbox) */}
                        <View
                          className={`h-6 w-6 rounded-md items-center justify-center ${
                            isSelected
                              ? "bg-[#456B57] dark:bg-[#E6E6E6] "
                              : "border border-[#456B57] bg-white dark:border-[#414141] dark:bg-[#242424] "
                          }`}
                        >
                          {isSelected && (
                            <Ionicons
                              name="checkmark"
                              size={16}
                              color={themeColor("#FFFFFF", "#181818")}
                            />
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  })
                )}
              </ScrollView>

              {/* Bottom Finished Action Button */}
              <View className="absolute bottom-0 left-0 right-0 p-5 bg-[#FDFEFC] border-t border-[#E8EDDF] dark:bg-[#242424] dark:border-[#414141] ">
                <TouchableOpacity
                  onPress={() => setActiveView("POST_FORM")}
                  className="w-full bg-[#456B57] rounded-xl py-3.5 items-center justify-center active:opacity-80 shadow-sm dark:bg-[#E6E6E6] "
                  activeOpacity={0.8}
                >
                  <Text className="text-white font-semibold text-sm dark:text-[#181818] ">
                    {taggedUserIds.length ? `Confirm ${taggedUserIds.length} tagged ${taggedUserIds.length === 1 ? "person" : "people"}` : "Done"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
            </CalmEntrance>
          ) : activeView === "ADD_LOCATION" ? (
            /* 7. ADD LOCATION VIEW (Leaflet Map with Dynamic Search & Geocoding) */
            <View className="flex-1 bg-white h-full w-full relative overflow-hidden dark:bg-[#181818] ">
              {/* Full-Screen Map filling upper corners */}
              <LeafletMap
                latitude={mapCoords.latitude}
                longitude={mapCoords.longitude}
                zoom={14}
                locationTitle={locationSearch || "Selected Farm Location"}
                interactive={true}
                onLocationSelect={handleMapLocationSelect}
              />

              {/* Floating Top Controls: Chevron Back Button + Search Bar + GPS Button */}
              <View
                style={{
                  position: "absolute",
                  top: Math.max(insets.top, 16) + 6,
                  left: 16,
                  right: 16,
                  zIndex: 40,
                }}
              >
                <View className="flex-row items-center gap-2">
                  {/* Floating Chevron Back Button */}
                  <TouchableOpacity
                    onPress={() => {
                      setShowSearchResults(false);
                      setActiveView("POST_FORM");
                    }}
                    activeOpacity={0.7}
                    className="w-11 h-11 rounded-full bg-white items-center justify-center shadow-lg elevation-5 border border-gray-100 dark:bg-[#242424] dark:border-[#414141] "
                    accessibilityRole="button"
                    accessibilityLabel="Go back"
                  >
                    <Ionicons name="chevron-back" size={26} color={themeColor("#111827", "#E6E6E6")} />
                  </TouchableOpacity>

                  {/* Floating Search Bar */}
                  <View className="flex-1 bg-white border border-[#72AF5B] rounded-full flex-row items-center px-3.5 h-11 shadow-lg elevation-5 dark:bg-[#181818] dark:border-[#414141] ">
                    <Ionicons
                      name="search-outline"
                      size={18}
                      color={themeColor("#6B7280", "#ADADAD")}
                      style={{ marginRight: 6 }}
                    />
                    <TextInput
                      value={locationSearch}
                      onChangeText={(text) => {
                        setLocationSearch(text);
                        setShowSearchResults(true);
                      }}
                      onFocus={() => {
                        if (searchResults.length > 0) setShowSearchResults(true);
                      }}
                      placeholder="Search farm, barangay, or city..."
                      placeholderTextColor={themeColor("#9CA3AF", "#ADADAD")}
                      className="flex-1 text-sm text-gray-800 p-0 dark:text-[#E6E6E6] "
                      returnKeyType="search"
                    />
                    {isSearchingLocation ? (
                      <ActivityIndicator
                        size="small"
                        color={themeColor("#72AF5B", "#E6E6E6")}
                        style={{ marginLeft: 4 }}
                      />
                    ) : locationSearch.length > 0 ? (
                      <TouchableOpacity
                        onPress={() => {
                          setLocationSearch("");
                          setSearchResults([]);
                          setShowSearchResults(false);
                        }}
                        className="p-1"
                      >
                        <Ionicons
                          name="close-circle"
                          size={16}
                          color={themeColor("#9CA3AF", "#ADADAD")}
                        />
                      </TouchableOpacity>
                    ) : null}
                  </View>

                  {/* GPS Locator Button */}
                  <TouchableOpacity
                    onPress={handleUseCurrentLocation}
                    disabled={isLocatingGps}
                    activeOpacity={0.7}
                    className="w-11 h-11 rounded-full bg-white items-center justify-center shadow-lg elevation-5 border border-gray-100 dark:bg-[#242424] dark:border-[#414141] "
                    accessibilityRole="button"
                    accessibilityLabel="Use current device location"
                  >
                    {isLocatingGps ? (
                      <ActivityIndicator size="small" color={themeColor("#72AF5B", "#E6E6E6")} />
                    ) : (
                      <Ionicons name="locate" size={22} color={themeColor("#72AF5B", "#E6E6E6")} />
                    )}
                  </TouchableOpacity>
                </View>

                {/* Autocomplete Search Results Dropdown */}
                {showSearchResults && searchResults.length > 0 && (
                  <View className="mt-2 bg-white rounded-2xl shadow-2xl elevation-8 border border-gray-200 overflow-hidden max-h-56 dark:bg-[#242424] dark:border-[#414141] ">
                    <ScrollView
                      keyboardShouldPersistTaps="handled"
                      nestedScrollEnabled={true}
                    >
                      {searchResults.map((item, idx) => (
                        <TouchableOpacity
                          key={`${item.id || idx}-${item.latitude}`}
                          onPress={() => handleSelectSearchResult(item)}
                          className={`p-3 flex-row items-center border-b border-gray-100 active:bg-green-50  dark:border-[#414141] dark:active:bg-[#181818] ${
                            idx === searchResults.length - 1 ? "border-b-0" : ""
                          }`}
                        >
                          <View className="w-8 h-8 rounded-full bg-green-50 items-center justify-center mr-2.5 dark:bg-[#181818] ">
                            <Ionicons
                              name="location-sharp"
                              size={16}
                              color={themeColor("#72AF5B", "#E6E6E6")}
                            />
                          </View>
                          <View className="flex-1 pr-1">
                            <Text
                              className="text-xs font-bold text-gray-900 dark:text-[#E6E6E6] "
                              numberOfLines={1}
                            >
                              {item.name}
                            </Text>
                            {item.fullName ? (
                              <Text
                                className="text-[11px] text-gray-500 mt-0.5 dark:text-[#ADADAD] "
                                numberOfLines={1}
                              >
                                {item.fullName}
                              </Text>
                            ) : null}
                          </View>
                          <Ionicons
                            name="arrow-forward"
                            size={14}
                            color={themeColor("#9CA3AF", "#ADADAD")}
                          />
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>


              {/* Floating Bottom Info Card with Select & Cancel Location Buttons */}
              <View className="absolute bottom-6 left-5 right-5 z-20 bg-white rounded-2xl p-4 shadow-xl border border-gray-100 dark:bg-[#242424] dark:border-[#414141] ">
                <View className="mb-3">
                  <View className="flex-row items-center gap-1.5 mb-1">
                    <Ionicons
                      name="location-sharp"
                      size={18}
                      color={themeColor("#72AF5B", "#E6E6E6")}
                    />
                    <Text
                      className="text-base font-bold text-gray-900 flex-1 dark:text-[#E6E6E6] "
                      numberOfLines={1}
                    >
                      {locationSearch || "Selected Location"}
                    </Text>
                    {isGeocoding && (
                      <View className="flex-row items-center gap-1">
                        <ActivityIndicator size="small" color={themeColor("#72AF5B", "#E6E6E6")} />
                        <Text className="text-[10px] text-[#72AF5B] font-medium dark:text-[#E6E6E6] ">
                          Resolving...
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text className="text-xs text-gray-500 leading-4 dark:text-[#ADADAD] ">
                    Coordinates: {mapCoords.latitude.toFixed(4)},{" "}
                    {mapCoords.longitude.toFixed(4)}
                  </Text>
                  <Text className="text-[11px] text-gray-400 mt-0.5 dark:text-[#ADADAD] ">
                    Tap anywhere on the map, use the search bar, or pick your GPS location.
                  </Text>
                </View>
                {/* Action Buttons Row */}
                <View className="flex-row justify-end gap-2.5 pt-1">
                  {/* Cancel Location Button */}
                  <TouchableOpacity
                    onPress={() => {
                      setShowSearchResults(false);
                      setActiveView("POST_FORM");
                    }}
                    className="bg-gray-100 px-4 py-2.5 rounded-xl border border-gray-200 items-center justify-center active:bg-gray-200 dark:bg-[#181818] dark:border-[#414141] dark:active:bg-[#181818] "
                    activeOpacity={0.7}
                  >
                    <Text className="text-gray-700 font-semibold text-xs dark:text-[#E6E6E6] ">
                      Cancel
                    </Text>
                  </TouchableOpacity>

                  {/* Select Location Button */}
                  <TouchableOpacity
                    onPress={() => {
                      const finalName =
                        locationSearch || "Selected Farm Location";
                      setSelectedLocation(finalName);
                      setSelectedCoordinates(mapCoords);
                      setShowSearchResults(false);
                      setActiveView("POST_FORM");
                    }}
                    className="bg-[#72AF5B] px-5 py-2.5 rounded-xl items-center justify-center active:bg-[#5e944a] shadow-sm dark:bg-[#E6E6E6] dark:active:bg-[#E6E6E6] "
                    activeOpacity={0.8}
                  >
                    <Text className="text-white font-bold text-xs dark:text-[#181818] ">
                      Select Location
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ) : null}
        </SafeAreaView>
      )}

      {/* RSBSA Green Badge Requirement Modal Overlay */}
      {showRsbsaLockModal && (
        <View className="absolute inset-0 bg-black/60 z-50 justify-center items-center px-6">
          <Pressable
            onPress={() => setShowRsbsaLockModal(false)}
            className="absolute inset-0"
            accessibilityRole="button"
            accessibilityLabel="Dismiss modal backdrop"
          />
          <View
            className="bg-white rounded-3xl p-6 w-full max-w-sm items-center shadow-2xl z-10 dark:bg-[#242424] "
            accessibilityRole="alert"
          >
            {/* Badge & Camera Graphic */}
            <View className="relative mb-3">
              <View className="w-16 h-16 rounded-full bg-[#72AF5B] items-center justify-center dark:bg-[#E6E6E6] ">
                <Ionicons name="videocam" size={32} color={themeColor("#ffffff", "#181818")} />
              </View>
              <View className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-white items-center justify-center shadow-md dark:bg-[#242424] ">
                <Ionicons name="checkmark-circle" size={24} color={themeColor("#72AF5B", "#E6E6E6")} />
              </View>
            </View>

            {/* Status / Category Pill */}
            <View
              className={`px-3 py-1 rounded-full mb-2 border ${
                rsbsaApp?.status === "pending"
                  ? "bg-amber-50 border-amber-200 dark:bg-[#181818] "
                  : rsbsaApp?.status === "rejected"
                    ? "bg-rose-50 border-rose-200 dark:bg-[#181818] "
                    : "bg-gray-50 border-[#72AF5B] dark:bg-[#242424] dark:border-[#414141] "
              }`}
            >
              <Text
                className={`text-[11px] font-bold tracking-wide uppercase ${
                  rsbsaApp?.status === "pending"
                    ? "text-amber-800"
                    : rsbsaApp?.status === "rejected"
                      ? "text-rose-800"
                      : "text-emerald-800 dark:text-[#E6E6E6] "
                }`}
              >
                {rsbsaApp?.status === "pending"
                  ? "Verification Under Review"
                  : rsbsaApp?.status === "rejected"
                    ? "Verification Needs Attention"
                    : "RSBSA Green Badge Required"}
              </Text>
            </View>

            {/* Modal Heading */}
            <Text className="text-xl font-bold text-[#E45742] text-center mb-2">
              Unlock Live Streaming
            </Text>

            {/* Explanation / Subtitle */}
            <Text className="text-sm text-gray-600 text-center leading-5 mb-4 dark:text-[#ADADAD] ">
              {rsbsaApp?.status === "pending"
                ? "Your RSBSA application is currently under review by our team. Live streaming privileges will automatically unlock once verified."
                : rsbsaApp?.status === "rejected"
                  ? "Your previous RSBSA verification was not approved. Please update and re-submit your farming credentials to unlock live broadcasting."
                  : "Live video broadcasting is exclusively reserved for RSBSA-verified farmers. Earn the Green Badge to protect our marketplace from fraudulent sellers and stream live harvest updates to buyers."}
            </Text>

            {/* Security & Trust Benefits */}
            <View className="bg-gray-50 rounded-2xl p-3.5 w-full mb-5 border border-gray-100 gap-2 dark:bg-[#242424] dark:border-[#414141] ">
              <View className="flex-row items-center gap-2">
                <Ionicons name="shield-checkmark" size={18} color={themeColor("#72AF5B", "#E6E6E6")} />
                <Text className="text-sm font-semibold text-gray-800 dark:text-[#E6E6E6] ">
                  Protects buyers from fake farm listings
                </Text>
              </View>
              <View className="flex-row items-center gap-2">
                <Ionicons name="ribbon" size={18} color={themeColor("#72AF5B", "#E6E6E6")} />
                <Text className="text-sm font-semibold text-gray-800 dark:text-[#E6E6E6] ">
                  Awards the official Green Badge to your profile
                </Text>
              </View>
              <View className="flex-row items-center gap-2">
                <Ionicons name="people" size={18} color={themeColor("#72AF5B", "#E6E6E6")} />
                <Text className="text-sm font-semibold text-gray-800 dark:text-[#E6E6E6] ">
                  Builds instant trust with local wholesale and retail buyers
                </Text>
              </View>
            </View>

            {/* Action Buttons */}
            <TouchableOpacity
              onPress={() => {
                setShowRsbsaLockModal(false);
                handleClose();
                router.push("/user/RSBSAVerification" as any);
              }}
              className="w-full text-sm bg-[#72AF5B] py-3.5 rounded-xl items-center justify-center active:opacity-85 shadow-sm mb-2.5 dark:bg-[#E6E6E6] "
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={
                rsbsaApp?.status === "pending"
                  ? "Check verification status"
                  : rsbsaApp?.status === "rejected"
                    ? "Review and re-apply"
                    : "Apply for RSBSA verification"
              }
            >
              <Text className="text-white font-bold text-sm dark:text-[#181818] ">
                {rsbsaApp?.status === "pending"
                  ? "Check Verification Status"
                  : rsbsaApp?.status === "rejected"
                    ? "Review & Re-apply"
                    : "Apply for RSBSA Verification"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setShowRsbsaLockModal(false)}
              className="w-full py-3.5 bg-gray-100 border border-gray-200 rounded-xl items-center justify-center active:opacity-60 dark:bg-[#181818] dark:border-[#414141] "
              accessibilityRole="button"
              accessibilityLabel="Dismiss dialog"
            >
              <Text className="text-gray-500 font-semibold text-sm text-center dark:text-[#ADADAD] ">
                Maybe Later
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Dynamic Live Broadcaster Studio Modal */}
      <LiveBroadcasterModal
        isVisible={showLiveBroadcaster}
        onClose={() => setShowLiveBroadcaster(false)}
        onPublishReplay={handlePublishLiveReplay}
        initialLocation={selectedLocation}
        initialCoordinates={selectedCoordinates || mapCoords}
      />
    </Modal>
  );
}
