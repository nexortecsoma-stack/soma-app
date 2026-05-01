import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from "@/lib/supabase";
import { theme } from "@/lib/theme";
import { useAuth } from "@/hooks/AuthContext";
import { dateEngine } from "@/engines/date-engine";
import { currencyEngine } from "@/engines/currency-engine";
import { AppBarChart } from "@/components/ui/AppBarChart";
import { AppCard } from "@/components/ui/AppCard";
import { AppHeader } from "@/components/ui/AppHeader";
import { AppFooter } from "@/components/ui/AppFooter";
import type { Ganho, Plataforma } from "@/lib/types";

function corDaPlataforma(nome: string): string {
  const n = nome.toLowerCase();
  // Uber: usa cinza escuro visível no tema escuro (não #000000 puro)
  if (n.includes("uber preto") || n.includes("uberpreto")) return "#4A4A4A";
  if (n.includes("uber")) return "#5C5C5C";
  if (n.includes("99")) return "#FFC300";
  if (n.includes("indriver") || n.includes("in driver")) return "#22C55E";
  if (n.includes("ifood") || n.includes("i food")) return "#EF4444";
  if (n.includes("entrega")) return "#EC4899";
  if (n.includes("particular")) return "#3B82F6";
  return "#8B5CF6";
}

interface PlatSemana {
  plataforma: string;
  cor: string;
  total: number;
  dias: { label: string; sublabel: string; valor: number }[];
}

function calcSemana(
  ganhos: Ganho[],
  plataformas: Plataforma[],
  inicioSemana: Date,
): PlatSemana[] {
  const dias = Array.from({ length: 7 }, (_, i) => {
    const d = dateEngine.somarDias(inicioSemana, i);
    return { date: d, iso: dateEngine.formatarISO(d) };
  });

  const platMap = new Map<string, { nome: string; cor: string; valores: number[] }>();

  for (const g of ganhos) {
    const dayIdx = dias.findIndex((d) => d.iso === g.data_ganho);
    if (dayIdx < 0) continue;

    const platId = g.plataforma_id;
    const plat = platId ? plataformas.find((p) => p.id === platId) : null;
    const platNome = plat?.nome ?? "Outros";

    if (!platMap.has(platNome)) {
      platMap.set(platNome, {
        nome: platNome,
        cor: corDaPlataforma(platNome),
        valores: [0, 0, 0, 0, 0, 0, 0],
      });
    }
    platMap.get(platNome)!.valores[dayIdx]! += Number(g.valor) || 0;
  }

  if (platMap.size === 0) return [];

  return Array.from(platMap.values())
    .map((p) => ({
      plataforma: p.nome,
      cor: p.cor,
      total: p.valores.reduce((s, v) => s + v, 0),
      dias: dias.map((d, i) => ({
        label: dateEngine.diaSemanaCurto(d.date),
        sublabel: String(d.date.getDate()).padStart(2, "0"),
        valor: p.valores[i] ?? 0,
      })),
    }))
    .filter((p) => p.total > 0)
    .sort((a, b) => b.total - a.total);
}

