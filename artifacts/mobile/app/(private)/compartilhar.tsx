import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
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
import { useDashboard } from "@/hooks/useDashboard";
import { AppHeader } from "@/components/ui/AppHeader";
import { AppProgressBar } from "@/components/ui/AppProgressBar";
import { APP_FULL_NAME } from "@/lib/constants";

// ─── Cartão de stat ──────────────────────────────────────────────────────────

function StatCard({
  icon,
  label,
  value,
  color,
  small,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  color: string;
  small?: boolean;
}) {
  return (
    <View style={[card.wrap, { borderLeftColor: color }]}>
      <View style={[card.iconWrap, { backgroundColor: color + "22" }]}>
        <Ionicons name={icon} size={small ? 13 : 15} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={card.label} numberOfLines={1}>{label}</Text>
        <Text style={[card.value, { color }]} numberOfLines={1}>{value}</Text>
      </View>
    </View>
  );
}

// ─── Tela ─────────────────────────────────────────────────────────────────────

export default function CompartilharScreen() {
  const insets = useSafeAreaInsets();
  const { perfil } = useAuth();
  const { openDrawer, showToast } = useUI();
  const viewShotRef = useRef<ViewShot>(null);
  const [capturing, setCapturing] = useState(false);

  const [mes] = useState(new Date());
  const { data, loading, refetch } = useDashboard(mes, 0);

  useFocusEffect(
    React.useCallback(() => {
      void refetch();
    }, [refetch]),
  );

  const nomeExibir = perfil?.nome_publico || perfil?.nome || "Motorista";
  const cidade = perfil?.cidade ? `${perfil.cidade}${perfil.uf ? `/${perfil.uf}` : ""}` : null;
  const mesLabel = dateEngine.formatarMesAno(mes);

  // ── Captura e compartilha ──────────────────────────────────────────────────
  const compartilhar = async () => {
    if (!viewShotRef.current) return;
    setCapturing(true);
    try {
      const uri = await (viewShotRef.current as any).capture();

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, {
          mimeType: "image/png",
          dialogTitle: "Compartilhar resultado SOMA",
        });
      } else {
        showToast({ type: "error", message: "Compartilhamento não disponível neste dispositivo." });
      }
    } catch {
      showToast({ type: "error", message: "Erro ao capturar a tela. Tente novamente." });
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
        setCapturing(false);
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

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.surfaceMuted }}>
      <AppHeader
        title="Compartilhar"
        subtitle="Mostre seu desempenho"
        onBackPress={() => router.back()}
        onMenuPress={openDrawer}
      />

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 120 }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.hint}>
          Toque em <Text style={styles.hintBold}>Compartilhar</Text> para enviar a imagem ou{" "}
          <Text style={styles.hintBold}>Salvar</Text> para baixar na galeria.
        </Text>

        {/* ── Card capturável ──────────────────────────────────────────────── */}
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
            {/* ── Header da imagem ─────────────────────────────────────────── */}
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

            {/* ── Nome do motorista ─────────────────────────────────────────── */}
            <View style={styles.driverRow}>
              <View style={styles.driverAvatarWrap}>
                <Ionicons name="person" size={22} color={theme.colors.accentBright} />
              </View>
              <View>
                <Text style={styles.driverName}>{nomeExibir}</Text>
                {cidade && <Text style={styles.driverCity}>{cidade}</Text>}
                {perfil?.categoria && (
                  <Text style={styles.driverCat}>{perfil.categoria}</Text>
                )}
              </View>
            </View>

            {/* ── Divider ───────────────────────────────────────────────────── */}
            <View style={styles.imgDivider} />

            {/* ── Conteúdo dependente de dados ─────────────────────────────── */}
            {loading || !data ? (
              <View style={{ paddingVertical: 32, alignItems: "center" }}>
                <ActivityIndicator color={theme.colors.accentBright} />
                <Text style={[styles.driverCity, { marginTop: 8 }]}>Carregando…</Text>
              </View>
            ) : (
              <>
                {/* ── KPIs principais ─────────────────────────────────────── */}
                <View style={styles.mainKpiRow}>
                  <View style={styles.mainKpi}>
                    <Text style={styles.mainKpiLabel}>Ganho Bruto</Text>
                    <Text style={styles.mainKpiValue}>{currencyEngine.formatar(data.ganhoMes)}</Text>
                  </View>
                  <View style={[styles.mainKpiDivider]} />
                  <View style={styles.mainKpi}>
                    <Text style={styles.mainKpiLabel}>Líquido</Text>
                    <Text style={[styles.mainKpiValue, { color: theme.colors.accentBright }]}>
                      {currencyEngine.formatar(data.ganhoMesLiquido)}
                    </Text>
                  </View>
                </View>

                {/* ── Meta ────────────────────────────────────────────────── */}
                <View style={styles.metaBlock}>
                  <View style={styles.metaTopRow}>
                    <Text style={styles.metaTitle}>Meta do mês</Text>
                    <Text style={styles.metaPct}>{data.percentualMes}%</Text>
                  </View>
                  <View style={styles.progressOuter}>
                    <View
                      style={[
                        styles.progressInner,
                        {
                          width: `${Math.min(100, data.percentualMes)}%`,
                          backgroundColor:
                            data.percentualMes >= 100
                              ? theme.colors.success
                              : theme.colors.accentBright,
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.metaSub}>
                    {currencyEngine.formatar(data.ganhoMes)} de{" "}
                    {currencyEngine.formatar(data.metaMensal)}
                    {data.percentualMes >= 100 ? " · META BATIDA! 🏆" : ""}
                  </Text>
                </View>

                {/* ── Grid de stats ────────────────────────────────────────── */}
                <View style={styles.statsGrid}>
                  <StatCard
                    icon="trending-up"
                    label="Ganho semana"
                    value={currencyEngine.formatar(data.ganhoSemana)}
                    color={theme.colors.primary}
                  />
                  <StatCard
                    icon="leaf"
                    label="Líquido semana"
                    value={currencyEngine.formatar(data.lucroLiquidoSemana)}
                    color={theme.colors.success}
                  />
                  <StatCard
                    icon="today"
                    label="Hoje"
                    value={currencyEngine.formatar(data.ganhoHoje)}
                    color={theme.colors.accent}
                  />
                  <StatCard
                    icon="remove-circle"
                    label="Despesas mês"
                    value={currencyEngine.formatar(data.despesasMes)}
                    color={theme.colors.danger}
                  />
                </View>

                {/* ── Meta diária ───────────────────────────────────────────── */}
                <View style={styles.metaDiariaRow}>
                  <Ionicons name="flag" size={13} color={theme.colors.accentBright} />
                  <Text style={styles.metaDiariaTxt}>
                    Meta diária ajustada:{" "}
                    <Text style={styles.metaDiariaVal}>
                      {currencyEngine.formatar(data.metaDiariaAjustada)}
                    </Text>
                  </Text>
                </View>
              </>
            )}

            {/* ── Rodapé da imagem ─────────────────────────────────────────── */}
            <View style={styles.imgFooter}>
              <View style={styles.imgFooterDivider} />
              <Text style={styles.imgFooterTxt}>nexortec.com.br · SOMA App 2026</Text>
            </View>
          </LinearGradient>
        </ViewShot>

        {/* ── Botões de ação ───────────────────────────────────────────────── */}
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
              <Text style={styles.btnTxt}>
                {capturing ? "Aguarde…" : "Compartilhar"}
              </Text>
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

        <Text style={styles.dica}>
          Dica: a imagem inclui seus principais resultados do mês e é ideal para compartilhar nas redes sociais.
        </Text>
      </ScrollView>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  hint: {
    ...theme.font.regular,
    fontSize: 13,
    color: theme.colors.textMuted,
    textAlign: "center",
    marginBottom: 16,
  },
  hintBold: {
    ...theme.font.semibold,
    color: theme.colors.primary,
  },
  cardOuter: {
    borderRadius: 20,
    overflow: "hidden",
    ...theme.shadow.soft,
  },
  cardBg: {
    padding: 20,
    borderRadius: 20,
  },

  // Header da imagem
  imgHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  imgLogo: {
    width: 52,
    height: 52,
    borderRadius: 12,
  },
  imgBrand: {
    ...theme.font.bold,
    fontSize: 24,
    color: "#fff",
    letterSpacing: 2,
  },
  imgFullName: {
    ...theme.font.regular,
    fontSize: 10,
    color: "rgba(255,255,255,0.65)",
    marginTop: 2,
  },
  mesLabel: {
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  mesLabelTxt: {
    ...theme.font.semibold,
    fontSize: 12,
    color: theme.colors.accentBright,
  },

  // Driver
  driverRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  driverAvatarWrap: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: theme.colors.accentBright + "60",
  },
  driverName: {
    ...theme.font.bold,
    fontSize: 17,
    color: "#fff",
  },
  driverCity: {
    ...theme.font.regular,
    fontSize: 11,
    color: "rgba(255,255,255,0.65)",
    marginTop: 1,
  },
  driverCat: {
    ...theme.font.medium,
    fontSize: 11,
    color: theme.colors.accentBright,
    marginTop: 1,
  },

  imgDivider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.15)",
    marginBottom: 16,
  },

  // KPIs principais
  mainKpiRow: {
    flexDirection: "row",
    marginBottom: 16,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 14,
    overflow: "hidden",
  },
  mainKpi: {
    flex: 1,
    padding: 14,
    alignItems: "center",
  },
  mainKpiDivider: {
    width: 1,
    backgroundColor: "rgba(255,255,255,0.15)",
    marginVertical: 10,
  },
  mainKpiLabel: {
    ...theme.font.regular,
    fontSize: 11,
    color: "rgba(255,255,255,0.65)",
    marginBottom: 4,
  },
  mainKpiValue: {
    ...theme.font.bold,
    fontSize: 20,
    color: "#fff",
  },

  // Meta
  metaBlock: {
    marginBottom: 14,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 12,
    padding: 12,
  },
  metaTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  metaTitle: {
    ...theme.font.medium,
    fontSize: 12,
    color: "rgba(255,255,255,0.75)",
  },
  metaPct: {
    ...theme.font.bold,
    fontSize: 14,
    color: theme.colors.accentBright,
  },
  progressOuter: {
    height: 6,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 6,
  },
  progressInner: {
    height: 6,
    borderRadius: 3,
  },
  metaSub: {
    ...theme.font.regular,
    fontSize: 11,
    color: "rgba(255,255,255,0.6)",
  },

  // Stats grid
  statsGrid: {
    gap: 8,
    marginBottom: 12,
  },

  // Meta diária
  metaDiariaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 16,
  },
  metaDiariaTxt: {
    ...theme.font.regular,
    fontSize: 12,
    color: "rgba(255,255,255,0.7)",
  },
  metaDiariaVal: {
    ...theme.font.bold,
    color: theme.colors.accentBright,
  },

  // Rodapé da imagem
  imgFooter: {
    marginTop: 4,
  },
  imgFooterDivider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.12)",
    marginBottom: 10,
  },
  imgFooterTxt: {
    ...theme.font.regular,
    fontSize: 11,
    color: "rgba(255,255,255,0.45)",
    textAlign: "center",
  },

  // Botões
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

  dica: {
    ...theme.font.regular,
    fontSize: 12,
    color: theme.colors.textSubtle,
    textAlign: "center",
    marginTop: 14,
    paddingHorizontal: 8,
  },
});

const card = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 10,
    padding: 10,
    borderLeftWidth: 3,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    ...theme.font.regular,
    fontSize: 10,
    color: "rgba(255,255,255,0.65)",
  },
  value: {
    ...theme.font.bold,
    fontSize: 14,
  },
});
