import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { theme } from "@/lib/theme";
import { useAuth } from "@/hooks/AuthContext";
import { useUI } from "@/hooks/UIContext";
import { useConferenciaHodometro } from "@/hooks/useConferenciaHodometro";
import { useProtectedAction } from "@/hooks/useProtectedAction";
import { dateEngine } from "@/engines/date-engine";
import { currencyEngine } from "@/engines/currency-engine";
import { hodometroEngine, type FiltroPeriodo } from "@/engines/hodometro-engine";
import type { ConferenciaHodometro } from "@/lib/types";
import { AppHeader } from "@/components/ui/AppHeader";
import { AppCard } from "@/components/ui/AppCard";
import { AppKeyboardView } from "@/components/ui/AppKeyboardView";
import { AppInput } from "@/components/ui/AppInput";
import { AppCalendar } from "@/components/ui/AppCalendar";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { AppProgressBar } from "@/components/ui/AppProgressBar";
import { AppFooter } from "@/components/ui/AppFooter";

const FILTROS: { id: FiltroPeriodo; label: string }[] = [
  { id: "dia", label: "Dia" },
  { id: "semana", label: "Semana" },
  { id: "mes", label: "Mês" },
  { id: "ano", label: "Ano" },
  { id: "todos", label: "Tudo" },
];

// ─── Helpers de navegação ────────────────────────────────────────────────────

function refInicial(filtro: FiltroPeriodo): Date {
  const hoje = dateEngine.hoje();
  if (filtro === "mes") return new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  if (filtro === "ano") return new Date(hoje.getFullYear(), 0, 1);
  return hoje;
}

function navAnterior(filtro: FiltroPeriodo, ref: Date): Date {
  if (filtro === "dia")    return dateEngine.somarDias(ref, -1);
  if (filtro === "semana") return dateEngine.somarDias(dateEngine.inicioSemana(ref), -7);
  if (filtro === "mes")    return new Date(ref.getFullYear(), ref.getMonth() - 1, 1);
  if (filtro === "ano")    return new Date(ref.getFullYear() - 1, 0, 1);
  return ref;
}

function navProximo(filtro: FiltroPeriodo, ref: Date): Date {
  if (filtro === "dia")    return dateEngine.somarDias(ref, 1);
  if (filtro === "semana") return dateEngine.somarDias(dateEngine.inicioSemana(ref), 7);
  if (filtro === "mes")    return new Date(ref.getFullYear(), ref.getMonth() + 1, 1);
  if (filtro === "ano")    return new Date(ref.getFullYear() + 1, 0, 1);
  return ref;
}

function proximoBloqueado(filtro: FiltroPeriodo, ref: Date): boolean {
  if (filtro === "todos") return true;
  const hoje = dateEngine.hoje();
  if (filtro === "dia")    return ref >= hoje;
  if (filtro === "semana") return dateEngine.inicioSemana(ref) >= dateEngine.inicioSemana(hoje);
  if (filtro === "mes")    return ref.getFullYear() >= hoje.getFullYear() && ref.getMonth() >= hoje.getMonth();
  if (filtro === "ano")    return ref.getFullYear() >= hoje.getFullYear();
  return false;
}

function labelPeriodo(filtro: FiltroPeriodo, ref: Date): string {
  if (filtro === "todos")  return "Todos os registros";
  if (filtro === "dia")    return dateEngine.formatarBR(ref);
  if (filtro === "semana") {
    const ini = dateEngine.inicioSemana(ref);
    const fim = dateEngine.fimSemana(ref);
    return `${dateEngine.formatarBR(ini)} – ${dateEngine.formatarBR(fim)}`;
  }
  if (filtro === "mes") return dateEngine.formatarMesAno(ref);
  if (filtro === "ano") return String(ref.getFullYear());
  return "";
}

// ─────────────────────────────────────────────────────────────────────────────

