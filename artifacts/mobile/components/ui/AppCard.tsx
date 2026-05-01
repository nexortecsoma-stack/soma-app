import React from "react";
import { StyleSheet, View, ViewStyle } from "react-native";
import { theme } from "@/lib/theme";

interface Props {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  noPadding?: boolean;
}

export function AppCard({ children, style, noPadding }: Props) {
  return <View style={[styles.card, noPadding ? null : styles.padded, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    ...theme.shadow.soft,
  },
  padded: {
    padding: theme.spacing.lg,
  },
});
