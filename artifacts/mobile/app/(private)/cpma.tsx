import React, { useMemo, useState } from "react";
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
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { theme } from "@/lib/theme";
import { dateEngine } from "@/engines/date-engine";
import { currencyEngine } from "@/engines/currency-engine";
import { useAuth } from "@/hooks/AuthContext";
import { useUI } from "@/hooks/UIContext";
import { useDashboard } from "@/hooks/useDashboard";
import { AppHeader } from "@/components/ui/AppHeader";
import { AppCard } from "@/components/ui/AppCard";
import { AppProgressBar } from "@/components/ui/AppProgressBar";
import { AppFooter } from "@/components/ui/AppFooter";

export type PeriodoCPMA = "dia" | "semana" | "mes" | "ano" | "todos";

const FILTROS: { id: PeriodoCPMA; label: string }[] = [
  { id: "dia", label: "Dia" },
  { id: "semana", label: "Semana" },
  { id: "mes", label: "Mês" },
  { id: "ano", label: "Ano" },
  { id: "todos", label: "Tudo" },
];

// ─── Helpers de navegação ────────────────────────────────────────────────────

function refInicial(filtro: PeriodoCPMA): Date {
  const hoje = dateEngine.hoje();
  if (filtro === "mes") return new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  if (filtro === "ano") return new Date(hoje.getFullYear(), 0, 1);
  return hoje;
}

function navAnterior(filtro: PeriodoCPMA, ref: Date): Date {
  if (filtro === "dia")    return dateEngine.somarDias(ref, -1);
  if (filtro === "semana") return dateEngine.somarDias(dateEngine.inicioSemana(ref), -7);
  if (filtro === "mes")    return new Date(ref.getFullYear(), ref.getMonth() - 1, 1);
  if (filtro === "ano")    return new Date(ref.getFullYear() - 1, 0, 1);
  return ref;
}

function navProximo(filtro: PeriodoCPMA, ref: Date): Date {
  if (filtro === "dia")    return dateEngine.somarDias(ref, 1);
  if (filtro === "semana") return dateEngine.somarDias(dateEngine.inicioSemana(ref), 7);
  if (filtro === "mes")    return new Date(ref.getFullYear(), ref.getMonth() + 1, 1);
  if (filtro === "ano")    return new Date(ref.getFullYear() + 1, 0, 1);
  return ref;
}

function proximoBloqueado(filtro: PeriodoCPMA, ref: Date): boolean {
  if (filtro === "todos") return true;
  const hoje = dateEngine.hoje();
  if (filtro === "dia")    return ref >= hoje;
  if (filtro === "semana") return dateEngine.inicioSemana(ref) >= dateEngine.inicioSemana(hoje);
  if (filtro === "mes")    return ref.getFullYear() >= hoje.getFullYear() && ref.getMonth() >= hoje.getMonth();
  if (filtro === "ano")    return ref.getFullYear() >= hoje.getFullYear();
  return false;
}

