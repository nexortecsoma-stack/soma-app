import React, { useEffect, useMemo, useState } from "react";
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

// ─── Constantes ───────────────────────────────────────────────────────────────

const PAGE_SIZE = 10;

type Periodo = "dia" | "semana" | "mes" | "ano" | "tudo";

const CHIPS: { id: Periodo; label: string }[] = [
  { id: "dia", label: "Dia" },
  { id: "semana", label: "Semana" },
  { id: "mes", label: "Mês" },
  { id: "ano", label: "Ano" },
  { id: "tudo", label: "Tudo" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function inicioMes(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function inicioAno(d: Date)  { return new Date(d.getFullYear(), 0, 1); }

function isoInicio(periodo: Periodo, ref: Date): string {
  if (periodo === "dia")    return dateEngine.formatarISO(ref);
  if (periodo === "semana") return dateEngine.formatarISO(dateEngine.inicioSemana(ref));
  if (periodo === "mes")    return dateEngine.formatarISO(inicioMes(ref));
  if (periodo === "ano")    return dateEngine.formatarISO(inicioAno(ref));
  return "";
}

function isoFim(periodo: Periodo, ref: Date): string {
  if (periodo === "dia")    return dateEngine.formatarISO(ref);
  if (periodo === "semana") return dateEngine.formatarISO(dateEngine.fimSemana(ref));
  if (periodo === "mes")    return dateEngine.formatarISO(dateEngine.ultimoDiaMes(ref));
  if (periodo === "ano")    return dateEngine.formatarISO(new Date(ref.getFullYear(), 11, 31));
  return "";
}

function navAnterior(periodo: Periodo, ref: Date): Date {
  if (periodo === "dia")    return dateEngine.somarDias(ref, -1);
  if (periodo === "semana") return dateEngine.somarDias(dateEngine.inicioSemana(ref), -7);
  if (periodo === "mes")    return new Date(ref.getFullYear(), ref.getMonth() - 1, 1);
  if (periodo === "ano")    return new Date(ref.getFullYear() - 1, 0, 1);
  return ref;
}

function navProximo(periodo: Periodo, ref: Date): Date {
  if (periodo === "dia")    return dateEngine.somarDias(ref, 1);
  if (periodo === "semana") return dateEngine.somarDias(dateEngine.inicioSemana(ref), 7);
  if (periodo === "mes")    return new Date(ref.getFullYear(), ref.getMonth() + 1, 1);
  if (periodo === "ano")    return new Date(ref.getFullYear() + 1, 0, 1);
  return ref;
}

function periodoLabel(periodo: Periodo, ref: Date): string {
  if (periodo === "tudo")   return "Todos os registros";
  if (periodo === "dia")    return dateEngine.formatarBR(ref);
  if (periodo === "semana") {
    const ini = dateEngine.inicioSemana(ref);
    const fim = dateEngine.fimSemana(ref);
    return `${dateEngine.formatarBR(ini)} – ${dateEngine.formatarBR(fim)}`;
  }
  if (periodo === "mes") return dateEngine.formatarMesAno(ref);
  if (periodo === "ano")  return String(ref.getFullYear());
  return "";
}

function isProximoBloqueado(periodo: Periodo, ref: Date): boolean {
  if (periodo === "tudo") return true;
  const hoje = dateEngine.hoje();
  if (periodo === "dia")    return ref >= hoje;
  if (periodo === "semana") return dateEngine.inicioSemana(ref) >= dateEngine.inicioSemana(hoje);
  if (periodo === "mes")    return ref.getFullYear() >= hoje.getFullYear() && ref.getMonth() >= hoje.getMonth();
  if (periodo === "ano")    return ref.getFullYear() >= hoje.getFullYear();
  return false;
}

// ─── Tela ─────────────────────────────────────────────────────────────────────

export default function Abastecimentos() {
  const insets = useSafeAreaInsets();
  const { openDrawer, showModal, hideModal, showToast } = useUI();
  const { veiculo } = useAuth();
  const protect = useProtectedAction();
  const { list, ultimos30, valoresPadrao, create, update, remove } = useAbastecimentos();

  const isEletrico = veiculo?.tipo_tracao === "eletrico";
  const capacidadeBateriaKwh = veiculo?.bateria ?? 0;

  // ── Formulário ──────────────────────────────────────────────────────────────
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Abastecimento | null>(null);
  const [data, setData] = useState(dateEngine.hoje());
  const [valor, setValor] = useState(0);
  const [precoLitro, setPrecoLitro] = useState(0);
  const [tipo, setTipo] = useState(() => isEletrico ? "energia" : "gasolina");
  const [autonomia, setAutonomia] = useState("");
  const [percentualCarga, setPercentualCarga] = useState("");

  // ── Filtro + paginação ──────────────────────────────────────────────────────
  const [periodo, setPeriodo] = useState<Periodo>("mes");
  const [refDate, setRefDate] = useState<Date>(inicioMes(dateEngine.hoje()));
  const [pagina, setPagina] = useState(1);

  useEffect(() => { setPagina(1); }, [periodo, refDate]);

  const isEnergiaAtual = tipo === "energia";

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

  // ── Filtro ──────────────────────────────────────────────────────────────────
  const filtrado = useMemo(() => {
    const todos = (list.data ?? []).slice().sort(
      (a, b) => b.data_abastecimento.localeCompare(a.data_abastecimento),
    );
    if (periodo === "tudo") return todos;
    const ini = isoInicio(periodo, refDate);
    const fim = isoFim(periodo, refDate);
    return todos.filter((a) => a.data_abastecimento >= ini && a.data_abastecimento <= fim);
  }, [list.data, periodo, refDate]);

  const totalPaginas = Math.max(1, Math.ceil(filtrado.length / PAGE_SIZE));
  const paginado = filtrado.slice((pagina - 1) * PAGE_SIZE, pagina * PAGE_SIZE);

  // ── Estatísticas do período filtrado ────────────────────────────────────────
  const totalValor = filtrado.reduce((s, a) => s + Number(a.valor_total || 0), 0);
  const comConsumo = filtrado.filter((a) => a.autonomia_km_litro && Number(a.autonomia_km_litro) > 0);
  const mediaConsumo = comConsumo.length > 0
    ? comConsumo.reduce((s, a) => s + Number(a.autonomia_km_litro), 0) / comConsumo.length
    : 0;
  const comPreco = filtrado.filter((a) => a.preco_por_litro && Number(a.preco_por_litro) > 0);
  const mediaPreco = comPreco.length > 0
    ? comPreco.reduce((s, a) => s + Number(a.preco_por_litro), 0) / comPreco.length
    : 0;

  // ── Bloqueio seta direita ────────────────────────────────────────────────────
  const proximoBloqueado = isProximoBloqueado(periodo, refDate);

  const label = periodoLabel(periodo, refDate);

  // ── Formulário (tela separada) ───────────────────────────────────────────────
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

  // ── Lista ────────────────────────────────────────────────────────────────────
  return (
    <View style={{ flex: 1 }}>
      <AppHeader title="Abastecimentos" subtitle="Histórico de combustível" onMenuPress={openDrawer} />

      {/* Chips de período */}
      <View style={styles.chipsRow}>
        {CHIPS.map((c) => (
          <Pressable
            key={c.id}
            style={[styles.chip, periodo === c.id && styles.chipAtivo]}
            onPress={() => {
              setPeriodo(c.id);
              setRefDate(c.id === "mes" ? inicioMes(dateEngine.hoje()) : c.id === "ano" ? inicioAno(dateEngine.hoje()) : dateEngine.hoje());
              setPagina(1);
            }}
          >
            <Text style={[styles.chipTxt, periodo === c.id && styles.chipTxtAtivo]}>{c.label}</Text>
          </Pressable>
        ))}
      </View>

      {/* Navegação de período */}
      {periodo !== "tudo" && (
        <View style={styles.navRow}>
          <Pressable
            onPress={() => { setRefDate(navAnterior(periodo, refDate)); setPagina(1); }}
            hitSlop={10}
            style={styles.navBtn}
          >
            <Ionicons name="chevron-back" size={20} color={theme.colors.text} />
          </Pressable>
          <Text style={styles.navLabel}>{label}</Text>
          <Pressable
            onPress={() => { if (!proximoBloqueado) { setRefDate(navProximo(periodo, refDate)); setPagina(1); } }}
            hitSlop={10}
            style={[styles.navBtn, proximoBloqueado && { opacity: 0.3 }]}
            disabled={proximoBloqueado}
          >
            <Ionicons name="chevron-forward" size={20} color={theme.colors.text} />
          </Pressable>
        </View>
      )}

      {/* Card de estatísticas do período */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statLab}>Total</Text>
          <Text style={styles.statVal}>{currencyEngine.formatar(totalValor)}</Text>
          <Text style={styles.statSub}>{filtrado.length} lançamento{filtrado.length !== 1 ? "s" : ""}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLab}>Média consumo</Text>
          <Text style={styles.statVal}>{mediaConsumo > 0 ? `${mediaConsumo.toFixed(1)} km/L` : "—"}</Text>
          <Text style={styles.statSub}>{comConsumo.length} abast.</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLab}>Preço médio/L</Text>
          <Text style={styles.statVal}>{mediaPreco > 0 ? currencyEngine.formatar(mediaPreco) : "—"}</Text>
          <Text style={styles.statSub}>{comPreco.length} abast.</Text>
        </View>
      </View>

      {list.isLoading ? (
        <View style={{ padding: 40 }}><ActivityIndicator color={theme.colors.primary} /></View>
      ) : (
        <FlatList
          data={paginado}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 14, paddingBottom: insets.bottom + 100 }}
          ListEmptyComponent={
            <AppCard>
              <EmptyState
                icon="speedometer"
                titulo="Nenhum abastecimento"
                mensagem={periodo === "tudo" ? "Toque no + para registrar o primeiro." : "Nenhum registro neste período."}
              />
            </AppCard>
          }
          ListFooterComponent={
            <>
              {/* Paginação */}
              {totalPaginas > 1 && (
                <View style={styles.pagRow}>
                  <Pressable
                    onPress={() => setPagina((p) => Math.max(1, p - 1))}
                    disabled={pagina === 1}
                    hitSlop={8}
                    style={[styles.pagBtn, pagina === 1 && { opacity: 0.3 }]}
                  >
                    <Ionicons name="chevron-back" size={18} color={theme.colors.primary} />
                  </Pressable>
                  <Text style={styles.pagTxt}>{pagina} / {totalPaginas}</Text>
                  <Pressable
                    onPress={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
                    disabled={pagina === totalPaginas}
                    hitSlop={8}
                    style={[styles.pagBtn, pagina === totalPaginas && { opacity: 0.3 }]}
                  >
                    <Ionicons name="chevron-forward" size={18} color={theme.colors.primary} />
                  </Pressable>
                </View>
              )}
              <AppFooter />
            </>
          }
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

  chipsRow: {
    flexDirection: "row",
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 8,
  },
  chip: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.surface,
    alignItems: "center",
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  chipAtivo: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  chipTxt: { ...theme.font.semibold, fontSize: 12, color: theme.colors.textMuted },
  chipTxtAtivo: { color: "#fff" },

  navRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingBottom: 6,
  },
  navBtn: { padding: 4 },
  navLabel: { ...theme.font.semibold, fontSize: 14, color: theme.colors.text, flex: 1, textAlign: "center" },

  statsRow: { flexDirection: "row", paddingHorizontal: 14, gap: 8, marginBottom: 4 },
  statCard: { flex: 1, backgroundColor: "#fff", borderRadius: theme.radius.md, padding: 10, ...theme.shadow.soft },
  statLab: { fontSize: 10, color: theme.colors.textMuted, ...theme.font.medium },
  statVal: { fontSize: 13, color: theme.colors.text, ...theme.font.bold, marginTop: 3 },
  statSub: { fontSize: 10, color: theme.colors.textMuted, ...theme.font.regular, marginTop: 1 },

  row: { flexDirection: "row", alignItems: "center" },
  icon: { width: 38, height: 38, borderRadius: 10, backgroundColor: theme.colors.primary + "1A", justifyContent: "center", alignItems: "center", marginRight: 10 },
  tit: { ...theme.font.semibold, fontSize: 13, color: theme.colors.text },
  sub: { ...theme.font.regular, fontSize: 11, color: theme.colors.textMuted, marginTop: 2 },
  val: { ...theme.font.bold, fontSize: 14, color: theme.colors.text },

  pagRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    paddingVertical: 14,
  },
  pagBtn: { padding: 6 },
  pagTxt: { ...theme.font.semibold, fontSize: 14, color: theme.colors.textMuted },

  fab: {
    position: "absolute", right: 22, bottom: 28,
    width: 60, height: 60, borderRadius: 30, backgroundColor: theme.colors.primary,
    justifyContent: "center", alignItems: "center", ...theme.shadow.card,
  },
});
