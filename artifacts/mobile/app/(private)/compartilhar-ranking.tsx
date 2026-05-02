import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { theme } from "@/lib/theme";
import { currencyEngine } from "@/engines/currency-engine";
import {
  rankingEngine,
  periodoParaDatas,
  type CampoRanking,
  type RankingPeriodo,
} from "@/engines/ranking-engine";
import { rankingService } from "@/services/ranking-service";
import { dateEngine } from "@/engines/date-engine";
import { APP_FULL_NAME } from "@/lib/constants";
import {
  CATEGORIAS_VEICULO,
  TIPOS_PROPRIEDADE,
  TIPOS_TRACAO,
  UFS,
} from "@/lib/constants";
import type { RankingSoma } from "@/lib/types";

const W = Dimensions.get("window").width;
const POR_PAGINA = 20;

// ─── Tipos ────────────────────────────────────────────────────────────────────

type ChipKey = "metrica" | "uf" | "categoria" | "tracao" | "propriedade";

// ─── Constantes ───────────────────────────────────────────────────────────────

const CAMPOS: { id: CampoRanking; nome: string; lab: string }[] = [
  { id: "ganho_liquido",  nome: "Ganho Líquido", lab: "Líquido" },
  { id: "ganho_bruto",    nome: "Ganho Bruto",   lab: "Bruto"   },
  { id: "ganho_por_hora", nome: "R$ por hora",   lab: "R$/h"    },
  { id: "ganho_por_km",   nome: "R$ por km",     lab: "R$/km"   },
];

const PERIODOS: { id: RankingPeriodo; label: string }[] = [
  { id: "dia",    label: "Dia"    },
  { id: "semana", label: "Semana" },
  { id: "mes",    label: "Mês"    },
  { id: "ano",    label: "Ano"    },
  { id: "todos",  label: "Tudo"   },
];

// ─── Helpers de período ───────────────────────────────────────────────────────

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
  if (filtro === "mes") return dateEngine.formatarMesAno(ref);
  if (filtro === "ano") return String(ref.getFullYear());
  return "";
}

