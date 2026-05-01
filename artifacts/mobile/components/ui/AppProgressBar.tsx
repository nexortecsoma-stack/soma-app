import React from "react";
import { StyleSheet, Text, View, ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { theme } from "@/lib/theme";

interface Props {
  percentual: number;
  label?: string;
  rightLabel?: string;
  style?: ViewStyle;
  cor?: readonly [string, string];
}

export function AppProgressBar({ percentual, label, rightLabel, style, cor }: Props) {
  const pct = Math.min(100, Math.max(0, percentual));
  return (
    <View style={style}>
      {label || rightLabel ? (
        <View style={styles.row}>
          {label ? <Text style={styles.label}>{label}</Text> : <View />}
          {rightLabel ? <Text style={styles.right}>{rightLabel}</Text> : null}
        </View>
      ) : null}
      <View style={styles.track}>
        <LinearGradient
          colors={cor ?? (theme.gradients.primary as readonly [string, string])}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.fill, { width: `${pct}%` }]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  label: { fontSize: 12, color: theme.colors.text, ...theme.font.medium },
  right: { fontSize: 12, color: theme.colors.textMuted, ...theme.font.semibold },
  track: { height: 8, backgroundColor: theme.colors.divider, borderRadius: 6, overflow: "hidden" },
  fill: { height: "100%", borderRadius: 6 },
});
