import React, { useRef, useState } from "react";
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
import { router, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ViewShot from "react-native-view-shot";
import * as Sharing from "expo-sharing";
import * as MediaLibrary from "expo-media-library";
import { theme } from "@/lib/theme";
import { dateEngine } from "@/engines/date-engine";
import { currencyEngine } from "@/engines/currency-engine";
import { useAuth } from "@/hooks/AuthContext";
import { useUI } from "@/hooks/UIContext";
import { useCPMA } from "@/hooks/useCPMA";
import { APP_FULL_NAME } from "@/lib/constants";

// Largura de cada mini card dentro do card capturável
// ScrollView padding: 16*2=32, cardBg padding: 20*2=40, gaps: 4*2=8
const SHARE_W = Math.floor((Dimensions.get("window").width - 80) / 3);

// ─── Utilitário ───────────────────────────────────────────────────────────────

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

// ─── Mini card (mesmo estilo do CPMA, tamanho do share) ──────────────────────

function MiniCard({
  icon,
  label,
  value,
  color,
  pct,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  color: string;
  pct?: number;
}) {
  return (
    <View style={[mc.card, { borderLeftColor: color, width: SHARE_W }]}>
      <View style={mc.headerRow}>
        <View style={[mc.iconWrap, { backgroundColor: color + "1F" }]}>
          <Ionicons name={icon} size={11} color={color} />
        </View>
        <Text style={mc.label} numberOfLines={1}>{label}</Text>
      </View>
      <View style={mc.valueRow}>
        <Text style={[mc.value, { color }]} numberOfLines={1} adjustsFontSizeToFit>
          {value}
        </Text>
        {pct !== undefined && (
          <Text style={[mc.pct, { color }]}>{pct}%</Text>
        )}
      </View>
    </View>
  );
}

// ─── Separador de seção (tema escuro) ────────────────────────────────────────

function SecLabel({ children }: { children: string }) {
  return (
    <View style={sl.wrap}>
      <View style={sl.line} />
      <Text style={sl.txt}>{children}</Text>
      <View style={sl.line} />
    </View>
  );
}

// ─── Tela ─────────────────────────────────────────────────────────────────────

export default function CompartilharScreen() {
  const insets = useSafeAreaInsets();
  const { perfil } = useAuth();
  const { showToast } = useUI();
  const viewShotRef = useRef<ViewShot>(null);
  const [capturing, setCapturing] = useState(false);

  // Período: mês atual fixo
  const hoje = dateEngine.hoje();
  const refDate = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  const mesLabel = dateEngine.formatarMesAno(refDate);

  const { data, isLoading, isFetching, refetch } = useCPMA("mes", refDate);

  useFocusEffect(
    React.useCallback(() => {
      void refetch();
    }, [refetch]),
  );

  const nomeExibir = perfil?.nome_publico || perfil?.nome || "Motorista";
  const cidade = perfil?.cidade ? `${perfil.cidade}${perfil.uf ? `/${perfil.uf}` : ""}` : null;

  // ── Formatadores ────────────────────────────────────────────────────────────
  const fmt = (v: number) => currencyEngine.formatar(v);
  const fmtN = (v: number, dec = 1) => v.toFixed(dec).replace(".", ",");
  const fmtKm = (v: number) => `${fmtN(v, 1)} km`;
  const fmtH = (h: number) => {
    const hh = Math.floor(h);
    const mm = Math.round((h - hh) * 60);
    return mm > 0 ? `${hh}h${String(mm).padStart(2, "0")}min` : `${hh}h`;
  };

  // ── Captura e compartilha ───────────────────────────────────────────────────
  const compartilhar = async () => {
    if (!viewShotRef.current) return;
    setCapturing(true);
    try {
      const uri = await (viewShotRef.current as any).capture();
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, { mimeType: "image/png", dialogTitle: "Compartilhar resultado SOMA" });
      } else {
        showToast({ type: "error", message: "Compartilhamento não disponível neste dispositivo." });
      }
    } catch {
      showToast({ type: "error", message: "Erro ao capturar. Tente novamente." });
    } finally {
      setCapturing(false);
    }
  };

  const salvarGaleria = async () => {
    if (!viewShotRef.current) return;
    setCapturing(true);
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== "granted") {
        showToast({ type: "error", message: "Permissão para galeria negada." });
        return;
      }
      const uri = await (viewShotRef.current as any).capture();
      await MediaLibrary.saveToLibraryAsync(uri);
      showToast({ type: "success", message: "Imagem salva na galeria!" });
    } catch {
      showToast({ type: "error", message: "Erro ao salvar imagem." });
    } finally {
      setCapturing(false);
    }
  };

  const loading = isLoading || isFetching;

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.surfaceMuted }}>

      {/* ── Botão voltar minimalista ──────────────────────────────────────── */}
      <View style={[styles.backRow, { paddingTop: insets.top + 8 }]}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={16}
          style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}
        >
          <Ionicons name="arrow-back" size={16} color={theme.colors.textMuted} />
          <Text style={styles.backTxt}>Voltar</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Card capturável ────────────────────────────────────────────── */}
        <ViewShot
          ref={viewShotRef}
          options={{ format: "png", quality: 1 }}
          style={styles.cardOuter}
        >
          <LinearGradient
            colors={["#020617", "#0B1430", "#0EA5E9"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.cardBg}
          >
            {/* ── Cabeçalho ──────────────────────────────────────────────── */}
            <View style={styles.imgHeader}>
              <Image
                source={require("../../assets/images/app-logo.png")}
                style={styles.imgLogo}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.imgBrand}>SOMA</Text>
                <Text style={styles.imgFullName} numberOfLines={2}>{APP_FULL_NAME}</Text>
              </View>
              <View style={styles.mesLabel}>
                <Text style={styles.mesLabelTxt}>{mesLabel}</Text>
              </View>
            </View>

            {/* ── Motorista ──────────────────────────────────────────────── */}
            <View style={styles.driverRow}>
              <View style={styles.driverAvatar}>
                <Ionicons name="person" size={18} color={theme.colors.accentBright} />
              </View>
              <View>
                <Text style={styles.driverName}>{nomeExibir}</Text>
                {cidade && <Text style={styles.driverCity}>{cidade}</Text>}
                {perfil?.categoria && <Text style={styles.driverCat}>{perfil.categoria}</Text>}
              </View>
            </View>

            <View style={styles.divider} />

            {/* ── Cards ──────────────────────────────────────────────────── */}
            {loading || !data ? (
              <View style={{ paddingVertical: 40, alignItems: "center" }}>
                <ActivityIndicator color={theme.colors.accentBright} />
                <Text style={[styles.driverCity, { marginTop: 8 }]}>Carregando…</Text>
              </View>
            ) : (
              <>
                <SecLabel>Financeiro</SecLabel>
                <View style={styles.grid}>
                  <MiniCard icon="cash" label="Ganho Bruto" value={fmt(data.ganhoBruto)} color={theme.colors.primary} />
                  <MiniCard icon="leaf" label="Ganho Líquido" value={fmt(data.ganhoLiquido)} color={theme.colors.success} pct={data.pctLiquido} />
                  <MiniCard icon="star" label="Ganho Real" value={fmt(data.ganhoReal)} color={data.ganhoReal >= 0 ? theme.colors.accent : theme.colors.danger} pct={data.pctReal} />
                </View>

                <SecLabel>Custos</SecLabel>
                <View style={styles.grid}>
                  <MiniCard icon="alert-circle" label="Total Custos" value={fmt(data.totalCustos)} color={theme.colors.danger} pct={data.pctCustos} />
                  <MiniCard icon="flame" label="Combustível" value={fmt(data.custoCombustivel)} color={theme.colors.warning} pct={data.pctCombustivel} />
                  <MiniCard icon="wallet" label="Custo Fixo" value={fmt(data.custoFixo)} color={theme.colors.purple} pct={data.pctCustoFixo} />
                </View>

                {data.despesasItems.length > 0 && (
                  <>
                    <SecLabel>Despesas Variáveis</SecLabel>
                    {chunk(data.despesasItems, 3).map((row, ri) => (
                      <View key={ri} style={styles.grid}>
                        {row.map((item) => (
                          <MiniCard key={item.nome} icon="receipt" label={item.nome} value={fmt(item.valor)} color={theme.colors.orange} pct={item.pct} />
                        ))}
                        {row.length === 2 && <View style={{ width: SHARE_W }} />}
                        {row.length === 1 && <><View style={{ width: SHARE_W }} /><View style={{ width: SHARE_W }} /></>}
                      </View>
                    ))}
                  </>
                )}

                <SecLabel>Atividade</SecLabel>
                <View style={styles.grid}>
                  <MiniCard icon="car" label="KM Trabalhado" value={data.kmTrabalho > 0 ? fmtKm(data.kmTrabalho) : "—"} color={theme.colors.primary} />
                  <MiniCard icon="time" label="Horas Trab." value={data.horas > 0 ? fmtH(data.horas) : "—"} color={theme.colors.accent} />
                  <MiniCard icon="home" label="KM Pessoal" value={data.kmPessoal != null ? fmtKm(data.kmPessoal) : "—"} color={theme.colors.indigo} />
                </View>
                <View style={styles.grid}>
                  <MiniCard icon="sunny" label="Dias Trab." value={String(data.diasTrabalhados)} color={theme.colors.success} />
                  <MiniCard icon="navigate" label="Corridas" value={String(data.corridas)} color={theme.colors.primary} />
                  <MiniCard icon="timer" label="Corridas/hora" value={data.corridasPorHora > 0 ? fmtN(data.corridasPorHora) : "—"} color={theme.colors.warning} />
                </View>

                <SecLabel>Médias</SecLabel>
                <View style={styles.grid}>
                  <MiniCard icon="calendar" label="Ganho / dia" value={data.ganhoPorDia > 0 ? fmt(data.ganhoPorDia) : "—"} color={theme.colors.primary} />
                  <MiniCard icon="hourglass" label="Horas / dia" value={data.horasPorDia > 0 ? fmtH(data.horasPorDia) : "—"} color={theme.colors.accent} />
                  <MiniCard icon="speedometer-outline" label="KM / corrida" value={data.kmPorCorrida > 0 ? fmtKm(data.kmPorCorrida) : "—"} color={theme.colors.indigo} />
                </View>
                <View style={styles.grid}>
                  <MiniCard icon="cash-outline" label="Ganho/corrida" value={data.ganhoPorCorrida > 0 ? fmt(data.ganhoPorCorrida) : "—"} color={theme.colors.success} />
                  <MiniCard icon="trending-up" label="Ganho / hora" value={data.ganhoPorHora > 0 ? fmt(data.ganhoPorHora) : "—"} color={theme.colors.primary} />
                  <MiniCard icon="leaf" label="Ganho real/hora" value={data.ganhoRealPorHora !== 0 ? fmt(data.ganhoRealPorHora) : "—"} color={data.ganhoRealPorHora >= 0 ? theme.colors.success : theme.colors.danger} />
                </View>

                <SecLabel>Índices</SecLabel>
                <View style={styles.grid}>
                  <MiniCard icon="trending-down" label="Custo / hora" value={data.custoPorHora > 0 ? fmt(data.custoPorHora) : "—"} color={theme.colors.danger} />
                  <MiniCard icon="remove-circle" label="Custo/corrida" value={data.custoPorCorrida > 0 ? fmt(data.custoPorCorrida) : "—"} color={theme.colors.orange} />
                  <MiniCard icon="analytics" label="Custo / km" value={data.custoPorKm > 0 ? `R$ ${fmtN(data.custoPorKm, 2)}` : "—"} color={theme.colors.warning} />
                </View>
                <View style={styles.grid}>
                  <MiniCard icon="add-circle" label="Ganho / km" value={data.ganhoPorKm > 0 ? `R$ ${fmtN(data.ganhoPorKm, 2)}` : "—"} color={theme.colors.primary} />
                  <MiniCard icon="leaf-outline" label="Ganho real/km" value={data.ganhoPorKmReal !== 0 ? `R$ ${fmtN(data.ganhoPorKmReal, 2)}` : "—"} color={data.ganhoPorKmReal >= 0 ? theme.colors.success : theme.colors.danger} />
                  <View style={{ width: SHARE_W }} />
                </View>
              </>
            )}

            {/* ── Rodapé ─────────────────────────────────────────────────── */}
            <View style={styles.footer}>
              <View style={styles.footerLine} />
              <Text style={styles.footerTxt}>nexortec.com.br · SOMA App 2026</Text>
            </View>
          </LinearGradient>
        </ViewShot>

        {/* ── Botões ─────────────────────────────────────────────────────── */}
        <View style={styles.actionsRow}>
          <Pressable
            style={({ pressed }) => [styles.btnShare, pressed && { opacity: 0.85 }]}
            onPress={compartilhar}
            disabled={capturing || loading}
          >
            <LinearGradient
              colors={theme.gradients.primary as readonly [string, string]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.btnInner}
            >
              {capturing ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Ionicons name="share-social" size={20} color="#fff" />
              )}
              <Text style={styles.btnTxt}>{capturing ? "Aguarde…" : "Compartilhar"}</Text>
            </LinearGradient>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.btnSave, pressed && { opacity: 0.85 }]}
            onPress={salvarGaleria}
            disabled={capturing || loading}
          >
            <Ionicons name="download-outline" size={20} color={theme.colors.primary} />
            <Text style={styles.btnSaveTxt}>Salvar</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  backRow: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
  },
  backTxt: {
    ...theme.font.medium,
    fontSize: 13,
    color: theme.colors.textMuted,
  },

  // Card
  cardOuter: {
    borderRadius: 20,
    overflow: "hidden",
    ...theme.shadow.soft,
  },
  cardBg: {
    padding: 20,
    borderRadius: 20,
  },

  // Header
  imgHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
  },
  imgLogo: {
    width: 44,
    height: 44,
    borderRadius: 10,
  },
  imgBrand: {
    ...theme.font.bold,
    fontSize: 22,
    color: "#fff",
    letterSpacing: 2,
  },
  imgFullName: {
    ...theme.font.regular,
    fontSize: 9,
    color: "rgba(255,255,255,0.6)",
    marginTop: 2,
  },
  mesLabel: {
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  mesLabelTxt: {
    ...theme.font.semibold,
    fontSize: 11,
    color: theme.colors.accentBright,
  },

  // Motorista
  driverRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
  },
  driverAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: theme.colors.accentBright + "60",
  },
  driverName: {
    ...theme.font.bold,
    fontSize: 15,
    color: "#fff",
  },
  driverCity: {
    ...theme.font.regular,
    fontSize: 10,
    color: "rgba(255,255,255,0.6)",
    marginTop: 1,
  },
  driverCat: {
    ...theme.font.medium,
    fontSize: 10,
    color: theme.colors.accentBright,
    marginTop: 1,
  },

  divider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.15)",
    marginBottom: 12,
  },

  // Grid de mini cards
  grid: {
    flexDirection: "row",
    gap: 4,
    marginBottom: 4,
  },

  // Rodapé
  footer: {
    marginTop: 10,
  },
  footerLine: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.12)",
    marginBottom: 8,
  },
  footerTxt: {
    ...theme.font.regular,
    fontSize: 10,
    color: "rgba(255,255,255,0.4)",
    textAlign: "center",
  },

  // Botões de ação
  actionsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 18,
  },
  btnShare: {
    flex: 1,
    borderRadius: theme.radius.pill,
    overflow: "hidden",
    ...theme.shadow.soft,
  },
  btnInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 15,
  },
  btnTxt: {
    ...theme.font.bold,
    fontSize: 16,
    color: "#fff",
  },
  btnSave: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 15,
    backgroundColor: "#fff",
    borderRadius: theme.radius.pill,
    borderWidth: 1.5,
    borderColor: theme.colors.primary,
    ...theme.shadow.soft,
  },
  btnSaveTxt: {
    ...theme.font.bold,
    fontSize: 15,
    color: theme.colors.primary,
  },
});

// ─── Mini card styles ─────────────────────────────────────────────────────────

const mc = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 5,
    borderLeftWidth: 3,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginBottom: 3,
  },
  iconWrap: {
    width: 16,
    height: 16,
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    flex: 1,
    ...theme.font.regular,
    fontSize: 8,
    color: theme.colors.textMuted,
    lineHeight: 10,
  },
  valueRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
  },
  value: {
    ...theme.font.bold,
    fontSize: 11,
    lineHeight: 14,
  },
  pct: {
    ...theme.font.medium,
    fontSize: 8,
    opacity: 0.85,
  },
});

// ─── Section label styles (dark bg) ──────────────────────────────────────────

const sl = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 5,
    marginTop: 8,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  txt: {
    ...theme.font.semibold,
    fontSize: 9,
    color: "rgba(255,255,255,0.7)",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
});
