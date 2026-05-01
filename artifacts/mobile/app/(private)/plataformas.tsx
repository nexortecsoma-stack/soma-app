import React, { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Switch, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { theme } from "@/lib/theme";
import { useUI } from "@/hooks/UIContext";
import { usePlataformas, type PlataformaDisplay } from "@/hooks/usePlataformas";
import { AppHeader } from "@/components/ui/AppHeader";
import { AppCard } from "@/components/ui/AppCard";
import { AppInput } from "@/components/ui/AppInput";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { AppKeyboardView } from "@/components/ui/AppKeyboardView";
import { AppFooter } from "@/components/ui/AppFooter";

export default function Plataformas() {
  const insets = useSafeAreaInsets();
  const { openDrawer, showModal, hideModal, showToast } = useUI();
  const { list, fixas, extras, isFree, fixasAtivas, limiteFixasAtivas, extrasAtivas, limiteExtras, toggle, addExtra, remove } = usePlataformas();
  const [novaPlat, setNovaPlat] = useState("");

  const onToggle = async (plataforma: PlataformaDisplay, novoValor: boolean) => {
    if (novoValor) {
      if (plataforma.fixa && fixasAtivas >= limiteFixasAtivas) {
        showModal({
          type: "pro",
          title: "Limite gratuito",
          message: `O plano gratuito permite até ${limiteFixasAtivas} plataformas ativas. Atualize para o plano Pro para liberar mais.`,
        });
        return;
      }
      if (!plataforma.fixa && extrasAtivas >= limiteExtras && isFree) {
        showModal({
          type: "pro",
          title: "Limite gratuito",
          message: `Plano Free permite ${limiteExtras} plataforma extra ativa. Para mais, assine o plano Pro.`,
        });
        return;
      }
    }
    try {
      await toggle.mutateAsync({ plataforma, ativa: novoValor });
    } catch {
      showToast({ type: "error", message: "Erro ao atualizar" });
    }
  };

  const adicionar = async () => {
    if (!novaPlat.trim()) {
      showModal({ type: "error", title: "Nome obrigatório", message: "Informe o nome da plataforma." });
      return;
    }
    if (isFree && extrasAtivas >= limiteExtras) {
      showModal({ type: "pro", title: "Limite gratuito", message: `Plano Free: ${limiteExtras} plataforma extra. Para mais, assine o Pro.` });
      return;
    }
    try {
      await addExtra.mutateAsync({ nome: novaPlat.trim() });
      setNovaPlat("");
      showToast({ type: "success", message: "Plataforma adicionada" });
    } catch {
      showToast({ type: "error", message: "Erro ao adicionar" });
    }
  };

  const removerPlat = (id: string, nome: string) => {
    showModal({
      type: "confirm",
      title: `Remover ${nome}?`,
      message: "Os ganhos vinculados não serão excluídos.",
      confirmLabel: "Remover",
      cancelLabel: "Cancelar",
      onConfirm: async () => {
        hideModal();
        try {
          await remove.mutateAsync(id);
          showToast({ type: "success", message: "Removida" });
        } catch {
          showToast({ type: "error", message: "Erro" });
        }
      },
      onCancel: hideModal,
    });
  };

  return (
    <View style={{ flex: 1 }}>
      <AppHeader title="Plataformas" subtitle="Origem dos seus ganhos" onMenuPress={openDrawer} />
      <AppKeyboardView contentContainerStyle={{ padding: 14, paddingBottom: insets.bottom + 90 }}>
        <AppCard>
          <View style={styles.statusBar}>
            <Ionicons name={isFree ? "lock-closed" : "star"} size={16} color={isFree ? theme.colors.warning : theme.colors.primary} />
            <Text style={styles.statusTxt}>
              {isFree ? `Plano Free · ${fixasAtivas}/${limiteFixasAtivas} ativas + ${extrasAtivas}/${limiteExtras} extras` : "Plano Pro · sem limites"}
            </Text>
          </View>
        </AppCard>

        {/* Plataformas fixas: sempre visíveis (vêm dos constantes do app) */}
        <Text style={styles.section}>Plataformas fixas</Text>
        <AppCard noPadding>
          {fixas.map((p, idx) => (
            <View key={p.nome} style={[styles.platRow, idx < fixas.length - 1 && styles.divider]}>
              <Ionicons name="settings-outline" size={14} color={theme.colors.textMuted} style={{ marginRight: 8 }} />
              <View style={styles.platLeft}>
                <Text style={styles.platNome}>{p.nome}</Text>
              </View>
              <Switch
                value={p.ativa}
                onValueChange={(v) => onToggle(p, v)}
                trackColor={{ true: theme.colors.primary, false: theme.colors.border }}
                disabled={toggle.isPending}
              />
            </View>
          ))}
        </AppCard>

        {/* Plataformas extras: do banco */}
        <Text style={styles.section}>Plataformas extras</Text>
        <AppCard noPadding>
          {list.isLoading ? (
            <View style={{ padding: 16, alignItems: "center" }}>
              <ActivityIndicator color={theme.colors.primary} size="small" />
            </View>
          ) : extras.length === 0 ? (
            <View style={{ padding: 16 }}>
              <Text style={styles.empty}>Nenhuma plataforma extra cadastrada</Text>
            </View>
          ) : (
            extras.map((p, idx) => (
              <View key={p.id ?? p.nome} style={[styles.platRow, idx < extras.length - 1 && styles.divider]}>
                <View style={styles.platLeft}>
                  <Text style={styles.platNome}>{p.nome}</Text>
                </View>
                <Switch
                  value={p.ativa}
                  onValueChange={(v) => onToggle(p, v)}
                  trackColor={{ true: theme.colors.primary, false: theme.colors.border }}
                  disabled={toggle.isPending}
                />
                {p.id ? (
                  <Pressable onPress={() => removerPlat(p.id!, p.nome)} hitSlop={6} style={{ marginLeft: 8 }}>
                    <Ionicons name="trash-outline" size={18} color={theme.colors.danger} />
                  </Pressable>
                ) : null}
              </View>
            ))
          )}
        </AppCard>

        <AppCard style={{ marginTop: 14 }}>
          <Text style={styles.cardTit}>Adicionar plataforma extra</Text>
          <AppInput
            label="Nome da plataforma"
            placeholder="Ex.: Loggi, Lalamove..."
            value={novaPlat}
            onChangeText={setNovaPlat}
            autoCapitalize="words"
          />
          <PrimaryButton label="Adicionar" icon="add" onPress={adicionar} loading={addExtra.isPending} fullWidth style={{ marginTop: 12 }} />
        </AppCard>

        <AppFooter />
      </AppKeyboardView>
    </View>
  );
}

const styles = StyleSheet.create({
  statusBar: { flexDirection: "row", alignItems: "center", gap: 8 },
  statusTxt: { ...theme.font.medium, fontSize: 13, color: theme.colors.text },
  section: { ...theme.font.semibold, fontSize: 13, color: theme.colors.textMuted, marginTop: 18, marginBottom: 8, marginLeft: 4 },
  platRow: { flexDirection: "row", alignItems: "center", padding: 14 },
  divider: { borderBottomWidth: 1, borderBottomColor: theme.colors.divider },
  platLeft: { flex: 1 },
  platNome: { ...theme.font.semibold, fontSize: 14, color: theme.colors.text },
  empty: { textAlign: "center", color: theme.colors.textMuted, ...theme.font.regular, fontSize: 12 },
  cardTit: { ...theme.font.semibold, fontSize: 14, color: theme.colors.text, marginBottom: 12 },
});
