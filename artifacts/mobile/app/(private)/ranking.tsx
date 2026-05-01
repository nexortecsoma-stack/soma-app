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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { theme } from "@/lib/theme";
import { useUI } from "@/hooks/UIContext";
import { useAuth } from "@/hooks/AuthContext";
import { useRanking } from "@/hooks/useRanking";
import { rankingEngine, type CampoRanking } from "@/engines/ranking-engine";
import { currencyEngine } from "@/engines/currency-engine";
import { CATEGORIAS_VEICULO, TIPOS_PROPRIEDADE, TIPOS_TRACAO, UFS } from "@/lib/constants";
import { AppHeader } from "@/components/ui/AppHeader";
import { AppCard } from "@/components/ui/AppCard";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { EmptyState } from "@/components/ui/EmptyState";
import { AppFooter } from "@/components/ui/AppFooter";

const CAMPOS: { id: CampoRanking; nome: string; lab: string; sufixo: string }[] = [
  { id: "ganho_liquido", nome: "Ganho líquido", lab: "Líquido", sufixo: "" },
  { id: "ganho_bruto", nome: "Ganho bruto", lab: "Bruto", sufixo: "" },
  { id: "ganho_por_hora", nome: "R$ por hora", lab: "R$/h", sufixo: "/h" },
  { id: "ganho_por_km", nome: "R$ por km", lab: "R$/km", sufixo: "/km" },
];

type ChipKey = "metrica" | "uf" | "categoria" | "tracao" | "propriedade";

type RankingItem = ReturnType<typeof rankingEngine.filtrar>[number];

// ─── Card de ranking expandível ───────────────────────────────────────────────

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

  // Dados base
  const ganhoBruto = Number(item.ganho_bruto || 0);
  const ganhoLiquido = Number(item.ganho_liquido || 0);
  const horas = Number(item.horas_trabalhadas || 0);
  const km = Number(item.km_percorrido || 0);

  // R$/h e R$/km: se o campo armazenado for negativo (ganho líquido < 0),
  // recalcula usando o ganho bruto como base e indica "bruto" no rótulo
  const usandoBrutoHora = ganhoLiquido < 0 || Number(item.ganho_por_hora || 0) < 0;
  const usandoBrutoKm = ganhoLiquido < 0 || Number(item.ganho_por_km || 0) < 0;

  const valorPorHora = usandoBrutoHora
    ? (horas > 0 ? ganhoBruto / horas : 0)
    : Number(item.ganho_por_hora || 0);
  const valorPorKm = usandoBrutoKm
    ? (km > 0 ? ganhoBruto / km : 0)
    : Number(item.ganho_por_km || 0);

  const stats = [
    { lab: "Bruto", val: ganhoBruto, id: "ganho_bruto" as CampoRanking, sub: null },
    { lab: "Líquido", val: ganhoLiquido, id: "ganho_liquido" as CampoRanking, sub: null },
    { lab: "R$/hora", val: valorPorHora, id: "ganho_por_hora" as CampoRanking, sub: usandoBrutoHora ? "bruto" : null },
    { lab: "R$/km", val: valorPorKm, id: "ganho_por_km" as CampoRanking, sub: usandoBrutoKm ? "bruto" : null },
  ];

  // Valor exibido para a métrica principal (corrigido)
  const valorPrincipalBruto =
    campo === "ganho_por_hora" ? valorPorHora :
    campo === "ganho_por_km" ? valorPorKm :
    Number(item[campo] || 0);
  const valorPrincipal = valorPrincipalBruto;

  const tags = [
    item.categoria ? CATEGORIAS_VEICULO.find((c) => c.id === item.categoria)?.nome ?? item.categoria : null,
    item.tipo_tracao ? TIPOS_TRACAO.find((t) => t.id === item.tipo_tracao)?.nome ?? item.tipo_tracao : null,
  ].filter(Boolean) as string[];

  const locTxt = [item.cidade, item.uf].filter(Boolean).join("/") || "—";

  return (
    <Pressable
      onPress={() => setAberto((v) => !v)}
      style={[
        styles.cardWrap,
        proprio && styles.cardProprio,
      ]}
    >
      {/* ── Linha principal (sempre visível) ── */}
      <View style={styles.cardMain}>
        {/* Posição */}
        <View style={[styles.pos, posStyle(index)]}>
          <Text style={[styles.posTxt, index < 3 && { color: "#fff" }]}>{index + 1}</Text>
        </View>

        {/* Avatar */}
        {item.foto_url ? (
          <Image source={{ uri: item.foto_url }} style={styles.foto} />
        ) : (
          <View style={[styles.foto, styles.fotoVazia]}>
            <Ionicons name="person" size={16} color="#fff" />
          </View>
        )}

        {/* Nome + localidade + tags */}
        <View style={styles.cardInfo}>
          <Text style={styles.nome} numberOfLines={1}>
            {item.nome_publico ?? "Motorista anônimo"}
          </Text>
          <Text style={styles.locTxt} numberOfLines={1}>
            {locTxt}
            {tags.length > 0 ? "  ·  " + tags.join(" · ") : ""}
          </Text>
        </View>

        {/* Valor principal + chevron */}
        <View style={styles.valorCol}>
          <Text style={[styles.valorPrincipal, campo === "ganho_liquido" && { color: "#16A34A" }]} numberOfLines={1}>
            {currencyEngine.formatar(valorPrincipal)}
          </Text>
          <Text style={styles.valorLab}>{campoAtual.lab}</Text>
        </View>

        <Ionicons
          name={aberto ? "chevron-up" : "chevron-down"}
          size={14}
          color={theme.colors.textMuted}
          style={{ marginLeft: 4 }}
        />
      </View>

      {/* ── Painel expandido ── */}
      {aberto && (
        <View style={styles.expandPanel}>
          <View style={styles.statsGrid}>
            {stats.map((s) => (
              <View
                key={s.id}
                style={[styles.statCell, s.id === campo && styles.statCellAtivo]}
              >
                <Text style={styles.statLab}>{s.lab}</Text>
                <Text
                  style={[styles.statVal, s.id === campo && styles.statValAtivo]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.7}
                >
                  {currencyEngine.formatar(s.val)}
                </Text>
                {s.sub && (
                  <Text style={styles.statSub}>{s.sub}</Text>
                )}
              </View>
            ))}
          </View>
        </View>
      )}
    </Pressable>
  );
}

