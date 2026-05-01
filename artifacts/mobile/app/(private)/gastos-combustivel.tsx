import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { theme } from "@/lib/theme";
import { useUI } from "@/hooks/UIContext";
import { useAuth } from "@/hooks/AuthContext";
import { supabase } from "@/lib/supabase";
import { dateEngine } from "@/engines/date-engine";
import { currencyEngine } from "@/engines/currency-engine";
import { combustivelEngine } from "@/engines/combustivel-engine";
import { AppHeader } from "@/components/ui/AppHeader";
import { AppCard } from "@/components/ui/AppCard";
import { AppFooter } from "@/components/ui/AppFooter";
import type { Jornada, Abastecimento } from "@/lib/types";

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface DetalheJornada {
  id: string;
  data: string;
  kmPercorrido: number;
  custoEstimado: number;
  consumoKmL: number;
  precoLitro: number;
  litrosUsados: number;
}

// ─── Tela ─────────────────────────────────────────────────────────────────────

export default function GastosCombustivel() {
  const insets = useSafeAreaInsets();
  const { openDrawer } = useUI();
  const { session, perfil, veiculo } = useAuth();
  const userId = session?.user?.id;

  const [mes, setMes] = useState(new Date());
  const mesKey = `${mes.getFullYear()}-${mes.getMonth()}`;

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

  const isEletrico = veiculo?.tipo_tracao === "eletrico";

  // ── Busca de dados ──────────────────────────────────────────────────────────

  const query = useQuery({
    queryKey: ["gastos-combustivel", userId, mesKey],
    queryFn: async () => {
      if (!userId) return { jornadas: [], abastecimentos: [], abastMes: [] };
      const inicioISO = dateEngine.formatarISO(new Date(mes.getFullYear(), mes.getMonth(), 1));
      const fimISO = dateEngine.formatarISO(new Date(mes.getFullYear(), mes.getMonth() + 1, 0));

      const [jRes, aRes, aMesRes] = await Promise.all([
        supabase
          .from("jornadas")
          .select("id, data_jornada, km_percorrido, km_percorrido_real, status")
          .eq("profile_id", userId)
          .eq("status", "encerrada")
          .gte("data_jornada", inicioISO)
          .lte("data_jornada", fimISO)
          .order("data_jornada", { ascending: true }),
        supabase
          .from("abastecimentos")
          .select("id, data_abastecimento, valor_total, litros, preco_por_litro, tipo_combustivel, autonomia_km_litro")
          .eq("profile_id", userId)
          .order("data_abastecimento", { ascending: false })
          .limit(30),
        supabase
          .from("abastecimentos")
          .select("id, data_abastecimento, valor_total, litros, preco_por_litro, tipo_combustivel, autonomia_km_litro")
          .eq("profile_id", userId)
          .gte("data_abastecimento", inicioISO)
          .lte("data_abastecimento", fimISO),
      ]);

      return {
        jornadas: (jRes.data ?? []) as Jornada[],
        abastecimentos: (aRes.data ?? []) as Abastecimento[],
        abastMes: (aMesRes.data ?? []) as Abastecimento[],
      };
    },
    enabled: !!userId,
    staleTime: 30000,
  });

  // ── Cálculos ────────────────────────────────────────────────────────────────

  const { detalhes, resumo, realMes } = useMemo(() => {
    if (!query.data) {
      return { detalhes: [] as DetalheJornada[], resumo: null, realMes: { total: 0, litros: 0, count: 0 } };
    }
    const { jornadas, abastecimentos, abastMes } = query.data;

    const media = combustivelEngine.mediaUltimos30(abastecimentos);
    const padraoV = combustivelEngine.valoresVeiculo(veiculo);
    const consumoKmL = media.valida ? media.consumoKmL : padraoV.consumoKmL;
    const precoLitro = media.valida ? media.precoLitro : padraoV.precoLitro;

    const detalhes: DetalheJornada[] = [];
    let totalKm = 0;
    let totalCusto = 0;
    let totalLitros = 0;

    for (const j of jornadas) {
      const km = Number(j.km_percorrido_real) > 0
        ? Number(j.km_percorrido_real)
        : Number(j.km_percorrido) || 0;
      if (km <= 0) continue;
      const custo = consumoKmL > 0 && precoLitro > 0 ? (km / consumoKmL) * precoLitro : 0;
      const litros = consumoKmL > 0 ? km / consumoKmL : 0;
      detalhes.push({
        id: j.id,
        data: j.data_jornada,
        kmPercorrido: km,
        custoEstimado: custo,
        consumoKmL,
        precoLitro,
        litrosUsados: litros,
      });
      totalKm += km;
      totalCusto += custo;
      totalLitros += litros;
    }

    const realTotal = abastMes.reduce((s, a) => s + (Number(a.valor_total) || 0), 0);
    const realLitros = abastMes.reduce((s, a) => s + (Number(a.litros) || 0), 0);

    const resumo = {
      totalKm,
      custoEstimado: totalCusto,
      totalLitros,
      consumoKmL,
      precoLitro,
      custoPorKm: totalKm > 0 ? totalCusto / totalKm : 0,
      fonte: media.valida ? "histórico" : "veículo",
      jornadasCount: detalhes.length,
    };

    return {
      detalhes,
      resumo,
      realMes: { total: realTotal, litros: realLitros, count: abastMes.length },
    };
  }, [query.data, veiculo]);

  // ── Render ──────────────────────────────────────────────────────────────────

  const unidade = isEletrico ? "kWh" : "L";
  const consumoLabel = isEletrico ? "km/kWh" : "km/L";
  const precoLabel = isEletrico ? "R$/kWh" : "R$/L";

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <AppHeader title="Gastos de Combustível" onMenuPress={openDrawer} />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Navegação de mês */}
        <View style={styles.mesRow}>
          <Pressable onPress={irPrev} hitSlop={10} disabled={isAtMin}>
            <Ionicons name="chevron-back" size={20} color={isAtMin ? theme.colors.border : theme.colors.text} />
          </Pressable>
          <Text style={styles.mesTxt}>{dateEngine.formatarMesAno(mes)}</Text>
          <Pressable onPress={irNext} hitSlop={10} disabled={isFuturo}>
            <Ionicons name="chevron-forward" size={20} color={isFuturo ? theme.colors.border : theme.colors.text} />
          </Pressable>
        </View>

        {query.isLoading ? (
          <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 40 }} />
        ) : !resumo || resumo.totalKm === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="speedometer-outline" size={52} color={theme.colors.border} />
            <Text style={styles.emptyTit}>Sem jornadas neste mês</Text>
            <Text style={styles.emptySub}>
              Registre jornadas com km percorrido para calcular o gasto de combustível.
            </Text>
          </View>
        ) : (
          <>
            {/* Card de resumo */}
            <AppCard style={styles.resumoCard}>
              <View style={styles.resumoHeader}>
                <View style={styles.resumoIconWrap}>
                  <Ionicons name="flame" size={20} color="#F59E0B" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.resumoTit}>Custo estimado do mês</Text>
                  <Text style={styles.resumoSub}>
                    Fonte: {resumo.fonte === "histórico" ? "média dos abastecimentos" : "configuração do veículo"}
                  </Text>
                </View>
              </View>

              <Text style={styles.custoTotal}>{currencyEngine.formatar(resumo.custoEstimado)}</Text>

              <View style={styles.gridRow}>
                <View style={styles.gridItem}>
                  <Ionicons name="speedometer-outline" size={15} color={theme.colors.primary} />
                  <Text style={styles.gridLab}>KM rodados</Text>
                  <Text style={styles.gridVal}>{resumo.totalKm.toFixed(0)} km</Text>
                </View>
                <View style={styles.gridDivider} />
                <View style={styles.gridItem}>
                  <Ionicons name="water-outline" size={15} color={theme.colors.primary} />
                  <Text style={styles.gridLab}>{unidade} estimados</Text>
                  <Text style={styles.gridVal}>{resumo.totalLitros.toFixed(1)} {unidade}</Text>
                </View>
                <View style={styles.gridDivider} />
                <View style={styles.gridItem}>
                  <Ionicons name="trending-down-outline" size={15} color={theme.colors.primary} />
                  <Text style={styles.gridLab}>Custo/km</Text>
                  <Text style={styles.gridVal}>{currencyEngine.formatar(resumo.custoPorKm)}</Text>
                </View>
              </View>

              <View style={[styles.gridRow, { marginTop: 0 }]}>
                <View style={styles.gridItem}>
                  <Ionicons name="analytics-outline" size={15} color={theme.colors.textMuted} />
                  <Text style={styles.gridLab}>{consumoLabel}</Text>
                  <Text style={styles.gridVal}>{resumo.consumoKmL.toFixed(1)}</Text>
                </View>
                <View style={styles.gridDivider} />
                <View style={styles.gridItem}>
                  <Ionicons name="pricetag-outline" size={15} color={theme.colors.textMuted} />
                  <Text style={styles.gridLab}>{precoLabel}</Text>
                  <Text style={styles.gridVal}>{currencyEngine.formatar(resumo.precoLitro)}</Text>
                </View>
                <View style={styles.gridDivider} />
                <View style={styles.gridItem}>
                  <Ionicons name="calendar-outline" size={15} color={theme.colors.textMuted} />
                  <Text style={styles.gridLab}>Jornadas</Text>
                  <Text style={styles.gridVal}>{resumo.jornadasCount}</Text>
                </View>
              </View>

              {resumo.fonte === "veículo" && (
                <View style={styles.aviso}>
                  <Ionicons name="information-circle-outline" size={14} color={theme.colors.warning} />
                  <Text style={styles.avisoTxt}>
                    Sem abastecimentos recentes — usando dados do veículo. Registre abastecimentos para maior precisão.
                  </Text>
                </View>
              )}
            </AppCard>

            {/* Comparativo com abastecimentos reais */}
            {realMes.count > 0 && (
              <AppCard style={styles.realCard}>
                <Text style={styles.secTit}>Comparativo com abastecimentos</Text>
                <View style={styles.comparRow}>
                  <View style={styles.comparItem}>
                    <Text style={styles.comparLab}>Estimado</Text>
                    <Text style={[styles.comparVal, { color: theme.colors.primary }]}>
                      {currencyEngine.formatar(resumo.custoEstimado)}
                    </Text>
                  </View>
                  <View style={styles.comparArrow}>
                    <Ionicons name="swap-horizontal" size={18} color={theme.colors.textMuted} />
                  </View>
                  <View style={styles.comparItem}>
                    <Text style={styles.comparLab}>Real ({realMes.count} abast.)</Text>
                    <Text style={[styles.comparVal, { color: "#22C55E" }]}>
                      {currencyEngine.formatar(realMes.total)}
                    </Text>
                  </View>
                </View>
                {(() => {
                  const diff = resumo.custoEstimado - realMes.total;
                  const pct = realMes.total > 0 ? Math.abs(diff / realMes.total) * 100 : 0;
                  const overEstimated = diff > 0;
                  return (
                    <View style={[styles.diffBadge, { backgroundColor: overEstimated ? "#FEF3C7" : "#DCFCE7" }]}>
                      <Ionicons
                        name={overEstimated ? "arrow-up" : "arrow-down"}
                        size={12}
                        color={overEstimated ? "#D97706" : "#16A34A"}
                      />
                      <Text style={[styles.diffTxt, { color: overEstimated ? "#D97706" : "#16A34A" }]}>
                        Estimativa {overEstimated ? "acima" : "abaixo"} do real em{" "}
                        {currencyEngine.formatar(Math.abs(diff))} ({pct.toFixed(1)}%)
                      </Text>
                    </View>
                  );
                })()}
              </AppCard>
            )}

            {/* Detalhamento por jornada */}
            <Text style={styles.secTitFlutuante}>Detalhamento por dia</Text>
            {detalhes.map((d) => (
              <AppCard key={d.id} style={styles.jornadaCard}>
                <View style={styles.jornadaRow}>
                  <View style={styles.jornadaData}>
                    <Text style={styles.jornadaDia}>{dateEngine.formatarBR(d.data)}</Text>
                  </View>
                  <View style={styles.jornadaInfo}>
                    <View style={styles.jornadaMetric}>
                      <Ionicons name="speedometer-outline" size={12} color={theme.colors.textMuted} />
                      <Text style={styles.jornadaMetricTxt}>{d.kmPercorrido.toFixed(0)} km</Text>
                    </View>
                    <View style={styles.jornadaMetric}>
                      <Ionicons name="water-outline" size={12} color={theme.colors.textMuted} />
                      <Text style={styles.jornadaMetricTxt}>{d.litrosUsados.toFixed(1)} {unidade}</Text>
                    </View>
                  </View>
                  <Text style={styles.jornadaCusto}>{currencyEngine.formatar(d.custoEstimado)}</Text>
                </View>
                {/* Barra proporcional */}
                <View style={styles.barBg}>
                  <View
                    style={[
                      styles.barFill,
                      {
                        width: `${resumo.custoEstimado > 0 ? Math.min((d.custoEstimado / resumo.custoEstimado) * 100, 100) : 0}%`,
                      },
                    ]}
                  />
                </View>
              </AppCard>
            ))}
          </>
        )}

        <AppFooter />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.surfaceMuted },
  scroll: { padding: 16, paddingBottom: 32 },

  mesRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
    paddingHorizontal: 4,
  },
  mesTxt: { ...theme.font.semibold, fontSize: 15, color: theme.colors.text },

  empty: { alignItems: "center", paddingVertical: 60, gap: 12 },
  emptyTit: { ...theme.font.semibold, fontSize: 16, color: theme.colors.text },
  emptySub: {
    ...theme.font.regular, fontSize: 13, color: theme.colors.textMuted,
    textAlign: "center", paddingHorizontal: 24, lineHeight: 20,
  },

  resumoCard: { marginBottom: 14 },
  resumoHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
  resumoIconWrap: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: "#FEF3C7", justifyContent: "center", alignItems: "center",
  },
  resumoTit: { ...theme.font.semibold, fontSize: 14, color: theme.colors.text },
  resumoSub: { ...theme.font.regular, fontSize: 11, color: theme.colors.textMuted, marginTop: 1 },
  custoTotal: {
    ...theme.font.bold, fontSize: 32,
    color: theme.colors.text, marginBottom: 16, textAlign: "center",
  },

  gridRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 14,
    paddingHorizontal: 4,
  },
  gridItem: { flex: 1, alignItems: "center", gap: 3 },
  gridDivider: { width: 1, height: 44, backgroundColor: theme.colors.divider },
  gridLab: {
    ...theme.font.regular, fontSize: 10,
    color: theme.colors.textMuted, textAlign: "center",
  },
  gridVal: {
    ...theme.font.bold, fontSize: 13,
    color: theme.colors.text, textAlign: "center",
  },

  aviso: {
    flexDirection: "row", alignItems: "flex-start", gap: 6,
    backgroundColor: "#FFFBEB", borderRadius: theme.radius.md,
    padding: 10, marginTop: 4,
  },
  avisoTxt: {
    ...theme.font.regular, fontSize: 11,
    color: "#92400E", flex: 1, lineHeight: 16,
  },

  realCard: { marginBottom: 14 },
  secTit: { ...theme.font.semibold, fontSize: 13, color: theme.colors.text, marginBottom: 12 },
  comparRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  comparItem: { flex: 1, alignItems: "center" },
  comparLab: { ...theme.font.regular, fontSize: 11, color: theme.colors.textMuted, marginBottom: 4 },
  comparVal: { ...theme.font.bold, fontSize: 18 },
  comparArrow: { paddingHorizontal: 8 },
  diffBadge: {
    flexDirection: "row", alignItems: "center", gap: 6,
    borderRadius: theme.radius.md, paddingHorizontal: 10, paddingVertical: 8,
  },
  diffTxt: { ...theme.font.medium, fontSize: 12, flex: 1 },

  secTitFlutuante: {
    ...theme.font.semibold, fontSize: 13,
    color: theme.colors.textMuted, marginBottom: 8, marginLeft: 4,
  },
  jornadaCard: { marginBottom: 10 },
  jornadaRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  jornadaData: { flex: 1 },
  jornadaDia: { ...theme.font.semibold, fontSize: 13, color: theme.colors.text },
  jornadaInfo: { flexDirection: "row", gap: 10, marginRight: 12 },
  jornadaMetric: { flexDirection: "row", alignItems: "center", gap: 3 },
  jornadaMetricTxt: { ...theme.font.regular, fontSize: 11, color: theme.colors.textMuted },
  jornadaCusto: { ...theme.font.bold, fontSize: 14, color: theme.colors.text },
  barBg: { height: 4, backgroundColor: theme.colors.divider, borderRadius: 2, overflow: "hidden" },
  barFill: { height: 4, borderRadius: 2, backgroundColor: "#F59E0B" },
});
