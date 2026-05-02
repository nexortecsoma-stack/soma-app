import React, { useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { theme } from "@/lib/theme";
import { dateEngine } from "@/engines/date-engine";
import { currencyEngine } from "@/engines/currency-engine";
import { useAuth } from "@/hooks/AuthContext";
import { useUI } from "@/hooks/UIContext";
import { useCPMA } from "@/hooks/useCPMA";
import type { FiltroPeriodo } from "@/engines/hodometro-engine";
import { AppHeader } from "@/components/ui/AppHeader";
import { AppFooter } from "@/components/ui/AppFooter";

// Largura fixa para todos os cards (sempre 1/3 da tela)
const CARD_W = Math.floor((Dimensions.get("window").width - 24) / 3);

// ─── Helpers de período (mesmo padrão de conferir-hodometro) ────────────────

const FILTROS: { id: FiltroPeriodo; label: string }[] = [
  { id: "dia",    label: "Dia" },
  { id: "semana", label: "Semana" },
  { id: "mes",    label: "Mês" },
  { id: "ano",    label: "Ano" },
  { id: "todos",  label: "Tudo" },
];

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

// ─── Mini card ───────────────────────────────────────────────────────────────

function MiniCard({
  icon,
  label,
  value,
  color,
  pct,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  color: string;
  pct?: number;
}) {
  return (
    <View style={[mini.card, { borderLeftColor: color }]}>
      {/* ícone + título lado a lado */}
      <View style={mini.headerRow}>
        <View style={[mini.iconWrap, { backgroundColor: color + "1F" }]}>
          <Ionicons name={icon} size={11} color={color} />
        </View>
        <Text style={mini.label} numberOfLines={1}>{label}</Text>
      </View>
      {/* valor + % — value à esquerda, % encostado na direita */}
      <View style={mini.valueRow}>
        <Text style={[mini.value, { color }]} numberOfLines={1} adjustsFontSizeToFit>
          {value}
        </Text>
        {pct !== undefined && (
          <Text style={[mini.pct, { color }]}>{pct}%</Text>
        )}
      </View>
    </View>
  );
}

// ─── Utilitário ──────────────────────────────────────────────────────────────

function chunk<T>(arr: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) result.push(arr.slice(i, i + size));
  return result;
}

// ─── Separador de seção ──────────────────────────────────────────────────────

function SectionLabel({ children }: { children: string }) {
  return (
    <View style={sec.wrap}>
      <View style={sec.line} />
      <Text style={sec.txt}>{children}</Text>
      <View style={sec.line} />
    </View>
  );
}

// ─── Tela ─────────────────────────────────────────────────────────────────────

