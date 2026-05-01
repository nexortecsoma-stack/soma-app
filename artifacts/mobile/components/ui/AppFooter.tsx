import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { theme } from "@/lib/theme";
import { APP_FOOTER } from "@/lib/constants";

export function AppFooter() {
  return (
    <View style={styles.wrap}>
      <Text style={styles.txt}>{APP_FOOTER}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingVertical: 16, alignItems: "center" },
  txt: { fontSize: 13, color: theme.colors.textSubtle, ...theme.font.regular },
});
