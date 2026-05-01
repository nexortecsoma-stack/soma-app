import React from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "@/lib/theme";
import { useUI } from "@/hooks/UIContext";
import { PrimaryButton } from "./PrimaryButton";

const ICON_MAP = {
  info: { icon: "information-circle" as const, color: theme.colors.primary },
  confirm: { icon: "help-circle" as const, color: theme.colors.warning },
  success: { icon: "checkmark-circle" as const, color: theme.colors.success },
  error: { icon: "close-circle" as const, color: theme.colors.danger },
  onboard: { icon: "lock-closed" as const, color: theme.colors.warning },
  pro: { icon: "star" as const, color: "#F59E0B" },
};

export function CustomModal() {
  const { modal, hideModal } = useUI();
  if (!modal) return null;
  const meta = ICON_MAP[modal.type];

  return (
    <Modal transparent visible animationType="fade" onRequestClose={hideModal}>
      <Pressable style={styles.backdrop} onPress={modal.onCancel ?? hideModal}>
        <Pressable style={styles.card} onPress={() => undefined}>
          <View style={[styles.iconWrap, { backgroundColor: meta.color + "1A" }]}>
            <Ionicons name={meta.icon} size={32} color={meta.color} />
          </View>
          <Text style={styles.title}>{modal.title}</Text>
          <Text style={styles.message}>{modal.message}</Text>
          <View style={styles.actions}>
            {modal.cancelLabel ? (
              <PrimaryButton
                label={modal.cancelLabel}
                onPress={modal.onCancel ?? hideModal}
                variant="ghost"
                style={{ flex: 1, marginRight: 8 }}
              />
            ) : null}
            <PrimaryButton
              label={modal.confirmLabel ?? "OK"}
              onPress={() => {
                hideModal();
                modal.onConfirm?.();
              }}
              style={{ flex: 1 }}
            />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(2,6,23,0.65)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  card: { backgroundColor: "#fff", borderRadius: theme.radius.lg, padding: 24, width: "100%", maxWidth: 380 },
  iconWrap: { width: 64, height: 64, borderRadius: 32, alignSelf: "center", justifyContent: "center", alignItems: "center", marginBottom: 14 },
  title: { fontSize: 18, ...theme.font.bold, color: theme.colors.text, textAlign: "center", marginBottom: 8 },
  message: { fontSize: 14, color: theme.colors.textMuted, ...theme.font.regular, textAlign: "center", marginBottom: 22, lineHeight: 20 },
  actions: { flexDirection: "row", justifyContent: "space-between" },
});