export default function CPMAScreen() {
  const insets = useSafeAreaInsets();
  const { perfil, veiculo } = useAuth();
  const { openDrawer } = useUI();

  const [filtro, setFiltro] = useState<FiltroPeriodo>("mes");
  const [refDate, setRefDate] = useState<Date>(() => refInicial("mes"));

  const { data, isLoading, isFetching, refetch } = useCPMA(filtro, refDate);

  useFocusEffect(
    React.useCallback(() => {
      void refetch();
    }, [refetch]),
  );

  const mudarFiltro = (novo: FiltroPeriodo) => {
    setFiltro(novo);
    setRefDate(refInicial(novo));
  };

  const bloqueado = proximoBloqueado(filtro, refDate);

  // ── Helpers de formatação ──────────────────────────────────────────────────
  const fmt = currencyEngine.formatar;
  const fmtKm = (v: number) => `${Math.round(v).toLocaleString("pt-BR")} km`;
  const fmtN = (v: number, dec = 1) => v.toFixed(dec).replace(".", ",");
  const fmtH = (h: number) => {
    const hh = Math.floor(h);
    const mm = Math.round((h - hh) * 60);
    return mm > 0 ? `${hh}h${String(mm).padStart(2, "0")}min` : `${hh}h`;
  };

  // ── Dados do veículo / perfil ──────────────────────────────────────────────
  const nomeVeiculo = veiculo?.nome_veiculo ?? null;
  const ehEletrico  = veiculo?.tipo_tracao === "eletrico";
  const catLabel    = perfil?.categoria ?? null;
  const cidadeUF    = perfil?.cidade
    ? `${perfil.cidade}${perfil.uf ? `/${perfil.uf}` : ""}`
    : null;

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.surfaceMuted }}>
      <AppHeader
        title="CPMA"
        subtitle="Controle de Performance"
        onBackPress={() => router.back()}
        onMenuPress={openDrawer}
      />

      <ScrollView
        contentContainerStyle={{ padding: 8, paddingBottom: insets.bottom + 80 }}
        refreshControl={
          <RefreshControl
            refreshing={isFetching && !isLoading}
            onRefresh={refetch}
            tintColor={theme.colors.primary}
          />
        }
      >
        {/* ── Filtros de período ──────────────────────────────────────────── */}
        <View style={styles.chipsRow}>
          {FILTROS.map((f) => (
            <Pressable
              key={f.id}
              style={[styles.chip, filtro === f.id && styles.chipActive]}
              onPress={() => mudarFiltro(f.id)}
            >
              <Text style={[styles.chipTxt, filtro === f.id && styles.chipTxtActive]}>
                {f.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* ── Navegação ────────────────────────────────────────────────────── */}
        <View style={styles.navRow}>
          {filtro !== "todos" ? (
            <Pressable onPress={() => setRefDate(navAnterior(filtro, refDate))} hitSlop={12} style={styles.navBtn}>
              <Ionicons name="chevron-back" size={20} color={theme.colors.primary} />
            </Pressable>
          ) : <View style={styles.navBtn} />}

          <Text style={styles.navLabel}>{labelPeriodo(filtro, refDate)}</Text>

          {filtro !== "todos" ? (
            <Pressable
              onPress={() => !bloqueado && setRefDate(navProximo(filtro, refDate))}
              hitSlop={12}
              style={[styles.navBtn, bloqueado && { opacity: 0.25 }]}
              disabled={bloqueado}
            >
              <Ionicons name="chevron-forward" size={20} color={theme.colors.primary} />
            </Pressable>
          ) : <View style={styles.navBtn} />}
        </View>

        {/* ── Carregando ───────────────────────────────────────────────────── */}
        {isLoading ? (
          <View style={{ paddingVertical: 60, alignItems: "center" }}>
            <ActivityIndicator color={theme.colors.primary} size="large" />
            <Text style={styles.loadingTxt}>Calculando métricas…</Text>
          </View>
        ) : !data ? null : (
          <>
            {/* ════════════════════════════════════════════════════════════════
                FINANCEIRO
            ════════════════════════════════════════════════════════════════ */}
            <SectionLabel>Financeiro</SectionLabel>
            <View style={styles.grid}>
              <MiniCard
                icon="cash"
                label="Ganho Bruto"
                value={fmt(data.ganhoBruto)}
                color={theme.colors.primary}
              />
              <MiniCard
                icon="leaf"
                label="Ganho Líquido"
                value={fmt(data.ganhoLiquido)}
                color={theme.colors.success}
                pct={data.pctLiquido}
              />
              <MiniCard
                icon="star"
                label="Ganho Real"
                value={fmt(data.ganhoReal)}
                color={data.ganhoReal >= 0 ? theme.colors.accent : theme.colors.danger}
                pct={data.pctReal}
              />
            </View>

            {/* ════════════════════════════════════════════════════════════════
                CUSTOS
            ════════════════════════════════════════════════════════════════ */}
            <SectionLabel>Custos</SectionLabel>
            <View style={styles.grid}>
              <MiniCard
                icon="alert-circle"
                label="Total Custos"
                value={fmt(data.totalCustos)}
                color={theme.colors.danger}
                pct={data.pctCustos}
              />
              <MiniCard
                icon="flame"
                label="Combustível"
                value={fmt(data.custoCombustivel)}
                color={theme.colors.warning}
                pct={data.pctCombustivel}
              />
              <MiniCard
                icon="wallet"
                label="Custo Fixo"
                value={fmt(data.custoFixo)}
                color={theme.colors.purple}
                pct={data.pctCustoFixo}
              />
            </View>

            {/* ── Despesas variáveis individuais (só se houver) ─────────── */}
            {data.despesasItems.length > 0 && (
              <>
                <SectionLabel>Despesas Variáveis</SectionLabel>
                {chunk(data.despesasItems, 3).map((row, ri) => (
                  <View key={ri} style={styles.grid}>
                    {row.map((item) => (
                      <MiniCard
                        key={item.nome}
                        icon="receipt"
                        label={item.nome}
                        value={fmt(item.valor)}
                        color={theme.colors.orange}
                        pct={item.pct}
                      />
                    ))}
                    {row.length === 2 && <View style={mini.cardEmpty} />}
                    {row.length === 1 && (
                      <>
                        <View style={mini.cardEmpty} />
                        <View style={mini.cardEmpty} />
                      </>
                    )}
                  </View>
                ))}
              </>
            )}

            {/* ════════════════════════════════════════════════════════════════
                ATIVIDADE
            ════════════════════════════════════════════════════════════════ */}
            <SectionLabel>Atividade</SectionLabel>
            <View style={styles.grid}>
              <MiniCard
                icon="car"
                label="KM Trabalhado"
                value={data.kmTrabalho > 0 ? fmtKm(data.kmTrabalho) : "—"}
                color={theme.colors.primary}
              />
              <MiniCard
                icon="time"
                label="Horas Trab."
                value={data.horas > 0 ? fmtH(data.horas) : "—"}
                color={theme.colors.accent}
              />
              <MiniCard
                icon="home"
                label="KM Pessoal"
                value={data.kmPessoal != null ? fmtKm(data.kmPessoal) : "—"}
                color={theme.colors.indigo}
              />
            </View>
            <View style={styles.grid}>
              <MiniCard
                icon="sunny"
                label="Dias Trab."
                value={String(data.diasTrabalhados)}
                color={theme.colors.success}
              />
              <MiniCard
                icon="navigate"
                label="Corridas"
                value={String(data.corridas)}
                color={theme.colors.primary}
              />
              <MiniCard
                icon="timer"
                label="Corridas / hora"
                value={data.corridasPorHora > 0 ? fmtN(data.corridasPorHora) : "—"}
                color={theme.colors.warning}
              />
            </View>

            {/* ════════════════════════════════════════════════════════════════
                MÉDIAS
            ════════════════════════════════════════════════════════════════ */}
            <SectionLabel>Médias</SectionLabel>
            <View style={styles.grid}>
              <MiniCard
                icon="calendar"
                label="Ganho / dia"
                value={data.ganhoPorDia > 0 ? fmt(data.ganhoPorDia) : "—"}
                color={theme.colors.primary}
              />
              <MiniCard
                icon="hourglass"
                label="Horas / dia"
                value={data.horasPorDia > 0 ? fmtH(data.horasPorDia) : "—"}
                color={theme.colors.accent}
              />
              <MiniCard
                icon="speedometer-outline"
                label="KM / corrida"
                value={data.kmPorCorrida > 0 ? fmtKm(data.kmPorCorrida) : "—"}
                color={theme.colors.indigo}
              />
            </View>
            <View style={styles.grid}>
              <MiniCard
                icon="cash-outline"
                label="Ganho / corrida"
                value={data.ganhoPorCorrida > 0 ? fmt(data.ganhoPorCorrida) : "—"}
                color={theme.colors.success}
              />
              <MiniCard
                icon="trending-up"
                label="Ganho / hora"
                value={data.ganhoPorHora > 0 ? fmt(data.ganhoPorHora) : "—"}
                color={theme.colors.primary}
              />
              <MiniCard
                icon="leaf"
                label="Ganho real / hora"
                value={data.ganhoRealPorHora !== 0 ? fmt(data.ganhoRealPorHora) : "—"}
                color={data.ganhoRealPorHora >= 0 ? theme.colors.success : theme.colors.danger}
              />
            </View>

            {/* ════════════════════════════════════════════════════════════════
                ÍNDICES
            ════════════════════════════════════════════════════════════════ */}
            <SectionLabel>Índices</SectionLabel>
            <View style={styles.grid}>
              <MiniCard
                icon="trending-down"
                label="Custo / hora"
                value={data.custoPorHora > 0 ? fmt(data.custoPorHora) : "—"}
                color={theme.colors.danger}
              />
              <MiniCard
                icon="remove-circle"
                label="Custo / corrida"
                value={data.custoPorCorrida > 0 ? fmt(data.custoPorCorrida) : "—"}
                color={theme.colors.orange}
              />
              <MiniCard
                icon="analytics"
                label="Custo / km"
                value={data.custoPorKm > 0 ? `R$ ${fmtN(data.custoPorKm, 2)}` : "—"}
                color={theme.colors.warning}
              />
            </View>
            <View style={styles.grid}>
              <MiniCard
                icon="add-circle"
                label="Ganho / km"
                value={data.ganhoPorKm > 0 ? `R$ ${fmtN(data.ganhoPorKm, 2)}` : "—"}
                color={theme.colors.primary}
              />
              <MiniCard
                icon="leaf-outline"
                label="Ganho real / km"
                value={data.ganhoPorKmReal !== 0 ? `R$ ${fmtN(data.ganhoPorKmReal, 2)}` : "—"}
                color={data.ganhoPorKmReal >= 0 ? theme.colors.success : theme.colors.danger}
              />
              <View style={mini.cardEmpty} />
            </View>

            {/* ════════════════════════════════════════════════════════════════
                VEÍCULO
            ════════════════════════════════════════════════════════════════ */}
            <SectionLabel>Veículo e Perfil</SectionLabel>
            <View style={styles.veiculoCard}>
              {nomeVeiculo && (
                <VeiculoRow icon="car-sport" label="Veículo" value={nomeVeiculo} color={theme.colors.primary} />
              )}
              {catLabel && (
                <VeiculoRow icon="ribbon" label="Categoria" value={catLabel} color={theme.colors.accent} />
              )}
              <VeiculoRow
                icon="flash"
                label="Propulsão"
                value={ehEletrico ? "Elétrico ⚡" : veiculo?.tipo_tracao ? veiculo.tipo_tracao.charAt(0).toUpperCase() + veiculo.tipo_tracao.slice(1) : "Não informado"}
                color={ehEletrico ? theme.colors.success : theme.colors.textMuted}
              />
              {cidadeUF && (
                <VeiculoRow icon="location" label="Cidade / UF" value={cidadeUF} color={theme.colors.indigo} />
              )}
            </View>

            {/* ── Atalho compartilhar ─────────────────────────────────────── */}
            <Pressable
              style={({ pressed }) => [styles.shareBtn, pressed && { opacity: 0.85 }]}
              onPress={() => router.push("/(private)/compartilhar")}
            >
              <Ionicons name="share-social" size={18} color="#fff" />
              <Text style={styles.shareBtnTxt}>Compartilhar meu resultado</Text>
            </Pressable>
          </>
        )}

        <AppFooter />
      </ScrollView>
    </View>
  );
}

// ─── Linha do veículo ─────────────────────────────────────────────────────────

function VeiculoRow({
  icon,
  label,
  value,
  color,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <View style={vei.row}>
      <View style={[vei.iconWrap, { backgroundColor: color + "1A" }]}>
        <Ionicons name={icon} size={15} color={color} />
      </View>
      <Text style={vei.label}>{label}</Text>
      <Text style={vei.value}>{value}</Text>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  chipsRow: {
    flexDirection: "row",
    gap: 4,
    marginBottom: 6,
  },
  chip: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: theme.radius.pill,
    alignItems: "center",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  chipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  chipTxt: {
    fontSize: 12,
    ...theme.font.medium,
    color: theme.colors.textMuted,
  },
  chipTxtActive: {
    color: "#fff",
    ...theme.font.semibold,
  },
  navRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: theme.radius.md,
    paddingVertical: 7,
    paddingHorizontal: 10,
    marginBottom: 8,
    ...theme.shadow.soft,
  },
  navBtn: { width: 32, alignItems: "center" },
  navLabel: {
    flex: 1,
    textAlign: "center",
    ...theme.font.semibold,
    fontSize: 14,
    color: theme.colors.text,
  },
  loadingTxt: {
    marginTop: 12,
    color: theme.colors.textMuted,
    ...theme.font.regular,
    fontSize: 14,
  },
  grid: {
    flexDirection: "row",
    gap: 4,
    marginBottom: 4,
  },
  veiculoCard: {
    backgroundColor: "#fff",
    borderRadius: theme.radius.md,
    padding: 10,
    gap: 7,
    ...theme.shadow.soft,
    marginBottom: 6,
  },
  shareBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.pill,
    paddingVertical: 14,
    marginTop: 10,
    ...theme.shadow.soft,
  },
  shareBtnTxt: {
    color: "#fff",
    ...theme.font.bold,
    fontSize: 16,
  },
});

