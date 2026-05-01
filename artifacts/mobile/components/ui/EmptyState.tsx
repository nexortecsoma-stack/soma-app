import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "@/lib/theme";

interface Props {
  icon?: keyof typeof Ionicons.glyphMap;
  titulo: string;
  mensagem?: string;
}

export function EmptyState({ icon = "file-tray", titulo, mensagem }: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.iconBox}>
        <Ionicons name={icon} size={32} color={theme.colors.primary} />
      </View>
      <Text style={styles.titulo}>{titulo}</Text>
      {mensagem ? <Text style={styles.msg}>{mensagem}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 28, alignItems: "center", justifyContent: "center" },
  iconBox: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: theme.colors.primary + "1A",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
  },
  titulo: { ...theme.font.semibold, fontSize: 15, color: theme.colors.text, marginBottom: 6, textAlign: "center" },
  msg: { ...theme.font.regular, fontSize: 13, color: theme.colors.textMuted, textAlign: "center", lineHeight: 18 },
});
