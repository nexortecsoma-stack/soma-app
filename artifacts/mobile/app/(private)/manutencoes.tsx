import React, { useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { theme } from "@/lib/theme";
import { useUI } from "@/hooks/UIContext";
import { useManutencoes } from "@/hooks/useManutencoes";
import { useConferenciaHodometro } from "@/hooks/useConferenciaHodometro";
import { useAuth } from "@/hooks/AuthContext";
import { useProtectedAction } from "@/hooks/useProtectedAction";
import { TIPOS_MANUTENCAO } from "@/lib/constants";
import type { Manutencao, ConferenciaHodometro } from "@/lib/types";
import { dateEngine } from "@/engines/date-engine";
import { currencyEngine } from "@/engines/currency-engine";
import { manutencaoEngine, type ManutencaoComStatus } from "@/engines/manutencao-engine";
import { AppHeader } from "@/components/ui/AppHeader";
import { AppCard } from "@/components/ui/AppCard";
import { AppKeyboardView } from "@/components/ui/AppKeyboardView";
import { AppInput } from "@/components/ui/AppInput";
import { AppDropdown } from "@/components/ui/AppDropdown";
import { CurrencyInput } from "@/components/ui/CurrencyInput";
import { AppCalendar } from "@/components/ui/AppCalendar";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { AppProgressBar } from "@/components/ui/AppProgressBar";
import { EmptyState } from "@/components/ui/EmptyState";
import { AppFooter } from "@/components/ui/AppFooter";

function fmtKm(km: number | null | undefined): string {
  if (km == null) return "—";
  return Number(km).toLocaleString("pt-BR") + " km";
}

/**
 * Km média mensal a partir das conferências de hodômetro (km total rodado).
 * - 1 conferência: usa km_total_periodo diretamente
 * - 2+ conferências: km/dia por intervalo × 30
 */
function kmMediaMensalDeConferencias(confs: ConferenciaHodometro[]): number | null {
  if (confs.length === 0) return null;
  const sorted = [...confs].sort((a, b) => a.data_conferencia.localeCompare(b.data_conferencia));
  if (sorted.length === 1) return sorted[0]!.km_total_periodo;
  let totalKm = 0;
  let totalDias = 0;
  for (let i = 1; i < sorted.length; i++) {
    const dA = new Date(sorted[i - 1]!.data_conferencia + "T00:00:00");
    const dB = new Date(sorted[i]!.data_conferencia + "T00:00:00");
    const dias = Math.max(1, Math.round((dB.getTime() - dA.getTime()) / 86400000));
    totalKm += sorted[i]!.km_total_periodo;
    totalDias += dias;
  }
  return totalDias > 0 ? (totalKm / totalDias) * 30 : sorted[sorted.length - 1]!.km_total_periodo;
}

export default function Manutencoes() {
  const insets = useSafeAreaInsets();
  const { veiculo } = useAuth();
  const { openDrawer, showModal, hideModal, showToast } = useUI();
  const protect = useProtectedAction();
  const { list, create, update, remove } = useManutencoes();
  const { list: conferenciasList } = useConferenciaHodometro();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Manutencao | null>(null);
  const [tipo, setTipo] = useState<string>(TIPOS_MANUTENCAO[0]?.id ?? "outros");
  const [data, setData] = useState(dateEngine.hoje());
  const [valor, setValor] = useState(0);
  const [kmTroca, setKmTroca] = useState("");
  const [duracaoKm, setDuracaoKm] = useState("");
  const [duracaoMes, setDuracaoMes] = useState("");
  const [obs, setObs] = useState("");

  // Km média mensal baseada no hodômetro (km total rodado, não só trabalhado)
  const kmMediaMensal = useMemo(() => {
    return kmMediaMensalDeConferencias(conferenciasList.data ?? []) ?? 0;
  }, [conferenciasList.data]);

  const abrirNovo = () => {
    setEditing(null);
    setTipo(TIPOS_MANUTENCAO[0]?.id ?? "outros");
    setData(dateEngine.hoje());
    setValor(0);
    setKmTroca(veiculo?.km_atual != null ? String(veiculo.km_atual) : "");
    setDuracaoKm("");
    setDuracaoMes("");
    setObs("");
    setOpen(true);
  };

  const abrirEdicao = (m: Manutencao) => {
    setEditing(m);
    setTipo(m.tipo_manutencao);
    setData(dateEngine.parseISO(m.data_manutencao));
    setValor(Number(m.valor) || 0);
    setKmTroca(m.km_troca != null ? String(m.km_troca) : "");
    setDuracaoKm(m.duracao_km != null ? String(m.duracao_km) : "");
    setDuracaoMes(m.duracao_meses != null ? String(m.duracao_meses) : "");
    setObs(m.observacao ?? "");
    setOpen(true);
  };

  React.useEffect(() => {
    if (editing) return;
    const t = TIPOS_MANUTENCAO.find((x) => x.id === tipo);
    if (t) {
      setDuracaoKm(t.duracao_km > 0 ? String(t.duracao_km) : "");
      setDuracaoMes(t.duracao_meses > 0 ? String(t.duracao_meses) : "");
    }
    if (!kmTroca && veiculo?.km_atual != null) setKmTroca(String(veiculo.km_atual));
  }, [tipo, editing]);

  const salvar = () => {
    if (valor <= 0) {
      showModal({ type: "error", title: "Valor obrigatório", message: "Informe o valor pago." });
      return;
    }
    protect(async () => {
      try {
        const payload = {
          tipo_manutencao: tipo,
          data_manutencao: dateEngine.formatarISO(data),
          valor,
          km_troca: parseFloat((kmTroca || "0").replace(",", ".")) || null,
          duracao_km: parseFloat((duracaoKm || "0").replace(",", ".")) || null,
          duracao_meses: parseInt(duracaoMes || "0", 10) || null,
          observacao: obs || null,
        };
        if (editing) {
          await update.mutateAsync({ id: editing.id, patch: payload });
          showToast({ type: "success", message: "Manutenção atualizada" });
        } else {
          await create.mutateAsync(payload);
          showToast({ type: "success", message: "Manutenção registrada" });
        }
        setOpen(false);
        setEditing(null);
      } catch {
        showToast({ type: "error", message: "Erro ao salvar" });
      }
    });
  };

  const remover = (id: string) => {
    showModal({
      type: "confirm",
      title: "Remover?",
      message: "Tem certeza?",
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

  if (open) {
    return (
      <View style={{ flex: 1 }}>
        <AppHeader title={editing ? "Editar Manutenção" : "Nova Manutenção"} onBackPress={() => { setOpen(false); setEditing(null); }} />
        <AppKeyboardView contentContainerStyle={{ padding: 14, paddingBottom: insets.bottom + 90 }}>
          <AppCard>
            <AppDropdown
              label="Tipo"
              value={tipo}
              onChange={setTipo}
              options={TIPOS_MANUTENCAO.map((t) => ({ label: t.nome, value: t.id }))}
            />
            <Text style={styles.lab}>Data</Text>
            <AppCalendar value={data} onChange={setData} maxDate={dateEngine.hoje()} />
            <CurrencyInput label="Valor pago" value={valor} onChangeValue={setValor} />
            <AppInput label="Km no momento da troca" keyboardType="numeric" value={kmTroca} onChangeText={(t) => setKmTroca(t.replace(/[^0-9.,]/g, ""))} />
            <View style={{ flexDirection: "row" }}>
              <View style={{ flex: 1 }}>
                <AppInput label="Duração (km)" keyboardType="numeric" value={duracaoKm} onChangeText={(t) => setDuracaoKm(t.replace(/[^0-9.,]/g, ""))} />
              </View>
              <View style={{ width: 12 }} />
              <View style={{ flex: 1 }}>
                <AppInput label="Duração (meses)" keyboardType="numeric" value={duracaoMes} onChangeText={(t) => setDuracaoMes(t.replace(/\D/g, ""))} />
              </View>
            </View>
            <AppInput label="Observação" value={obs} onChangeText={setObs} />
            <PrimaryButton label="Salvar" icon="checkmark" onPress={salvar} loading={create.isPending || update.isPending} fullWidth size="lg" />
          </AppCard>
          <AppFooter />
        </AppKeyboardView>
      </View>
    );
  }

  const tipoMap = new Map<string, (typeof TIPOS_MANUTENCAO)[number]>(TIPOS_MANUTENCAO.map((t) => [t.id, t]));
  const res = manutencaoEngine.resumo(list.data ?? []);
  const kmAtual = veiculo?.km_atual ?? 0;

  const renderItem = ({ item }: { item: ManutencaoComStatus }) => {
    const status = manutencaoEngine.status(item, kmAtual, kmMediaMensal);
    const substituido = !item.ativo;
    const cor = substituido
      ? theme.colors.textMuted
      : status.status === "vencida" ? theme.colors.danger
        : status.status === "atencao" ? theme.colors.warning
          : theme.colors.success;

    const hasKm = item.duracao_km != null && item.km_troca != null;
    const hasTempo = item.duracao_meses != null && item.duracao_meses > 0;

    return (
      <AppCard style={[{ marginBottom: 10 }, substituido ? styles.cardSubst : {}]}>
        {/* Título + ações */}
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <View style={styles.titRow}>
              <Text style={[styles.tit, substituido && styles.textMuted]}>
                {tipoMap.get(item.tipo_manutencao)?.nome ?? item.tipo_manutencao}
              </Text>
              {substituido && (
                <View style={styles.badgeSubst}>
                  <Ionicons name="checkmark-done" size={10} color={theme.colors.textMuted} />
                  <Text style={styles.badgeTxt}>Substituído</Text>
                </View>
              )}
            </View>
            <Text style={[styles.sub, substituido && styles.textMuted]}>
              {dateEngine.formatarBR(item.data_manutencao)} · {currencyEngine.formatar(Number(item.valor))}
              {item.km_troca != null ? ` · ${fmtKm(item.km_troca)} na troca` : ""}
            </Text>
          </View>
          <Pressable onPress={() => abrirEdicao(item)} hitSlop={6} style={{ marginRight: 8 }}>
            <Ionicons name="create-outline" size={18} color={substituido ? theme.colors.textMuted : theme.colors.primary} />
          </Pressable>
          <Pressable onPress={() => remover(item.id)} hitSlop={6}>
            <Ionicons name="trash-outline" size={18} color={theme.colors.danger} />
          </Pressable>
        </View>

        {/* Detalhes de prazo (somente ativos) */}
        {!substituido && (
          <>
            {/* Termos */}
            <View style={styles.termosGrid}>
              {/* Prazo por km */}
              {hasKm && (
                <View style={[
                  styles.termoBloco,
                  status.termoEfetivoFonte === "km" && styles.termoBlocoDestaque,
                ]}>
                  <View style={styles.termoBlocoHeader}>
                    <Ionicons name="speedometer-outline" size={12} color={status.termoEfetivoFonte === "km" ? theme.colors.primary : theme.colors.textMuted} />
                    <Text style={[styles.termoBlocoTit, status.termoEfetivoFonte === "km" && { color: theme.colors.primary }]}>Prazo por km</Text>
                    {status.termoEfetivoFonte === "km" && (
                      <View style={styles.efetivoBadge}>
                        <Text style={styles.efetivoBadgeTxt}>efetivo</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.termoData}>
                    {status.dataPrevistaKmFmt ?? (kmMediaMensal > 0 ? "—" : "sem média km")}
                  </Text>
                  <Text style={styles.termoDetalhe}>
                    {fmtKm(item.km_troca)} → {fmtKm(status.kmFim)}
                  </Text>
                  {status.kmRestantes != null && (
                    <Text style={styles.termoDetalhe}>
                      restam {fmtKm(status.kmRestantes)}
                    </Text>
                  )}
                </View>
              )}

              {/* Prazo por tempo */}
              {hasTempo && (
                <View style={[
                  styles.termoBloco,
                  status.termoEfetivoFonte === "tempo" && styles.termoBlocoDestaque,
                ]}>
                  <View style={styles.termoBlocoHeader}>
                    <Ionicons name="calendar-outline" size={12} color={status.termoEfetivoFonte === "tempo" ? theme.colors.primary : theme.colors.textMuted} />
                    <Text style={[styles.termoBlocoTit, status.termoEfetivoFonte === "tempo" && { color: theme.colors.primary }]}>Prazo por tempo</Text>
                    {status.termoEfetivoFonte === "tempo" && (
                      <View style={styles.efetivoBadge}>
                        <Text style={styles.efetivoBadgeTxt}>efetivo</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.termoData}>{status.termoFinalFmt ?? "—"}</Text>
                  <Text style={styles.termoDetalhe}>{item.duracao_meses} meses</Text>
                  {status.diasRestantes != null && (
                    <Text style={styles.termoDetalhe}>restam {status.diasRestantes} dias</Text>
                  )}
                </View>
              )}

              {/* Se não tem nenhum prazo */}
              {!hasKm && !hasTempo && (
                <View style={[styles.termoBloco, { flex: 1 }]}>
                  <Text style={styles.termoDetalhe}>Sem prazo definido</Text>
                </View>
              )}
            </View>

            {/* Barra de progresso */}
            <AppProgressBar
              percentual={status.vidaUtilPercentual}
              rightLabel={`${status.vidaUtilPercentual}% usado`}
              cor={[cor, cor]}
              style={{ marginTop: 10 }}
            />

            {/* Rateio */}
            {status.rateioMensal > 0 && (
              <View style={styles.rateioRow}>
                <Ionicons name="calculator-outline" size={13} color={theme.colors.primary} />
                <Text style={styles.rateioTxt}>
                  Rateio:{" "}
                  <Text style={styles.rateioVal}>{currencyEngine.formatar(status.rateioMensal)}/mês</Text>
                  {"  ·  "}
                  <Text style={styles.rateioVal}>{currencyEngine.formatar(status.rateioDiario)}/dia</Text>
                </Text>
                {status.vidaUtilMeses != null && (
                  <Text style={styles.rateioMeses}>
                    ({status.vidaUtilMeses.toFixed(1)} meses)
                  </Text>
                )}
              </View>
            )}
          </>
        )}

        {/* Substituído: mostra apenas vencimento */}
        {substituido && item.termoFinalFmt && (
          <Text style={[styles.sub, { marginTop: 4 }]}>Venceu em {item.termoFinalFmt}</Text>
        )}
      </AppCard>
    );
  };

  return (
    <View style={{ flex: 1 }}>
      <AppHeader title="Manutenções" subtitle="Vida útil e previsões" onMenuPress={openDrawer} />
      {list.isLoading ? (
        <View style={{ padding: 40 }}><ActivityIndicator color={theme.colors.primary} /></View>
      ) : (
        <FlatList
          data={res.itens}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 14, paddingBottom: insets.bottom + 100 }}
          ListEmptyComponent={<AppCard><EmptyState icon="construct" titulo="Sem manutenções" mensagem="Toque em + para registrar." /></AppCard>}
          ListFooterComponent={<AppFooter />}
          ListHeaderComponent={
            res.itens.length > 0 ? (
              <View style={styles.summaryCard}>
                <View style={styles.summaryRow}>
                  <View style={styles.summaryBlock}>
                    <Ionicons name="construct" size={18} color={theme.colors.primary} style={{ marginBottom: 4 }} />
                    <Text style={styles.summaryLabel}>Total investido (ativos)</Text>
                    <Text style={styles.summaryValor}>{currencyEngine.formatar(res.totalCustoAtivo)}</Text>
                    <Text style={styles.summaryMeta}>
                      {res.totalItensAtivos} ativo(s) · {res.totalItensSubstituidos} substituído(s)
                    </Text>
                  </View>
                  <View style={styles.summaryDivider} />
                  <View style={styles.summaryBlock}>
                    <Ionicons name="speedometer-outline" size={18} color={theme.colors.primary} style={{ marginBottom: 4 }} />
                    <Text style={styles.summaryLabel}>Média km/mês</Text>
                    <Text style={styles.summaryValor}>
                      {kmMediaMensal > 0
                        ? Math.round(kmMediaMensal).toLocaleString("pt-BR") + " km"
                        : "sem dados"}
                    </Text>
                    <Text style={styles.summaryMeta}>
                      {conferenciasList.data && conferenciasList.data.length > 0
                        ? `${conferenciasList.data.length} conferência(s) hodômetro`
                        : "base: km das jornadas"}
                    </Text>
                  </View>
                </View>
              </View>
            ) : null
          }
          renderItem={renderItem}
        />
      )}
      <Pressable onPress={abrirNovo} style={styles.fab}>
        <Ionicons name="add" size={28} color="#fff" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  lab: { ...theme.font.medium, fontSize: 13, color: theme.colors.text, marginBottom: 6 },
  row: { flexDirection: "row", alignItems: "center" },
  titRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  tit: { ...theme.font.semibold, fontSize: 14, color: theme.colors.text },
  textMuted: { color: theme.colors.textMuted },
  sub: { ...theme.font.regular, fontSize: 11, color: theme.colors.textMuted, marginTop: 2 },
  cardSubst: { opacity: 0.6 },
  badgeSubst: {
    flexDirection: "row", alignItems: "center", gap: 3,
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2,
  },
  badgeTxt: { fontSize: 9, color: theme.colors.textMuted, ...theme.font.semibold, textTransform: "uppercase" },

  // Termos
  termosGrid: { flexDirection: "row", gap: 8, marginTop: 10 },
  termoBloco: {
    flex: 1, backgroundColor: theme.colors.surfaceMuted,
    borderRadius: theme.radius.md, padding: 8,
    borderWidth: 1, borderColor: theme.colors.divider,
  },
  termoBlocoDestaque: {
    backgroundColor: theme.colors.primary + "0F",
    borderColor: theme.colors.primary + "40",
  },
  termoBlocoHeader: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 4 },
  termoBlocoTit: { fontSize: 10, color: theme.colors.textMuted, ...theme.font.semibold, textTransform: "uppercase", flex: 1 },
  efetivoBadge: {
    backgroundColor: theme.colors.primary + "20",
    borderRadius: 4, paddingHorizontal: 4, paddingVertical: 1,
  },
  efetivoBadgeTxt: { fontSize: 8, color: theme.colors.primary, ...theme.font.bold, textTransform: "uppercase" },
  termoData: { ...theme.font.bold, fontSize: 13, color: theme.colors.text, marginBottom: 2 },
  termoDetalhe: { fontSize: 10, color: theme.colors.textMuted, ...theme.font.regular, marginTop: 1 },

  // Rateio
  rateioRow: {
    flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8,
    backgroundColor: theme.colors.primary + "0A",
    borderRadius: theme.radius.md, padding: 8,
  },
  rateioTxt: { fontSize: 12, color: theme.colors.textMuted, ...theme.font.regular, flex: 1 },
  rateioVal: { ...theme.font.semibold, color: theme.colors.text },
  rateioMeses: { fontSize: 10, color: theme.colors.textMuted, ...theme.font.regular },

  // Cabeçalho resumo
  summaryCard: {
    backgroundColor: theme.colors.primary + "12",
    borderRadius: theme.radius.lg, padding: 14, marginBottom: 14,
    borderWidth: 1.5, borderColor: theme.colors.primary + "25",
    ...theme.shadow.soft,
  },
  summaryRow: { flexDirection: "row", alignItems: "stretch" },
  summaryBlock: { flex: 1, alignItems: "flex-start" },
  summaryDivider: { width: 1, backgroundColor: theme.colors.divider, marginHorizontal: 14 },
  summaryLabel: { ...theme.font.medium, fontSize: 11, color: theme.colors.textMuted },
  summaryValor: { ...theme.font.bold, fontSize: 18, color: theme.colors.text, marginTop: 2 },
  summaryMeta: { ...theme.font.regular, fontSize: 10, color: theme.colors.textMuted, marginTop: 2 },

  fab: {
    position: "absolute", right: 22, bottom: 28,
    width: 60, height: 60, borderRadius: 30, backgroundColor: theme.colors.primary,
    justifyContent: "center", alignItems: "center", ...theme.shadow.card,
  },
});
