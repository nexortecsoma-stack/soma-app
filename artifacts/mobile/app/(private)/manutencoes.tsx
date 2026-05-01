import React, { useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { theme } from "@/lib/theme";
import { useUI } from "@/hooks/UIContext";
import { useManutencoes } from "@/hooks/useManutencoes";
import { useAuth } from "@/hooks/AuthContext";
import { useProtectedAction } from "@/hooks/useProtectedAction";
import { TIPOS_MANUTENCAO } from "@/lib/constants";
import type { Manutencao } from "@/lib/types";
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

export default function Manutencoes() {
  const insets = useSafeAreaInsets();
  const { veiculo } = useAuth();
  const { openDrawer, showModal, hideModal, showToast } = useUI();
  const protect = useProtectedAction();
  const { list, create, update, remove } = useManutencoes();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Manutencao | null>(null);
  const [tipo, setTipo] = useState<string>(TIPOS_MANUTENCAO[0]?.id ?? "outros");
  const [data, setData] = useState(dateEngine.hoje());
  const [valor, setValor] = useState(0);
  const [kmTroca, setKmTroca] = useState("");
  const [duracaoKm, setDuracaoKm] = useState("");
  const [duracaoMes, setDuracaoMes] = useState("");
  const [obs, setObs] = useState("");

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
            <AppInput label="Km no momento" keyboardType="numeric" value={kmTroca} onChangeText={(t) => setKmTroca(t.replace(/[^0-9.,]/g, ""))} />
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

  const renderItem = ({ item }: { item: ManutencaoComStatus }) => {
    const status = manutencaoEngine.status(item, veiculo?.km_atual ?? 0);
    const substituido = !item.ativo;
    const cor = substituido
      ? theme.colors.textMuted
      : status.status === "vencida" ? theme.colors.danger
        : status.status === "atencao" ? theme.colors.warning
          : theme.colors.success;

    return (
      <AppCard style={[{ marginBottom: 10 }, substituido ? styles.cardSubst : {}]}>
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
            </Text>
          </View>
          <Pressable onPress={() => abrirEdicao(item)} hitSlop={6} style={{ marginRight: 8 }}>
            <Ionicons name="create-outline" size={18} color={substituido ? theme.colors.textMuted : theme.colors.primary} />
          </Pressable>
          <Pressable onPress={() => remover(item.id)} hitSlop={6}>
            <Ionicons name="trash-outline" size={18} color={theme.colors.danger} />
          </Pressable>
        </View>

        {!substituido && (
          <>
            <AppProgressBar
              percentual={status.vidaUtilPercentual}
              rightLabel={`${status.vidaUtilPercentual}% usado`}
              cor={[cor, cor]}
              style={{ marginTop: 10 }}
            />
            <View style={styles.bottomRow}>
              {(status.diasRestantes != null || status.kmRestantes != null) && (
                <Text style={styles.rest}>
                  {status.diasRestantes != null ? `${status.diasRestantes} dias` : ""}
                  {status.diasRestantes != null && status.kmRestantes != null ? " · " : ""}
                  {status.kmRestantes != null ? `${status.kmRestantes.toFixed(0)} km restantes` : ""}
                </Text>
              )}
              {item.termoFinalFmt && (
                <Text style={styles.termoFinal}>
                  <Ionicons name="flag-outline" size={10} /> até {item.termoFinalFmt}
                </Text>
              )}
            </View>
          </>
        )}
        {substituido && item.termoFinalFmt && (
          <Text style={[styles.rest, { marginTop: 4 }]}>Venceu em {item.termoFinalFmt}</Text>
        )}
      </AppCard>
    );
  };

  return (
    <View style={{ flex: 1 }}>
      <AppHeader title="Manutenções" subtitle="Acompanhe a vida útil" onMenuPress={openDrawer} />
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
                <View style={styles.summaryLeft}>
                  <Ionicons name="construct" size={22} color={theme.colors.primary} />
                  <View style={{ marginLeft: 12 }}>
                    <Text style={styles.summaryLabel}>Total investido (itens ativos)</Text>
                    <Text style={styles.summaryValor}>{currencyEngine.formatar(res.totalCustoAtivo)}</Text>
                    <Text style={styles.summaryMeta}>
                      {res.totalItensAtivos} ativo(s) · {res.totalItensSubstituidos} substituído(s)
                    </Text>
                  </View>
                </View>
                {res.termoFinalGlobalFmt && (
                  <View style={styles.termoBox}>
                    <Text style={styles.termoLabel}>Próx. vencimento</Text>
                    <Text style={styles.termoVal}>{res.termoFinalGlobalFmt}</Text>
                  </View>
                )}
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
  sub: { ...theme.font.regular, fontSize: 12, color: theme.colors.textMuted, marginTop: 2 },
  bottomRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 6 },
  rest: { fontSize: 11, color: theme.colors.textMuted, ...theme.font.medium },
  termoFinal: { fontSize: 11, color: theme.colors.primary, ...theme.font.semibold },
  cardSubst: { opacity: 0.65 },
  badgeSubst: {
    flexDirection: "row", alignItems: "center", gap: 3,
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2,
  },
  badgeTxt: { fontSize: 9, color: theme.colors.textMuted, ...theme.font.semibold, textTransform: "uppercase" },
  // Card de resumo no topo
  summaryCard: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: theme.colors.primary + "12",
    borderRadius: theme.radius.lg, padding: 14, marginBottom: 14,
    borderWidth: 1.5, borderColor: theme.colors.primary + "25",
    ...theme.shadow.soft,
  },
  summaryLeft: { flexDirection: "row", alignItems: "center", flex: 1 },
  summaryLabel: { ...theme.font.medium, fontSize: 11, color: theme.colors.textMuted },
  summaryValor: { ...theme.font.bold, fontSize: 20, color: theme.colors.text, marginTop: 1 },
  summaryMeta: { ...theme.font.regular, fontSize: 10, color: theme.colors.textMuted, marginTop: 2 },
  termoBox: {
    alignItems: "flex-end", padding: 10,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md, marginLeft: 8,
    borderWidth: 1, borderColor: theme.colors.divider,
  },
  termoLabel: { fontSize: 9, color: theme.colors.textMuted, ...theme.font.semibold, textTransform: "uppercase" },
  termoVal: { fontSize: 13, color: theme.colors.primary, ...theme.font.bold, marginTop: 2 },
  fab: {
    position: "absolute", right: 22, bottom: 28,
    width: 60, height: 60, borderRadius: 30, backgroundColor: theme.colors.primary,
    justifyContent: "center", alignItems: "center", ...theme.shadow.card,
  },
});
