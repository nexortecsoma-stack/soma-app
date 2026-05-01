import React from "react";
import { ScrollView, StyleSheet, ViewStyle } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";

interface Props {
  children: React.ReactNode;
  contentContainerStyle?: ViewStyle | ViewStyle[];
  bottomOffset?: number;
}

export function AppKeyboardView({ children, contentContainerStyle, bottomOffset = 90 }: Props) {
  return (
    <KeyboardAwareScrollView
      bottomOffset={bottomOffset}
      keyboardShouldPersistTaps="handled"
      ScrollViewComponent={ScrollView}
      contentContainerStyle={[styles.content, contentContainerStyle]}
      showsVerticalScrollIndicator={false}
    >
      {children}
    </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 18, paddingBottom: 120 },
});