export default function ConferirHodometro() {
  const insets = useSafeAreaInsets();
  const { veiculo } = useAuth();
  const { openDrawer, showToast, showModal } = useUI();
  const protect = useProtectedAction();
  const { list, ultima, jornadas, abastecimentos, kmAtual, isLoading, create, update, remove } =
    useConferenciaHodometro();

  const [filtro, setFiltro] = useState<FiltroPeriodo>("mes");
  const [refDate, setRefDate] = useState<Date>(() => refInicial("mes"));
  const [dataConf, setDataConf] = useState(dateEngine.hoje());
  const [hodometroInput, setHodometroInput] = useState("");
  const [mostrarForm, setMostrarForm] = useState(false);

  // Estado de edição
  const [editItem, setEditItem] = useState<ConferenciaHodometro | null>(null);
  const [editData, setEditData] = useState(dateEngine.hoje());
  const [editHodo, setEditHodo] = useState("");

  const resumo = useMemo(
    () =>
      hodometroEngine.resumo({
        jornadas,
        abastecimentos,
        veiculo,
        hodometroAtual: kmAtual,
        filtro,
        refDate,
      }),
    [jornadas, abastecimentos, veiculo, kmAtual, filtro, refDate],
  );

  const abrirEdicao = (item: ConferenciaHodometro) => {
    setEditItem(item);
    setEditData(dateEngine.parseISO(item.data_conferencia));
    setEditHodo(String(item.hodometro_atual));
  };

  const salvarEdicao = async () => {
    if (!editItem) return;
    const v = parseFloat((editHodo || "0").replace(",", "."));
    if (v <= 0) {
      showToast({ type: "error", message: "Valor inválido" });
      return;
    }
    try {
      await update.mutateAsync({
        id: editItem.id,
        hodometroAtual: v,
        dataConferencia: dateEngine.formatarISO(editData),
      });
      showToast({ type: "success", message: "Leitura atualizada" });
      setEditItem(null);
    } catch {
      showToast({ type: "error", message: "Erro ao salvar" });
    }
  };

  const confirmarRemover = (id: string) => {
    showModal({
      type: "confirm",
      title: "Remover leitura?",
      message: "Esta ação não poderá ser desfeita.",
      confirmLabel: "Remover",
      cancelLabel: "Cancelar",
      onConfirm: async () => {
        try {
          await remove.mutateAsync(id);
          showToast({ type: "success", message: "Leitura removida" });
        } catch {
          showToast({ type: "error", message: "Erro ao remover" });
        }
      },
      onCancel: () => {},
    });
  };

  const conferir = () => {
    const v = parseFloat((hodometroInput || "0").replace(",", "."));
    if (v <= kmAtual) {
      showModal({
        type: "error",
        title: "Hodômetro inválido",
        message: `O valor deve ser maior que ${kmAtual.toFixed(0)} km.`,
      });
      return;
    }
    protect(async () => {
      try {
        await create.mutateAsync({ hodometroAtual: v, dataAtual: dateEngine.formatarISO(dataConf) });
        showToast({ type: "success", message: "Hodômetro atualizado" });
        setHodometroInput("");
        setMostrarForm(false);
      } catch {
        showToast({ type: "error", message: "Erro ao registrar" });
      }
    });
  };

  return (
    <View style={{ flex: 1 }}>
      <AppHeader title="Hodômetro" subtitle="Km trabalho × pessoal" onMenuPress={openDrawer} />
      <AppKeyboardView contentContainerStyle={{ padding: 14, paddingBottom: insets.bottom + 90 }}>
        {/* ── Card geral (km_atual, hodômetro inicial, km total) ── */}
        {isLoading ? (
          <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 16 }} />
        ) : (
          <>
            <View style={styles.summaryCard}>
              {/* Hodômetros */}
              <View style={styles.odRow}>
                <View style={styles.odItem}>
                  <Text style={styles.odLabel}>Hodômetro inicial</Text>
                  <Text style={styles.odVal}>{resumo.hodometroInicial.toLocaleString("pt-BR")} km</Text>
                </View>
                <Ionicons name="arrow-forward" size={16} color={theme.colors.textMuted} />
                <View style={[styles.odItem, { alignItems: "flex-end" }]}>
                  <Text style={styles.odLabel}>Hodômetro atual</Text>
                  <Text style={[styles.odVal, { color: theme.colors.primary }]}>
                    {resumo.hodometroAtual.toLocaleString("pt-BR")} km
                  </Text>
                </View>
              </View>

              {/* Total geral */}
              <View style={styles.divider} />
              <View style={styles.totalRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.totalLabel}>Total percorrido</Text>
                  <Text style={styles.totalVal}>{resumo.kmTotalGeral.toLocaleString("pt-BR")} km</Text>
                </View>
                <View style={styles.miniStats}>
                  <MiniStat
                    label="Trabalho"
                    valor={`${resumo.kmTrabalhoTotal.toLocaleString("pt-BR")} km`}
                    cor={theme.colors.primary}
                    pct={resumo.percentualTrabalhoGeral}
                  />
                  <MiniStat
                    label="Pessoal"
                    valor={`${resumo.kmPessoalTotal.toLocaleString("pt-BR")} km`}
                    cor={theme.colors.warning}
                    pct={resumo.percentualPessoalGeral}
                  />
                </View>
              </View>

              {/* Barra geral */}
              <AppProgressBar
                percentual={resumo.percentualTrabalhoGeral}
                rightLabel={`${resumo.percentualTrabalhoGeral}% trabalho`}
                style={{ marginTop: 10 }}
              />
            </View>

            {/* ── Filtros de período ── */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginTop: 14, marginHorizontal: -4 }}
              contentContainerStyle={{ paddingHorizontal: 4, gap: 8 }}
            >
              {FILTROS.map((f) => (
                <Pressable
                  key={f.id}
                  onPress={() => {
                    setFiltro(f.id);
                    setRefDate(refInicial(f.id));
                  }}
                  style={[styles.pill, filtro === f.id && styles.pillAtivo]}
                >
                  <Text style={[styles.pillTxt, filtro === f.id && styles.pillTxtAtivo]}>
                    {f.label}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            {/* ── Navegação de período ── */}
            {filtro !== "todos" && (
              <View style={styles.navRow}>
                <Pressable
                  onPress={() => setRefDate(navAnterior(filtro, refDate))}
                  hitSlop={10}
                  style={styles.navBtn}
                >
                  <Ionicons name="chevron-back" size={20} color={theme.colors.text} />
                </Pressable>
                <Text style={styles.navLabel}>{labelPeriodo(filtro, refDate)}</Text>
                <Pressable
                  onPress={() => { if (!proximoBloqueado(filtro, refDate)) setRefDate(navProximo(filtro, refDate)); }}
                  hitSlop={10}
                  disabled={proximoBloqueado(filtro, refDate)}
                  style={[styles.navBtn, proximoBloqueado(filtro, refDate) && { opacity: 0.3 }]}
                >
                  <Ionicons name="chevron-forward" size={20} color={theme.colors.text} />
                </Pressable>
              </View>
            )}

            {/* ── Card do período selecionado ── */}
            <AppCard style={{ marginTop: 6 }}>
              <View style={styles.periodoHeader}>
                <Ionicons name="stats-chart" size={16} color={theme.colors.primary} />
                <Text style={styles.periodoTit}>
                  {resumo.periodo.jornadasCount} jornada{resumo.periodo.jornadasCount !== 1 ? "s" : ""}
                </Text>
                {resumo.periodo.estimado && (
                  <View style={styles.badgeEst}>
                    <Text style={styles.badgeEstTxt}>pessoal estimado</Text>
                  </View>
                )}
              </View>

              <View style={styles.statsRow}>
                <BigStat
                  label="Trabalho"
                  valor={`${resumo.periodo.kmTrabalho.toLocaleString("pt-BR")} km`}
                  sub={currencyEngine.formatar(resumo.periodo.custoEstimadoTrabalho)}
                  cor={theme.colors.primary}
                  pct={resumo.periodo.percentualTrabalho}
                />
                <BigStat
                  label="Pessoal"
                  valor={`${resumo.periodo.kmPessoal.toLocaleString("pt-BR")} km`}
                  sub={currencyEngine.formatar(resumo.periodo.custoEstimadoPessoal)}
                  cor={theme.colors.warning}
                  pct={resumo.periodo.percentualPessoal}
                />
              </View>

              <AppProgressBar
                percentual={resumo.periodo.percentualTrabalho}
                rightLabel={`${resumo.periodo.percentualTrabalho}% trabalho`}
                style={{ marginTop: 12 }}
              />
            </AppCard>

            {/* ── Atualizar hodômetro ── */}
            <Pressable
              onPress={() => setMostrarForm(!mostrarForm)}
              style={styles.atualizarBtn}
            >
              <Ionicons
                name={mostrarForm ? "chevron-up" : "speedometer-outline"}
                size={16}
                color={theme.colors.primary}
              />
              <Text style={styles.atualizarTxt}>
                {mostrarForm ? "Fechar" : "Registrar leitura do hodômetro"}
              </Text>
            </Pressable>

            {mostrarForm && (
              <AppCard style={{ marginTop: 8 }}>
                <Text style={styles.formTitle}>Nova leitura</Text>
                <Text style={styles.helper}>
                  Hodômetro atual registrado: {kmAtual.toFixed(0)} km
                </Text>
                <Text style={styles.lab}>Data da leitura</Text>
                <AppCalendar value={dataConf} onChange={setDataConf} maxDate={dateEngine.hoje()} />
                <AppInput
                  label="Hodômetro atual (km)"
                  keyboardType="numeric"
                  placeholder={`Ex.: ${(kmAtual + 500).toFixed(0)}`}
                  value={hodometroInput}
                  onChangeText={(t) => setHodometroInput(t.replace(/[^0-9.,]/g, ""))}
                />
                <PrimaryButton
                  label="Salvar leitura"
                  icon="checkmark"
                  onPress={conferir}
                  loading={create.isPending}
                  fullWidth
                  size="lg"
                />
              </AppCard>
            )}

            {/* ── Histórico de conferências ── */}
            {(list.data ?? []).length > 0 && (
              <>
                <Text style={styles.section}>Histórico de leituras</Text>
                <FlatList
                  data={list.data ?? []}
                  scrollEnabled={false}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item }) => (
                    <AppCard style={{ marginBottom: 10 }}>
                      <View style={styles.histRow}>
                        <View style={styles.histIcon}>
                          <Ionicons name="speedometer" size={16} color={theme.colors.primary} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.histTit}>{dateEngine.formatarBR(item.data_conferencia)}</Text>
                          <Text style={styles.histSub}>
                            {Number(item.hodometro_anterior).toLocaleString("pt-BR")} →{" "}
                            {Number(item.hodometro_atual).toLocaleString("pt-BR")} km
                            {" · "}{Number(item.km_total_periodo).toFixed(0)} km no período
                          </Text>
                        </View>
                        <Pressable onPress={() => abrirEdicao(item)} hitSlop={8} style={{ marginRight: 10 }}>
                          <Ionicons name="create-outline" size={18} color={theme.colors.primary} />
                        </Pressable>
                        <Pressable onPress={() => confirmarRemover(item.id)} hitSlop={8}>
                          <Ionicons name="trash-outline" size={18} color={theme.colors.danger} />
                        </Pressable>
                      </View>
                      <AppProgressBar
                        percentual={Number(item.percentual_trabalho)}
                        rightLabel={`${Number(item.km_trabalho_periodo).toFixed(0)} km trab.`}
                        style={{ marginTop: 8 }}
                      />
                    </AppCard>
                  )}
                />
              </>
            )}
          </>
        )}
        <AppFooter />
      </AppKeyboardView>

      {/* ── Modal de edição ── */}
      <Modal
        visible={!!editItem}
        transparent
        animationType="slide"
        onRequestClose={() => setEditItem(null)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setEditItem(null)}>
          <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHead}>
              <View style={styles.histIcon}>
                <Ionicons name="create" size={16} color={theme.colors.primary} />
              </View>
              <Text style={styles.modalTit}>Editar leitura</Text>
              <Pressable onPress={() => setEditItem(null)} hitSlop={10}>
                <Ionicons name="close-circle" size={24} color={theme.colors.textMuted} />
              </Pressable>
            </View>
            <Text style={styles.lab}>Data da leitura</Text>
            <AppCalendar value={editData} onChange={setEditData} maxDate={dateEngine.hoje()} />
            <AppInput
              label="Hodômetro (km)"
              keyboardType="numeric"
              value={editHodo}
              onChangeText={(t) => setEditHodo(t.replace(/[^0-9.,]/g, ""))}
            />
            <PrimaryButton
              label="Salvar alterações"
              icon="checkmark"
              onPress={salvarEdicao}
              loading={update.isPending}
              fullWidth
              size="lg"
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function MiniStat({
  label,
  valor,
  cor,
  pct,
}: {
  label: string;
  valor: string;
  cor: string;
  pct: number;
}) {
  return (
    <View style={miniStyles.item}>
      <View style={[miniStyles.dot, { backgroundColor: cor }]} />
      <View>
        <Text style={miniStyles.label}>{label} ({pct}%)</Text>
        <Text style={[miniStyles.val, { color: cor }]}>{valor}</Text>
      </View>
    </View>
  );
}

