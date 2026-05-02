import React, { useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { theme } from "@/lib/theme";
import { dateEngine } from "@/engines/date-engine";
import { useUI } from "@/hooks/UIContext";
import { useAuth } from "@/hooks/AuthContext";
import { useJornadas } from "@/hooks/useJornadas";
import { useGanhos } from "@/hooks/useGanhos";
import { usePlataformas } from "@/hooks/usePlataformas";
import { jornadaEngine } from "@/engines/jornada-engine";
import { AppHeader } from "@/components/ui/AppHeader";
import { AppCard } from "@/components/ui/AppCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { FloatingButton } from "@/components/ui/FloatingButton";
import { AppFooter } from "@/components/ui/AppFooter";
import { EditarDiaModal } from "@/components/modals/EditarDiaModal";
import type { SavePayload } from "@/components/modals/EditarDiaModal";
import type { Ganho, Jornada } from "@/lib/types";

export default function MinhasJornadas() {
  const insets = useSafeAreaInsets();
  const { openDrawer, showModal, hideModal, showToast } = useUI();
  const { perfil } = useAuth();
  const [mes, setMes] = useState(new Date());
  const { list, update, remove, removeComGanhos } = useJornadas(mes);
  const ganhosQuery = useGanhos(mes);
  const { ativas: plataformasAtivas } = usePlataformas();
  const [editandoJornada, setEditandoJornada] = useState<Jornada | null>(null);

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

  const totalKm = (list.data ?? []).reduce((s, j) => s + (Number(j.km_percorrido) || 0), 0);
  const totalMin = (list.data ?? []).reduce((s, j) => s + jornadaEngine.tempoTotalMinutos(j.horas ?? 0, j.minutos ?? 0), 0);

  const confirmarRemover = (jornada: Jornada) => {
    showModal({
      type: "confirm",
      title: "Remover jornada?",
      message: "Isso também removerá todos os ganhos registrados nesse dia.",
      confirmLabel: "Remover",
      cancelLabel: "Cancelar",
      onConfirm: async () => {
        hideModal();
        try {
          await removeComGanhos.mutateAsync(jornada);
          showToast({ type: "success", message: "Jornada e ganhos removidos" });
        } catch {
          showToast({ type: "error", message: "Erro ao remover" });
        }
      },
      onCancel: hideModal,
    });
  };

  const ganhosPorData = useMemo(() => {
    const map = new Map<string, Ganho[]>();
    for (const g of ganhosQuery.list.data ?? []) {
      if (!map.has(g.data_ganho)) map.set(g.data_ganho, []);
      map.get(g.data_ganho)!.push(g);
    }
    return map;
  }, [ganhosQuery.list.data]);

  const marcadores = useMemo(() => {
    const dataCom = new Set((list.data ?? []).map((j) => j.data_jornada));
    const hoje = dateEngine.hoje();
    const resultado: { iso: string; cor: string }[] = [];
    for (let i = 1; i <= 60; i++) {
      const d = dateEngine.somarDias(hoje, -i);
      const iso = dateEngine.formatarISO(d);
      resultado.push({ iso, cor: dataCom.has(iso) ? theme.colors.success : "#EF4444" });
    }
    return resultado;
  }, [list.data]);

  const datasOcupadasJornadas = useMemo(
    () =>
      (list.data ?? [])
        .map((j) => j.data_jornada)
        .filter((d) => d !== (editandoJornada?.data_jornada ?? "")),
    [list.data, editandoJornada],
  );

  const isSavingEdicao =
    update.isPending ||
    ganhosQuery.create.isPending ||
    ganhosQuery.update.isPending ||
    ganhosQuery.remove.isPending;

  const handleSaveEdicao = async (payload: SavePayload) => {
    if (!editandoJornada) return;
    try {
      if (payload.jornadaPatch) {
        await update.mutateAsync({
          id: editandoJornada.id,
          patch: {
            data_jornada: payload.novaDataISO,
            horas: payload.jornadaPatch.horas,
            minutos: payload.jornadaPatch.minutos,
            km_percorrido: payload.jornadaPatch.km_percorrido,
            km_percorrido_real: payload.jornadaPatch.km_percorrido_real,
          },
        });
      }
      for (const id of payload.ganhoDeletes) {
        await ganhosQuery.remove.mutateAsync(id);
      }
      for (const g of payload.ganhoUpdates) {
        await ganhosQuery.update.mutateAsync({
          id: g.id,
          patch: { data_ganho: g.data_ganho, plataforma_id: g.plataforma_id, valor: g.valor, corridas: g.corridas },
        });
      }
      for (const g of payload.ganhoCreates) {
        await ganhosQuery.create.mutateAsync({
          jornada_id: editandoJornada.id,
          plataforma_id: g.plataforma_id,
          data_ganho: g.data_ganho,
          valor: g.valor,
          corridas: g.corridas,
        });
      }
      showToast({ type: "success", message: "Jornada atualizada" });
      setEditandoJornada(null);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Tente novamente";
      showToast({ type: "error", message: msg });
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <AppHeader title="Minhas Jornadas" subtitle="Histórico do mês" onMenuPress={openDrawer} />
      <View style={styles.mesRow}>
        <Pressable onPress={irPrev} hitSlop={10} disabled={isAtMin}><Ionicons name="chevron-back" size={20} color={isAtMin ? theme.colors.border : theme.colors.text} /></Pressable>
        <Text style={styles.mesTxt}>{dateEngine.formatarMesAno(mes)}</Text>
        <Pressable onPress={irNext} hitSlop={10} disabled={isFuturo}><Ionicons name="chevron-forward" size={20} color={isFuturo ? theme.colors.border : theme.colors.text} /></Pressable>
      </View>

      <View style={styles.statsRow}>
        <StatChip label="Jornadas" valor={`${(list.data ?? []).length}`} icon="calendar" />
        <StatChip label="Km totais" valor={`${totalKm.toFixed(0)}`} icon="speedometer" />
        <StatChip label="Tempo" valor={`${Math.floor(totalMin / 60)}h${String(totalMin % 60).padStart(2, "0")}`} icon="time" />
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
              <EmptyState icon="calendar" titulo="Sem jornadas no mês" mensagem="Toque no botão + para registrar." />
            </AppCard>
          }
          ListFooterComponent={<AppFooter />}
          renderItem={({ item }) => (
            <AppCard style={{ marginBottom: 10 }}>
              <View style={styles.cardRow}>
                <View style={styles.dot}>
                  <Text style={styles.dotDay}>{dateEngine.parseISO(item.data_jornada).getDate()}</Text>
                  <Text style={styles.dotMon}>{dateEngine.mesCurto(item.data_jornada)}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTit}>{dateEngine.diaSemana(item.data_jornada)}</Text>
                  <Text style={styles.cardSub}>{jornadaEngine.formatarTempo(item)} · {Number(item.km_percorrido).toFixed(0)} km</Text>
                </View>
                <Pressable onPress={() => setEditandoJornada(item)} hitSlop={6} style={{ marginRight: 10 }}>
                  <Ionicons name="create-outline" size={20} color={theme.colors.primary} />
                </Pressable>
                <Pressable onPress={() => confirmarRemover(item)} hitSlop={8}>
                  <Ionicons name="trash-outline" size={20} color={theme.colors.danger} />
                </Pressable>
              </View>
            </AppCard>
          )}
        />
      )}
      <FloatingButton icon="add" onPress={() => router.push("/(private)/registrar-jornada")} />

      <EditarDiaModal
        visible={!!editandoJornada}
        onClose={() => setEditandoJornada(null)}
        dataISO={editandoJornada?.data_jornada ?? ""}
        jornada={editandoJornada}
        ganhosDia={editandoJornada ? (ganhosPorData.get(editandoJornada.data_jornada) ?? []) : []}
        datasOcupadas={datasOcupadasJornadas}
        marcadores={marcadores}
        plataformas={plataformasAtivas}
        onSave={handleSaveEdicao}
        isSaving={isSavingEdicao}
      />
    </View>
  );
}

