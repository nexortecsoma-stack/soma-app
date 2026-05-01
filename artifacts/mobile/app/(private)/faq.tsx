import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { theme } from "@/lib/theme";
import { useUI } from "@/hooks/UIContext";
import { FAQ_ITENS } from "@/lib/constants";
import { AppHeader } from "@/components/ui/AppHeader";
import { AppCard } from "@/components/ui/AppCard";
import { AppKeyboardView } from "@/components/ui/AppKeyboardView";
import { AppFooter } from "@/components/ui/AppFooter";

export default function FAQScreen() {
  const insets = useSafeAreaInsets();
  const { openDrawer } = useUI();
  const [aberto, setAberto] = useState<number | null>(0);

  return (
    <View style={{ flex: 1 }}>
      <AppHeader title="Dúvidas frequentes" subtitle="Respostas rápidas" onMenuPress={openDrawer} />
      <AppKeyboardView contentContainerStyle={{ padding: 14, paddingBottom: insets.bottom + 30 }}>
        {FAQ_ITENS.map((item, i) => {
          const ativo = aberto === i;
          return (
            <AppCard key={i} style={{ marginBottom: 10 }}>
              <Pressable onPress={() => setAberto(ativo ? null : i)} style={styles.head}>
                <Text style={styles.perg} numberOfLines={ativo ? undefined : 2}>{item.pergunta}</Text>
                <Ionicons name={ativo ? "chevron-up" : "chevron-down"} size={20} color={theme.colors.primary} />
              </Pressable>
              {ativo ? <Text style={styles.resp}>{item.resposta}</Text> : null}
            </AppCard>
          );
        })}
        <AppFooter />
      </AppKeyboardView>
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  perg: { flex: 1, ...theme.font.semibold, fontSize: 14, color: theme.colors.text, marginRight: 10 },
  resp: { marginTop: 10, ...theme.font.regular, fontSize: 13, color: theme.colors.textMuted, lineHeight: 18 },
});
