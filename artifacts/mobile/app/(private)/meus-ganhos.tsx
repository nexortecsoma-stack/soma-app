import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { theme } from "@/lib/theme";
import { dateEngine } from "@/engines/date-engine";
import { currencyEngine } from "@/engines/currency-engine";
import { combustivelEngine } from "@/engines/combustivel-engine";
import { despesaFixaEngine } from "@/engines/despesa-fixa-engine";
import { CATEGORIAS_DESPESA } from "@/lib/constants";
import { supabase } from "@/lib/supabase";
import { jornadaService } from "@/services/jornada-service";
import { abastecimentosService } from "@/services/abastecimentos-service";
import { useUI } from "@/hooks/UIContext";
import { useGanhos } from "@/hooks/useGanhos";
import { useAuth } from "@/hooks/AuthContext";
import { AppHeader } from "@/components/ui/AppHeader";
import { AppCard } from "@/components/ui/AppCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { FloatingButton } from "@/components/ui/FloatingButton";
import { AppFooter } from "@/components/ui/AppFooter";
import { EditarDiaModal } from "@/components/modals/EditarDiaModal";
import type { SavePayload } from "@/components/modals/EditarDiaModal";
import type { Abastecimento, Despesa, IpvaAliquota, Jornada, Manutencao, Ganho, Plataforma } from "@/lib/types";

// ─── Helpers ────────────────────────────────────────────────────────────────

function nomeDespesa(d: Despesa): string {
  if (d.categoria === "outros" && d.categoria_personalizada) return d.categoria_personalizada;
  return CATEGORIAS_DESPESA.find((c) => c.id === d.categoria)?.nome ?? d.categoria;
}

interface SuplementoMes {
  despesas: Despesa[];
  jornadas: Jornada[];
  abastecimentos: Abastecimento[];
  manutencoes: Manutencao[];
  aliquotasIpva: IpvaAliquota[];
  plataformas: Plataforma[];
}

// ─── Sub-componente para linha de breakdown ─────────────────────────────────

function BRow({
  label,
  valor,
  negativo,
  indent,
  destaque,
  pct,
}: {
  label: string;
  valor: number;
  negativo?: boolean;
  indent?: boolean;
  destaque?: boolean;
  pct?: number;
}) {
  const cor = destaque
    ? valor >= 0
      ? theme.colors.success
      : theme.colors.danger
    : negativo
    ? theme.colors.danger
    : theme.colors.text;
  return (
    <View style={[bStyles.row, indent && bStyles.indent]}>
      <Text style={[bStyles.lbl, destaque && bStyles.lblBold]}>{label}</Text>
      <View style={bStyles.valWrap}>
        {pct !== undefined && pct > 0 && (
          <Text style={bStyles.pctTxt}>{pct.toFixed(1)}%</Text>
        )}
        <Text style={[bStyles.val, { color: cor }, destaque && bStyles.valBold]}>
          {negativo || valor < 0 ? "- " : ""}
          {currencyEngine.formatar(Math.abs(valor))}
        </Text>
      </View>
    </View>
  );
}

function MRow({ label, val, empty, sufixo }: { label: string; val: number; empty?: boolean; sufixo?: string }) {
  return (
    <View style={bStyles.row}>
      <Text style={bStyles.lbl}>{label}</Text>
      <Text style={[bStyles.val, { color: theme.colors.text }]}>
        {empty || val === 0 ? "—" : `${currencyEngine.formatar(val)}${sufixo ?? ""}`}
      </Text>
    </View>
  );
}

const bStyles = StyleSheet.create({
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 3 },
  indent: { paddingLeft: 14 },
  lbl: { ...theme.font.regular, fontSize: 13, color: theme.colors.textMuted, flex: 1 },
  lblBold: { ...theme.font.bold, color: theme.colors.text, fontSize: 15 },
  valWrap: { flexDirection: "row", alignItems: "center", gap: 6 },
  pctTxt: { ...theme.font.medium, fontSize: 12, color: theme.colors.textMuted },
  val: { ...theme.font.semibold, fontSize: 13 },
  valBold: { fontSize: 15, ...theme.font.bold },
});

// ─── Tela principal ──────────────────────────────────────────────────────────

