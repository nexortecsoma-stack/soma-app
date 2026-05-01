import React from "react";
import { Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { theme } from "@/lib/theme";

interface Props {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  bottom?: number;
}

export function FloatingButton({ icon, onPress, bottom = 28 }: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.fab,
        { bottom },
        pressed && { transform: [{ scale: 0.96 }] },
      ]}
    >
      <LinearGradient
        colors={theme.gradients.primary as readonly [string, string]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.bg}
      >
        <Ionicons name={icon} size={28} color="#fff" />
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: "absolute",
    right: 22,
    width: 60,
    height: 60,
    borderRadius: 30,
    overflow: "hidden",
    ...theme.shadow.card,
    shadowColor: "#0EA5E9",
    shadowOpacity: 0.4,
  },
  bg: { flex: 1, justifyContent: "center", alignItems: "center" },
});
