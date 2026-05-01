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
import { AppHeader } from "@/components/ui/AppHeader";
import { AppCard } from "@/components/ui/AppCard";
import { AppFooter } from "@/components/ui/AppFooter";
import type { Ganho, Plataforma } from "@/lib/types";

// ─── Cor da plataforma ───────────────────────────────────────────────────────

function corDaPlataforma(nome: string): string {
  const n = nome.toLowerCase();
  if (n.includes("uber")) return "#5C5C5C";
  if (n.includes("99")) return "#FFC300";
  if (n.includes("indriver") || n.includes("in driver")) return "#22C55E";
  if (n.includes("ifood") || n.includes("i food")) return "#EF4444";
  if (n.includes("entrega")) return "#EC4899";
  if (n.includes("particular")) return "#3B82F6";
  return "#8B5CF6";
}

// ─── Tipo de resumo por plataforma ───────────────────────────────────────────

interface ResumoPlat {
  nome: string;
  cor: string;
  total: number;
  corridas: number;
  diasAtivos: number;
}

// ─── Tela principal ──────────────────────────────────────────────────────────

export default function GanhosPorPlataforma() {
  const insets = useSafeAreaInsets();
  const { openDrawer } = useUI();
  const { session, perfil } = useAuth();
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

  const query = useQuery({
    queryKey: ["ganhos-por-plataforma", userId, mesKey],
    queryFn: async () => {
      if (!userId) return { ganhos: [], plataformas: [] };
      const inicioISO = dateEngine.formatarISO(new Date(mes.getFullYear(), mes.getMonth(), 1));
      const fimISO = dateEngine.formatarISO(new Date(mes.getFullYear(), mes.getMonth() + 1, 0));
      const [gRes, pRes] = await Promise.all([
        supabase
          .from("ganhos")
          .select("*")
          .eq("profile_id", userId)
          .gte("data_ganho", inicioISO)
          .lte("data_ganho", fimISO),
        supabase.from("plataformas").select("*").eq("profile_id", userId),
      ]);
      return {
        ganhos: (gRes.data ?? []) as Ganho[],
        plataformas: (pRes.data ?? []) as Plataforma[],
      };
    },
    enabled: !!userId,
    staleTime: 30000,
  });

  const resumos = useMemo<ResumoPlat[]>(() => {
    if (!query.data) return [];
    const { ganhos, plataformas } = query.data;
    const map = new Map<string, ResumoPlat>();

    for (const g of ganhos) {
      const plat = g.plataforma_id
        ? plataformas.find((p) => p.id === g.plataforma_id)
        : null;
      const nome = plat?.nome ?? "Outros";
      const cor = corDaPlataforma(nome);

      if (!map.has(nome)) {
        map.set(nome, { nome, cor, total: 0, corridas: 0, diasAtivos: 0 });
      }
      const r = map.get(nome)!;
      r.total += Number(g.valor) || 0;
      r.corridas += Number(g.corridas) || 0;
      r.diasAtivos += 1;
    }

    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [query.data]);

  const totalMes = resumos.reduce((s, r) => s + r.total, 0);
  const totalCorridas = resumos.reduce((s, r) => s + r.corridas, 0);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <AppHeader
        title="Ganhos por Plataforma"
        onMenuPress={openDrawer}
      />

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

        {/* Resumo do mês */}
        {totalMes > 0 && (
          <AppCard style={styles.resumoCard}>
            <View style={styles.resumoRow}>
              <View style={styles.resumoItem}>
                <Text style={styles.resumoLab}>Total do mês</Text>
                <Text style={styles.resumoVal}>{currencyEngine.formatar(totalMes)}</Text>
              </View>
              <View style={styles.resumoDiv} />
              <View style={styles.resumoItem}>
                <Text style={styles.resumoLab}>Total de corridas</Text>
                <Text style={styles.resumoVal}>{totalCorridas}</Text>
              </View>
              <View style={styles.resumoDiv} />
              <View style={styles.resumoItem}>
                <Text style={styles.resumoLab}>Plataformas</Text>
                <Text style={styles.resumoVal}>{resumos.length}</Text>
              </View>
            </View>
          </AppCard>
        )}

        {/* Loading */}
        {query.isLoading ? (
          <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 40 }} />
        ) : resumos.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="cash-outline" size={52} color={theme.colors.border} />
            <Text style={styles.emptyTit}>Sem ganhos este mês</Text>
            <Text style={styles.emptySub}>
              Registre jornadas com ganhos para ver o resumo por plataforma.
            </Text>
          </View>
        ) : (
          resumos.map((r) => {
            const mediaDia = r.diasAtivos > 0 ? r.total / r.diasAtivos : 0;
            const pctTotal = totalMes > 0 ? (r.total / totalMes) * 100 : 0;

            return (
              <AppCard key={r.nome} style={styles.platCard}>
                {/* Cabeçalho da plataforma */}
                <View style={[styles.platHeader, { borderLeftColor: r.cor }]}>
                  <Text style={[styles.platNome, { color: r.cor }]}>{r.nome}</Text>
                  <Text style={styles.platPct}>{pctTotal.toFixed(1)}% do mês</Text>
                </View>

                {/* Total grande */}
                <Text style={[styles.platTotal, { color: r.cor }]}>
                  {currencyEngine.formatar(r.total)}
                </Text>

                {/* Detalhes */}
                <View style={styles.detRow}>
                  <View style={styles.detItem}>
                    <Ionicons name="navigate-circle-outline" size={14} color={theme.colors.textMuted} />
                    <Text style={styles.detLab}>{r.corridas} corridas</Text>
                  </View>
                  <View style={styles.detItem}>
                    <Ionicons name="calendar-outline" size={14} color={theme.colors.textMuted} />
                    <Text style={styles.detLab}>{r.diasAtivos} dias trabalhados</Text>
                  </View>
                  <View style={styles.detItem}>
                    <Ionicons name="trending-up-outline" size={14} color={theme.colors.textMuted} />
                    <Text style={styles.detLab}>{currencyEngine.formatar(mediaDia)}/dia</Text>
                  </View>
                </View>

                {/* Barra de progresso relativa ao total */}
                <View style={styles.barBg}>
                  <View style={[styles.barFill, { width: `${pctTotal}%`, backgroundColor: r.cor }]} />
                </View>
              </AppCard>
            );
          })
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

  resumoCard: { marginBottom: 16 },
  resumoRow: { flexDirection: "row", alignItems: "center" },
  resumoItem: { flex: 1, alignItems: "center" },
  resumoDiv: { width: 1, height: 36, backgroundColor: theme.colors.divider },
  resumoLab: {
    ...theme.font.regular,
    fontSize: 11,
    color: theme.colors.textMuted,
    marginBottom: 4,
    textAlign: "center",
  },
  resumoVal: {
    ...theme.font.bold,
    fontSize: 15,
    color: theme.colors.text,
    textAlign: "center",
  },

  platCard: { marginBottom: 14 },
  platHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderLeftWidth: 4,
    paddingLeft: 10,
    marginBottom: 6,
  },
  platNome: {
    ...theme.font.bold,
    fontSize: 16,
  },
  platPct: {
    ...theme.font.medium,
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  platTotal: {
    ...theme.font.bold,
    fontSize: 28,
    marginBottom: 10,
    marginLeft: 14,
  },
  detRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  detItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  detLab: {
    ...theme.font.medium,
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  barBg: {
    height: 6,
    backgroundColor: theme.colors.divider,
    borderRadius: 3,
    overflow: "hidden",
  },
  barFill: { height: 6, borderRadius: 3 },

  empty: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    gap: 12,
  },
  emptyTit: {
    ...theme.font.semibold,
    fontSize: 16,
    color: theme.colors.text,
  },
  emptySub: {
    ...theme.font.regular,
    fontSize: 13,
    color: theme.colors.textMuted,
    textAlign: "center",
    paddingHorizontal: 24,
    lineHeight: 20,
  },
});