export default function MeusGanhos() {
  const insets = useSafeAreaInsets();
  const { openDrawer, showModal, hideModal, showToast } = useUI();
  const { session, perfil, veiculo } = useAuth();
  const userId = session?.user?.id;

  const [mes, setMes] = useState(new Date());
  const mesKey = `${mes.getFullYear()}-${mes.getMonth()}`;

  const { list, create, update, remove } = useGanhos(mes);
  const { list: todosGanhos } = useGanhos();
  const queryClient = useQueryClient();
  const [expandido, setExpandido] = useState<string | null>(null);
  const [editandoData, setEditandoData] = useState<string | null>(null);

  // Plataformas (query separada, carrega rápido e fica em cache)
  const plataformasQuery = useQuery<Plataforma[]>({
    queryKey: ["plataformas", userId],
    queryFn: async () => {
      if (!userId) return [];
      const res = await supabase.from("plataformas").select("*").eq("profile_id", userId);
      return (res.data ?? []) as Plataforma[];
    },
    enabled: !!userId,
    staleTime: 60000,
  });

  // Dados suplementares para breakdown financeiro
  const suplemento = useQuery<SuplementoMes>({
    queryKey: ["meus-ganhos-suplemento", userId, mesKey],
    queryFn: async () => {
      if (!userId) return { despesas: [], jornadas: [], abastecimentos: [], manutencoes: [], aliquotasIpva: [], plataformas: [] };
      const inicioISO = dateEngine.formatarISO(new Date(mes.getFullYear(), mes.getMonth(), 1));
      const fimISO = dateEngine.formatarISO(new Date(mes.getFullYear(), mes.getMonth() + 1, 0));
      const [dRes, jRes, aRes, mRes, iRes, pRes] = await Promise.all([
        supabase.from("despesas").select("*").eq("profile_id", userId).gte("data_despesa", inicioISO).lte("data_despesa", fimISO),
        supabase.from("jornadas").select("*").eq("profile_id", userId).gte("data_jornada", inicioISO).lte("data_jornada", fimISO),
        supabase.from("abastecimentos").select("*").eq("profile_id", userId).order("data_abastecimento", { ascending: false }).limit(30),
        supabase.from("manutencoes").select("*").eq("profile_id", userId),
        supabase.from("ipva_aliquotas").select("*"),
        supabase.from("plataformas").select("*").eq("profile_id", userId),
      ]);
      return {
        despesas: (dRes.data ?? []) as Despesa[],
        jornadas: (jRes.data ?? []) as Jornada[],
        abastecimentos: (aRes.data ?? []) as Abastecimento[],
        manutencoes: (mRes.data ?? []) as Manutencao[],
        aliquotasIpva: (iRes.data ?? []) as IpvaAliquota[],
        plataformas: (pRes.data ?? []) as Plataforma[],
      };
    },
    enabled: !!userId,
    staleTime: 30000,
  });

  // Custos fixos mensais (calculados uma vez por mês)
  const custoFixoMensal = useMemo(() => {
    if (!suplemento.data) return null;
    const jornadasMes = suplemento.data.jornadas;
    const diasTrabalhadosMes = new Set(jornadasMes.map((j) => j.data_jornada)).size;
    const kmMes = jornadasMes.reduce((s, j) => s + (Number(j.km_percorrido) || 0), 0);
    return despesaFixaEngine.calcular({
      perfil,
      veiculo,
      manutencoes: suplemento.data.manutencoes,
      aliquotasIpva: suplemento.data.aliquotasIpva,
      diasTrabalhadosMes,
      totalJornadasMes: jornadasMes.length,
      kmMediaDiaria: diasTrabalhadosMes > 0 ? kmMes / diasTrabalhadosMes : 0,
      diasFolgaSemana: perfil?.dias_folga_semana ?? 2,
    });
  }, [suplemento.data, perfil, veiculo]);


  const total = (list.data ?? []).reduce((s, g) => s + (Number(g.valor) || 0), 0);
  const corridas = (list.data ?? []).reduce((s, g) => s + (Number(g.corridas) || 0), 0);

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

  const removerGanho = (g: Ganho, ganhosDia: Ganho[]) => {
    const isUltimo = ganhosDia.length === 1;
    showModal({
      type: "confirm",
      title: "Remover ganho?",
      message: isUltimo
        ? "Isso também removerá a jornada do dia e os abastecimentos registrados nessa data."
        : "Isso também removerá os abastecimentos registrados nessa data.",
      confirmLabel: "Remover",
      cancelLabel: "Cancelar",
      onConfirm: async () => {
        hideModal();
        try {
          await remove.mutateAsync(g.id);
          // Remove sempre os abastecimentos daquela data
          if (userId) {
            await abastecimentosService.removeByDate(userId, g.data_ganho);
            queryClient.invalidateQueries({ queryKey: ["abastecimentos"] });
          }
          if (isUltimo) {
            const jornadaDoDia = suplemento.data?.jornadas.find(
              (j) => j.data_jornada === g.data_ganho,
            );
            if (jornadaDoDia) {
              await jornadaService.remove(jornadaDoDia.id);
              queryClient.invalidateQueries({ queryKey: ["jornadas"] });
              suplemento.refetch();
            }
          }
          showToast({ type: "success", message: "Ganho removido" });
        } catch {
          showToast({ type: "error", message: "Erro ao remover" });
        }
      },
      onCancel: hideModal,
    });
  };

  // Agrupa ganhos por data
  const ganhosPorData = new Map<string, Ganho[]>();
  for (const g of list.data ?? []) {
    const d = g.data_ganho;
    if (!ganhosPorData.has(d)) ganhosPorData.set(d, []);
    ganhosPorData.get(d)!.push(g);
  }
  const datasUnicas = Array.from(ganhosPorData.keys()).sort((a, b) => b.localeCompare(a));

  const editandoJornada = useMemo(
    () =>
      editandoData
        ? (suplemento.data?.jornadas.find((j) => j.data_jornada === editandoData) ?? null)
        : null,
    [editandoData, suplemento.data],
  );
  const ganhosDoDiaEditando = editandoData ? (ganhosPorData.get(editandoData) ?? []) : [];

  const marcadoresGanhos = useMemo(() => {
    const datasComGanho = new Set((todosGanhos.data ?? []).map((g) => g.data_ganho));
    const hoje = dateEngine.hoje();
    const hojeISO = dateEngine.formatarISO(hoje);
    const resultado: { iso: string; cor: string }[] = [];
    for (let i = 1; i <= 60; i++) {
      const d = dateEngine.somarDias(hoje, -i);
      const iso = dateEngine.formatarISO(d);
      if (iso > hojeISO) continue;
      resultado.push({ iso, cor: datasComGanho.has(iso) ? theme.colors.success : "#EF4444" });
    }
    for (const iso of datasComGanho) {
      if (!resultado.find((m) => m.iso === iso)) {
        resultado.push({ iso, cor: theme.colors.success });
      }
    }
    return resultado;
  }, [todosGanhos.data]);

  const datasOcupadasGanhos = useMemo(
    () =>
      [...new Set((todosGanhos.data ?? []).map((g) => g.data_ganho))]
        .filter((d) => d !== editandoData),
    [todosGanhos.data, editandoData],
  );

  const isSavingEdicao = remove.isPending || update.isPending || create.isPending;

  const handleSaveEdicao = async (payload: SavePayload) => {
    try {
      for (const id of payload.ganhoDeletes) {
        await remove.mutateAsync(id);
      }
      for (const g of payload.ganhoUpdates) {
        await update.mutateAsync({
          id: g.id,
          patch: { data_ganho: g.data_ganho, plataforma_id: g.plataforma_id, valor: g.valor, corridas: g.corridas },
        });
      }
      for (const g of payload.ganhoCreates) {
        await create.mutateAsync({
          jornada_id: g.jornada_id,
          plataforma_id: g.plataforma_id,
          data_ganho: g.data_ganho,
          valor: g.valor,
          corridas: g.corridas,
        });
      }
      if (payload.jornadaPatch && editandoJornada) {
        await jornadaService.update(editandoJornada.id, {
          data_jornada: payload.novaDataISO,
          ...payload.jornadaPatch,
        });
        queryClient.invalidateQueries({ queryKey: ["jornadas"] });
        suplemento.refetch();
      }
      showToast({ type: "success", message: "Dia atualizado" });
      setEditandoData(null);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Tente novamente";
      showToast({ type: "error", message: msg });
    }
  };

  // Calcula breakdown para um dia
  function calcDia(dataISO: string, ganhosBruto: number, corridasDia: number) {
    const s = suplemento.data;

    // Despesas do dia (limpeza, alimentação, etc.)
    const despDia = s?.despesas.filter((d) => d.data_despesa === dataISO) ?? [];
    const totalDesp = despDia.reduce((acc, d) => acc + (Number(d.valor) || 0), 0);

    // Combustível estimado (vai na seção "Ganho Líquido")
    const jornadasDia = s?.jornadas.filter((j) => j.data_jornada === dataISO) ?? [];
    const kmDia = jornadasDia.reduce((acc, j) => acc + (Number(j.km_percorrido) || 0), 0);
    const custoComb = combustivelEngine.custoEstimado({
      km: kmDia,
      veiculo,
      abastecimentos: s?.abastecimentos ?? [],
    });

    // Ganho Líquido = bruto - despesas - combustível
    const ganhoLiquido = ganhosBruto - totalDesp - custoComb;

    // Custos fixos (vai na seção "Ganho Líquido Real")
    const itensAtivos = custoFixoMensal?.itens.filter((i) => i.ativo) ?? [];
    const custoFixoDia = custoFixoMensal?.custoDiario ?? 0;

    // Ganho Líquido Real = ganho líquido - custos fixos
    const ganhoLiquidoReal = ganhoLiquido - custoFixoDia;

    // Helper para % em relação ao bruto
    const pct = (v: number) => ganhosBruto > 0 ? (v / ganhosBruto) * 100 : 0;

    // ── Minhas Médias ────────────────────────────────────────────
    // Para jornadas manuais, tempo_total_minutos pode ser null → usa horas+minutos declarados
    const horasTotais = jornadasDia.reduce((acc, j) => {
      const mins = Number(j.tempo_total_minutos) > 0
        ? Number(j.tempo_total_minutos)
        : (Number(j.horas) * 60 + Number(j.minutos));
      return acc + mins;
    }, 0) / 60;
    // Para efetivas: usa tempo_efetivo_minutos, fallback para total
    const horasEfetivas = jornadasDia.reduce((acc, j) => {
      const ef = Number(j.tempo_efetivo_minutos);
      const tot = Number(j.tempo_total_minutos) > 0
        ? Number(j.tempo_total_minutos)
        : (Number(j.horas) * 60 + Number(j.minutos));
      return acc + (ef > 0 ? ef : tot);
    }, 0) / 60;
    // km real: usa km_percorrido_real se disponível, senão km_percorrido declarado
    const kmReal = jornadasDia.reduce((acc, j) => {
      const real = Number(j.km_percorrido_real);
      return acc + (real > 0 ? real : Number(j.km_percorrido) || 0);
    }, 0);

    const corridasPorHora = horasTotais > 0 ? corridasDia / horasTotais : 0;
    const ganhoPorCorrida = corridasDia > 0 ? ganhosBruto / corridasDia : 0;
    const ganhoPorKm = kmDia > 0 ? ganhosBruto / kmDia : 0;
    const ganhoPorHora = horasTotais > 0 ? ganhosBruto / horasTotais : 0;
    const ganhoPorKmReal = kmReal > 0 ? ganhoLiquidoReal / kmReal : 0;
    const ganhoPorHoraReal = horasEfetivas > 0 ? ganhoLiquidoReal / horasEfetivas : 0;

    return {
      despDia, totalDesp, ganhoLiquido, kmDia, custoComb,
      itensAtivos, custoFixoDia, ganhoLiquidoReal, pct,
      corridasPorHora, ganhoPorCorrida, ganhoPorKm, ganhoPorHora,
      ganhoPorKmReal, ganhoPorHoraReal, horasTotais, horasEfetivas, kmReal,
    };
  }

  return (
    <View style={{ flex: 1 }}>
      <AppHeader title="Meus Ganhos" subtitle="Histórico mensal" onMenuPress={openDrawer} />
      <View style={styles.mesRow}>
        <Pressable onPress={irPrev} hitSlop={10} disabled={isAtMin}>
          <Ionicons name="chevron-back" size={20} color={isAtMin ? theme.colors.border : theme.colors.text} />
        </Pressable>
        <Text style={styles.mesTxt}>{dateEngine.formatarMesAno(mes)}</Text>
        <Pressable onPress={irNext} hitSlop={10} disabled={isFuturo}>
          <Ionicons name="chevron-forward" size={20} color={isFuturo ? theme.colors.border : theme.colors.text} />
        </Pressable>
      </View>
      <View style={styles.totRow}>
        <View style={styles.totCard}>
          <Text style={styles.totLab}>Total do mês</Text>
          <Text style={styles.totVal}>{currencyEngine.formatar(total)}</Text>
        </View>
        <View style={styles.totCard}>
          <Text style={styles.totLab}>Corridas</Text>
          <Text style={styles.totVal}>{corridas}</Text>
        </View>
      </View>

      {list.isLoading ? (
        <View style={{ padding: 40 }}><ActivityIndicator color={theme.colors.primary} /></View>
      ) : datasUnicas.length === 0 ? (
        <AppCard style={{ margin: 14 }}>
          <EmptyState icon="cash" titulo="Sem ganhos no mês" mensagem="Toque no botão + para registrar." />
        </AppCard>
      ) : (
        <FlatList
          data={datasUnicas}
          keyExtractor={(d) => d}
          contentContainerStyle={{ padding: 14, paddingBottom: insets.bottom + 100 }}
          ListFooterComponent={<AppFooter />}
          renderItem={({ item: dataISO }) => {
            const ganhosDia = ganhosPorData.get(dataISO) ?? [];
            const totalDia = ganhosDia.reduce((s, g) => s + (Number(g.valor) || 0), 0);
            const corridasDia = ganhosDia.reduce((s, g) => s + (Number(g.corridas) || 0), 0);
            const isOpen = expandido === dataISO;
            const bd = isOpen ? calcDia(dataISO, totalDia, corridasDia) : null;

            return (
              <AppCard style={{ marginBottom: 10 }}>
                {/* Linha principal */}
                <Pressable onPress={() => setExpandido(isOpen ? null : dataISO)} style={styles.dayRow}>
                  <View style={styles.icon}>
                    <Ionicons name="trending-up" size={18} color={theme.colors.success} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.tit}>{dateEngine.formatarBR(dataISO)}</Text>
                    <Text style={styles.sub}>
                      {corridasDia} corridas · {ganhosDia.length} plataforma{ganhosDia.length > 1 ? "s" : ""}
                    </Text>
                  </View>
                  <Text style={styles.val}>{currencyEngine.formatar(totalDia)}</Text>
                  <Ionicons
                    name={isOpen ? "chevron-up" : "chevron-down"}
                    size={16}
                    color={theme.colors.textMuted}
                    style={{ marginLeft: 8 }}
                  />
                </Pressable>

                {/* Expansão */}
                {isOpen && bd ? (
                  <View style={styles.expandBox}>
                    {/* ── Ganhos por plataforma ── */}
                    {ganhosDia.map((g) => {
                      const platNome = g.plataforma_id
                        ? (plataformasQuery.data?.find((p) => p.id === g.plataforma_id)?.nome ?? "Outros")
                        : "Particular";
                      return (
                      <View key={g.id} style={styles.platRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.platNome}>{platNome}</Text>
                          <Text style={styles.platSub}>{Number(g.corridas) || 0} corridas</Text>
                        </View>
                        <Text style={styles.platVal}>{currencyEngine.formatar(Number(g.valor))}</Text>
                        <Pressable onPress={() => setEditandoData(dataISO)} hitSlop={8} style={styles.editBtn}>
                          <Ionicons name="create-outline" size={16} color={theme.colors.primary} />
                        </Pressable>
                        <Pressable onPress={() => removerGanho(g, ganhosDia)} hitSlop={8} style={styles.editBtn}>
                          <Ionicons name="trash-outline" size={16} color={theme.colors.danger} />
                        </Pressable>
                      </View>
                      );
                    })}

                    {/* ── Ganho Líquido ── */}
                    <View style={styles.secDivider} />
                    <View style={styles.secHeader}>
                      <Ionicons name="wallet-outline" size={13} color={theme.colors.primary} />
                      <Text style={styles.secTit}>Ganho Líquido</Text>
                    </View>

                    <BRow label="Ganho bruto" valor={totalDia} />
                    {bd.despDia.length > 0 ? (
                      bd.despDia.map((d) => (
                        <BRow
                          key={d.id}
                          label={nomeDespesa(d)}
                          valor={d.valor}
                          negativo
                          pct={bd.pct(d.valor)}
                        />
                      ))
                    ) : (
                      <Text style={styles.semDesp}>Sem despesas registradas no dia</Text>
                    )}
                    <BRow
                      label={`Combustível est.${bd.kmDia > 0 ? ` (${bd.kmDia.toFixed(0)} km)` : ""}`}
                      valor={bd.custoComb}
                      negativo
                      pct={bd.pct(bd.custoComb)}
                    />
                    <View style={styles.totalLine} />
                    <BRow label="= Ganho líquido" valor={bd.ganhoLiquido} destaque />

                    {/* ── Ganho Líquido Real + Minhas Médias (PRO) ── */}
                    <View style={styles.secDivider} />
                    {assinante ? (
                      <>
                        {/* Ganho Líquido Real */}
                        <View style={styles.secHeader}>
                          <Ionicons name="calculator-outline" size={13} color={theme.colors.accent} />
                          <Text style={[styles.secTit, { color: theme.colors.accent }]}>Ganho Real</Text>
                        </View>

                        <BRow label="Ganho líquido" valor={bd.ganhoLiquido} />

                        {bd.itensAtivos.length > 0 ? (
                          <>
                            <View style={[styles.platRow, { marginTop: 2, alignItems: "center" }]}>
                              <Text style={[bStyles.lbl, { flex: 1 }]}>Custos fixos</Text>
                              <Text style={bStyles.pctTxt}>{bd.pct(bd.custoFixoDia).toFixed(1)}%</Text>
                              <View style={{ width: 6 }} />
                              <Text style={[bStyles.val, { color: theme.colors.danger }]}>
                                - {currencyEngine.formatar(bd.custoFixoDia)}
                              </Text>
                            </View>
                            {bd.itensAtivos.map((item) => (
                              <BRow
                                key={item.tipo}
                                label={item.descricao}
                                valor={item.valorDiario}
                                negativo
                                indent
                                pct={bd.pct(item.valorDiario)}
                              />
                            ))}
                          </>
                        ) : (
                          <Text style={styles.semDesp}>Sem custos fixos configurados</Text>
                        )}

                        <View style={styles.totalLine} />
                        <BRow label="= Ganho líquido real" valor={bd.ganhoLiquidoReal} destaque />

                        {/* Minhas Médias */}
                        <View style={styles.secDivider} />
                        <View style={styles.secHeader}>
                          <Ionicons name="stats-chart-outline" size={13} color={theme.colors.warning} />
                          <Text style={[styles.secTit, { color: theme.colors.warning }]}>Minhas Médias</Text>
                        </View>

                        <View style={bStyles.row}>
                          <Text style={bStyles.lbl}>Corridas / hora</Text>
                          <Text style={styles.mediaDestaque}>
                            {bd.corridasPorHora > 0 ? bd.corridasPorHora.toFixed(1) : "—"}
                          </Text>
                        </View>

                        <MRow label="Ganho / corrida"  val={bd.ganhoPorCorrida}  empty={corridasDia === 0} />
                        <MRow label="Ganho / km"        val={bd.ganhoPorKm}        empty={bd.kmDia === 0} sufixo="/km" />
                        <MRow label="Ganho / hora"      val={bd.ganhoPorHora}      empty={bd.horasTotais === 0} sufixo="/h" />
                        <MRow label="Ganho / km real"   val={bd.ganhoPorKmReal}    empty={bd.kmReal === 0} sufixo="/km" />
                        <MRow label="Ganho / hora real" val={bd.ganhoPorHoraReal}  empty={bd.horasEfetivas === 0} sufixo="/h" />
                      </>
                    ) : (
                      /* Banner PRO para não-assinantes */
                      <Pressable style={styles.proBanner} onPress={() => router.push("/(private)/planos")}>
                        <View style={styles.proBannerLeft}>
                          <Ionicons name="lock-closed" size={16} color={theme.colors.primary} />
                          <View style={{ marginLeft: 10 }}>
                            <Text style={styles.proBannerTit}>Ganho Líquido Real + Médias</Text>
                            <Text style={styles.proBannerSub}>Disponível no plano PRO</Text>
                          </View>
                        </View>
                        <View style={styles.proBadge}>
                          <Text style={styles.proBadgeTxt}>PRO</Text>
                        </View>
                      </Pressable>
                    )}

                    {/* ── Link compartilhar ── */}
                    <Pressable
                      onPress={() => router.push({ pathname: "/(private)/compartilhar", params: { data: dataISO } })}
                      hitSlop={8}
                      style={styles.shareLink}
                    >
                      <Ionicons name="share-social-outline" size={13} color={theme.colors.primary} />
                      <Text style={styles.shareLinkTxt}>Ver card para compartilhar</Text>
                    </Pressable>
                  </View>
                ) : null}
              </AppCard>
            );
          }}
        />
      )}
      <FloatingButton icon="play-circle" onPress={() => router.push("/(private)/registrar-jornada")} />

      <EditarDiaModal
        visible={!!editandoData}
        onClose={() => setEditandoData(null)}
        dataISO={editandoData ?? ""}
        jornada={editandoJornada}
        ganhosDia={ganhosDoDiaEditando}
        datasOcupadas={datasOcupadasGanhos}
        marcadores={marcadoresGanhos}
        plataformas={plataformasQuery.data ?? []}
        onSave={handleSaveEdicao}
        isSaving={isSavingEdicao}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  mesRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 22,
    paddingVertical: 12,
  },
  mesTxt: { ...theme.font.semibold, fontSize: 15, color: theme.colors.text },
  totRow: { flexDirection: "row", paddingHorizontal: 14, gap: 10 },
  totCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: theme.radius.md,
    padding: 12,
    ...theme.shadow.soft,
  },
  totLab: { fontSize: 13, color: theme.colors.textMuted, ...theme.font.medium },
  totVal: { fontSize: 20, color: theme.colors.text, ...theme.font.bold, marginTop: 4 },
  dayRow: { flexDirection: "row", alignItems: "center" },
  icon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: theme.colors.success + "1A",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  tit: { ...theme.font.semibold, fontSize: 15, color: theme.colors.text },
  sub: { ...theme.font.regular, fontSize: 13, color: theme.colors.textMuted, marginTop: 2 },
  val: { ...theme.font.bold, fontSize: 16, color: theme.colors.success },
  expandBox: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.divider,
    paddingTop: 10,
  },
  platRow: { flexDirection: "row", alignItems: "center", paddingVertical: 5 },
  platNome: { ...theme.font.semibold, fontSize: 14, color: theme.colors.text },
  platSub: { ...theme.font.regular, fontSize: 13, color: theme.colors.textMuted, marginTop: 2 },
  platVal: { ...theme.font.bold, fontSize: 14, color: theme.colors.success, marginRight: 8 },
  editBtn: { padding: 4, marginLeft: 4 },
  secDivider: {
    height: 1,
    backgroundColor: theme.colors.divider,
    marginVertical: 10,
  },
  secHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  secTit: {
    ...theme.font.semibold,
    fontSize: 13,
    color: theme.colors.primary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  totalLine: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.divider,
    borderStyle: "dashed",
    marginVertical: 4,
  },
  semDesp: {
    fontSize: 13,
    color: theme.colors.textMuted,
    ...theme.font.regular,
    fontStyle: "italic",
    paddingVertical: 2,
  },
  mediaDestaque: {
    ...theme.font.bold,
    fontSize: 16,
    color: theme.colors.primary,
  },
  proBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: theme.colors.primary + "10",
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.primary + "30",
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginTop: 4,
  },
  proBannerLeft: { flexDirection: "row", alignItems: "center", flex: 1 },
  proBannerTit: { ...theme.font.semibold, fontSize: 14, color: theme.colors.text },
  proBannerSub: { ...theme.font.regular, fontSize: 13, color: theme.colors.textMuted, marginTop: 1 },
  proBadge: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  proBadgeTxt: { ...theme.font.bold, fontSize: 12, color: "#fff", letterSpacing: 0.5 },
  shareLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    alignSelf: "flex-end",
    marginTop: 12,
    paddingVertical: 2,
  },
  shareLinkTxt: {
    ...theme.font.medium,
    fontSize: 12,
    color: theme.colors.primary,
  },
  row2: { flexDirection: "row" },
  calLabel: { ...theme.font.medium, fontSize: 13, color: theme.colors.text, marginBottom: 6 },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", padding: 16 },
  modalCard: {
    backgroundColor: "#fff",
    borderRadius: theme.radius.lg,
    padding: 16,
    ...theme.shadow.soft,
    maxHeight: "92%",
  },
  modalHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  modalTit: { ...theme.font.bold, fontSize: 16, color: theme.colors.text },
});
