import React from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { theme } from "@/lib/theme";
import { useUI } from "@/hooks/UIContext";
import { CONTATOS_SUPORTE } from "@/lib/constants";
import { AppHeader } from "@/components/ui/AppHeader";
import { AppCard } from "@/components/ui/AppCard";
import { AppKeyboardView } from "@/components/ui/AppKeyboardView";
import { AppFooter } from "@/components/ui/AppFooter";

export default function ContatoScreen() {
  const insets = useSafeAreaInsets();
  const { openDrawer, showToast } = useUI();

  const abrir = async (url: string) => {
    try {
      const ok = await Linking.canOpenURL(url);
      if (!ok) throw new Error("URL não suportada");
      await Linking.openURL(url);
    } catch {
      showToast({ type: "error", message: "Não foi possível abrir." });
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <AppHeader title="Contato e suporte" subtitle="Estamos por aqui" onMenuPress={openDrawer} />
      <AppKeyboardView contentContainerStyle={{ padding: 14, paddingBottom: insets.bottom + 30 }}>
        <AppCard>
          <Text style={styles.txt}>
            Encontrou um problema ou tem uma sugestão? Fale com a gente pelos canais abaixo. Respondemos
            em até 1 dia útil.
          </Text>
        </AppCard>

        <AppCard style={{ marginTop: 12 }}>
          <CanalLinha
            icone="logo-whatsapp"
            cor="#22C55E"
            titulo="WhatsApp"
            descricao="Atendimento de segunda a sábado"
            valor={CONTATOS_SUPORTE.whatsapp}
            onPress={() => abrir(`https://wa.me/${CONTATOS_SUPORTE.whatsappNumero}`)}
          />
          <CanalLinha
            icone="mail"
            cor={theme.colors.primary}
            titulo="E-mail"
            descricao="Respondemos em até 1 dia útil"
            valor={CONTATOS_SUPORTE.email}
            onPress={() => abrir(`mailto:${CONTATOS_SUPORTE.email}`)}
            ultimo
          />
        </AppCard>

        <AppCard style={{ marginTop: 12 }}>
          <Text style={styles.section}>Como agilizar seu atendimento</Text>
          <Text style={styles.txt}>
            • Conte rapidamente o que aconteceu.{"\n"}
            • Diga se aconteceu ao salvar, listar ou abrir alguma tela.{"\n"}
            • Se possível, envie uma captura de tela.{"\n"}
            • Informe a versão do app: 1.0.0.
          </Text>
        </AppCard>
        <AppFooter />
      </AppKeyboardView>
    </View>
  );
}

function CanalLinha({
  icone, cor, titulo, descricao, valor, onPress, ultimo,
}: {
  icone: keyof typeof Ionicons.glyphMap;
  cor: string;
  titulo: string;
  descricao?: string;
  valor: string;
  onPress: () => void;
  ultimo?: boolean;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.linha, !ultimo && styles.divider]}>
      <View style={[styles.icone, { backgroundColor: cor + "1A" }]}>
        <Ionicons name={icone} size={20} color={cor} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.linhaTit}>{titulo}</Text>
        {descricao ? <Text style={styles.linhaDesc}>{descricao}</Text> : null}
        <Text style={styles.linhaVal}>{valor}</Text>
      </View>
      <Ionicons name="open-outline" size={18} color={theme.colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  txt: { ...theme.font.regular, fontSize: 13, color: theme.colors.textMuted, lineHeight: 19 },
  section: { ...theme.font.semibold, fontSize: 14, color: theme.colors.text, marginBottom: 10 },
  linha: { flexDirection: "row", alignItems: "center", paddingVertical: 12 },
  divider: { borderBottomWidth: 1, borderBottomColor: theme.colors.divider },
  icone: { width: 40, height: 40, borderRadius: 10, justifyContent: "center", alignItems: "center", marginRight: 12 },
  linhaTit: { ...theme.font.semibold, fontSize: 14, color: theme.colors.text },
  linhaDesc: { ...theme.font.regular, fontSize: 12, color: theme.colors.textMuted, marginTop: 1 },
  linhaVal: { ...theme.font.semibold, fontSize: 13, color: theme.colors.primary, marginTop: 2 },
});
