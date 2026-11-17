import { PropsWithChildren, useEffect, useState } from "react";
import { AccessibilityInfo, Animated, Easing, Platform } from "react-native";

export default function CalmEntrance({ children, visible = true }: PropsWithChildren<{ visible?: boolean }>) {
  const [progress] = useState(() => new Animated.Value(1));
  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    let animation: Animated.CompositeAnimation | undefined;
    AccessibilityInfo.isReduceMotionEnabled().then((reduced) => {
      if (cancelled || reduced) return;
      progress.setValue(0);
      animation = Animated.timing(progress, { toValue: 1, duration: 240, easing: Easing.out(Easing.cubic), useNativeDriver: Platform.OS !== "web" });
      animation.start();
    }).catch(() => {});
    return () => { cancelled = true; animation?.stop(); progress.setValue(1); };
  }, [visible, progress]);
  return <Animated.View style={{ flex: 1, opacity: progress, transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }] }}>{children}</Animated.View>;
}