function labelSemana(inicio: Date, fim: Date): string {
  const f = (d: Date) =>
    `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
  return `${f(inicio)} – ${f(fim)}`;
}

export default function RelatoriosScreen() {
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const userId = session?.user?.id;

  const [offset, setOffset] = useState(0);

  const hoje = useMemo(() => dateEngine.hoje(), []);
  const inicioSemana = useMemo(
    () => dateEngine.somarDias(dateEngine.inicioSemana(hoje), offset * 7),
    [hoje, offset],
  );
  const fimSemana = useMemo(
    () => dateEngine.somarDias(dateEngine.fimSemana(hoje), offset * 7),
    [hoje, offset],
  );

  const inicioISO = useMemo(() => dateEngine.formatarISO(inicioSemana), [inicioSemana]);
  const fimISO = useMemo(() => dateEngine.formatarISO(fimSemana), [fimSemana]);

  const query = useQuery({
    queryKey: ["relatorios", userId, inicioISO, fimISO],
    queryFn: async () => {
      if (!userId) return { ganhos: [], plataformas: [] };
      const [gRes, pRes] = await Promise.all([
        supabase
          .from("ganhos")
          .select("*")
          .eq("profile_id", userId)
          .gte("data_ganho", inicioISO)
          .lte("data_ganho", fimISO),
        supabase.from("plataformas").select("*").eq("profile_id", userId),
      ]);
      if (gRes.error) throw gRes.error;
      if (pRes.error) throw pRes.error;
      return {
        ganhos: (gRes.data ?? []) as Ganho[],
        plataformas: (pRes.data ?? []) as Plataforma[],
      };
    },
    enabled: !!userId,
    staleTime: 30000,
  });

  const semanas = useMemo<PlatSemana[]>(() => {
    if (!query.data) return [];
    return calcSemana(query.data.ganhos, query.data.plataformas, inicioSemana);
  }, [query.data, inicioSemana]);

  const totalSemana = semanas.reduce((s, p) => s + p.total, 0);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <AppHeader title="Relatórios por Plataforma" onBackPress={() => router.back()} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Filtro de semana */}
        <AppCard style={styles.filterCard}>
          <View style={styles.filterRow}>
            <Pressable
              onPress={() => setOffset((n) => n - 1)}
              hitSlop={10}
              disabled={offset <= -52}
              style={styles.navBtn}
            >
              <Ionicons
                name="chevron-back"
                size={20}
                color={offset > -52 ? theme.colors.text : theme.colors.border}
              />
            </Pressable>
            <View style={styles.filterCenter}>
              <Text style={styles.filterLabel}>
                {offset === 0 ? "Esta semana" : labelSemana(inicioSemana, fimSemana)}
              </Text>
              {totalSemana > 0 && (
                <Text style={styles.filterTotal}>{currencyEngine.formatar(totalSemana)}</Text>
              )}
            </View>
            <Pressable
              onPress={() => setOffset((n) => n + 1)}
              hitSlop={10}
              disabled={offset >= 0}
              style={styles.navBtn}
            >
              <Ionicons
                name="chevron-forward"
                size={20}
                color={offset < 0 ? theme.colors.text : theme.colors.border}
              />
            </Pressable>
          </View>
        </AppCard>

        {query.isLoading ? (
          <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 40 }} />
        ) : semanas.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="bar-chart-outline" size={48} color={theme.colors.border} />
            <Text style={styles.emptyTit}>Sem ganhos no período</Text>
            <Text style={styles.emptySub}>
              Registre jornadas e ganhos para ver os relatórios por plataforma.
            </Text>
          </View>
        ) : (
          semanas.map((p) => (
            <AppCard key={p.plataforma} style={styles.platCard}>
              {/* Título da plataforma */}
              <View style={[styles.platHeader, { borderLeftWidth: 4, borderLeftColor: p.cor, paddingLeft: 10 }]}>
                <Text style={[styles.platNome, { color: p.cor }]}>{p.plataforma}</Text>
                <Text style={styles.platTotal}>
                  {currencyEngine.formatar(p.total)}
                </Text>
              </View>
              {/* Gráfico semanal com barras na cor da plataforma */}
              <AppBarChart data={p.dias} altura={140} barColor={p.cor} />
            </AppCard>
          ))
        )}

        <AppFooter />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.surfaceMuted },
  scroll: { padding: 16, paddingBottom: 24 },
  filterCard: { marginBottom: 16 },
  filterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  navBtn: { padding: 4 },
  filterCenter: { flex: 1, alignItems: "center" },
  filterLabel: {
    ...theme.font.semibold,
    fontSize: 14,
    color: theme.colors.text,
  },
  filterTotal: {
    ...theme.font.bold,
    fontSize: 18,
    color: theme.colors.primary,
    marginTop: 2,
  },
  platCard: { marginBottom: 14 },
  platHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  platDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  platNome: {
    flex: 1,
    ...theme.font.semibold,
    fontSize: 14,
    color: theme.colors.text,
  },
  platTotal: {
    ...theme.font.bold,
    fontSize: 14,
    color: theme.colors.text,
  },
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
