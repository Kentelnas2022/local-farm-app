import { useAppTheme } from "@/context/theme-context";
import { View } from "react-native";

/** Presence uses a separate palette from the app's forest-green actions. */
export default function PresenceDot({ online }: { online: boolean }) {
  const { themeColor } = useAppTheme();
  return (
    <View
      accessible
      accessibilityLabel={online ? "Online" : "Offline"}
      style={{
        width: 16,
        height: 16,
        borderRadius: 8,
        borderWidth: 2,
        borderColor: themeColor("#FFFFFF", "#414141"),
        backgroundColor: online ? "#16A34A" : "#64748B",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {!online && <View style={{ width: 6, height: 2, borderRadius: 1, backgroundColor: themeColor("#FFFFFF", "#242424") }} />}
    </View>
  );
}