// ─── Tela principal ───────────────────────────────────────────────────────────

export default function RankingScreen() {
  const insets = useSafeAreaInsets();
  const { openDrawer, showToast } = useUI();
  const { perfil } = useAuth();
  const { list, sincronizar } = useRanking();

  const [campo, setCampo] = useState<CampoRanking>("ganho_liquido");
  const [uf, setUf] = useState<string | null>(null);
  const [categoria, setCategoria] = useState<string | null>(null);
  const [tracao, setTracao] = useState<string | null>(null);
  const [propriedade, setPropriedade] = useState<string | null>(null);
  const [chipOpen, setChipOpen] = useState<ChipKey | null>(null);

  const filtrados = useMemo(() => {
    const base = rankingEngine.filtrar(list.data ?? [], {
      uf, categoria, tipo_tracao: tracao, tipo_propriedade: propriedade,
    });
    return rankingEngine.ordenar(base, campo);
  }, [list.data, uf, categoria, tracao, propriedade, campo]);

  const minhaPosicao = perfil ? filtrados.findIndex((r) => r.profile_id === perfil.id) : -1;

  const sincronizarAgora = async () => {
    try {
      await sincronizar.mutateAsync();
      showToast({ type: "success", message: "Ranking atualizado" });
    } catch (e: any) {
      showToast({ type: "error", message: e?.message ?? "Não foi possível atualizar" });
    }
  };

  const fechar = () => setChipOpen(null);

  const opcoesChip = (key: ChipKey): { label: string; value: string }[] => {
    if (key === "metrica") return CAMPOS.map((c) => ({ label: c.nome, value: c.id }));
    if (key === "uf") return [{ label: "Todas", value: "" }, ...UFS.map((u) => ({ label: u, value: u }))];
    if (key === "categoria") return [{ label: "Todas", value: "" }, ...CATEGORIAS_VEICULO.map((c) => ({ label: c.nome, value: c.id }))];
    if (key === "tracao") return [{ label: "Todas", value: "" }, ...TIPOS_TRACAO.map((c) => ({ label: c.nome, value: c.id }))];
    return [{ label: "Todas", value: "" }, ...TIPOS_PROPRIEDADE.map((c) => ({ label: c.nome, value: c.id }))];
  };

  const valorAtual = (key: ChipKey): string | null => {
    if (key === "metrica") return campo;
    if (key === "uf") return uf;
    if (key === "categoria") return categoria;
    if (key === "tracao") return tracao;
    return propriedade;
  };

  const aplicarValor = (key: ChipKey, value: string) => {
    const v = value || null;
    if (key === "metrica") setCampo((value as CampoRanking) || "ganho_liquido");
    else if (key === "uf") setUf(v);
    else if (key === "categoria") setCategoria(v);
    else if (key === "tracao") setTracao(v);
    else if (key === "propriedade") setPropriedade(v);
    fechar();
  };

  const renderChip = (key: ChipKey, label: string, valorTxt: string, icone: keyof typeof Ionicons.glyphMap) => (
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
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
              {renderChip("metrica", "Métrica", CAMPOS.find((c) => c.id === campo)?.nome ?? "—", "stats-chart")}
              {renderChip("uf", "UF", uf ?? "Todas", "map")}
              {renderChip("categoria", "Tipo", categoria ? CATEGORIAS_VEICULO.find((c) => c.id === categoria)?.nome ?? categoria : "Todas", "car")}
              {renderChip("tracao", "Tração", tracao ? TIPOS_TRACAO.find((c) => c.id === tracao)?.nome ?? tracao : "Todas", "flash")}
              {renderChip("propriedade", "Propriedade", propriedade ? TIPOS_PROPRIEDADE.find((c) => c.id === propriedade)?.nome ?? propriedade : "Todas", "key")}
            </ScrollView>

            <AppCard style={{ marginBottom: 10 }}>
              <PrimaryButton
                label={perfil?.participar_ranking_soma ? "Atualizar minha posição" : "Habilite a participação no Perfil"}
                icon="refresh"
                onPress={sincronizarAgora}
                loading={sincronizar.isPending}
                fullWidth
                disabled={!perfil?.participar_ranking_soma}
              />
              {minhaPosicao >= 0 ? (
                <Text style={styles.minha}>Sua posição atual: #{minhaPosicao + 1}</Text>
              ) : perfil?.participar_ranking_soma ? (
                <Text style={styles.minha}>Toque em atualizar para entrar na lista.</Text>
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
              <EmptyState icon="trophy" titulo="Sem participantes ainda" mensagem="Habilite seu perfil para fazer parte do ranking." />
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
  if (k === "metrica") return "Escolha a métrica";
  if (k === "uf") return "Filtrar por UF";
  if (k === "categoria") return "Filtrar por categoria";
  if (k === "tracao") return "Filtrar por tração";
  return "Filtrar por propriedade";
}

function posStyle(index: number) {
  if (index === 0) return { backgroundColor: "#F59E0B" };
  if (index === 1) return { backgroundColor: "#94A3B8" };
  if (index === 2) return { backgroundColor: "#B45309" };
  return { backgroundColor: theme.colors.surfaceMuted };
}

const styles = StyleSheet.create({
  chipsRow: { paddingVertical: 6, paddingHorizontal: 2, gap: 6, marginBottom: 8 },
  chip: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "#fff", borderRadius: theme.radius.pill,
    paddingVertical: 7, paddingHorizontal: 11,
    ...theme.shadow.soft, borderWidth: 1, borderColor: theme.colors.border,
  },
  chipLab: { ...theme.font.medium, fontSize: 11, color: theme.colors.textMuted },
  chipVal: { color: theme.colors.text, ...theme.font.semibold },
  minha: { textAlign: "center", marginTop: 10, ...theme.font.medium, fontSize: 12, color: theme.colors.textMuted },

  // ── Card ──
  cardWrap: {
    backgroundColor: "#fff",
    borderRadius: theme.radius.md,
    marginBottom: 7,
    overflow: "hidden",
    ...theme.shadow.soft,
  },
  cardProprio: {
    borderWidth: 1.5,
    borderColor: theme.colors.primary,
  },
  cardMain: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  pos: {
    width: 28, height: 28, borderRadius: 14,
    justifyContent: "center", alignItems: "center",
    marginRight: 8, flexShrink: 0,
  },
  posTxt: { ...theme.font.bold, fontSize: 12, color: theme.colors.text },
  foto: { width: 38, height: 38, borderRadius: 19, flexShrink: 0 },
  fotoVazia: { backgroundColor: theme.colors.primary, justifyContent: "center", alignItems: "center" },

  cardInfo: { flex: 1, marginLeft: 9, minWidth: 0 },
  nome: { ...theme.font.semibold, fontSize: 13, color: theme.colors.text },
  locTxt: { ...theme.font.regular, fontSize: 10, color: theme.colors.textMuted, marginTop: 1 },

  valorCol: { alignItems: "flex-end", marginLeft: 8, flexShrink: 0 },
  valorPrincipal: {
    ...theme.font.bold, fontSize: 14,
    color: theme.colors.text,
  },
  valorLab: { ...theme.font.regular, fontSize: 9, color: theme.colors.textMuted, marginTop: 1 },

  // ── Painel expandido ──
  expandPanel: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.divider,
    paddingHorizontal: 10,
    paddingVertical: 10,
    backgroundColor: theme.colors.surfaceMuted,
  },
  statsGrid: { flexDirection: "row", gap: 6 },
  statCell: {
    flex: 1, backgroundColor: "#fff",
    borderRadius: theme.radius.sm, padding: 8,
    alignItems: "center",
    borderWidth: 1, borderColor: "transparent",
  },
  statCellAtivo: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary + "0D",
  },
  statLab: {
    fontSize: 9, ...theme.font.medium,
    color: theme.colors.textMuted, textTransform: "uppercase", marginBottom: 3,
  },
  statVal: {
    fontSize: 12, ...theme.font.bold,
    color: theme.colors.text, textAlign: "center",
  },
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
  opcSel: { backgroundColor: theme.colors.primary + "0F" },
  opcTxt: { ...theme.font.medium, fontSize: 14, color: theme.colors.text },
  opcTxtSel: { color: theme.colors.primaryDark, ...theme.font.semibold },
});
