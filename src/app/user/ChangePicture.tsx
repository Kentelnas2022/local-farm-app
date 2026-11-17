import { useAppTheme } from "@/context/theme-context";
import { AuthContext } from "@/context/auth-context";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useState, useContext } from "react";
import { uploadImageToSupabase } from "@/lib/storage";
import { updateProfileApi } from "@/services/auth-service";
import {
  Alert,
  Image,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import Navigation from "../../components/Navigation";

const DEFAULT_AVATAR = "";

export default function ChangePicture() {
  const { themeColor } = useAppTheme();
  const { refreshUser } = useContext(AuthContext);
  const [isSaving, setIsSaving] = useState(false);
  const router = useRouter();
  const [avatarUri, setAvatarUri] = useState<string>(DEFAULT_AVATAR);
  const [sliderProgress, setSliderProgress] = useState<number>(0.15);
  const [trackWidth, setTrackWidth] = useState<number>(280);

  const updateSliderProgress = (locationX: number) => {
    if (trackWidth <= 0) return;
    const clampedX = Math.max(0, Math.min(locationX, trackWidth));
    setSliderProgress(clampedX / trackWidth);
  };

  const handleBack = () => {
    try {
      if (router.canGoBack()) {
        router.back();
      } else {
        router.push("/user/PersonalInformation" as any);
      }
    } catch {
      router.push("/user/PersonalInformation" as any);
    }
  };

  const handleSave = async () => {
    if (!avatarUri) {
      handleBack();
      return;
    }

    setIsSaving(true);
    try {
      let finalAvatarUrl = avatarUri;
      if (!avatarUri.startsWith("http")) {
        const { publicUrl, error } = await uploadImageToSupabase("avatars", avatarUri);
        if (error || !publicUrl) {
          throw new Error(error?.message || "Failed to upload image to avatars bucket");
        }
        finalAvatarUrl = publicUrl;
      }

      await updateProfileApi({ avatarUrl: finalAvatarUrl });
      await refreshUser();

      Alert.alert("Success", "Profile picture updated successfully!", [
        { text: "OK", onPress: handleBack },
      ]);
    } catch (err: any) {
      console.error("Failed to save avatar:", err);
      Alert.alert("Error", err.message || "Failed to save profile picture. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const pickImageFromGallery = async () => {
    try {
      if (Platform.OS !== "web") {
        const permissionResult =
          await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permissionResult.granted) {
          Alert.alert(
            "Permission Required",
            "Permission to access your gallery is required to choose a profile picture.",
          );
          return;
        }
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.9,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setAvatarUri(result.assets[0].uri);
        setSliderProgress(0.15);
        return;
      }
    } catch (error) {
      console.error("Error picking image from gallery:", error);
    }

    // Direct Web fallback if running on web browser
    if (Platform.OS === "web" && typeof document !== "undefined") {
      try {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "image/*";
        input.onchange = (e: any) => {
          const file = e.target?.files?.[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
              const res = event.target?.result;
              if (typeof res === "string") {
                setAvatarUri(res);
                setSliderProgress(0.15);
              }
            };
            reader.readAsDataURL(file);
          }
        };
        input.click();
      } catch (webErr) {
        console.error("Web file picker error:", webErr);
      }
    }
  };

  const thumbLeft = Math.max(
    0,
    Math.min(
      sliderProgress * (trackWidth || 280) - 12,
      (trackWidth || 280) - 24,
    ),
  );

  return (
    <SafeAreaView
      className="flex-1 bg-white relative dark:bg-[#181818] "
      style={{ flex: 1, backgroundColor: themeColor("#FFFFFF", "#242424") }}
    >
      <ScrollView
        className="flex-1 bg-white dark:bg-[#181818] "
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 110 }}
      >
        {/* Top Header Row */}
        <View className="flex-row items-center justify-center px-4 pt-4 pb-3 relative bg-white dark:bg-[#242424] ">
          <TouchableOpacity
            onPress={handleBack}
            className="absolute left-4 top-4 p-1 active:opacity-70"
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-undo" size={28} color={themeColor("#000000", "#E6E6E6")} />
          </TouchableOpacity>

          <Text className="text-xl font-bold text-gray-900 dark:text-[#E6E6E6] ">
            Change picture
          </Text>
        </View>

        {/* Large Circular Profile Picture Crop Preview */}
        <View className="items-center justify-center mt-10 mb-6">
          <TouchableOpacity
            onPress={pickImageFromGallery}
            activeOpacity={0.9}
            className="relative"
            accessibilityRole="button"
            accessibilityLabel="Choose photo from gallery"
          >
            <View className="w-64 h-64 sm:w-72 sm:h-72 rounded-full overflow-hidden bg-[#E5E7EB] items-center justify-center shadow-lg border border-gray-100 dark:bg-[#181818] dark:border-[#414141] ">
              {avatarUri ? (
                <Image
                  source={{ uri: avatarUri }}
                  style={{
                    width: "100%",
                    height: "100%",
                    transform: [{ scale: 1 + sliderProgress * 1.2 }],
                  }}
                  resizeMode="cover"
                />
              ) : (
                <View className="w-full h-full bg-[#E5E7EB] items-center justify-center dark:bg-[#181818] ">
                  <Ionicons name="person" size={130} color={themeColor("#9CA3AF", "#ADADAD")} />
                </View>
              )}
            </View>

            {/* Gallery Icon Badge */}
            <View className="absolute bottom-2 right-4 bg-[#72AF5B] p-2.5 rounded-full border-2 border-white shadow-md dark:bg-[#E6E6E6] dark:border-[#414141] ">
              <Ionicons name="images" size={18} color={themeColor("#FFFFFF", "#181818")} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={pickImageFromGallery}
            className="mt-3 flex-row items-center gap-1.5 active:opacity-70"
          >
            <Ionicons name="image-outline" size={18} color={themeColor("#72AF5B", "#E6E6E6")} />
            <Text className="text-sm font-semibold text-[#72AF5B] dark:text-[#E6E6E6] ">
              Choose from gallery
            </Text>
          </TouchableOpacity>
        </View>

        {/* Slider & Actions Container */}
        <View className="px-8 w-full max-w-[360px] self-center">
          {/* Horizontal Slider Track */}
          <View
            onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
            onStartShouldSetResponder={() => true}
            onMoveShouldSetResponder={() => true}
            onResponderGrant={(evt) =>
              updateSliderProgress(evt.nativeEvent.locationX)
            }
            onResponderMove={(evt) =>
              updateSliderProgress(evt.nativeEvent.locationX)
            }
            className="h-8 justify-center relative"
          >
            {/* Gray Bar */}
            <View className="h-2 bg-[#D1D5DB] rounded-full w-full dark:bg-[#303030] " />

            {/* Slider Thumb Handle */}
            <View
              style={{
                position: "absolute",
                left: thumbLeft,
                width: 24,
                height: 24,
                borderRadius: 12,
                backgroundColor: themeColor("#CBD5E1", "#303030"),
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.25,
                shadowRadius: 2,
                elevation: 3,
              }}
            />
          </View>

          {/* Action Buttons: Cancel and Save */}
          <View className="flex-row justify-end gap-3 mt-4">
            <TouchableOpacity
              onPress={handleBack}
              className="bg-[#A0A8B0] px-6 py-2.5 rounded-lg active:bg-[#8e969e] shadow-xs dark:bg-[#303030] "
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Cancel"
            >
              <Text className="text-white text-base font-bold dark:text-[#E6E6E6] ">Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleSave}
              disabled={isSaving}
              className="bg-[#72AF5B] px-7 py-2.5 rounded-lg active:bg-[#60964c] shadow-xs dark:bg-[#E6E6E6] dark:active:bg-[#E6E6E6] "
              style={{ backgroundColor: themeColor("#72AF5B", "#E6E6E6"), opacity: isSaving ? 0.7 : 1 }}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Save"
            >
              <Text className="text-white text-base font-bold dark:text-[#181818] ">
                {isSaving ? "Saving..." : "Save"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <Navigation activeTab="Menu" showFab={false} />
    </SafeAreaView>
  );
}
