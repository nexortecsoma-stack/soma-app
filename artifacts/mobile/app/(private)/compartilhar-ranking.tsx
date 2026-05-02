import React from "react";
import {
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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { theme } from "@/lib/theme";
import { currencyEngine } from "@/engines/currency-engine";
import { useAuth } from "@/hooks/AuthContext";
import { APP_FULL_NAME } from "@/lib/constants";

const W = Dimensions.get("window").width;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function posColor(pos: number): string {
  if (pos === 1) return "#F59E0B";
  if (pos === 2) return "#94A3B8";
  if (pos === 3) return "#CD7F32";
  return theme.colors.accentBright;
}

function posLabel(pos: number): string {
  if (pos === 1) return "🥇";
  if (pos === 2) return "🥈";
  if (pos === 3) return "🥉";
  return `#${pos}`;
}

// ─── Tela ─────────────────────────────────────────────────────────────────────

export default function CompartilharRankingScreen() {
  const insets = useSafeAreaInsets();
  const { perfil } = useAuth();

  const {
    posicao: posStr,
    periodo,
    ganhoBruto: brutoStr,
    ganhoLiquido: liquidoStr,
    ganhoPorHora: horaStr,
    ganhoPorKm: kmStr,
    horas: horasStr,
    km: kmPercStr,
  } = useLocalSearchParams<{
    posicao: string;
    periodo: string;
    ganhoBruto: string;
    ganhoLiquido: string;
    ganhoPorHora: string;
    ganhoPorKm: string;
    horas: string;
    km: string;
  }>();

  const posicao      = Number(posStr ?? "0");
  const ganhoBruto   = Number(brutoStr ?? "0");
  const ganhoLiquido = Number(liquidoStr ?? "0");
  const ganhoPorHora = Number(horaStr ?? "0");
  const ganhoPorKm   = Number(kmStr ?? "0");
  const horas        = Number(horasStr ?? "0");
  const km           = Number(kmPercStr ?? "0");

  const nome   = perfil?.nome_publico || perfil?.nome || "Motorista";
  const cidade = [perfil?.cidade, perfil?.uf].filter(Boolean).join("/") || null;

  const cor = posColor(posicao);

  const fmt  = (v: number) => currencyEngine.formatar(v);
  const fmtH = (h: number) => {
    const hh = Math.floor(h);
    const mm = Math.round((h - hh) * 60);
    return mm > 0 ? `${hh}h${String(mm).padStart(2, "0")}min` : `${hh}h`;
  };
  const fmtKm = (v: number) => `${v.toFixed(1).replace(".", ",")} km`;

  const stats = [
    { lab: "Ganho bruto",   val: fmt(ganhoBruto),            color: theme.colors.accent },
    { lab: "Ganho líquido", val: fmt(ganhoLiquido),           color: ganhoLiquido >= 0 ? theme.colors.success : theme.colors.danger },
    { lab: "R$ por hora",   val: fmt(ganhoPorHora),           color: theme.colors.primary },
    { lab: "R$ por km",     val: `R$ ${ganhoPorKm.toFixed(2).replace(".", ",")}`, color: theme.colors.accentBright },
  ];

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
          {/* Header: logo + brand + período */}
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

          {/* Posição destaque */}
          <View style={s.posRow}>
            <View style={[s.posBadge, { borderColor: cor }]}>
              <Text style={[s.posNum, { color: cor }]}>
                {posicao <= 3 ? posLabel(posicao) : `#${posicao}`}
              </Text>
            </View>
            <View style={s.posInfo}>
              <Text style={s.posLabel}>Ranking SOMA</Text>
              <Text style={s.posTexto}>
                {posicao === 1 ? "Líder do ranking!" :
                 posicao <= 3 ? `Top ${posicao} do ranking` :
                 `${posicao}ª posição`}
              </Text>
            </View>
          </View>

          {/* Motorista */}
          <View style={s.divider} />
          <View style={s.driverRow}>
            <View style={s.driverAvatar}>
              {perfil?.foto_url ? (
                <Image source={{ uri: perfil.foto_url }} style={s.driverFoto} />
              ) : (
                <Ionicons name="person" size={18} color={theme.colors.accentBright} />
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.driverName} numberOfLines={1}>{nome}</Text>
              {cidade && <Text style={s.driverCity}>{cidade}</Text>}
            </View>
          </View>

          {/* Stats grid */}
          <View style={s.divider} />
          <View style={s.statsGrid}>
            {stats.map((st) => (
              <View key={st.lab} style={s.statCell}>
                <Text style={s.statLab} numberOfLines={1}>{st.lab}</Text>
                <Text style={[s.statVal, { color: st.color }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                  {st.val}
                </Text>
              </View>
            ))}
          </View>

          {/* Atividade */}
          {(horas > 0 || km > 0) && (
            <>
              <View style={s.divider} />
              <View style={s.atividadeRow}>
                {horas > 0 && (
                  <View style={s.atividadeItem}>
                    <Ionicons name="time-outline" size={13} color="rgba(255,255,255,0.5)" />
                    <Text style={s.atividadeTxt}>{fmtH(horas)}</Text>
                  </View>
                )}
                {km > 0 && (
                  <View style={s.atividadeItem}>
                    <Ionicons name="speedometer-outline" size={13} color="rgba(255,255,255,0.5)" />
                    <Text style={s.atividadeTxt}>{fmtKm(km)}</Text>
                  </View>
                )}
              </View>
            </>
          )}

          {/* Rodapé */}
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
    marginBottom: 18,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  logo: {
    width: 40,
    height: 40,
    borderRadius: 9,
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
    color: "rgba(255,255,255,0.5)",
    marginTop: 1,
  },
  periodoTag: {
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  periodoTxt: {
    ...theme.font.semibold,
    fontSize: 11,
    color: theme.colors.accentBright,
  },

  // Posição
  posRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginBottom: 16,
  },
  posBadge: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  posNum: {
    ...theme.font.bold,
    fontSize: 26,
  },
  posInfo: {
    flex: 1,
  },
  posLabel: {
    ...theme.font.medium,
    fontSize: 11,
    color: "rgba(255,255,255,0.5)",
    marginBottom: 3,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  posTexto: {
    ...theme.font.bold,
    fontSize: 18,
    color: "#fff",
  },

  divider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.12)",
    marginVertical: 14,
  },

  // Motorista
  driverRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  driverAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 1.5,
    borderColor: theme.colors.accentBright + "50",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  driverFoto: {
    width: 42,
    height: 42,
  },
  driverName: {
    ...theme.font.bold,
    fontSize: 15,
    color: "#fff",
  },
  driverCity: {
    ...theme.font.regular,
    fontSize: 11,
    color: "rgba(255,255,255,0.55)",
    marginTop: 2,
  },

  // Stats
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  statCell: {
    width: (W - 32 - 40 - 8) / 2,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 12,
    padding: 12,
  },
  statLab: {
    ...theme.font.medium,
    fontSize: 10,
    color: "rgba(255,255,255,0.5)",
    marginBottom: 5,
    textTransform: "uppercase",
  },
  statVal: {
    ...theme.font.bold,
    fontSize: 17,
  },

  // Atividade
  atividadeRow: {
    flexDirection: "row",
    gap: 18,
    justifyContent: "center",
  },
  atividadeItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  atividadeTxt: {
    ...theme.font.medium,
    fontSize: 12,
    color: "rgba(255,255,255,0.6)",
  },

  // Rodapé
  footer: {
    marginTop: 16,
    alignItems: "center",
  },
  footerTxt: {
    ...theme.font.regular,
    fontSize: 10,
    color: "rgba(255,255,255,0.3)",
    letterSpacing: 0.5,
  },

  // Dica
  dica: {
    ...theme.font.regular,
    fontSize: 12,
    color: theme.colors.textSubtle,
    textAlign: "center",
    marginTop: 16,
  },
});