const mini = StyleSheet.create({
  card: {
    width: CARD_W,
    backgroundColor: "#fff",
    borderRadius: theme.radius.sm,
    paddingHorizontal: 7,
    paddingVertical: 6,
    borderLeftWidth: 3,
    ...theme.shadow.soft,
  },
  cardEmpty: {
    width: CARD_W,
    backgroundColor: "transparent",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 3,
  },
  iconWrap: {
    width: 18,
    height: 18,
    borderRadius: 5,
    alignItems: "center",
    justifyContent: "center",
  },
  valueRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
  },
  value: {
    ...theme.font.bold,
    fontSize: 13,
    lineHeight: 16,
  },
  pct: {
    ...theme.font.medium,
    fontSize: 9,
    opacity: 0.85,
  },
  label: {
    flex: 1,
    ...theme.font.regular,
    fontSize: 9,
    color: theme.colors.textMuted,
    lineHeight: 11,
  },
});

const sec = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
    marginTop: 6,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: theme.colors.border,
  },
  txt: {
    ...theme.font.semibold,
    fontSize: 11,
    color: theme.colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
});

const vei = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  iconWrap: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    ...theme.font.regular,
    fontSize: 12,
    color: theme.colors.textMuted,
    width: 80,
  },
  value: {
    flex: 1,
    ...theme.font.semibold,
    fontSize: 13,
    color: theme.colors.text,
  },
});