function BigStat({
  label,
  valor,
  sub,
  cor,
  pct,
}: {
  label: string;
  valor: string;
  sub: string;
  cor: string;
  pct: number;
}) {
  return (
    <View style={bigStyles.card}>
      <View style={[bigStyles.stripe, { backgroundColor: cor }]} />
      <View style={{ flex: 1 }}>
        <View style={bigStyles.row}>
          <Text style={bigStyles.label}>{label}</Text>
          <Text style={[bigStyles.pct, { color: cor }]}>{pct}%</Text>
        </View>
        <Text style={[bigStyles.val, { color: cor }]}>{valor}</Text>
        <Text style={bigStyles.sub}>{sub} em combustível</Text>
      </View>
    </View>
  );
}

const miniStyles = StyleSheet.create({
  item: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  label: { fontSize: 10, color: theme.colors.textMuted, ...theme.font.medium },
  val: { fontSize: 12, ...theme.font.bold },
});

const bigStyles = StyleSheet.create({
  card: {
    flex: 1, flexDirection: "row", gap: 8,
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: theme.radius.md, padding: 10, overflow: "hidden",
  },
  stripe: { width: 3, borderRadius: 2 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  label: { fontSize: 11, color: theme.colors.textMuted, ...theme.font.semibold, textTransform: "uppercase" },
  pct: { fontSize: 11, ...theme.font.bold },
  val: { fontSize: 18, ...theme.font.bold, marginTop: 2 },
  sub: { fontSize: 10, color: theme.colors.textMuted, ...theme.font.regular, marginTop: 2 },
});

const styles = StyleSheet.create({
  summaryCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg, padding: 14,
    borderWidth: 1.5, borderColor: theme.colors.primary + "20",
    ...theme.shadow.soft,
  },
  odRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  odItem: { flex: 1 },
  odLabel: { fontSize: 10, color: theme.colors.textMuted, ...theme.font.medium },
  odVal: { fontSize: 16, color: theme.colors.text, ...theme.font.bold, marginTop: 2 },
  divider: { height: 1, backgroundColor: theme.colors.divider, marginVertical: 12 },
  totalRow: { flexDirection: "row", alignItems: "flex-start" },
  totalLabel: { fontSize: 11, color: theme.colors.textMuted, ...theme.font.medium },
  totalVal: { fontSize: 20, color: theme.colors.text, ...theme.font.bold, marginTop: 2 },
  miniStats: { alignItems: "flex-end" },
  pill: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 20, borderWidth: 1.5, borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  pillAtivo: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  pillTxt: { fontSize: 13, color: theme.colors.textMuted, ...theme.font.semibold },
  pillTxtAtivo: { color: "#fff" },
  navRow: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10, marginBottom: 2,
    paddingHorizontal: 2,
  },
  navBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: theme.colors.surface,
    borderWidth: 1, borderColor: theme.colors.border,
    justifyContent: "center", alignItems: "center",
  },
  navLabel: {
    flex: 1, textAlign: "center",
    ...theme.font.semibold, fontSize: 13, color: theme.colors.text,
  },
  periodoHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 12 },
  periodoTit: { ...theme.font.semibold, fontSize: 14, color: theme.colors.text, flex: 1 },
  badgeEst: {
    backgroundColor: theme.colors.warning + "20",
    borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2,
  },
  badgeEstTxt: { fontSize: 9, color: theme.colors.warning, ...theme.font.semibold },
  statsRow: { flexDirection: "row", gap: 8 },
  atualizarBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    padding: 12, marginTop: 12,
    backgroundColor: theme.colors.primary + "0D",
    borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.primary + "25",
  },
  atualizarTxt: { ...theme.font.semibold, fontSize: 13, color: theme.colors.primary },
  formTitle: { ...theme.font.bold, fontSize: 15, color: theme.colors.text, marginBottom: 4 },
  helper: { fontSize: 11, color: theme.colors.textMuted, ...theme.font.medium, marginBottom: 10 },
  lab: { ...theme.font.medium, fontSize: 13, color: theme.colors.text, marginBottom: 6, marginTop: 4 },
  section: { ...theme.font.semibold, fontSize: 14, color: theme.colors.text, marginTop: 20, marginBottom: 8 },
  histRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  histIcon: {
    width: 34, height: 34, borderRadius: 9,
    backgroundColor: theme.colors.primary + "15",
    justifyContent: "center", alignItems: "center",
  },
  histTit: { ...theme.font.semibold, fontSize: 13, color: theme.colors.text },
  histSub: { ...theme.font.regular, fontSize: 11, color: theme.colors.textMuted, marginTop: 1 },
  histPct: { ...theme.font.bold, fontSize: 12, color: theme.colors.primary },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: theme.colors.bgCard,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 36,
    gap: 12,
  },
  modalHandle: {
    width: 40, height: 4,
    backgroundColor: theme.colors.border,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 8,
  },
  modalHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 4,
  },
  modalTit: {
    flex: 1,
    ...theme.font.bold,
    fontSize: 16,
    color: theme.colors.text,
  },
});
