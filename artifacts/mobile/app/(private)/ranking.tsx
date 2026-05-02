import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { theme } from "@/lib/theme";
import { useUI } from "@/hooks/UIContext";
import { useAuth } from "@/hooks/AuthContext";
import { useRanking } from "@/hooks/useRanking";
import { rankingEngine, periodoParaDatas, type CampoRanking, type RankingPeriodo } from "@/engines/ranking-engine";
import { currencyEngine } from "@/engines/currency-engine";
import { dateEngine } from "@/engines/date-engine";
import { CATEGORIAS_VEICULO, TIPOS_PROPRIEDADE, TIPOS_TRACAO, UFS } from "@/lib/constants";
import { AppHeader } from "@/components/ui/AppHeader";
import { AppCard } from "@/components/ui/AppCard";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { EmptyState } from "@/components/ui/EmptyState";
import { AppFooter } from "@/components/ui/AppFooter";

const CAMPOS: { id: CampoRanking; nome: string; lab: string }[] = [
  { id: "ganho_liquido", nome: "Ganho líquido", lab: "Líquido" },
  { id: "ganho_bruto",   nome: "Ganho bruto",   lab: "Bruto"   },
  { id: "ganho_por_hora", nome: "R$ por hora",  lab: "R$/h"    },
  { id: "ganho_por_km",  nome: "R$ por km",     lab: "R$/km"   },
];

const PERIODOS: { id: RankingPeriodo; label: string }[] = [
  { id: "dia",    label: "Dia"    },
  { id: "semana", label: "Semana" },
  { id: "mes",    label: "Mês"    },
  { id: "ano",    label: "Ano"    },
  { id: "todos",  label: "Tudo"   },
];

type ChipKey = "metrica" | "uf" | "categoria" | "tracao" | "propriedade";
type RankingItem = ReturnType<typeof rankingEngine.filtrar>[number];

// Formato compacto sem "R$" para células estreitas
function fmtStat(v: number): string {
  const abs = Math.abs(v);
  const sign = v < 0 ? "-" : "";
  if (abs >= 10000) return `${sign}${(abs / 1000).toFixed(1)}k`;
  if (abs >= 1000)  return `${sign}${(abs / 1000).toFixed(2)}k`;
  return currencyEngine.formatar(v).replace("R$ ", "").replace("R$", "");
}

// ─── Helpers de navegação de período ────────────────────────────────────────

function refInicial(filtro: RankingPeriodo): Date {
  const hoje = dateEngine.hoje();
  if (filtro === "mes") return new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  if (filtro === "ano") return new Date(hoje.getFullYear(), 0, 1);
  return hoje;
}

function navAnterior(filtro: RankingPeriodo, ref: Date): Date {
  if (filtro === "dia")    return dateEngine.somarDias(ref, -1);
  if (filtro === "semana") return dateEngine.somarDias(dateEngine.inicioSemana(ref), -7);
  if (filtro === "mes")    return new Date(ref.getFullYear(), ref.getMonth() - 1, 1);
  if (filtro === "ano")    return new Date(ref.getFullYear() - 1, 0, 1);
  return ref;
}

function navProximo(filtro: RankingPeriodo, ref: Date): Date {
  if (filtro === "dia")    return dateEngine.somarDias(ref, 1);
  if (filtro === "semana") return dateEngine.somarDias(dateEngine.inicioSemana(ref), 7);
  if (filtro === "mes")    return new Date(ref.getFullYear(), ref.getMonth() + 1, 1);
  if (filtro === "ano")    return new Date(ref.getFullYear() + 1, 0, 1);
  return ref;
}

function proximoBloqueado(filtro: RankingPeriodo, ref: Date): boolean {
  if (filtro === "todos") return true;
  const hoje = dateEngine.hoje();
  if (filtro === "dia")    return ref >= hoje;
  if (filtro === "semana") return dateEngine.inicioSemana(ref) >= dateEngine.inicioSemana(hoje);
  if (filtro === "mes")    return ref.getFullYear() >= hoje.getFullYear() && ref.getMonth() >= hoje.getMonth();
  if (filtro === "ano")    return ref.getFullYear() >= hoje.getFullYear();
  return false;
}