function isoLocal(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// ─── Helpers de valor ─────────────────────────────────────────────────────────

function calcValor(campo: CampoRanking, item: RankingSoma): number {
  if (campo === "ganho_por_hora") {
    const h = Number(item.horas_trabalhadas || 0);
    return h > 0 ? Number(item.ganho_bruto || 0) / h : 0;
  }
  if (campo === "ganho_por_km") {
    const k = Number(item.km_percorrido || 0);
    return k > 0 ? Number(item.ganho_bruto || 0) / k : 0;
  }
  return Number(item[campo] ?? 0);
}

function fmtValor(campo: CampoRanking, item: RankingSoma): string {
  const v = calcValor(campo, item);
  if (campo === "ganho_por_km") return `R$ ${v.toFixed(2).replace(".", ",")}`;
  return currencyEngine.formatar(v);
}

function medalColor(pos: number): string {
  if (pos === 1) return "#F59E0B";
  if (pos === 2) return "#94A3B8";
  if (pos === 3) return "#CD7F32";
  return "rgba(255,255,255,0.35)";
}

function rotuloChip(k: ChipKey): string {
  if (k === "metrica")   return "Escolha a métrica";
  if (k === "uf")        return "Filtrar por UF";
  if (k === "categoria") return "Filtrar por categoria";
  if (k === "tracao")    return "Filtrar por tração";
  return "Filtrar por propriedade";
}

// ─── Tela ─────────────────────────────────────────────────────────────────────

export default function CompartilharRankingScreen() {
  const insets = useSafeAreaInsets();

  const { filtro: fp, refDate: rdp, campo: cp } = useLocalSearchParams<{
    filtro: string; refDate: string; campo: string;
  }>();

  // ── Estado de filtros (inicializado pelos params da tela anterior) ──
  const [campo, setCampo]               = useState<CampoRanking>((cp ?? "ganho_liquido") as CampoRanking);
  const [filtro, setFiltro]             = useState<RankingPeriodo>((fp ?? "mes") as RankingPeriodo);
  const [refDate, setRefDate]           = useState<Date>(() => rdp ? new Date(rdp) : refInicial("mes"));
  const [uf, setUf]                     = useState<string | null>(null);
  const [categoria, setCategoria]       = useState<string | null>(null);
  const [tracao, setTracao]             = useState<string | null>(null);
  const [propriedade, setPropriedade]   = useState<string | null>(null);
  const [chipOpen, setChipOpen]         = useState<ChipKey | null>(null);
  const [pagina, setPagina]             = useState(1);

  const { data: todos, isLoading } = useQuery({
    queryKey: ["ranking"],
    queryFn:  () => rankingService.listAll(),
    staleTime: 60000,
  });

  // ── Lista filtrada e ordenada ──
  const ordenados = useMemo(() => {
    if (!todos) return [];
    let base = todos;

    if (filtro !== "todos") {
      const { inicio } = periodoParaDatas(filtro, refDate);
      base = base.filter((r) => r.periodo_inicio === isoLocal(inicio));
    }

    base = rankingEngine.filtrar(base, {
      uf, categoria, tipo_tracao: tracao, tipo_propriedade: propriedade,
    });

    if (campo === "ganho_por_hora") {
      return [...base].sort((a, b) => calcValor(campo, b) - calcValor(campo, a));
    }
    if (campo === "ganho_por_km") {
      return [...base].sort((a, b) => calcValor(campo, b) - calcValor(campo, a));
    }
    return rankingEngine.ordenar(base, campo);
  }, [todos, filtro, refDate, uf, categoria, tracao, propriedade, campo]);

  const totalPaginas = Math.max(1, Math.ceil(ordenados.length / POR_PAGINA));

  const paginados = useMemo(
    () => ordenados.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA),
    [ordenados, pagina],
  );

  // Reset paginação quando filtros mudam
  const mudarFiltro = (novo: RankingPeriodo) => {
    setFiltro(novo);
    setRefDate(refInicial(novo));
    setPagina(1);
  };

  const fechar = () => setChipOpen(null);

  const aplicarValor = (key: ChipKey, value: string) => {
    const v = value || null;
    if (key === "metrica")         setCampo((value as CampoRanking) || "ganho_liquido");
    else if (key === "uf")         setUf(v);
    else if (key === "categoria")  setCategoria(v);
    else if (key === "tracao")     setTracao(v);
    else if (key === "propriedade") setPropriedade(v);
    setPagina(1);
    fechar();
  };

  const opcoesChip = (key: ChipKey): { label: string; value: string }[] => {
    if (key === "metrica")   return CAMPOS.map((c) => ({ label: c.nome, value: c.id }));
    if (key === "uf")        return [{ label: "Todas", value: "" }, ...UFS.map((u) => ({ label: u, value: u }))];
    if (key === "categoria") return [{ label: "Todas", value: "" }, ...CATEGORIAS_VEICULO.map((c) => ({ label: c.nome, value: c.id }))];
    if (key === "tracao")    return [{ label: "Todas", value: "" }, ...TIPOS_TRACAO.map((c) => ({ label: c.nome, value: c.id }))];
    return [{ label: "Todas", value: "" }, ...TIPOS_PROPRIEDADE.map((c) => ({ label: c.nome, value: c.id }))];
  };

  const valorAtual = (key: ChipKey): string | null => {
    if (key === "metrica")   return campo;
    if (key === "uf")        return uf;
    if (key === "categoria") return categoria;
    if (key === "tracao")    return tracao;
    return propriedade;
  };

  const ativo = (key: ChipKey) => {
    if (key === "metrica") return false; // métrica sempre tem valor
    return valorAtual(key) !== null;
  };

  const renderChip = (
    key: ChipKey,
    label: string,
    valorTxt: string,
    icone: keyof typeof Ionicons.glyphMap,
  ) => {
    const isAtivo = ativo(key);
    return (
      <Pressable
        key={key}
        onPress={() => setChipOpen(key)}
        style={[s.chip, isAtivo && s.chipAtivo]}
      >
        <Ionicons name={icone} size={13} color={isAtivo ? "#fff" : theme.colors.primary} />
        <Text style={[s.chipLab, isAtivo && s.chipLabAtivo]} numberOfLines={1}>
          {label}:{" "}
          <Text style={[s.chipVal, isAtivo && s.chipValAtivo]}>{valorTxt}</Text>
        </Text>
      </Pressable>
    );
  };

  const periodoLabel = labelPeriodo(filtro, refDate);
  const campoLabel   = CAMPOS.find((c) => c.id === campo)?.nome ?? "Ganho Líquido";
  const bloqueado    = proximoBloqueado(filtro, refDate);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.surfaceMuted }}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 8,
          paddingHorizontal: 12,
          paddingBottom: insets.bottom + 40,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Voltar ── */}
        <Pressable
          onPress={() => router.back()}
          hitSlop={16}
          style={({ pressed }) => [s.backBtn, pressed && { opacity: 0.6 }]}
        >
          <Ionicons name="arrow-back" size={16} color={theme.colors.textMuted} />
          <Text style={s.backTxt}>Voltar</Text>
        </Pressable>

        {/* ── Chips de métrica/filtros ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.chipsRow}
        >
          {renderChip("metrica",     "Métrica",    CAMPOS.find((c) => c.id === campo)?.nome ?? "—",                                                        "stats-chart")}
          {renderChip("uf",          "UF",         uf ?? "Todas",                                                                                          "map")}
          {renderChip("categoria",   "Tipo",       categoria  ? CATEGORIAS_VEICULO.find((c) => c.id === categoria)?.nome  ?? categoria  : "Todas",         "car")}
          {renderChip("tracao",      "Tração",     tracao     ? TIPOS_TRACAO.find((c) => c.id === tracao)?.nome           ?? tracao     : "Todas",         "flash")}
          {renderChip("propriedade", "Propriedade",propriedade? TIPOS_PROPRIEDADE.find((c) => c.id === propriedade)?.nome ?? propriedade: "Todas",         "key")}
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
              onPress={() => mudarFiltro(p.id)}
              style={[s.pill, filtro === p.id && s.pillAtivo]}
            >
              <Text style={[s.pillTxt, filtro === p.id && s.pillTxtAtivo]}>
                {p.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* ── Navegação de período ── */}
        {filtro !== "todos" && (
          <View style={s.navRow}>
            <Pressable
              onPress={() => { setRefDate(navAnterior(filtro, refDate)); setPagina(1); }}
              hitSlop={10}
              style={s.navBtn}
            >
              <Ionicons name="chevron-back" size={20} color={theme.colors.text} />
            </Pressable>
            <Text style={s.navLabel}>{periodoLabel}</Text>
            <Pressable
              onPress={() => { if (!bloqueado) { setRefDate(navProximo(filtro, refDate)); setPagina(1); } }}
              hitSlop={10}
              disabled={bloqueado}
              style={[s.navBtn, bloqueado && { opacity: 0.3 }]}
            >
              <Ionicons name="chevron-forward" size={20} color={theme.colors.text} />
            </Pressable>
          </View>
        )}

        {/* ── Card do ranking ── */}
        <LinearGradient
          colors={[theme.colors.primaryDark, "#0a1628", "#0d1f3c"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={s.card}
        >
          {/* Header do card */}
          <View style={s.cardHeader}>
            <View style={s.cardHeaderLeft}>
              <Image
                source={require("@/assets/images/icon.png")}
                style={s.logo}
                resizeMode="cover"
              />
              <View>
                <Text style={s.brand}>SOMA</Text>
                <Text style={s.brandSub}>{APP_FULL_NAME}</Text>
              </View>
            </View>
            <View style={s.periodoTag}>
              <Text style={s.periodoTxt} numberOfLines={1}>{periodoLabel}</Text>
            </View>
          </View>

          {/* Título + métrica */}
          <View style={s.tituloRow}>
            <Ionicons name="trophy" size={16} color="#F59E0B" />
            <Text style={s.titulo}>Ranking</Text>
            <View style={s.campoTag}>
              <Text style={s.campoTagTxt}>{campoLabel}</Text>
            </View>
            <Text style={s.paginaInfo}>
              {pagina}/{totalPaginas}
            </Text>
          </View>

          <View style={s.divider} />

          {/* Lista */}
          {isLoading ? (
            <ActivityIndicator color={theme.colors.accentBright} style={{ marginVertical: 24 }} />
          ) : paginados.length === 0 ? (
            <Text style={s.vazio}>Nenhum participante neste período.</Text>
          ) : (
            paginados.map((item, idx) => {
              const pos = (pagina - 1) * POR_PAGINA + idx + 1;
              const cor = medalColor(pos);
              const isTop3 = pos <= 3;
              return (
                <View key={item.profile_id} style={[s.row, isTop3 && s.rowDestaque]}>
                  {/* Posição */}
                  <View style={[s.posBadge, { borderColor: isTop3 ? cor : "rgba(255,255,255,0.15)" }]}>
                    <Text style={[s.posNum, { color: isTop3 ? cor : "rgba(255,255,255,0.5)" }]}>
                      {pos <= 3 ? ["🥇","🥈","🥉"][pos - 1] : `${pos}º`}
                    </Text>
                  </View>

                  {/* Avatar */}
                  <View style={s.avatarWrap}>
                    {item.foto_url ? (
                      <Image source={{ uri: item.foto_url }} style={s.avatar} />
                    ) : (
                      <View style={s.avatarFallback}>
                        <Ionicons name="person" size={14} color={theme.colors.accentBright} />
                      </View>
                    )}
                  </View>

                  {/* Nome + cidade */}
                  <View style={s.nomeWrap}>
                    <Text style={s.nome} numberOfLines={1}>
                      {item.nome_publico || "Motorista"}
                    </Text>
                    {(item.cidade || item.uf) && (
                      <Text style={s.cidade} numberOfLines={1}>
                        {[item.cidade, item.uf].filter(Boolean).join("/")}
                      </Text>
                    )}
                  </View>

                  {/* Valor */}
                  <Text style={[s.valor, isTop3 && { color: cor }]} numberOfLines={1}>
                    {fmtValor(campo, item)}
                  </Text>
                </View>
              );
            })
          )}

          <View style={s.divider} />
          <View style={s.cardFooter}>
            <Text style={s.footerTxt}>soma.nexortec.com.br</Text>
          </View>
        </LinearGradient>

        {/* ── Paginação ── */}
        {totalPaginas > 1 && (
          <View style={s.paginacaoRow}>
            <Pressable
              onPress={() => setPagina((p) => Math.max(1, p - 1))}
              disabled={pagina === 1}
              style={[s.pageBtn, pagina === 1 && { opacity: 0.3 }]}
            >
              <Ionicons name="chevron-back" size={18} color={theme.colors.primary} />
              <Text style={s.pageBtnTxt}>Anterior</Text>
            </Pressable>

            <Text style={s.pageNumTxt}>
              Página {pagina} de {totalPaginas}
            </Text>

            <Pressable
              onPress={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
              disabled={pagina === totalPaginas}
              style={[s.pageBtn, pagina === totalPaginas && { opacity: 0.3 }]}
            >
              <Text style={s.pageBtnTxt}>Próxima</Text>
              <Ionicons name="chevron-forward" size={18} color={theme.colors.primary} />
            </Pressable>
          </View>
        )}

        <Text style={s.dica}>Tire um print para compartilhar 📲</Text>
      </ScrollView>

      {/* ── Modal de filtros ── */}
      <Modal visible={!!chipOpen} transparent animationType="fade" onRequestClose={fechar}>
        <Pressable onPress={fechar} style={s.backdrop}>
          <Pressable style={s.sheet} onPress={() => null}>
            <Text style={s.sheetTit}>{chipOpen ? rotuloChip(chipOpen) : ""}</Text>
            <ScrollView style={{ maxHeight: 380 }}>
              {chipOpen
                ? opcoesChip(chipOpen).map((o) => {
                    const sel = (valorAtual(chipOpen) ?? "") === o.value;
                    return (
                      <Pressable
                        key={o.value || "todos"}
                        style={[s.opc, sel && s.opcSel]}
                        onPress={() => aplicarValor(chipOpen, o.value)}
                      >
                        <Text style={[s.opcTxt, sel && s.opcTxtSel]}>{o.label}</Text>
                        {sel && <Ionicons name="checkmark" size={18} color={theme.colors.primary} />}
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

// ─── Estilos ──────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  backBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    marginBottom: 12, alignSelf: "flex-start",
  },
  backTxt: { ...theme.font.medium, fontSize: 14, color: theme.colors.textMuted },

  // ── Chips ──
  chipsRow: { paddingVertical: 6, paddingHorizontal: 2, gap: 6, marginBottom: 8 },
  chip: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "#fff", borderRadius: theme.radius.pill,
    paddingVertical: 7, paddingHorizontal: 11,
    ...theme.shadow.soft, borderWidth: 1, borderColor: theme.colors.border,
    maxWidth: 180,
  },
  chipAtivo: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  chipLab: { ...theme.font.medium, fontSize: 11, color: theme.colors.textMuted, flexShrink: 1 },
  chipLabAtivo: { color: "rgba(255,255,255,0.8)" },
  chipVal: { color: theme.colors.text, ...theme.font.semibold },
  chipValAtivo: { color: "#fff" },

  // ── Período ──
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
    marginBottom: 8, paddingHorizontal: 2,
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

  // ── Card gradient ──
  card: { borderRadius: 20, padding: 18, ...theme.shadow.soft, overflow: "hidden" },

  cardHeader: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between", marginBottom: 14,
  },
  cardHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  logo: { width: 36, height: 36, borderRadius: 8 },
  brand: { ...theme.font.bold, fontSize: 18, color: "#fff", letterSpacing: 2 },
  brandSub: { ...theme.font.regular, fontSize: 8, color: "rgba(255,255,255,0.45)", marginTop: 1 },
  periodoTag: {
    backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 4, maxWidth: 130, flexShrink: 1,
  },
  periodoTxt: { ...theme.font.semibold, fontSize: 10, color: theme.colors.accentBright },

  tituloRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  titulo: { ...theme.font.bold, fontSize: 16, color: "#fff" },
  campoTag: {
    backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 6,
    paddingHorizontal: 7, paddingVertical: 3, flex: 1,
  },
  campoTagTxt: { ...theme.font.medium, fontSize: 10, color: "rgba(255,255,255,0.7)" },
  paginaInfo: { ...theme.font.medium, fontSize: 10, color: "rgba(255,255,255,0.4)" },

  divider: {
    height: 1, backgroundColor: "rgba(255,255,255,0.1)", marginVertical: 10,
  },
  vazio: {
    ...theme.font.regular, fontSize: 13,
    color: "rgba(255,255,255,0.4)", textAlign: "center", marginVertical: 20,
  },

  // ── Linhas ──
  row: {
    flexDirection: "row", alignItems: "center", gap: 9,
    paddingVertical: 7, borderRadius: 10, paddingHorizontal: 4,
  },
  rowDestaque: { backgroundColor: "rgba(255,255,255,0.05)", marginBottom: 2 },
  posBadge: {
    width: 32, height: 32, borderRadius: 16,
    borderWidth: 1.5, alignItems: "center", justifyContent: "center",
  },
  posNum: { ...theme.font.bold, fontSize: 12, textAlign: "center" },
  avatarWrap: { width: 30, height: 30 },
  avatar: { width: 30, height: 30, borderRadius: 15 },
  avatarFallback: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center", justifyContent: "center",
  },
  nomeWrap: { flex: 1, minWidth: 0 },
  nome: { ...theme.font.semibold, fontSize: 13, color: "#fff" },
  cidade: { ...theme.font.regular, fontSize: 10, color: "rgba(255,255,255,0.45)", marginTop: 1 },
  valor: { ...theme.font.bold, fontSize: 12, color: theme.colors.accentBright, textAlign: "right" },

  cardFooter: { alignItems: "center" },
  footerTxt: { ...theme.font.regular, fontSize: 10, color: "rgba(255,255,255,0.2)", letterSpacing: 0.5 },

  // ── Paginação ──
  paginacaoRow: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between",
    marginTop: 14, paddingHorizontal: 4,
  },
  pageBtn: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingVertical: 8, paddingHorizontal: 12,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.sm,
    borderWidth: 1, borderColor: theme.colors.border,
  },
  pageBtnTxt: { ...theme.font.medium, fontSize: 13, color: theme.colors.primary },
  pageNumTxt: { ...theme.font.semibold, fontSize: 13, color: theme.colors.text },

  dica: {
    ...theme.font.regular, fontSize: 12,
    color: theme.colors.textSubtle, textAlign: "center", marginTop: 16,
  },

  // ── Modal ──
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "center", padding: 20 },
  sheet: {
    backgroundColor: "#fff", borderRadius: theme.radius.lg,
    padding: 16, ...theme.shadow.soft,
  },
  sheetTit: { ...theme.font.bold, fontSize: 15, color: theme.colors.text, marginBottom: 12 },
  opc: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingVertical: 12, paddingHorizontal: 4,
    borderBottomWidth: 1, borderBottomColor: theme.colors.border,
  },
  opcSel: { backgroundColor: theme.colors.primary + "10" },
  opcTxt: { ...theme.font.medium, fontSize: 14, color: theme.colors.text },
  opcTxtSel: { color: theme.colors.primary, ...theme.font.semibold },
});