function labelPeriodo(filtro: PeriodoCPMA, ref: Date): string {
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

// ─── Componente de linha de dado ─────────────────────────────────────────────

function DataRow({
  icon,
  label,
  value,
  color,
  sub,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  color?: string;
  sub?: string;
}) {
  return (
    <View style={row.wrap}>
      <View style={[row.iconWrap, { backgroundColor: (color ?? theme.colors.primary) + "1A" }]}>
        <Ionicons name={icon} size={16} color={color ?? theme.colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={row.label}>{label}</Text>
        {sub ? <Text style={row.sub}>{sub}</Text> : null}
      </View>
      <Text style={[row.value, color ? { color } : null]}>{value}</Text>
    </View>
  );
}

function SectionTitle({ children }: { children: string }) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

function Divider() {
  return <View style={styles.divider} />;
}

// ─── Tela principal ───────────────────────────────────────────────────────────

export default function CPMAScreen() {
  const insets = useSafeAreaInsets();
  const { perfil, veiculo } = useAuth();
  const { openDrawer } = useUI();

  const [filtro, setFiltro] = useState<PeriodoCPMA>("mes");
  const [refDate, setRefDate] = useState<Date>(() => refInicial("mes"));

  const mesDashboard = useMemo(() => {
    if (filtro === "mes" || filtro === "todos") return refDate;
    if (filtro === "dia" || filtro === "semana") return new Date(refDate.getFullYear(), refDate.getMonth(), 1);
    if (filtro === "ano") return new Date(refDate.getFullYear(), 0, 1);
    return new Date();
  }, [filtro, refDate]);

  const { data, loading, refetching, refetch } = useDashboard(mesDashboard, 0);

  useFocusEffect(
    React.useCallback(() => {
      void refetch();
    }, [refetch]),
  );

  const mudarFiltro = (novo: PeriodoCPMA) => {
    setFiltro(novo);
    setRefDate(refInicial(novo));
  };

  const bloqueado = proximoBloqueado(filtro, refDate);

  // ── Dados calculados para o período selecionado ───────────────────────────
  const stats = useMemo(() => {
    if (!data) return null;

    const ganhos    = data.ganhoMes;
    const despesas  = data.despesasMes;
    const custoFixo = data.custoFixoMes;
    const liquido   = data.ganhoMesLiquido;
    const corridas  = data.corridasHoje;
    const meta      = data.metaMensal;
    const metaDiaria = data.metaDiariaAjustada;
    const pctMeta   = data.percentualMes;

    const ganhoPorKm = data.ganhoMes > 0 && liquido > 0 ? liquido : 0;
    const lucroHora  = data.ganhoSemana > 0 ? data.lucroLiquidoSemana : 0;

    return {
      ganhos, despesas, custoFixo, liquido, corridas,
      meta, metaDiaria, pctMeta,
      ganhoSemana: data.ganhoSemana,
      lucroLiquidoSemana: data.lucroLiquidoSemana,
      ganhoHoje: data.ganhoHoje,
      variacaoOntem: data.variacaoOntem,
      ganhoPorKm, lucroHora,
    };
  }, [data]);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.surfaceMuted }}>
      <AppHeader
        title="CPMA"
        subtitle="Controle de Performance"
        onBackPress={() => router.back()}
        onMenuPress={openDrawer}
      />

      <ScrollView
        contentContainerStyle={{ padding: 14, paddingBottom: insets.bottom + 100 }}
        refreshControl={
          <RefreshControl
            refreshing={refetching}
            onRefresh={refetch}
            tintColor={theme.colors.primary}
          />
        }
      >
        {/* ── Filtros de período ──────────────────────────────────────────── */}
        <View style={styles.filtrosRow}>
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

        {/* ── Navegação de período ────────────────────────────────────────── */}
        {filtro !== "todos" && (
          <View style={styles.navRow}>
            <Pressable
              onPress={() => setRefDate(navAnterior(filtro, refDate))}
              hitSlop={12}
              style={styles.navBtn}
            >
              <Ionicons name="chevron-back" size={20} color={theme.colors.primary} />
            </Pressable>
            <Text style={styles.navLabel}>{labelPeriodo(filtro, refDate)}</Text>
            <Pressable
              onPress={() => !bloqueado && setRefDate(navProximo(filtro, refDate))}
              hitSlop={12}
              style={[styles.navBtn, bloqueado && { opacity: 0.3 }]}
              disabled={bloqueado}
            >
              <Ionicons name="chevron-forward" size={20} color={theme.colors.primary} />
            </Pressable>
          </View>
        )}
        {filtro === "todos" && (
          <View style={[styles.navRow, { justifyContent: "center" }]}>
            <Text style={styles.navLabel}>Todos os registros</Text>
          </View>
        )}

        {/* ── Conteúdo ────────────────────────────────────────────────────── */}
        {loading || !stats ? (
          <View style={{ paddingVertical: 60, alignItems: "center" }}>
            <ActivityIndicator color={theme.colors.primary} size="large" />
            <Text style={styles.loadingTxt}>Carregando dados…</Text>
          </View>
        ) : (
          <>
            {/* ── KPI topo: Bruto × Líquido ─────────────────────────────── */}
            <View style={styles.kpiRow}>
              <LinearGradient
                colors={theme.gradients.primary as readonly [string, string]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={styles.kpiCard}
              >
                <Ionicons name="cash" size={18} color="#fff" />
                <Text style={styles.kpiLabel}>Ganho Bruto</Text>
                <Text style={styles.kpiValue}>{currencyEngine.formatar(stats.ganhos)}</Text>
              </LinearGradient>

              <LinearGradient
                colors={theme.gradients.success as readonly [string, string]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={styles.kpiCard}
              >
                <Ionicons name="leaf" size={18} color="#fff" />
                <Text style={styles.kpiLabel}>Líquido</Text>
                <Text style={styles.kpiValue}>{currencyEngine.formatar(stats.liquido)}</Text>
              </LinearGradient>
            </View>

            {/* ── Meta do mês ───────────────────────────────────────────── */}
            <AppCard style={{ marginTop: 12 }}>
              <SectionTitle>Meta do mês</SectionTitle>
              <View style={styles.metaNumRow}>
                <Text style={styles.metaAcum}>{currencyEngine.formatar(stats.ganhos)}</Text>
                <Text style={styles.metaTotal}>/ {currencyEngine.formatar(stats.meta)}</Text>
              </View>
              <AppProgressBar percentual={stats.pctMeta} rightLabel={`${stats.pctMeta}%`} />
              <View style={styles.metaSubRow}>
                <Text style={styles.metaSub}>
                  {stats.pctMeta >= 100
                    ? "Meta atingida!"
                    : `Faltam ${currencyEngine.formatar(Math.max(0, stats.meta - stats.ganhos))}`}
                </Text>
                <View style={styles.metaDiariaBadge}>
                  <Text style={styles.metaDiariaLab}>Meta diária</Text>
                  <Text style={styles.metaDiariaVal}>{currencyEngine.formatar(stats.metaDiaria)}</Text>
                </View>
              </View>
            </AppCard>

            {/* ── Financeiro ────────────────────────────────────────────── */}
            <AppCard style={{ marginTop: 10 }}>
              <SectionTitle>Financeiro</SectionTitle>
              <DataRow
                icon="cash-outline"
                label="Ganho bruto"
                value={currencyEngine.formatar(stats.ganhos)}
                color={theme.colors.primary}
              />
              <Divider />
              <DataRow
                icon="remove-circle-outline"
                label="Despesas variáveis"
                value={currencyEngine.formatar(stats.despesas)}
                color={theme.colors.danger}
              />
              <Divider />
              <DataRow
                icon="wallet-outline"
                label="Custo fixo (estimado)"
                value={currencyEngine.formatar(stats.custoFixo)}
                color={theme.colors.warning}
              />
              <Divider />
              <DataRow
                icon="leaf-outline"
                label="Líquido"
                value={currencyEngine.formatar(stats.liquido)}
                color={theme.colors.success}
              />
            </AppCard>

            {/* ── Desempenho semanal ────────────────────────────────────── */}
            <AppCard style={{ marginTop: 10 }}>
              <SectionTitle>Esta semana</SectionTitle>
              <DataRow
                icon="trending-up"
                label="Ganho bruto"
                value={currencyEngine.formatar(stats.ganhoSemana)}
                color={theme.colors.primary}
              />
              <Divider />
              <DataRow
                icon="leaf"
                label="Líquido (semana)"
                value={currencyEngine.formatar(stats.lucroLiquidoSemana)}
                color={theme.colors.success}
              />
              <Divider />
              <DataRow
                icon="today-outline"
                label="Hoje"
                value={currencyEngine.formatar(stats.ganhoHoje)}
                color={theme.colors.accent}
                sub={
                  stats.variacaoOntem !== 0
                    ? `${stats.variacaoOntem > 0 ? "+" : ""}${stats.variacaoOntem}% vs ontem`
                    : undefined
                }
              />
            </AppCard>

            {/* ── Veículo ───────────────────────────────────────────────── */}
            {veiculo && (
              <AppCard style={{ marginTop: 10 }}>
                <SectionTitle>Veículo</SectionTitle>
                {veiculo.nome_veiculo && (
                  <DataRow
                    icon="car-sport"
                    label="Veículo"
                    value={veiculo.nome_veiculo}
                  />
                )}
                {veiculo.placa && (
                  <>
                    <Divider />
                    <DataRow
                      icon="id-card-outline"
                      label="Placa"
                      value={veiculo.placa}
                    />
                  </>
                )}
                {veiculo.km_atual != null && (
                  <>
                    <Divider />
                    <DataRow
                      icon="speedometer-outline"
                      label="Hodômetro atual"
                      value={`${Number(veiculo.km_atual).toFixed(0)} km`}
                    />
                  </>
                )}
                {veiculo.tipo_tracao && (
                  <>
                    <Divider />
                    <DataRow
                      icon="flame-outline"
                      label="Tração"
                      value={veiculo.tipo_tracao.charAt(0).toUpperCase() + veiculo.tipo_tracao.slice(1)}
                    />
                  </>
                )}
                {veiculo.valor_fipe != null && (
                  <>
                    <Divider />
                    <DataRow
                      icon="pricetag-outline"
                      label="FIPE"
                      value={currencyEngine.formatar(veiculo.valor_fipe)}
                    />
                  </>
                )}
              </AppCard>
            )}

            {/* ── Perfil / configurações ────────────────────────────────── */}
            <AppCard style={{ marginTop: 10 }}>
              <SectionTitle>Configurações do motorista</SectionTitle>
              {perfil?.meta_mensal != null && (
                <DataRow
                  icon="flag-outline"
                  label="Meta mensal"
                  value={currencyEngine.formatar(perfil.meta_mensal)}
                  color={theme.colors.primary}
                />
              )}
              {perfil?.dias_folga_semana != null && (
                <>
                  <Divider />
                  <DataRow
                    icon="bed-outline"
                    label="Dias de folga / semana"
                    value={String(perfil.dias_folga_semana)}
                  />
                </>
              )}
              {perfil?.cidade && (
                <>
                  <Divider />
                  <DataRow
                    icon="location-outline"
                    label="Cidade"
                    value={`${perfil.cidade}${perfil.uf ? ` / ${perfil.uf}` : ""}`}
                  />
                </>
              )}
              <Divider />
              <DataRow
                icon="star-outline"
                label="Plano"
                value={perfil?.assinante ? "PRO" : "Gratuito"}
                color={perfil?.assinante ? theme.colors.warning : theme.colors.textMuted}
              />
            </AppCard>

            {/* ── Atalhos ───────────────────────────────────────────────── */}
            <View style={styles.atalhoRow}>
              <Pressable
                style={styles.atalhoBtn}
                onPress={() => router.push("/(private)/compartilhar")}
              >
                <Ionicons name="share-social" size={16} color={theme.colors.primary} />
                <Text style={styles.atalhoBtnTxt}>Compartilhar resultado</Text>
              </Pressable>
              <Pressable
                style={styles.atalhoBtn}
                onPress={() => router.push("/(private)/relatorios")}
              >
                <Ionicons name="bar-chart" size={16} color={theme.colors.primary} />
                <Text style={styles.atalhoBtnTxt}>Ver relatórios</Text>
              </Pressable>
            </View>
          </>
        )}

        <AppFooter />
      </ScrollView>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  filtrosRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 10,
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
    justifyContent: "space-between",
    backgroundColor: "#fff",
    borderRadius: theme.radius.md,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 12,
    ...theme.shadow.soft,
  },
  navBtn: {
    padding: 4,
  },
  navLabel: {
    ...theme.font.semibold,
    fontSize: 14,
    color: theme.colors.text,
    flex: 1,
    textAlign: "center",
  },
  loadingTxt: {
    marginTop: 12,
    color: theme.colors.textMuted,
    ...theme.font.regular,
    fontSize: 14,
  },
  kpiRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 2,
  },
  kpiCard: {
    flex: 1,
    borderRadius: theme.radius.lg,
    padding: 14,
    gap: 4,
    ...theme.shadow.soft,
  },
  kpiLabel: {
    color: "rgba(255,255,255,0.85)",
    ...theme.font.medium,
    fontSize: 12,
    marginTop: 4,
  },
  kpiValue: {
    color: "#fff",
    ...theme.font.bold,
    fontSize: 18,
  },
  sectionTitle: {
    ...theme.font.semibold,
    fontSize: 15,
    color: theme.colors.text,
    marginBottom: 12,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.divider,
    marginVertical: 8,
  },
  metaNumRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
    marginBottom: 8,
  },
  metaAcum: {
    ...theme.font.bold,
    fontSize: 22,
    color: theme.colors.text,
  },
  metaTotal: {
    ...theme.font.medium,
    fontSize: 15,
    color: theme.colors.textMuted,
  },
  metaSubRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  metaSub: {
    ...theme.font.regular,
    fontSize: 13,
    color: theme.colors.textMuted,
  },
  metaDiariaBadge: {
    backgroundColor: theme.colors.primary + "18",
    borderRadius: theme.radius.pill,
    paddingHorizontal: 11,
    paddingVertical: 5,
    alignItems: "center",
  },
  metaDiariaLab: { ...theme.font.regular, fontSize: 10, color: theme.colors.primary },
  metaDiariaVal: { ...theme.font.bold, fontSize: 14, color: theme.colors.primary },
  atalhoRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },
  atalhoBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadow.soft,
  },
  atalhoBtnTxt: {
    ...theme.font.medium,
    fontSize: 13,
    color: theme.colors.primary,
  },
});

const row = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: theme.radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    ...theme.font.medium,
    fontSize: 13,
    color: theme.colors.text,
  },
  sub: {
    ...theme.font.regular,
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 1,
  },
  value: {
    ...theme.font.semibold,
    fontSize: 14,
    color: theme.colors.text,
  },
});
