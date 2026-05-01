import React, { useState } from "react";
import { Platform, Pressable, StyleSheet, Text, TextInput, TextInputProps, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "@/lib/theme";

interface Props extends Omit<TextInputProps, "style"> {
  label?: string;
  error?: string | null;
  helper?: string;
  left?: keyof typeof Ionicons.glyphMap;
  right?: React.ReactNode;
  password?: boolean;
  disabled?: boolean;
}

export function AppInput({ label, error, helper, left, right, password, disabled, ...rest }: Props) {
  const [show, setShow] = useState(false);
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.wrap}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View
        style={[
          styles.inputBox,
          focused && styles.inputBoxFocused,
          error ? styles.inputBoxError : null,
          disabled ? styles.inputBoxDisabled : null,
        ]}
      >
        {left ? <Ionicons name={left} size={18} color={theme.colors.textMuted} style={{ marginRight: 8 }} /> : null}
        <TextInput
          autoCapitalize="words"
          {...rest}
          editable={!disabled}
          secureTextEntry={password ? !show : rest.secureTextEntry}
          placeholderTextColor={theme.colors.textSubtle}
          onFocus={(e) => {
            setFocused(true);
            rest.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            rest.onBlur?.(e);
          }}
          style={[styles.input, Platform.OS === "web" ? webNoOutline : null]}
          underlineColorAndroid="transparent"
        />
        {password ? (
          <Pressable onPress={() => setShow((s) => !s)} hitSlop={10}>
            <Ionicons name={show ? "eye-off" : "eye"} size={20} color={theme.colors.textMuted} />
          </Pressable>
        ) : right ? (
          right
        ) : null}
      </View>
      {error ? (
        <Text style={styles.error}>{error}</Text>
      ) : helper ? (
        <Text style={styles.helper}>{helper}</Text>
      ) : null}
    </View>
  );
}

const webNoOutline = {
  outlineStyle: "none",
  outlineWidth: 0,
  outlineColor: "transparent",
  boxShadow: "none",
  WebkitAppearance: "none",
  appearance: "none",
} as any;

const styles = StyleSheet.create({
  wrap: { marginBottom: theme.spacing.md },
  label: { ...theme.font.medium, fontSize: 15, color: theme.colors.text, marginBottom: 6 },
  inputBox: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    height: 50,
    backgroundColor: theme.colors.inputBg,
    borderWidth: 1.5,
    borderColor: theme.colors.inputBorder,
    borderRadius: theme.radius.md,
    overflow: "hidden",
  },
  inputBoxFocused: { borderColor: theme.colors.primary, backgroundColor: "#fff" },
  inputBoxError: { borderColor: theme.colors.danger },
  inputBoxDisabled: { backgroundColor: theme.colors.surfaceSubtle, opacity: 0.7 },
  input: {
    flex: 1,
    ...theme.font.regular,
    fontSize: 15,
    color: theme.colors.text,
    paddingVertical: 0,
    margin: 0,
    borderWidth: 0,
    backgroundColor: "transparent",
    height: "100%",
  },
  error: { color: theme.colors.danger, fontSize: 14, marginTop: 4 },
  helper: { color: theme.colors.textMuted, fontSize: 14, marginTop: 4 },
});
