import React, { useMemo } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Image,
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
import { rankingEngine, periodoParaDatas, type CampoRanking, type RankingPeriodo } from "@/engines/ranking-engine";
import { rankingService } from "@/services/ranking-service";
import { APP_FULL_NAME } from "@/lib/constants";

const W = Dimensions.get("window").width;
const TOP = 10;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isoLocal(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function medalColor(pos: number): string {
  if (pos === 1) return "#F59E0B";
  if (pos === 2) return "#94A3B8";
  if (pos === 3) return "#CD7F32";
  return "rgba(255,255,255,0.4)";
}

function medalEmoji(pos: number): string {
  if (pos === 1) return "🥇";
  if (pos === 2) return "🥈";
  if (pos === 3) return "🥉";
  return `${pos}º`;
}

const CAMPO_LABELS: Record<CampoRanking, string> = {
  ganho_bruto:    "Ganho Bruto",
  ganho_liquido:  "Ganho Líquido",
  ganho_por_hora: "Ganho/hora",
  ganho_por_km:   "Ganho/km",
};

function fmtValor(campo: CampoRanking, item: ReturnType<typeof rankingEngine.filtrar>[number]): string {
  const v = Number(item[campo] ?? 0);
  if (campo === "ganho_por_km") return `R$ ${v.toFixed(2).replace(".", ",")}`;
  return currencyEngine.formatar(v);
}

// ─── Tela ─────────────────────────────────────────────────────────────────────

export default function CompartilharRankingScreen() {
  const insets = useSafeAreaInsets();

  const {
    filtro: filtroParam,
    refDate: refDateParam,
    campo: campoParam,
    periodo,
  } = useLocalSearchParams<{
    filtro: string;
    refDate: string;
    campo: string;
    periodo: string;
  }>();

  const filtro  = (filtroParam ?? "mes") as RankingPeriodo;
  const campo   = (campoParam  ?? "ganho_liquido") as CampoRanking;
  const refDate = refDateParam ? new Date(refDateParam) : new Date();

  const { data: todos, isLoading } = useQuery({
    queryKey: ["ranking"],
    queryFn:  () => rankingService.listAll(),
    staleTime: 60000,
  });

  const top = useMemo(() => {
    if (!todos) return [];
    let base = todos;
    if (filtro !== "todos") {
      const { inicio } = periodoParaDatas(filtro, refDate);
      const inicioISO  = isoLocal(inicio);
      base = base.filter((r) => r.periodo_inicio === inicioISO);
    }
    return rankingEngine.ordenar(base, campo).slice(0, TOP);
  }, [todos, filtro, refDate, campo]);

  const campoLabel = CAMPO_LABELS[campo] ?? "Ganho Líquido";

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.surfaceMuted }}>
      <ScrollView
        contentContainerStyle={{
          padding: 16,
          paddingTop: insets.top + 8,
          paddingBottom: insets.bottom + 40,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Voltar */}
        <Pressable
          onPress={() => router.back()}
          hitSlop={16}
          style={({ pressed }) => [s.backBtn, pressed && { opacity: 0.6 }]}
        >
          <Ionicons name="arrow-back" size={16} color={theme.colors.textMuted} />
          <Text style={s.backTxt}>Voltar</Text>
        </Pressable>

        {/* Card */}
        <LinearGradient
          colors={[theme.colors.primaryDark, "#0a1628", "#0d1f3c"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={s.card}
        >
          {/* Header */}
          <View style={s.header}>
            <View style={s.headerLeft}>
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
              <Text style={s.periodoTxt}>{periodo ?? "—"}</Text>
            </View>
          </View>

          {/* Título */}
          <View style={s.tituloRow}>
            <Ionicons name="trophy" size={18} color="#F59E0B" />
            <Text style={s.titulo}>Ranking</Text>
            <View style={s.campoTag}>
              <Text style={s.campoTagTxt}>{campoLabel}</Text>
            </View>
          </View>

          <View style={s.divider} />

          {/* Lista */}
          {isLoading ? (
            <ActivityIndicator color={theme.colors.accentBright} style={{ marginVertical: 24 }} />
          ) : top.length === 0 ? (
            <Text style={s.vazio}>Nenhum participante neste período.</Text>
          ) : (
            top.map((item, idx) => {
              const pos = idx + 1;
              const cor = medalColor(pos);
              const isTop3 = pos <= 3;
              return (
                <View key={item.profile_id} style={[s.row, isTop3 && s.rowDestaque]}>
                  {/* Posição */}
                  <View style={[s.posBadge, isTop3 && { borderColor: cor }]}>
                    <Text style={[s.posNum, { color: isTop3 ? cor : "rgba(255,255,255,0.5)" }]}>
                      {medalEmoji(pos)}
                    </Text>
                  </View>

                  {/* Avatar + nome */}
                  <View style={s.avatarWrap}>
                    {item.foto_url ? (
                      <Image source={{ uri: item.foto_url }} style={s.avatar} />
                    ) : (
                      <View style={s.avatarFallback}>
                        <Ionicons name="person" size={14} color={theme.colors.accentBright} />
                      </View>
                    )}
                  </View>
                  <View style={s.nomeWrap}>
                    <Text style={s.nome} numberOfLines={1}>{item.nome_publico || "—"}</Text>
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

          {/* Rodapé */}
          <View style={s.divider} />
          <View style={s.footer}>
            <Text style={s.footerTxt}>soma.nexortec.com.br</Text>
          </View>
        </LinearGradient>

        <Text style={s.dica}>Tire um print para compartilhar 📲</Text>
      </ScrollView>
    </View>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 14,
    alignSelf: "flex-start",
  },
  backTxt: {
    ...theme.font.medium,
    fontSize: 14,
    color: theme.colors.textMuted,
  },

  card: {
    borderRadius: 20,
    padding: 20,
    ...theme.shadow.soft,
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  logo: {
    width: 38,
    height: 38,
    borderRadius: 8,
  },
  brand: {
    ...theme.font.bold,
    fontSize: 20,
    color: "#fff",
    letterSpacing: 2,
  },
  brandSub: {
    ...theme.font.regular,
    fontSize: 8,
    color: "rgba(255,255,255,0.45)",
    marginTop: 1,
  },
  periodoTag: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  periodoTxt: {
    ...theme.font.semibold,
    fontSize: 11,
    color: theme.colors.accentBright,
  },

  // Título
  tituloRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
  },
  titulo: {
    ...theme.font.bold,
    fontSize: 18,
    color: "#fff",
    flex: 1,
  },
  campoTag: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  campoTagTxt: {
    ...theme.font.medium,
    fontSize: 10,
    color: "rgba(255,255,255,0.7)",
  },

  divider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.1)",
    marginVertical: 12,
  },

  vazio: {
    ...theme.font.regular,
    fontSize: 13,
    color: "rgba(255,255,255,0.4)",
    textAlign: "center",
    marginVertical: 20,
  },

  // Linhas do ranking
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 7,
    borderRadius: 10,
    paddingHorizontal: 6,
  },
  rowDestaque: {
    backgroundColor: "rgba(255,255,255,0.05)",
    marginBottom: 2,
  },

  posBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  posNum: {
    ...theme.font.bold,
    fontSize: 13,
    textAlign: "center",
  },

  avatarWrap: {
    width: 32,
    height: 32,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  avatarFallback: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },

  nomeWrap: {
    flex: 1,
  },
  nome: {
    ...theme.font.semibold,
    fontSize: 13,
    color: "#fff",
  },
  cidade: {
    ...theme.font.regular,
    fontSize: 10,
    color: "rgba(255,255,255,0.45)",
    marginTop: 1,
  },

  valor: {
    ...theme.font.bold,
    fontSize: 13,
    color: theme.colors.accentBright,
    textAlign: "right",
  },

  // Rodapé
  footer: {
    alignItems: "center",
  },
  footerTxt: {
    ...theme.font.regular,
    fontSize: 10,
    color: "rgba(255,255,255,0.25)",
    letterSpacing: 0.5,
  },

  dica: {
    ...theme.font.regular,
    fontSize: 12,
    color: theme.colors.textSubtle,
    textAlign: "center",
    marginTop: 16,
  },
});
