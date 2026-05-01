import React, { useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { theme } from "@/lib/theme";
import { dateEngine } from "@/engines/date-engine";
import { jornadaEngine } from "@/engines/jornada-engine";
import { useUI } from "@/hooks/UIContext";
import { useJornadas } from "@/hooks/useJornadas";
import { AppHeader } from "@/components/ui/AppHeader";
import { AppCard } from "@/components/ui/AppCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { AppFooter } from "@/components/ui/AppFooter";
import type { Jornada } from "@/lib/types";

export default function HistoricoGps() {
  const insets = useSafeAreaInsets();
  const { openDrawer, showModal, hideModal, showToast } = useUI();
  const [mes, setMes] = useState(new Date());
  const { listAuto, remove } = useJornadas(mes);

  const hoje = new Date();
  const isFuturo =
    mes.getFullYear() > hoje.getFullYear() ||
    (mes.getFullYear() === hoje.getFullYear() && mes.getMonth() >= hoje.getMonth());

  const irPrev = () => setMes(new Date(mes.getFullYear(), mes.getMonth() - 1, 1));
  const irNext = () => {
    if (!isFuturo) setMes(new Date(mes.getFullYear(), mes.getMonth() + 1, 1));
  };

  const jornadas = (listAuto.data ?? []).filter((j) => {
    const d = dateEngine.parseISO(j.data_jornada);
    return d.getFullYear() === mes.getFullYear() && d.getMonth() === mes.getMonth();
  });

  const totalKm = jornadas.reduce((s, j) => s + (Number(j.km_percorrido_real || j.km_percorrido) || 0), 0);
  const totalMin = jornadas.reduce(
    (s, j) => s + jornadaEngine.tempoTotalMinutos(j.horas ?? 0, j.minutos ?? 0),
    0,
  );

  const confirmarRemover = (id: string) => {
    showModal({
      type: "confirm",
      title: "Remover registro GPS?",
      message: "Esta ação não poderá ser desfeita.",
      confirmLabel: "Remover",
      cancelLabel: "Cancelar",
      onConfirm: async () => {
        hideModal();
        try {
          await remove.mutateAsync(id);
          showToast({ type: "success", message: "Registro removido" });
        } catch {
          showToast({ type: "error", message: "Erro ao remover" });
        }
      },
      onCancel: hideModal,
    });
  };

  const usarDados = (item: Jornada) => {
    router.push({
      pathname: "/(private)/registrar-jornada",
      params: {
        data: item.data_jornada,
        horas: String(item.horas ?? 0),
        minutos: String(item.minutos ?? 0),
        km: String(item.km_percorrido_real || item.km_percorrido || ""),
      },
    } as any);
  };

  return (
    <View style={{ flex: 1 }}>
      <AppHeader
        title="Histórico GPS"
        subtitle="Jornadas registradas automaticamente"
        onMenuPress={openDrawer}
      />

      <View style={styles.infoBox}>
        <Ionicons name="information-circle-outline" size={15} color={theme.colors.textMuted} />
        <Text style={styles.infoTxt}>
          Estes registros servem apenas como referência para preencher jornadas manuais.
        </Text>
      </View>

      <View style={styles.mesRow}>
        <Pressable onPress={irPrev} hitSlop={10}>
          <Ionicons name="chevron-back" size={20} color={theme.colors.text} />
        </Pressable>
        <Text style={styles.mesTxt}>{dateEngine.formatarMesAno(mes)}</Text>
        <Pressable onPress={irNext} hitSlop={10} disabled={isFuturo}>
          <Ionicons name="chevron-forward" size={20} color={isFuturo ? theme.colors.border : theme.colors.text} />
        </Pressable>
      </View>

      <View style={styles.statsRow}>
        <StatChip label="Registros" valor={`${jornadas.length}`} icon="navigate" />
        <StatChip label="Km totais" valor={`${totalKm.toFixed(0)}`} icon="speedometer" />
        <StatChip label="Tempo" valor={`${Math.floor(totalMin / 60)}h${String(totalMin % 60).padStart(2, "0")}`} icon="time" />
      </View>

      {listAuto.isLoading ? (
        <View style={{ padding: 40 }}>
          <ActivityIndicator color={theme.colors.primary} />
        </View>
      ) : (
        <FlatList
          data={jornadas}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 14, paddingBottom: insets.bottom + 60 }}
          ListEmptyComponent={
            <AppCard>
              <EmptyState
                icon="navigate"
                titulo="Sem registros GPS no mês"
                mensagem="Jornadas automáticas aparecerão aqui após serem encerradas."
              />
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
                  <View style={styles.titleRow}>
                    <Text style={styles.cardTit}>{dateEngine.diaSemana(item.data_jornada)}</Text>
                    <View style={styles.badge}>
                      <Ionicons name="navigate" size={10} color={theme.colors.primary} />
                      <Text style={styles.badgeTxt}>GPS</Text>
                    </View>
                  </View>
                  <Text style={styles.cardSub}>
                    {jornadaEngine.formatarTempo(item)} · {Number(item.km_percorrido_real || item.km_percorrido).toFixed(0)} km
                  </Text>
                  {item.status !== "encerrada" && (
                    <Text style={styles.statusTxt}>{item.status}</Text>
                  )}
                </View>
                <Pressable
                  onPress={() => usarDados(item)}
                  hitSlop={6}
                  style={styles.usarBtn}
                >
                  <Ionicons name="create-outline" size={14} color={theme.colors.primary} />
                  <Text style={styles.usarTxt}>Usar</Text>
                </Pressable>
                <Pressable onPress={() => confirmarRemover(item.id)} hitSlop={8} style={{ marginLeft: 8 }}>
                  <Ionicons name="trash-outline" size={20} color={theme.colors.danger} />
                </Pressable>
              </View>
            </AppCard>
          )}
        />
      )}
    </View>
  );
}

