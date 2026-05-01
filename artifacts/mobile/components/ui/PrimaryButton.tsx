import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View, ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "@/lib/theme";

interface Props {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: "primary" | "ghost" | "danger" | "success";
  icon?: keyof typeof Ionicons.glyphMap;
  style?: ViewStyle | ViewStyle[];
  size?: "md" | "lg" | "sm";
  fullWidth?: boolean;
}

export function PrimaryButton({ label, onPress, loading, disabled, variant = "primary", icon, style, size = "md", fullWidth }: Props) {
  const isDisabled = disabled || loading;
  const heightMap = { sm: 40, md: 48, lg: 56 };

  if (variant === "ghost") {
    return (
      <Pressable
        onPress={isDisabled ? undefined : onPress}
        disabled={isDisabled}
        style={({ pressed }) => [
          styles.btn,
          { height: heightMap[size] },
          styles.ghost,
          fullWidth && styles.full,
          pressed && !isDisabled ? { opacity: 0.6 } : null,
          isDisabled && styles.disabledGhost,
          style,
        ]}
      >
        {loading ? (
          <ActivityIndicator color={theme.colors.primary} />
        ) : (
          <View style={styles.row}>
            {icon ? <Ionicons name={icon} size={18} color={theme.colors.primary} style={{ marginRight: 8 }} /> : null}
            <Text style={styles.ghostLabel}>{label}</Text>
          </View>
        )}
      </Pressable>
    );
  }

  const colors =
    variant === "danger"
      ? (["#EF4444", "#B91C1C"] as const)
      : variant === "success"
        ? (theme.gradients.success as readonly [string, string])
        : (theme.gradients.button as readonly [string, string]);

  return (
    <Pressable
      onPress={isDisabled ? undefined : onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.btn,
        { height: heightMap[size] },
        fullWidth && styles.full,
        pressed && !isDisabled ? { opacity: 0.85, transform: [{ scale: 0.99 }] } : null,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.fill}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <View style={styles.row}>
            {icon ? <Ionicons name={icon} size={18} color="#fff" style={{ marginRight: 8 }} /> : null}
            <Text style={styles.label}>{label}</Text>
          </View>
        )}
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: { borderRadius: theme.radius.md, overflow: "hidden", justifyContent: "center", alignItems: "center" },
  fill: { flex: 1, alignSelf: "stretch", justifyContent: "center", alignItems: "center", paddingHorizontal: 18 },
  full: { width: "100%" },
  ghost: {
    backgroundColor: "transparent",
    borderWidth: 1.5,
    borderColor: theme.colors.primary,
    paddingHorizontal: 18,
  },
  row: { flexDirection: "row", alignItems: "center" },
  label: { color: "#fff", ...theme.font.semibold, fontSize: 15 },
  ghostLabel: { color: theme.colors.primary, ...theme.font.semibold, fontSize: 15 },
  disabled: { opacity: 0.5 },
  disabledGhost: { opacity: 0.5 },
});
