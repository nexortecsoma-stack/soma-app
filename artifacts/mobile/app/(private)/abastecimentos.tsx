import React, { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { theme } from "@/lib/theme";
import { dateEngine } from "@/engines/date-engine";
import { currencyEngine } from "@/engines/currency-engine";
import { useUI } from "@/hooks/UIContext";
import { useAbastecimentos } from "@/hooks/useAbastecimentos";
import { useAuth } from "@/hooks/AuthContext";
import { useProtectedAction } from "@/hooks/useProtectedAction";
import { TIPOS_COMBUSTIVEL } from "@/lib/constants";
import type { Abastecimento } from "@/lib/types";
import { AppHeader } from "@/components/ui/AppHeader";
import { AppCard } from "@/components/ui/AppCard";
import { AppDropdown } from "@/components/ui/AppDropdown";
import { AppInput } from "@/components/ui/AppInput";
import { AppCalendar } from "@/components/ui/AppCalendar";
import { CurrencyInput } from "@/components/ui/CurrencyInput";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { EmptyState } from "@/components/ui/EmptyState";
import { AppKeyboardView } from "@/components/ui/AppKeyboardView";
import { AppFooter } from "@/components/ui/AppFooter";

export default function Abastecimentos() {
  const insets = useSafeAreaInsets();
  const { openDrawer, showModal, hideModal, showToast } = useUI();
  const { veiculo } = useAuth();
  const protect = useProtectedAction();
  const { list, ultimos30, valoresPadrao, create, update, remove } = useAbastecimentos();

  const isEletrico = veiculo?.tipo_tracao === "eletrico";
  const capacidadeBateriaKwh = veiculo?.bateria ?? 0;

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Abastecimento | null>(null);
  const [data, setData] = useState(dateEngine.hoje());
  const [valor, setValor] = useState(0);
  const [precoLitro, setPrecoLitro] = useState(0);
  const [tipo, setTipo] = useState(() => isEletrico ? "energia" : "gasolina");
  const [autonomia, setAutonomia] = useState("");
  const [percentualCarga, setPercentualCarga] = useState("");

  // Detecta se o lançamento atual é de energia elétrica
  const isEnergiaAtual = tipo === "energia";

  // Auto-calcula litros (combustível) ou kWh (energia)
  const litrosCalculado = !isEnergiaAtual && precoLitro > 0 && valor > 0 ? (valor / precoLitro) : 0;
  const kWhCarregados = isEnergiaAtual && capacidadeBateriaKwh > 0 && percentualCarga
    ? (capacidadeBateriaKwh * parseFloat(percentualCarga.replace(",", ".")) / 100)
    : 0;
  const valorKwhCalculado = isEnergiaAtual && kWhCarregados > 0 && valor > 0
    ? (valor / kWhCarregados)
    : 0;

  useEffect(() => {
    if (!open) return;
    if (!editing) {
      setPrecoLitro(valoresPadrao.preco_por_litro || 0);
      setAutonomia(valoresPadrao.autonomia_km_litro ? String(valoresPadrao.autonomia_km_litro) : "");
      setPercentualCarga("");
      setTipo(isEletrico ? "energia" : "gasolina");
    }
  }, [open]);

  const abrirNovo = () => {
    setEditing(null);
    setData(dateEngine.hoje());
    setValor(0);
    setPrecoLitro(valoresPadrao.preco_por_litro || 0);
    setTipo(isEletrico ? "energia" : "gasolina");
    setAutonomia(valoresPadrao.autonomia_km_litro ? String(valoresPadrao.autonomia_km_litro) : "");
    setPercentualCarga("");
    setOpen(true);
  };

  const abrirEdicao = (a: Abastecimento) => {
    setEditing(a);
    setData(dateEngine.parseISO(a.data_abastecimento));
    setValor(Number(a.valor_total) || 0);
    setPrecoLitro(Number(a.preco_por_litro) || 0);
    setTipo(a.tipo_combustivel ?? "gasolina");
    setAutonomia(a.autonomia_km_litro != null ? String(a.autonomia_km_litro) : "");
    // Recalcular percentual a partir do consumo_kwh se disponível
    if (a.consumo_kwh && capacidadeBateriaKwh > 0) {
      const perc = (Number(a.consumo_kwh) / capacidadeBateriaKwh) * 100;
      setPercentualCarga(perc.toFixed(0));
    } else {
      setPercentualCarga("");
    }
    setOpen(true);
  };

  const salvar = () => {
    if (valor <= 0) {
      showModal({ type: "error", title: "Valor obrigatório", message: "Informe o valor total." });
      return;
    }
    if (isEnergiaAtual) {
      if (!percentualCarga || parseFloat(percentualCarga) <= 0) {
        showModal({ type: "error", title: "Porcentagem obrigatória", message: "Informe o percentual de carga da bateria." });
        return;
      }
      if (capacidadeBateriaKwh <= 0) {
        showModal({ type: "error", title: "Bateria não configurada", message: "Configure a capacidade da bateria na tela Veículo." });
        return;
      }
    } else {
      if (precoLitro <= 0) {
        showModal({ type: "error", title: "Preço/L obrigatório", message: "Informe o preço por litro." });
        return;
      }
      const autonomiaNum = parseFloat(autonomia.replace(",", "."));
      if (!autonomiaNum || autonomiaNum <= 0) {
        showModal({ type: "error", title: "Autonomia obrigatória", message: "Informe a autonomia (km/L)." });
        return;
      }
    }
    protect(async () => {
      try {
        const autonomiaNum = isEnergiaAtual ? null : parseFloat(autonomia.replace(",", ".")) || null;
        const payload = {
          veiculo_id: veiculo?.id ?? null,
          data_abastecimento: dateEngine.formatarISO(data),
          valor_total: valor,
          litros: !isEnergiaAtual && litrosCalculado > 0 ? parseFloat(litrosCalculado.toFixed(3)) : null,
          preco_por_litro: !isEnergiaAtual ? precoLitro || null : null,
          tipo_combustivel: tipo as any,
          autonomia_km_litro: autonomiaNum,
          consumo_kwh: isEnergiaAtual && kWhCarregados > 0 ? parseFloat(kWhCarregados.toFixed(3)) : null,
          valor_kwh: isEnergiaAtual && valorKwhCalculado > 0 ? parseFloat(valorKwhCalculado.toFixed(4)) : null,
          uso: "trabalho" as any,
          observacao: null,
        };
        if (editing) {
          await update.mutateAsync({ id: editing.id, patch: payload });
          showToast({ type: "success", message: "Abastecimento atualizado" });
        } else {
          await create.mutateAsync(payload);
          showToast({ type: "success", message: "Abastecimento registrado" });
        }
        setOpen(false);
        setEditing(null);
      } catch (e: any) {
        showModal({ type: "error", title: "Erro ao salvar", message: e?.message ?? "Tente novamente" });
      }
    });
  };

  const remover = (id: string) => {
    showModal({
      type: "confirm",
      title: "Remover abastecimento?",
      message: "Esta ação não pode ser desfeita.",
      confirmLabel: "Remover",
      cancelLabel: "Cancelar",
      onConfirm: async () => {
        hideModal();
        try {
          await remove.mutateAsync(id);
          showToast({ type: "success", message: "Removido" });
        } catch {
          showToast({ type: "error", message: "Erro ao remover" });
        }
      },
      onCancel: hideModal,
    });
  };

  // Estatísticas dos últimos 30 abastecimentos
  const ultList = ultimos30.data ?? [];
  const mediaConsumo = ultList.filter((a) => a.autonomia_km_litro && Number(a.autonomia_km_litro) > 0)
    .reduce((s, a, _, arr) => s + Number(a.autonomia_km_litro) / arr.length, 0);
  const mediaPreco = ultList.filter((a) => a.preco_por_litro && Number(a.preco_por_litro) > 0)
    .reduce((s, a, _, arr) => s + Number(a.preco_por_litro) / arr.length, 0);

  if (open) {
    return (
      <View style={{ flex: 1 }}>
        <AppHeader
          title={editing ? "Editar Abastecimento" : "Novo Abastecimento"}
          onBackPress={() => { setOpen(false); setEditing(null); }}
        />
        <AppKeyboardView contentContainerStyle={{ padding: 14, paddingBottom: insets.bottom + 90 }}>
          <AppCard>
            <Text style={styles.cardSec}>Data</Text>
            <AppCalendar value={data} onChange={setData} maxDate={dateEngine.hoje()} />
          </AppCard>

          <AppCard style={{ marginTop: 14 }}>
            {/* Valor + Tipo na mesma linha */}
            <View style={styles.row2}>
              <View style={{ flex: 3 }}>
                <CurrencyInput label="Valor total" value={valor} onChangeValue={setValor} left="cash" />
              </View>
              <View style={{ width: 10 }} />
              <View style={{ flex: 2 }}>
                <AppDropdown
                  label="Combustível"
                  value={tipo}
                  onChange={setTipo}
                  options={TIPOS_COMBUSTIVEL.map((t) => ({ label: t.nome, value: t.id }))}
                />
              </View>
            </View>

            {isEnergiaAtual ? (
              /* Modo elétrico: % da bateria */
              <>
                {capacidadeBateriaKwh > 0 ? (
                  <View style={styles.litrosBadge}>
                    <Ionicons name="battery-charging" size={14} color={theme.colors.primary} />
                    <Text style={styles.litrosTxt}>
                      Bateria: {capacidadeBateriaKwh} kWh
                      {kWhCarregados > 0 ? ` · ${kWhCarregados.toFixed(2)} kWh carregados` : ""}
                      {valorKwhCalculado > 0 ? ` · ${currencyEngine.formatar(valorKwhCalculado)}/kWh` : ""}
                    </Text>
                  </View>
                ) : (
                  <View style={[styles.litrosBadge, { backgroundColor: theme.colors.warning + "15" }]}>
                    <Ionicons name="warning-outline" size={14} color={theme.colors.warning} />
                    <Text style={[styles.litrosTxt, { color: theme.colors.warning }]}>
                      Configure a capacidade da bateria na tela Veículo
                    </Text>
                  </View>
                )}
                <View style={styles.row2}>
                  <View style={{ flex: 1 }}>
                    <AppInput
                      label="% carregada *"
                      keyboardType="numeric"
                      placeholder="Ex.: 80"
                      value={percentualCarga}
                      onChangeText={(t) => {
                        const n = t.replace(/\D/g, "").slice(0, 3);
                        setPercentualCarga(parseInt(n || "0", 10) > 100 ? "100" : n);
                      }}
                      helper={kWhCarregados > 0 ? `= ${kWhCarregados.toFixed(2)} kWh` : "0 a 100%"}
                    />
                  </View>
                  <View style={{ width: 10 }} />
                  <View style={{ flex: 1 }}>
                    <AppInput
                      label="Autonomia km/100kWh"
                      keyboardType="numeric"
                      placeholder="0"
                      value={autonomia}
                      onChangeText={(t) => setAutonomia(t.replace(/[^0-9.,]/g, ""))}
                    />
                  </View>
                </View>
              </>
            ) : (
              /* Modo combustível: litros calculado */
              <>
                <View style={styles.litrosBadge}>
                  <Ionicons name="water" size={14} color={theme.colors.primary} />
                  <Text style={styles.litrosTxt}>
                    {litrosCalculado > 0
                      ? `${litrosCalculado.toFixed(2)} litros (calculado automaticamente)`
                      : "Informe valor e preço/L para calcular os litros"}
                  </Text>
                </View>
                <View style={styles.row2}>
                  <View style={{ flex: 1 }}>
                    <CurrencyInput label="Preço por litro *" value={precoLitro} onChangeValue={setPrecoLitro} />
                  </View>
                  <View style={{ width: 10 }} />
                  <View style={{ flex: 1 }}>
                    <AppInput
                      label="Autonomia km/L *"
                      keyboardType="numeric"
                      placeholder="0,0"
                      value={autonomia}
                      onChangeText={(t) => setAutonomia(t.replace(/[^0-9.,]/g, ""))}
                      helper={valoresPadrao.autonomia_km_litro ? `Média: ${valoresPadrao.autonomia_km_litro.toFixed(1)}` : undefined}
                    />
                  </View>
                </View>
              </>
            )}

            <PrimaryButton
              label="Salvar"
              icon="checkmark"
              onPress={salvar}
              loading={create.isPending || update.isPending}
              fullWidth
              size="lg"
            />
          </AppCard>
          <AppFooter />
        </AppKeyboardView>
      </View>
    );
  }

  const total = (list.data ?? []).reduce((s, a) => s + Number(a.valor_total || 0), 0);

  return (
    <View style={{ flex: 1 }}>
      <AppHeader title="Abastecimentos" subtitle="Histórico de combustível" onMenuPress={openDrawer} />

      {/* Card de médias */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statLab}>Total registrado</Text>
          <Text style={styles.statVal}>{currencyEngine.formatar(total)}</Text>
          <Text style={styles.statSub}>{(list.data ?? []).length} lançamentos</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLab}>Média consumo</Text>
          <Text style={styles.statVal}>{mediaConsumo > 0 ? `${mediaConsumo.toFixed(1)} km/L` : "—"}</Text>
          <Text style={styles.statSub}>últimos {ultList.length} abast.</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLab}>Preço médio</Text>
          <Text style={styles.statVal}>{mediaPreco > 0 ? currencyEngine.formatar(mediaPreco) : "—"}</Text>
          <Text style={styles.statSub}>por litro</Text>
        </View>
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
              <EmptyState icon="speedometer" titulo="Nenhum abastecimento" mensagem="Toque no + para registrar o primeiro." />
            </AppCard>
          }
          ListFooterComponent={<AppFooter />}
          renderItem={({ item }) => (
            <AppCard style={{ marginBottom: 10 }}>
              <View style={styles.row}>
                <View style={styles.icon}>
                  <Ionicons name="speedometer" size={18} color={theme.colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.tit}>
                    {dateEngine.formatarBR(item.data_abastecimento)} · {item.tipo_combustivel}
                  </Text>
                  <Text style={styles.sub}>
                    {item.litros ? `${Number(item.litros).toFixed(2)} L` : ""}
                    {item.litros && item.preco_por_litro ? " · " : ""}
                    {item.preco_por_litro ? `${currencyEngine.formatar(Number(item.preco_por_litro))}/L` : ""}
                    {item.autonomia_km_litro ? ` · ${Number(item.autonomia_km_litro).toFixed(1)} km/L` : ""}
                  </Text>
                </View>
                <Text style={styles.val}>{currencyEngine.formatar(Number(item.valor_total))}</Text>
                <Pressable onPress={() => abrirEdicao(item)} hitSlop={6} style={{ marginLeft: 8 }}>
                  <Ionicons name="create-outline" size={18} color={theme.colors.primary} />
                </Pressable>
                <Pressable onPress={() => remover(item.id)} hitSlop={6} style={{ marginLeft: 8 }}>
                  <Ionicons name="trash-outline" size={18} color={theme.colors.danger} />
                </Pressable>
              </View>
            </AppCard>
          )}
        />
      )}
      <Pressable onPress={abrirNovo} style={styles.fab}>
        <Ionicons name="add" size={28} color="#fff" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  cardSec: { ...theme.font.medium, fontSize: 13, color: theme.colors.text, marginBottom: 6 },
  row2: { flexDirection: "row" },
  litrosBadge: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: theme.colors.primary + "12", borderRadius: theme.radius.md,
    paddingHorizontal: 10, paddingVertical: 8, marginBottom: 14,
  },
  litrosTxt: { ...theme.font.medium, fontSize: 12, color: theme.colors.primary, flex: 1 },
  statsRow: { flexDirection: "row", paddingHorizontal: 14, gap: 8, marginVertical: 10 },
  statCard: { flex: 1, backgroundColor: "#fff", borderRadius: theme.radius.md, padding: 10, ...theme.shadow.soft },
  statLab: { fontSize: 10, color: theme.colors.textMuted, ...theme.font.medium },
  statVal: { fontSize: 14, color: theme.colors.text, ...theme.font.bold, marginTop: 3 },
  statSub: { fontSize: 10, color: theme.colors.textMuted, ...theme.font.regular, marginTop: 1 },
  row: { flexDirection: "row", alignItems: "center" },
  icon: { width: 38, height: 38, borderRadius: 10, backgroundColor: theme.colors.primary + "1A", justifyContent: "center", alignItems: "center", marginRight: 10 },
  tit: { ...theme.font.semibold, fontSize: 13, color: theme.colors.text },
  sub: { ...theme.font.regular, fontSize: 11, color: theme.colors.textMuted, marginTop: 2 },
  val: { ...theme.font.bold, fontSize: 14, color: theme.colors.text },
  fab: {
    position: "absolute", right: 22, bottom: 28,
    width: 60, height: 60, borderRadius: 30, backgroundColor: theme.colors.primary,
    justifyContent: "center", alignItems: "center", ...theme.shadow.card,
  },
});