function StatChip({
  label,
  valor,
  icon,
}: {
  label: string;
  valor: string;
  icon: keyof typeof Ionicons.glyphMap;
}) {
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
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: "#fff",
    borderRadius: theme.radius.md,
    ...theme.shadow.soft,
    marginHorizontal: 4,
  },
  label: { fontSize: 10, color: theme.colors.textMuted, ...theme.font.medium },
  valor: { fontSize: 14, ...theme.font.bold, color: theme.colors.text },
});

const styles = StyleSheet.create({
  infoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    backgroundColor: theme.colors.primary + "10",
    marginHorizontal: 14,
    marginTop: 8,
    borderRadius: theme.radius.md,
    padding: 10,
  },
  infoTxt: { flex: 1, fontSize: 12, color: theme.colors.textMuted, ...theme.font.regular },
  mesRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 22,
    paddingVertical: 12,
  },
  mesTxt: { ...theme.font.semibold, fontSize: 15, color: theme.colors.text },
  statsRow: { flexDirection: "row", paddingHorizontal: 10, marginBottom: 6 },
  cardRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  dot: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: theme.colors.primary + "12",
    justifyContent: "center",
    alignItems: "center",
  },
  dotDay: { ...theme.font.bold, fontSize: 16, color: theme.colors.primary },
  dotMon: {
    ...theme.font.medium,
    fontSize: 9,
    color: theme.colors.primaryDark,
    textTransform: "uppercase",
  },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  cardTit: { ...theme.font.semibold, fontSize: 14, color: theme.colors.text },
  cardSub: { ...theme.font.regular, fontSize: 12, color: theme.colors.textMuted, marginTop: 2 },
  statusTxt: { ...theme.font.medium, fontSize: 11, color: theme.colors.warning, marginTop: 2 },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: theme.colors.primary + "15",
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  badgeTxt: { ...theme.font.semibold, fontSize: 10, color: theme.colors.primary },
  usarBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: theme.colors.primary + "15",
    borderRadius: theme.radius.pill,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  usarTxt: { ...theme.font.semibold, fontSize: 12, color: theme.colors.primary },
});
