import { useAppTheme } from "@/context/theme-context";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { ActivityIndicator, Image, TouchableOpacity, View } from "react-native";

export interface ProfileHeaderProps {
  coverPhotoUri?: string;
  avatarUri?: string;
  isOwnProfile?: boolean;
  isVerified?: boolean;
  isUpdatingCover?: boolean;
  onPressBack?: () => void;
  onPressDots?: () => void;
  onPressEditCover?: () => void;
  onPressChangePicture?: () => void;
  onPressCoverPhoto?: () => void;
}

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  coverPhotoUri = "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1000&auto=format&fit=crop&q=80",
  avatarUri,
  isOwnProfile = false,
  isVerified = false,
  isUpdatingCover = false,
  onPressBack,
  onPressDots,
  onPressEditCover,
  onPressChangePicture,
  onPressCoverPhoto,
}) => {
  const { themeColor } = useAppTheme();
  return (
    <View className="w-full h-48 bg-gray-200 relative mb-14 dark:bg-[#181818] ">
      {/* Cover Photo */}
      <TouchableOpacity
        activeOpacity={0.92}
        onPress={onPressCoverPhoto || onPressEditCover}
        className="w-full h-full"
        accessibilityRole="button"
        accessibilityLabel="Cover photo"
      >
        <Image
          source={{ uri: coverPhotoUri }}
          className="w-full h-full"
          resizeMode="cover"
        />
      </TouchableOpacity>

      {/* Loading Overlay when updating cover */}
      {isUpdatingCover && (
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.4)",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 15,
          }}
        >
          <ActivityIndicator size="large" color={themeColor("#FFFFFF", "#E6E6E6")} />
        </View>
      )}

      {/* Back Button Overlay */}
      {onPressBack && (
        <TouchableOpacity
          onPress={onPressBack}
          activeOpacity={0.8}
          style={{
            position: "absolute",
            top: 12,
            left: 12,
            zIndex: 20,
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: "rgba(25, 38, 30, 0.45)",
            alignItems: "center",
            justifyContent: "center",
          }}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={20} color={themeColor("#FFFFFF", "#E6E6E6")} />
        </TouchableOpacity>
      )}

      {/* Edit Cover Photo (Pencil) if own profile */}
      {isOwnProfile && onPressEditCover && (
        <TouchableOpacity
          onPress={onPressEditCover}
          activeOpacity={0.8}
          style={{
            position: "absolute",
            top: 12,
            right: 56,
            zIndex: 20,
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: "rgba(25, 38, 30, 0.45)",
            alignItems: "center",
            justifyContent: "center",
          }}
          accessibilityRole="button"
          accessibilityLabel="Edit cover photo"
        >
          <Ionicons name="pencil" size={17} color={themeColor("#FFFFFF", "#E6E6E6")} />
        </TouchableOpacity>
      )}

      {/* Absolute-positioned "dots" icon button (ellipsis-horizontal) */}
      <TouchableOpacity
        onPress={onPressDots}
        activeOpacity={0.8}
        style={{
          position: "absolute",
          top: 12,
          right: 12,
          zIndex: 20,
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: "rgba(25, 38, 30, 0.45)",
          alignItems: "center",
          justifyContent: "center",
        }}
        accessibilityRole="button"
        accessibilityLabel="Profile options"
      >
        <Ionicons name="ellipsis-horizontal" size={20} color={themeColor("#FFFFFF", "#E6E6E6")} />
      </TouchableOpacity>

      {/* Avatar */}
      <View className="absolute -bottom-10 left-4 z-10">
        <View
          style={{
            width: 96,
            height: 96,
            borderRadius: 48,
            borderWidth: 4,
            borderColor: themeColor("#FFFFFF", "#414141"),
            backgroundColor: themeColor("#EDF3EE", "#181818"),
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
            shadowColor: "#1e2a22",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.08,
            shadowRadius: 6,
            elevation: 3,
          }}
        >
          {avatarUri ? (
            <Image
              source={{ uri: avatarUri }}
              className="w-full h-full"
              resizeMode="cover"
            />
          ) : (
            <Ionicons name="person" size={48} color={themeColor("#7A8D81", "#E6E6E6")} />
          )}
        </View>

        {/* Camera icon on bottom right of avatar if own profile */}
        {isOwnProfile && onPressChangePicture && (
          <TouchableOpacity
            onPress={onPressChangePicture}
            style={{
              position: "absolute",
              bottom: 0,
              right: 0,
              width: 28,
              height: 28,
              borderRadius: 14,
              backgroundColor: themeColor("#F4F7F4", "#181818"),
              borderWidth: 2,
              borderColor: themeColor("#FFFFFF", "#414141"),
              alignItems: "center",
              justifyContent: "center",
              shadowColor: "#1e2a22",
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.1,
              shadowRadius: 2,
              elevation: 2,
            }}
            accessibilityRole="button"
            accessibilityLabel="Change profile picture"
          >
            <Ionicons name="camera" size={13} color={themeColor("#34594A", "#E6E6E6")} />
          </TouchableOpacity>
        )}

        {/* Verified Green Badge on top-right of avatar */}
        {isVerified && (
          <View
            style={{
              position: "absolute",
              top: -2,
              right: -2,
              width: 26,
              height: 26,
              backgroundColor: themeColor("#FFFFFF", "#242424"),
              borderRadius: 13,
              alignItems: "center",
              justifyContent: "center",
              shadowColor: "#000000",
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.12,
              shadowRadius: 2,
              elevation: 3,
            }}
            accessibilityLabel="Verified RSBSA Grower"
          >
            <Ionicons name="checkmark-circle" size={22} color={themeColor("#2A734D", "#E6E6E6")} />
          </View>
        )}
      </View>
    </View>
  );
};

export default ProfileHeader;
