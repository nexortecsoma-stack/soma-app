import React, { useState } from "react";
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "@/lib/theme";

export interface DropdownOption {
  label: string;
  value: string;
}

interface Props {
  label?: string;
  value: string | null | undefined;
  options: DropdownOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function AppDropdown({ label, value, options, onChange, placeholder = "Selecione", disabled }: Props) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);
  return (
    <View style={{ marginBottom: theme.spacing.md }}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <Pressable
        disabled={disabled}
        onPress={() => setOpen(true)}
        style={[styles.box, open && styles.boxFocused, disabled && styles.disabled]}
      >
        <Text numberOfLines={1} style={[styles.value, !selected && styles.placeholder]}>{selected?.label ?? placeholder}</Text>
        <Ionicons name="chevron-down" size={18} color={theme.colors.textMuted} />
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.sheet} onPress={() => undefined}>
            <Text style={styles.sheetTitle}>{label || "Selecionar"}</Text>
            <FlatList
              data={options}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => {
                    onChange(item.value);
                    setOpen(false);
                  }}
                  style={styles.item}
                >
                  <Text style={[styles.itemTxt, item.value === value && styles.itemTxtAtivo]}>{item.label}</Text>
                  {item.value === value ? <Ionicons name="checkmark" size={18} color={theme.colors.primary} /> : null}
                </Pressable>
              )}
              ItemSeparatorComponent={() => <View style={styles.sep} />}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { ...theme.font.medium, fontSize: 15, color: theme.colors.text, marginBottom: 6 },
  box: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    height: 50,
    backgroundColor: theme.colors.inputBg,
    borderWidth: 1.5,
    borderColor: theme.colors.inputBorder,
    borderRadius: theme.radius.md,
    overflow: "hidden",
  },
  boxFocused: { borderColor: theme.colors.primary, backgroundColor: "#fff" },
  disabled: { opacity: 0.6 },
  value: { ...theme.font.regular, fontSize: 15, color: theme.colors.text, flex: 1 },
  placeholder: { color: theme.colors.textSubtle },
  backdrop: { flex: 1, backgroundColor: "rgba(2,6,23,0.55)", justifyContent: "center", paddingHorizontal: 24 },
  sheet: {
    backgroundColor: "#fff",
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 22,
    maxHeight: "75%",
  },
  sheetTitle: { ...theme.font.bold, fontSize: 19, color: theme.colors.text, marginBottom: 14 },
  item: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 14 },
  itemTxt: { ...theme.font.regular, fontSize: 15, color: theme.colors.text },
  itemTxtAtivo: { ...theme.font.semibold, color: theme.colors.primary },
  sep: { height: 1, backgroundColor: theme.colors.divider },
});
