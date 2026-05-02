import React, { useState } from "react";
import {
  ActivityIndicator,
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
  sub,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  color: string;
  pct?: number;
  sub?: string;
}) {
  return (
    <View style={[mini.card, { borderTopColor: color }]}>
      <View style={mini.topRow}>
        <View style={[mini.iconWrap, { backgroundColor: color + "1F" }]}>
          <Ionicons name={icon} size={13} color={color} />
        </View>
        {pct !== undefined && (
          <View style={[mini.pctBadge, { backgroundColor: color + "22" }]}>
            <Text style={[mini.pctTxt, { color }]}>{pct}%</Text>
          </View>
        )}
      </View>
      <Text style={[mini.value, { color }]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text style={mini.label} numberOfLines={2}>{label}</Text>
      {sub ? <Text style={mini.sub}>{sub}</Text> : null}
    </View>
  );
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
    return mm > 0 ? `${hh}h ${String(mm).padStart(2, "0")}min` : `${hh}h`;
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
        contentContainerStyle={{ padding: 12, paddingBottom: insets.bottom + 100 }}
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
                icon="receipt"
                label="Despesas Variáveis"
                value={fmt(data.despesasVar)}
                color={theme.colors.orange}
              />
              <MiniCard
                icon="flame"
                label="Custo Combustível"
                value={fmt(data.custoCombustivel)}
                color={theme.colors.warning}
                sub="estimado"
              />
            </View>
            <View style={styles.grid}>
              <MiniCard
                icon="wallet"
                label="Custo Fixo"
                value={fmt(data.custoFixo)}
                color={theme.colors.purple}
                sub="proporcional"
              />
              <View style={mini.cardEmpty} />
              <View style={mini.cardEmpty} />
            </View>

            {/* ════════════════════════════════════════════════════════════════
                QUILOMETRAGEM
            ════════════════════════════════════════════════════════════════ */}
            <SectionLabel>Quilometragem</SectionLabel>
            <View style={styles.grid}>
              <MiniCard
                icon="car"
                label="KM Trabalho"
                value={data.kmTrabalho > 0 ? fmtKm(data.kmTrabalho) : "—"}
                color={theme.colors.primary}
              />
              <MiniCard
                icon="home"
                label="KM Pessoal"
                value={data.kmPessoal != null ? fmtKm(data.kmPessoal) : "—"}
                color={theme.colors.indigo}
                sub={data.kmPessoal == null ? "filtro: Tudo" : undefined}
              />
              <MiniCard
                icon="time"
                label="Horas Trab."
                value={data.horas > 0 ? fmtH(data.horas) : "—"}
                color={theme.colors.accent}
              />
            </View>

            {/* ════════════════════════════════════════════════════════════════
                CORRIDAS E JORNADAS
            ════════════════════════════════════════════════════════════════ */}
            <SectionLabel>Corridas e Jornadas</SectionLabel>
            <View style={styles.grid}>
              <MiniCard
                icon="navigate"
                label="Corridas"
                value={String(data.corridas)}
                color={theme.colors.primary}
              />
              <MiniCard
                icon="calendar"
                label="Jornadas"
                value={String(data.jornadasCount)}
                color={theme.colors.accent}
              />
              <MiniCard
                icon="sunny"
                label="Dias Trab."
                value={String(data.diasTrabalhados)}
                color={theme.colors.success}
              />
            </View>
            <View style={styles.grid}>
              <MiniCard
                icon="timer"
                label="Corridas / hora"
                value={data.corridasPorHora > 0 ? fmtN(data.corridasPorHora) : "—"}
                color={theme.colors.warning}
              />
              <MiniCard
                icon="trending-up"
                label="Ganho / hora"
                value={data.ganhoPorHora > 0 ? fmt(data.ganhoPorHora) : "—"}
                color={theme.colors.primary}
              />
              <MiniCard
                icon="cash-outline"
                label="Ganho / corrida"
                value={data.ganhoPorCorrida > 0 ? fmt(data.ganhoPorCorrida) : "—"}
                color={theme.colors.success}
              />
            </View>

            {/* ════════════════════════════════════════════════════════════════
                RATIOS POR KM E CORRIDA
            ════════════════════════════════════════════════════════════════ */}
            <SectionLabel>Índices por KM e Corrida</SectionLabel>
            <View style={styles.grid}>
              <MiniCard
                icon="trending-down"
                label="Custo / km"
                value={data.custoPorKm > 0 ? `R$ ${fmtN(data.custoPorKm, 2)}` : "—"}
                color={theme.colors.danger}
              />
              <MiniCard
                icon="remove-circle"
                label="Custo / corrida"
                value={data.custoPorCorrida > 0 ? fmt(data.custoPorCorrida) : "—"}
                color={theme.colors.orange}
              />
              <MiniCard
                icon="add-circle"
                label="Ganho / km"
                value={data.ganhoPorKm > 0 ? `R$ ${fmtN(data.ganhoPorKm, 2)}` : "—"}
                color={theme.colors.primary}
              />
            </View>
            <View style={styles.grid}>
              <MiniCard
                icon="leaf-outline"
                label="Ganho / km Real"
                value={data.ganhoPorKmReal !== 0 ? `R$ ${fmtN(data.ganhoPorKmReal, 2)}` : "—"}
                color={data.ganhoPorKmReal >= 0 ? theme.colors.success : theme.colors.danger}
                sub="após todos os custos"
              />
              <View style={mini.cardEmpty} />
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
    gap: 5,
    marginBottom: 8,
  },
  chip: {
    flex: 1,
    paddingVertical: 8,
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
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 14,
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
    gap: 8,
    marginBottom: 8,
  },
  veiculoCard: {
    backgroundColor: "#fff",
    borderRadius: theme.radius.lg,
    padding: 14,
    gap: 10,
    ...theme.shadow.soft,
    marginBottom: 8,
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
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: theme.radius.md,
    padding: 10,
    borderTopWidth: 3,
    ...theme.shadow.soft,
    minHeight: 90,
    justifyContent: "space-between",
  },
  cardEmpty: {
    flex: 1,
    backgroundColor: "transparent",
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  iconWrap: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  pctBadge: {
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  pctTxt: {
    fontSize: 10,
    ...theme.font.bold,
  },
  value: {
    ...theme.font.bold,
    fontSize: 15,
    lineHeight: 18,
  },
  label: {
    ...theme.font.regular,
    fontSize: 10,
    color: theme.colors.textMuted,
    marginTop: 3,
    lineHeight: 13,
  },
  sub: {
    ...theme.font.regular,
    fontSize: 9,
    color: theme.colors.textSubtle,
    marginTop: 1,
    fontStyle: "italic",
  },
});

const sec = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
    marginTop: 4,
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
