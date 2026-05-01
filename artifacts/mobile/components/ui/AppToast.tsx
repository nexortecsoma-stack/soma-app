import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { theme } from "@/lib/theme";
import { useUI } from "@/hooks/UIContext";

const colors = {
  success: theme.colors.success,
  error: theme.colors.danger,
  info: theme.colors.primary,
};

const icons = {
  success: "checkmark-circle" as const,
  error: "close-circle" as const,
  info: "information-circle" as const,
};

export function AppToast() {
  const { toast } = useUI();
  const insets = useSafeAreaInsets();
  const slide = useRef(new Animated.Value(-80)).current;

  useEffect(() => {
    if (toast) {
      Animated.spring(slide, { toValue: 0, useNativeDriver: true, friction: 8 }).start();
    } else {
      Animated.timing(slide, { toValue: -80, duration: 200, useNativeDriver: true }).start();
    }
  }, [toast, slide]);

  if (!toast) return null;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.wrap,
        { top: insets.top + 12, transform: [{ translateY: slide }] },
      ]}
    >
      <View style={[styles.toast, { borderLeftColor: colors[toast.type] }]}>
        <Ionicons name={icons[toast.type]} size={20} color={colors[toast.type]} />
        <Text style={styles.txt} numberOfLines={3}>
          {toast.message}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: "absolute", left: 16, right: 16, zIndex: 99 },
  toast: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: theme.radius.md,
    borderLeftWidth: 4,
    gap: 10,
    ...theme.shadow.card,
  },
  txt: { flex: 1, ...theme.font.medium, fontSize: 13, color: theme.colors.text },
});