function labelPeriodo(filtro: RankingPeriodo, ref: Date): string {
  if (filtro === "todos")  return "Todos os registros";
  if (filtro === "dia")    return dateEngine.formatarBR(ref);
  if (filtro === "semana") {
    const ini = dateEngine.inicioSemana(ref);
    const fim = dateEngine.fimSemana(ref);
    return `${dateEngine.formatarBR(ini)} – ${dateEngine.formatarBR(fim)}`;
  }
  if (filtro === "mes")    return dateEngine.formatarMesAno(ref);
  if (filtro === "ano")    return String(ref.getFullYear());
  return "";
}

// ─── Card de ranking expandível ─────────────────────────────────────────────

function RankingCard({
  item,
  index,
  campo,
  proprio,
}: {
  item: RankingItem;
  index: number;
  campo: CampoRanking;
  proprio: boolean;
}) {
  const [aberto, setAberto] = useState(false);

  const campoAtual = CAMPOS.find((c) => c.id === campo)!;
  const ganhoBruto   = Number(item.ganho_bruto || 0);
  const ganhoLiquido = Number(item.ganho_liquido || 0);
  const horas        = Number(item.horas_trabalhadas || 0);
  const km           = Number(item.km_percorrido || 0);

  const valorPorHora = horas > 0 ? ganhoBruto / horas : 0;
  const valorPorKm   = km   > 0 ? ganhoBruto / km   : 0;

  const stats = [
    { lab: "Bruto",   val: ganhoBruto,   id: "ganho_bruto"    as CampoRanking, sub: null },
    { lab: "Líquido", val: ganhoLiquido, id: "ganho_liquido"  as CampoRanking, sub: null },
    { lab: "R$/hora", val: valorPorHora, id: "ganho_por_hora" as CampoRanking, sub: "bruto" },
    { lab: "R$/km",   val: valorPorKm,   id: "ganho_por_km"   as CampoRanking, sub: "bruto" },
  ];

  const valorPrincipal =
    campo === "ganho_por_hora" ? valorPorHora :
    campo === "ganho_por_km"   ? valorPorKm   :
    Number(item[campo] || 0);

  const tags = [
    item.categoria   ? CATEGORIAS_VEICULO.find((c) => c.id === item.categoria)?.nome ?? item.categoria : null,
    item.tipo_tracao ? TIPOS_TRACAO.find((t) => t.id === item.tipo_tracao)?.nome     ?? item.tipo_tracao : null,
  ].filter(Boolean) as string[];

  // Localização curta: só UF, sem cidade para não transbordar
  const locTxt = item.uf ? item.uf : (item.cidade ? item.cidade.slice(0, 12) : "—");

  // Período que este participante sincronizou
  const periodoTxt = item.periodo_inicio
    ? `${dateEngine.formatarBR(item.periodo_inicio)} – ${item.periodo_fim ? dateEngine.formatarBR(item.periodo_fim) : "?"}`
    : null;

  // Última atualização formatada como "dd/mm hh:mm"
  const atualizadoTxt = item.atualizado_em
    ? (() => {
        const d = new Date(item.atualizado_em);
        const dd = String(d.getDate()).padStart(2, "0");
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const hh = String(d.getHours()).padStart(2, "0");
        const min = String(d.getMinutes()).padStart(2, "0");
        return `${dd}/${mm} ${hh}:${min}`;
      })()
    : null;

  return (
    <Pressable
      onPress={() => setAberto((v) => !v)}
      style={[styles.cardWrap, proprio && styles.cardProprio]}
    >
      {/* ── Linha principal ── */}
      <View style={styles.cardMain}>
        <View style={[styles.pos, posStyle(index)]}>
          <Text style={[styles.posTxt, index < 3 && { color: "#fff" }]}>{index + 1}</Text>
        </View>

        {item.foto_url ? (
          <Image source={{ uri: item.foto_url }} style={styles.foto} />
        ) : (
          <View style={[styles.foto, styles.fotoVazia]}>
            <Ionicons name="person" size={16} color="#fff" />
          </View>
        )}

        <View style={styles.cardInfo}>
          <Text style={styles.nome} numberOfLines={1}>
            {item.nome_publico ?? "Motorista anônimo"}
          </Text>
          <Text style={styles.locTxt} numberOfLines={1}>
            {locTxt}{tags.length > 0 ? " · " + tags[0] : ""}
          </Text>
        </View>

        <View style={styles.valorCol}>
          <Text
            style={[styles.valorPrincipal, campo === "ganho_liquido" && { color: "#16A34A" }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.65}
          >
            {currencyEngine.formatar(valorPrincipal)}
          </Text>
          <Text style={styles.valorLab} numberOfLines={1}>{campoAtual.lab}</Text>
        </View>

        <Ionicons
          name={aberto ? "chevron-up" : "chevron-down"}
          size={14}
          color={theme.colors.textMuted}
          style={{ marginLeft: 2 }}
        />
      </View>

      {/* ── Painel expandido ── */}
      {aberto && (
        <View style={styles.expandPanel}>
          {(periodoTxt || atualizadoTxt) && (
            <View style={styles.metaRow}>
              {periodoTxt
                ? <Text style={styles.metaTxt} numberOfLines={1}>📅 {periodoTxt}</Text>
                : <View />}
              {atualizadoTxt
                ? <Text style={styles.metaTxtRight} numberOfLines={1}>🕐 {atualizadoTxt}</Text>
                : null}
            </View>
          )}
          <View style={styles.statsGrid}>
            {stats.map((s) => (
              <View key={s.id} style={[styles.statCell, s.id === campo && styles.statCellAtivo]}>
                <Text style={styles.statLab}>{s.lab}</Text>
                <Text style={styles.statPrefix}>R$</Text>
                <Text
                  style={[styles.statVal, s.id === campo && styles.statValAtivo]}
                  numberOfLines={1}
                >
                  {fmtStat(s.val)}
                </Text>
                {s.sub && <Text style={styles.statSub}>{s.sub}</Text>}
              </View>
            ))}
          </View>
        </View>
      )}
    </Pressable>
  );
}

// ─── Tela principal ──────────────────────────────────────────────────────────

export default function RankingScreen() {
  const insets = useSafeAreaInsets();
  const { openDrawer, showToast } = useUI();
  const { perfil } = useAuth();
  const { list, sincronizar } = useRanking();

  // Filtros de categoria/uf/etc
  const [campo, setCampo]         = useState<CampoRanking>("ganho_liquido");
  const [uf, setUf]               = useState<string | null>(null);
  const [categoria, setCategoria] = useState<string | null>(null);
  const [tracao, setTracao]       = useState<string | null>(null);
  const [propriedade, setPropriedade] = useState<string | null>(null);
  const [chipOpen, setChipOpen]   = useState<ChipKey | null>(null);

  // Filtro de período
  const [filtro, setFiltro]   = useState<RankingPeriodo>("mes");
  const [refDate, setRefDate] = useState<Date>(() => refInicial("mes"));

  // Lista filtrada por período + categorias + ordenada
  const filtrados = useMemo(() => {
    let base = list.data ?? [];

    // Filtrar por período: só mostra quem sincronizou neste período
    // Usa data local (não UTC) para evitar problema de fuso horário
    if (filtro !== "todos") {
      const { inicio } = periodoParaDatas(filtro, refDate);
      const d = inicio;
      const inicioISO = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      base = base.filter((r) => r.periodo_inicio === inicioISO);
    }

    base = rankingEngine.filtrar(base, {
      uf, categoria, tipo_tracao: tracao, tipo_propriedade: propriedade,
    });
    return rankingEngine.ordenar(base, campo);
  }, [list.data, filtro, refDate, uf, categoria, tracao, propriedade, campo]);

  const minhaPosicao = perfil ? filtrados.findIndex((r) => r.profile_id === perfil.id) : -1;

  const sincronizarAgora = async () => {
    try {
      await sincronizar.mutateAsync({ filtro, refDate });
      showToast({ type: "success", message: "Ranking atualizado" });
    } catch (e: any) {
      const msg =
        e?.message ??
        (typeof e === "string" ? e : JSON.stringify(e ?? "erro desconhecido"));
      const hint = e?.details ? ` (${e.details})` : e?.hint ? ` (${e.hint})` : "";
      console.error("[Ranking] erro ao sincronizar:", e);
      showToast({ type: "error", message: msg + hint });
    }
  };

  const fechar = () => setChipOpen(null);

  const opcoesChip = (key: ChipKey): { label: string; value: string }[] => {
    if (key === "metrica")     return CAMPOS.map((c) => ({ label: c.nome, value: c.id }));
    if (key === "uf")          return [{ label: "Todas", value: "" }, ...UFS.map((u) => ({ label: u, value: u }))];
    if (key === "categoria")   return [{ label: "Todas", value: "" }, ...CATEGORIAS_VEICULO.map((c) => ({ label: c.nome, value: c.id }))];
    if (key === "tracao")      return [{ label: "Todas", value: "" }, ...TIPOS_TRACAO.map((c) => ({ label: c.nome, value: c.id }))];
    return [{ label: "Todas", value: "" }, ...TIPOS_PROPRIEDADE.map((c) => ({ label: c.nome, value: c.id }))];
  };

  const valorAtual = (key: ChipKey): string | null => {
    if (key === "metrica")     return campo;
    if (key === "uf")          return uf;
    if (key === "categoria")   return categoria;
    if (key === "tracao")      return tracao;
    return propriedade;
  };

  const aplicarValor = (key: ChipKey, value: string) => {
    const v = value || null;
    if (key === "metrica")     setCampo((value as CampoRanking) || "ganho_liquido");
    else if (key === "uf")          setUf(v);
    else if (key === "categoria")   setCategoria(v);
    else if (key === "tracao")      setTracao(v);
    else if (key === "propriedade") setPropriedade(v);
    fechar();
  };

  const renderChip = (
    key: ChipKey,
    label: string,
    valorTxt: string,
    icone: keyof typeof Ionicons.glyphMap,
  ) => (
    <Pressable onPress={() => setChipOpen(key)} style={styles.chip} key={key}>
      <Ionicons name={icone} size={13} color={theme.colors.primary} />
      <Text style={styles.chipLab} numberOfLines={1}>
        {label}: <Text style={styles.chipVal}>{valorTxt}</Text>
      </Text>
    </Pressable>
  );

  return (
    <View style={{ flex: 1 }}>
      <AppHeader title="Ranking SOMA" subtitle="Compare-se com outros motoristas" onMenuPress={openDrawer} />
      <FlatList
        data={filtrados}
        keyExtractor={(item) => item.profile_id}
        contentContainerStyle={{ padding: 12, paddingBottom: insets.bottom + 24 }}
        ListHeaderComponent={
          <>
            {/* ── Filtros de categoria/métricas ── */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipsRow}
            >
              {renderChip("metrica", "Métrica", CAMPOS.find((c) => c.id === campo)?.nome ?? "—", "stats-chart")}
              {renderChip("uf", "UF", uf ?? "Todas", "map")}
              {renderChip("categoria", "Tipo", categoria ? CATEGORIAS_VEICULO.find((c) => c.id === categoria)?.nome ?? categoria : "Todas", "car")}
              {renderChip("tracao", "Tração", tracao ? TIPOS_TRACAO.find((c) => c.id === tracao)?.nome ?? tracao : "Todas", "flash")}
              {renderChip("propriedade", "Propriedade", propriedade ? TIPOS_PROPRIEDADE.find((c) => c.id === propriedade)?.nome ?? propriedade : "Todas", "key")}
            </ScrollView>

            {/* ── Chips de período ── */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginBottom: 6 }}
              contentContainerStyle={{ paddingHorizontal: 2, gap: 8 }}
            >
              {PERIODOS.map((p) => (
                <Pressable
                  key={p.id}
                  onPress={() => {
                    setFiltro(p.id);
                    setRefDate(refInicial(p.id));
                  }}
                  style={[styles.pill, filtro === p.id && styles.pillAtivo]}
                >
                  <Text style={[styles.pillTxt, filtro === p.id && styles.pillTxtAtivo]}>
                    {p.label}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            {/* ── Navegação de período ── */}
            {filtro !== "todos" && (
              <View style={styles.navRow}>
                <Pressable
                  onPress={() => setRefDate(navAnterior(filtro, refDate))}
                  hitSlop={10}
                  style={styles.navBtn}
                >
                  <Ionicons name="chevron-back" size={20} color={theme.colors.text} />
                </Pressable>
                <Text style={styles.navLabel}>{labelPeriodo(filtro, refDate)}</Text>
                <Pressable
                  onPress={() => {
                    if (!proximoBloqueado(filtro, refDate)) setRefDate(navProximo(filtro, refDate));
                  }}
                  hitSlop={10}
                  disabled={proximoBloqueado(filtro, refDate)}
                  style={[styles.navBtn, proximoBloqueado(filtro, refDate) && { opacity: 0.3 }]}
                >
                  <Ionicons name="chevron-forward" size={20} color={theme.colors.text} />
                </Pressable>
              </View>
            )}

            {/* ── Card de atualização ── */}
            <AppCard style={{ marginBottom: 10, marginTop: 8 }}>
              <View style={styles.updateRow}>
                <View style={{ flex: 1 }}>
                  <PrimaryButton
                    label={
                      perfil?.participar_ranking_soma
                        ? `Atualizar minha posição`
                        : "Habilite a participação no Perfil"
                    }
                    icon="refresh"
                    onPress={sincronizarAgora}
                    loading={sincronizar.isPending}
                    fullWidth
                    disabled={!perfil?.participar_ranking_soma}
                  />
                </View>
                <Pressable
                  onPress={() => router.push({
                    pathname: "/(private)/compartilhar-ranking",
                    params: {
                      filtro:   filtro,
                      refDate:  refDate.toISOString(),
                      campo:    campo,
                      periodo:  labelPeriodo(filtro, refDate),
                    },
                  })}
                  style={({ pressed }) => [styles.shareBtn, pressed && { opacity: 0.6 }]}
                  hitSlop={8}
                >
                  <Ionicons name="share-social-outline" size={20} color={theme.colors.primary} />
                </Pressable>
              </View>
              {minhaPosicao >= 0 ? (
                <Text style={[styles.minha, { marginTop: 8 }]}>Sua posição atual: #{minhaPosicao + 1}</Text>
              ) : perfil?.participar_ranking_soma ? (
                <Text style={[styles.minha, { marginTop: 8 }]}>
                  Toque em atualizar para entrar na lista de {labelPeriodo(filtro, refDate)}.
                </Text>
              ) : null}
            </AppCard>
          </>
        }
        ListEmptyComponent={
          list.isLoading ? (
            <View style={{ padding: 40 }}>
              <ActivityIndicator color={theme.colors.primary} />
            </View>
          ) : (
            <AppCard>
              <EmptyState
                icon="trophy"
                titulo="Sem participantes neste período"
                mensagem={`Nenhum motorista sincronizou dados para ${labelPeriodo(filtro, refDate)}. Seja o primeiro!`}
              />
            </AppCard>
          )
        }
        ListFooterComponent={<AppFooter />}
        renderItem={({ item, index }) => (
          <RankingCard
            key={item.profile_id}
            item={item}
            index={index}
            campo={campo}
            proprio={perfil?.id === item.profile_id}
          />
        )}
      />

      {/* ── Modal de filtros ── */}
      <Modal visible={!!chipOpen} transparent animationType="fade" onRequestClose={fechar}>
        <Pressable onPress={fechar} style={styles.backdrop}>
          <Pressable style={styles.sheet} onPress={() => null}>
            <Text style={styles.sheetTit}>{chipOpen ? rotuloChip(chipOpen) : ""}</Text>
            <ScrollView style={{ maxHeight: 380 }}>
              {chipOpen
                ? opcoesChip(chipOpen).map((o) => {
                    const sel = (valorAtual(chipOpen) ?? "") === o.value;
                    return (
                      <Pressable
                        key={o.value || "todos"}
                        style={[styles.opc, sel && styles.opcSel]}
                        onPress={() => aplicarValor(chipOpen, o.value)}
                      >
                        <Text style={[styles.opcTxt, sel && styles.opcTxtSel]}>{o.label}</Text>
                        {sel ? <Ionicons name="checkmark" size={18} color={theme.colors.primary} /> : null}
                      </Pressable>
                    );
                  })
                : null}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function rotuloChip(k: ChipKey): string {
  if (k === "metrica")   return "Escolha a métrica";
  if (k === "uf")        return "Filtrar por UF";
  if (k === "categoria") return "Filtrar por categoria";
  if (k === "tracao")    return "Filtrar por tração";
  return "Filtrar por propriedade";
}

function posStyle(index: number) {
  if (index === 0) return { backgroundColor: "#F59E0B" };
  if (index === 1) return { backgroundColor: "#94A3B8" };
  if (index === 2) return { backgroundColor: "#B45309" };
  return { backgroundColor: theme.colors.surfaceMuted };
}

const styles = StyleSheet.create({
  // ── Filtros de categoria ──
  chipsRow: { paddingVertical: 6, paddingHorizontal: 2, gap: 6, marginBottom: 8 },
  chip: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "#fff", borderRadius: theme.radius.pill,
    paddingVertical: 7, paddingHorizontal: 11,
    ...theme.shadow.soft, borderWidth: 1, borderColor: theme.colors.border,
  },
  chipLab: { ...theme.font.medium, fontSize: 11, color: theme.colors.textMuted },
  chipVal: { color: theme.colors.text, ...theme.font.semibold },

  // ── Chips de período ──
  pill: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 20, borderWidth: 1.5, borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  pillAtivo: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  pillTxt:   { fontSize: 13, color: theme.colors.textMuted, ...theme.font.semibold },
  pillTxtAtivo: { color: "#fff" },

  // ── Navegação ──
  navRow: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4, paddingHorizontal: 2,
  },
  navBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: theme.colors.surface,
    borderWidth: 1, borderColor: theme.colors.border,
    justifyContent: "center", alignItems: "center",
  },
  navLabel: {
    flex: 1, textAlign: "center",
    ...theme.font.semibold, fontSize: 13, color: theme.colors.text,
  },

  minha: { textAlign: "center", ...theme.font.medium, fontSize: 12, color: theme.colors.textMuted },
  updateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  shareBtn: {
    width: 44,
    height: 44,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.primary + "15",
    alignItems: "center",
    justifyContent: "center",
  },

  // ── Card ──
  cardWrap: {
    backgroundColor: "#fff",
    borderRadius: theme.radius.md,
    marginBottom: 7,
    overflow: "hidden",
    ...theme.shadow.soft,
  },
  cardProprio: { borderWidth: 1.5, borderColor: theme.colors.primary },
  cardMain: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 10, paddingVertical: 10,
  },
  pos: {
    width: 28, height: 28, borderRadius: 14,
    justifyContent: "center", alignItems: "center",
    marginRight: 8, flexShrink: 0,
  },
  posTxt:  { ...theme.font.bold, fontSize: 12, color: theme.colors.text },
  foto:    { width: 38, height: 38, borderRadius: 19, flexShrink: 0 },
  fotoVazia: { backgroundColor: theme.colors.primary, justifyContent: "center", alignItems: "center" },
  cardInfo: { flex: 1, marginLeft: 9, minWidth: 0, overflow: "hidden" },
  nome:    { ...theme.font.semibold, fontSize: 13, color: theme.colors.text },
  locTxt:  { ...theme.font.regular, fontSize: 10, color: theme.colors.textMuted, marginTop: 1 },
  valorCol: { alignItems: "flex-end", marginLeft: 6, flexShrink: 0, width: 96 },
  valorPrincipal: { ...theme.font.bold, fontSize: 13, color: theme.colors.text, textAlign: "right", width: 96 },
  valorLab: { ...theme.font.regular, fontSize: 9, color: theme.colors.textMuted, marginTop: 1, textAlign: "right" },

  // ── Painel expandido ──
  expandPanel: {
    borderTopWidth: 1, borderTopColor: theme.colors.divider,
    paddingHorizontal: 10, paddingVertical: 10,
    backgroundColor: theme.colors.surfaceMuted,
  },
  metaRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    marginBottom: 8,
  },
  metaTxt: { fontSize: 10, color: theme.colors.textMuted, ...theme.font.medium, flex: 1 },
  metaTxtRight: { fontSize: 10, color: theme.colors.textMuted, ...theme.font.medium, textAlign: "right", flexShrink: 0, marginLeft: 8 },
  statsGrid: { flexDirection: "row", gap: 6 },
  statCell: {
    flex: 1, backgroundColor: "#fff",
    borderRadius: theme.radius.sm, padding: 8, alignItems: "center",
    borderWidth: 1, borderColor: "transparent",
  },
  statCellAtivo: { borderColor: theme.colors.primary, backgroundColor: theme.colors.primary + "0D" },
  statLab: {
    fontSize: 9, ...theme.font.medium,
    color: theme.colors.textMuted, textTransform: "uppercase", marginBottom: 1,
  },
  statPrefix: { fontSize: 8, ...theme.font.medium, color: theme.colors.textMuted },
  statVal: { fontSize: 13, ...theme.font.bold, color: theme.colors.text, textAlign: "center" },
  statValAtivo: { color: theme.colors.primaryDark },
  statSub: { fontSize: 8, ...theme.font.medium, color: theme.colors.textMuted, marginTop: 2, textTransform: "uppercase" },

  // ── Modal ──
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "center", padding: 20 },
  sheet: { backgroundColor: "#fff", borderRadius: theme.radius.lg, padding: 16, ...theme.shadow.soft },
  sheetTit: { ...theme.font.bold, fontSize: 15, color: theme.colors.text, marginBottom: 10 },
  opc: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingVertical: 12, paddingHorizontal: 8,
    borderBottomWidth: 1, borderBottomColor: theme.colors.divider,
  },
  opcSel:    { backgroundColor: theme.colors.primary + "0F" },
  opcTxt:    { ...theme.font.medium, fontSize: 14, color: theme.colors.text },
  opcTxtSel: { color: theme.colors.primaryDark, ...theme.font.semibold },
});
