import React, { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { theme } from "@/lib/theme";
import { dateEngine } from "@/engines/date-engine";
import { currencyEngine } from "@/engines/currency-engine";
import { useUI } from "@/hooks/UIContext";
import { useAuth } from "@/hooks/AuthContext";
import { useDespesas } from "@/hooks/useDespesas";
import { CATEGORIAS_DESPESA } from "@/lib/constants";
import { AppHeader } from "@/components/ui/AppHeader";
import { AppCard } from "@/components/ui/AppCard";
import { AppInput } from "@/components/ui/AppInput";
import { AppDropdown } from "@/components/ui/AppDropdown";
import { AppCalendar } from "@/components/ui/AppCalendar";
import { CurrencyInput } from "@/components/ui/CurrencyInput";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { EmptyState } from "@/components/ui/EmptyState";
import { FloatingButton } from "@/components/ui/FloatingButton";
import { AppFooter } from "@/components/ui/AppFooter";
import type { Despesa } from "@/lib/types";

export default function MinhasDespesas() {
  const insets = useSafeAreaInsets();
  const { openDrawer, showModal, hideModal, showToast } = useUI();
  const { perfil } = useAuth();
  const [mes, setMes] = useState(new Date());
  const { list, update, remove } = useDespesas(mes);
  const total = (list.data ?? []).reduce((s, d) => s + (Number(d.valor) || 0), 0);
  const catMap = new Map<string, (typeof CATEGORIAS_DESPESA)[number]>(CATEGORIAS_DESPESA.map((c) => [c.id, c]));
  const catOptions = CATEGORIAS_DESPESA.map((c) => ({ label: c.nome, value: c.id }));

  const [editing, setEditing] = useState<Despesa | null>(null);
  const [edData, setEdData] = useState(new Date());
  const [edCat, setEdCat] = useState<string | null>(null);
  const [edValor, setEdValor] = useState(0);
  const [edObs, setEdObs] = useState("");

  useEffect(() => {
    if (!editing) return;
    setEdData(dateEngine.parseISO(editing.data_despesa));
    setEdCat(editing.categoria);
    setEdValor(Number(editing.valor) || 0);
    setEdObs(editing.observacao ?? "");
  }, [editing?.id]);

  const assinante = perfil?.assinante === true;
  const hoje = new Date();
  const minMes = new Date(hoje.getFullYear(), hoje.getMonth() - 2, 1);
  const isAtMin = !assinante && (
    mes.getFullYear() < minMes.getFullYear() ||
    (mes.getFullYear() === minMes.getFullYear() && mes.getMonth() <= minMes.getMonth())
  );
  const isFuturo = mes.getFullYear() > hoje.getFullYear() ||
    (mes.getFullYear() === hoje.getFullYear() && mes.getMonth() >= hoje.getMonth());

  const irPrev = () => { if (!isAtMin) setMes(new Date(mes.getFullYear(), mes.getMonth() - 1, 1)); };
  const irNext = () => { if (!isFuturo) setMes(new Date(mes.getFullYear(), mes.getMonth() + 1, 1)); };

  const removerDespesa = (id: string) => {
    showModal({
      type: "confirm",
      title: "Remover despesa?",
      message: "Esta ação não pode ser desfeita.",
      confirmLabel: "Remover",
      cancelLabel: "Cancelar",
      onConfirm: async () => {
        hideModal();
        try {
          await remove.mutateAsync(id);
          showToast({ type: "success", message: "Despesa removida" });
        } catch {
          showToast({ type: "error", message: "Erro ao remover" });
        }
      },
      onCancel: hideModal,
    });
  };

  const salvarEdicao = async () => {
    if (!editing) return;
    if (edValor <= 0 || !edCat) {
      showToast({ type: "error", message: "Preencha valor e categoria" });
      return;
    }
    try {
      await update.mutateAsync({
        id: editing.id,
        patch: {
          data_despesa: dateEngine.formatarISO(edData),
          categoria: edCat,
          valor: edValor,
          observacao: edObs || null,
        },
      });
      showToast({ type: "success", message: "Despesa atualizada" });
      setEditing(null);
    } catch {
      showToast({ type: "error", message: "Erro ao salvar" });
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <AppHeader title="Minhas Despesas" subtitle="Histórico mensal" onMenuPress={openDrawer} />
      <View style={styles.mesRow}>
        <Pressable onPress={irPrev} hitSlop={10} disabled={isAtMin}><Ionicons name="chevron-back" size={20} color={isAtMin ? theme.colors.border : theme.colors.text} /></Pressable>
        <Text style={styles.mesTxt}>{dateEngine.formatarMesAno(mes)}</Text>
        <Pressable onPress={irNext} hitSlop={10} disabled={isFuturo}><Ionicons name="chevron-forward" size={20} color={isFuturo ? theme.colors.border : theme.colors.text} /></Pressable>
      </View>
      <View style={styles.totBox}>
        <Text style={styles.totLab}>Total no mês</Text>
        <Text style={styles.totVal}>{currencyEngine.formatar(total)}</Text>
      </View>

      {list.isLoading ? (
        <View style={{ padding: 40 }}><ActivityIndicator color={theme.colors.primary} /></View>
      ) : (
        <FlatList
          data={list.data ?? []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 14, paddingBottom: insets.bottom + 100 }}
          ListEmptyComponent={
            <AppCard>
              <EmptyState icon="receipt" titulo="Sem despesas no mês" mensagem="Toque no botão + para registrar." />
            </AppCard>
          }
          ListFooterComponent={<AppFooter />}
          renderItem={({ item }) => {
            const cat = catMap.get(item.categoria);
            return (
              <AppCard style={{ marginBottom: 10 }}>
                <View style={styles.row}>
                  <View style={[styles.icon, { backgroundColor: (cat?.cor ?? theme.colors.primary) + "1A" }]}>
                    <Ionicons name={(cat?.icone as any) ?? "receipt"} size={18} color={cat?.cor ?? theme.colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.tit}>{cat?.nome ?? item.categoria}</Text>
                    <Text style={styles.sub}>
                      {dateEngine.formatarBR(item.data_despesa)}
                      {item.observacao ? ` · ${item.observacao}` : ""}
                    </Text>
                  </View>
                  <Text style={styles.val}>{currencyEngine.formatar(Number(item.valor))}</Text>
                  <Pressable onPress={() => setEditing(item)} hitSlop={6} style={{ marginLeft: 8 }}>
                    <Ionicons name="create-outline" size={18} color={theme.colors.primary} />
                  </Pressable>
                  <Pressable onPress={() => removerDespesa(item.id)} hitSlop={6} style={{ marginLeft: 8 }}>
                    <Ionicons name="trash-outline" size={18} color={theme.colors.danger} />
                  </Pressable>
                </View>
              </AppCard>
            );
          }}
        />
      )}
      <FloatingButton icon="add" onPress={() => router.push("/(private)/despesas")} />

      <Modal visible={!!editing} transparent animationType="fade" onRequestClose={() => setEditing(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHead}>
              <Text style={styles.modalTit}>Editar despesa</Text>
              <Pressable onPress={() => setEditing(null)} hitSlop={8}>
                <Ionicons name="close" size={22} color={theme.colors.text} />
              </Pressable>
            </View>
            <Text style={styles.label}>Data</Text>
            <AppCalendar value={edData} onChange={setEdData} maxDate={dateEngine.hoje()} />
            <View style={{ marginTop: 8 }}>
              <AppDropdown label="Categoria" value={edCat} onChange={setEdCat} options={catOptions} placeholder="Selecione" />
              <CurrencyInput label="Valor" value={edValor} onChangeValue={setEdValor} />
              <AppInput label="Observação" value={edObs} onChangeText={setEdObs} />
              <PrimaryButton label="Salvar alterações" icon="checkmark" onPress={salvarEdicao} loading={update.isPending} fullWidth size="lg" />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  mesRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 22, paddingVertical: 12 },
  mesTxt: { ...theme.font.semibold, fontSize: 15, color: theme.colors.text },
  totBox: { backgroundColor: "#fff", marginHorizontal: 14, padding: 14, borderRadius: theme.radius.md, ...theme.shadow.soft, marginBottom: 10 },
  totLab: { fontSize: 11, color: theme.colors.textMuted, ...theme.font.medium },
  totVal: { fontSize: 22, color: theme.colors.danger, ...theme.font.bold, marginTop: 4 },
  row: { flexDirection: "row", alignItems: "center" },
  icon: { width: 38, height: 38, borderRadius: 10, justifyContent: "center", alignItems: "center", marginRight: 10 },
  tit: { ...theme.font.semibold, fontSize: 14, color: theme.colors.text },
  sub: { ...theme.font.regular, fontSize: 12, color: theme.colors.textMuted, marginTop: 2 },
  val: { ...theme.font.bold, fontSize: 15, color: theme.colors.danger },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", padding: 16 },
  modalCard: { backgroundColor: "#fff", borderRadius: theme.radius.lg, padding: 16, ...theme.shadow.soft, maxHeight: "92%" },
  modalHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  modalTit: { ...theme.font.bold, fontSize: 16, color: theme.colors.text },
  label: { ...theme.font.medium, fontSize: 13, color: theme.colors.text, marginBottom: 6 },
});