function StatChip({ label, valor, icon }: { label: string; valor: string; icon: keyof typeof Ionicons.glyphMap }) {
  return (
    <View style={statStyles.chip}>
      <Ionicons name={icon} size={14} color={theme.colors.primary} />
      <View>
        <Text style={statStyles.label}>{label}</Text>
        <Text style={statStyles.valor}>{valor}</Text>
      </View>
    </View>
  );
}

const statStyles = StyleSheet.create({
  chip: {
    flex: 1, flexDirection: "row", alignItems: "center", gap: 8,
    paddingVertical: 10, paddingHorizontal: 12, backgroundColor: "#fff",
    borderRadius: theme.radius.md, ...theme.shadow.soft, marginHorizontal: 4,
  },
  label: { fontSize: 10, color: theme.colors.textMuted, ...theme.font.medium },
  valor: { fontSize: 14, ...theme.font.bold, color: theme.colors.text },
});

const styles = StyleSheet.create({
  mesRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 22, paddingVertical: 12 },
  mesTxt: { ...theme.font.semibold, fontSize: 15, color: theme.colors.text },
  statsRow: { flexDirection: "row", paddingHorizontal: 10, marginBottom: 6 },
  cardRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  dot: { width: 48, height: 48, borderRadius: 12, backgroundColor: theme.colors.primary + "12", justifyContent: "center", alignItems: "center" },
  dotDay: { ...theme.font.bold, fontSize: 16, color: theme.colors.primary },
  dotMon: { ...theme.font.medium, fontSize: 9, color: theme.colors.primaryDark, textTransform: "uppercase" },
  cardTit: { ...theme.font.semibold, fontSize: 14, color: theme.colors.text },
  cardSub: { ...theme.font.regular, fontSize: 12, color: theme.colors.textMuted, marginTop: 2 },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", padding: 16 },
  modalCard: { backgroundColor: "#fff", borderRadius: theme.radius.lg, padding: 16, ...theme.shadow.soft, maxHeight: "92%" },
  modalHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  modalTit: { ...theme.font.bold, fontSize: 16, color: theme.colors.text },
  label: { ...theme.font.medium, fontSize: 13, color: theme.colors.text, marginBottom: 6 },
});
