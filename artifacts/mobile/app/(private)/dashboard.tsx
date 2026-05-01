import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { theme } from "@/lib/theme";
import { dateEngine } from "@/engines/date-engine";
import { currencyEngine } from "@/engines/currency-engine";
import { jornadaEngine } from "@/engines/jornada-engine";
import { useAuth } from "@/hooks/AuthContext";
import { useUI } from "@/hooks/UIContext";
import { useDashboard } from "@/hooks/useDashboard";
import { useJornadas } from "@/hooks/useJornadas";
import { useLocationTracking } from "@/hooks/useLocationTracking";
import { AppHeader } from "@/components/ui/AppHeader";
import { AppCard } from "@/components/ui/AppCard";
import { AppBarChart } from "@/components/ui/AppBarChart";
import { AppDonutChart } from "@/components/ui/AppDonutChart";
import { AppProgressBar } from "@/components/ui/AppProgressBar";
import { AppFooter } from "@/components/ui/AppFooter";
import { EmptyState } from "@/components/ui/EmptyState";

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const { perfil, onboard, session } = useAuth();
  const { openDrawer, showModal, hideModal, showToast } = useUI();
  const [mes, setMes] = useState(new Date());
  const [semanaOffset, setSemanaOffset] = useState(0);
  const [tick, setTick] = useState(0);
  const { data, loading, refetching, refetch } = useDashboard(mes, semanaOffset);
  const { ativa, iniciar, pausar, continuar, encerrar } = useJornadas();

  const jornadaAtiva = ativa.data ?? null;
  const tracking = useLocationTracking({
    ativo: !!jornadaAtiva && jornadaAtiva.status === "ativa",
    jornadaId: jornadaAtiva?.id ?? null,
    profileId: session?.user?.id ?? null,
  });

  useFocusEffect(
    React.useCallback(() => {
      void refetch();
    }, [refetch]),
  );

  useEffect(() => {
    if (!jornadaAtiva) return;
    const t = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, [!!jornadaAtiva]);

  void tick;

  const tempoCorrido = (() => {
    if (!jornadaAtiva) return 0;
    // Base em segundos (tempo_efetivo_minutos salvo no banco × 60)
    let efetivo = (jornadaAtiva.tempo_efetivo_minutos || 0) * 60;
    if (jornadaAtiva.status === "ativa" && jornadaAtiva.started_at) {
      efetivo += Math.max(
        0,
        Math.floor((Date.now() - new Date(jornadaAtiva.started_at).getTime()) / 1000),
      );
    }
    return efetivo;
  })();

  const nomeCompleto = perfil?.nome ?? perfil?.email?.split("@")[0] ?? "Motorista";
  const primeiroNome = nomeCompleto.split(/[\s.]+/)[0] ?? "Motorista";
  const nomeUsuario = primeiroNome.charAt(0).toUpperCase() + primeiroNome.slice(1).toLowerCase();

  const irMesAnterior = () => { setMes(new Date(mes.getFullYear(), mes.getMonth() - 1, 1)); setSemanaOffset(0); };
  const irProxMes = () => { setMes(new Date(mes.getFullYear(), mes.getMonth() + 1, 1)); setSemanaOffset(0); };

  React.useEffect(() => {
    if (!onboard.completo && perfil) {
      const t = setTimeout(() => {
        if (onboard.completo) return;
        showModal({
          type: "onboard",
          title: "Vamos completar seu cadastro",
          message:
            "Para usar o app por completo precisamos de:\n\n• " +
            onboard.faltando.join("\n• "),
          confirmLabel: "Completar perfil",
          cancelLabel: "Depois",
          onConfirm: () => {
            hideModal();
            router.push("/(private)/perfil");
          },
          onCancel: hideModal,
        });
      }, 600);
      return () => clearTimeout(t);
    }
  }, [onboard.completo, perfil?.id]);

  const onIniciar = () => {
    iniciar.mutate(undefined, {
      onSuccess: () => {
        showToast({ type: "success", message: "Jornada iniciada" });
        tracking.reset();
      },
      onError: () => showToast({ type: "error", message: "Erro ao iniciar jornada" }),
    });
  };

  const onPausar = () => {
    if (!jornadaAtiva) return;
    pausar.mutate(jornadaAtiva, {
      onSuccess: () => showToast({ type: "success", message: "Jornada pausada" }),
      onError: () => showToast({ type: "error", message: "Erro ao pausar" }),
    });
  };

  const onContinuar = () => {
    if (!jornadaAtiva) return;
    continuar.mutate(jornadaAtiva, {
      onSuccess: () => showToast({ type: "success", message: "Jornada retomada" }),
      onError: () => showToast({ type: "error", message: "Erro ao continuar" }),
    });
  };

  const onEncerrar = () => {
    if (!jornadaAtiva) return;
    showModal({
      type: "confirm",
      title: "Encerrar jornada?",
      message: `Tempo: ${jornadaEngine.formatarMinutos(Math.floor(tempoCorrido / 60))} · ${tracking.kmAcumulado.toFixed(2)} km. Confirmar encerramento?`,
      confirmLabel: "Encerrar",
      cancelLabel: "Continuar",
      onConfirm: () => {
        hideModal();
        const kmFinal = tracking.kmAcumulado;
        const jornadaSnapshot = jornadaAtiva;

        // Encerra imediatamente — sem esperar pelo flush do background
        encerrar.mutate(
          { jornada: jornadaSnapshot, kmReal: kmFinal },
          {
            onSuccess: () => {
              tracking.reset();
              showToast({ type: "success", message: "Jornada encerrada" });
              void refetch();
            },
            onError: (err) => {
              console.error("[SOMA] Erro ao encerrar jornada:", err);
              showToast({ type: "error", message: "Erro ao encerrar jornada" });
            },
          },
        );

        // Flush dos pontos de background em paralelo (não bloqueia o encerramento)
        tracking.flushBackground(perfil?.id ?? "").catch((e: unknown) => {
          console.warn("[SOMA] flushBackground falhou:", e);
        });
      },
      onCancel: hideModal,
    });
  };

  return (
    <View style={{ flex: 1 }}>
      <AppHeader
        showLogo
        showSaudacao
        saudacao={dateEngine.saudacao()}
        nomeUsuario={nomeUsuario}
        onMenuPress={openDrawer}
        rightContent={
          <Pressable onPress={() => router.push("/(private)/perfil")} hitSlop={8}>
            <Ionicons name="person-circle" size={28} color="#fff" />
          </Pressable>
        }
      />
      <ScrollView
        contentContainerStyle={{ padding: 14, paddingBottom: insets.bottom + 100 }}
        refreshControl={
          <RefreshControl
            refreshing={refetching}
            onRefresh={refetch}
            tintColor={theme.colors.primary}
          />
        }
      >
        <View style={styles.mesRow}>
          <Pressable onPress={irMesAnterior} hitSlop={10}>
            <Ionicons name="chevron-back" size={20} color={theme.colors.text} />
          </Pressable>
          <Text style={styles.mesTxt}>{dateEngine.formatarMesAno(mes)}</Text>
          <Pressable onPress={irProxMes} hitSlop={10}>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.text} />
          </Pressable>
        </View>

        {loading || !data ? (
          <View style={{ paddingVertical: 60 }}>
            <ActivityIndicator color={theme.colors.primary} />
          </View>
        ) : (
          <>
            {/* KPI Cards: Semana e Mês */}
            <View style={styles.gridRow}>
              <KpiCard
                titulo="Esta semana"
                valor={data.ganhoSemana}
                badge={`${data.variacaoSemana >= 0 ? "+" : ""}${data.variacaoSemana}% vs anterior`}
                gradient={theme.gradients.primary as readonly [string, string]}
                icon="calendar"
              />
              <KpiCard
                titulo="Este mês"
                valor={data.ganhoMes}
                badge={`${data.percentualMes}% da meta`}
                gradient={theme.gradients.success as readonly [string, string]}
                icon="trending-up"
              />
            </View>

            {/* Bloco de Jornada */}
            {ativa.isLoading ? (
              <View style={styles.jornadaLoading}>
                <ActivityIndicator color={theme.colors.primary} size="small" />
                <Text style={styles.jornadaLoadingTxt}>Verificando jornada...</Text>
              </View>
            ) : jornadaAtiva ? (
              /* Jornada ativa — contador ao vivo */
              <AppCard style={styles.jornadaCard}>
                <View style={styles.jornadaHeader}>
                  <View style={styles.statusRow}>
                    <View
                      style={[
                        styles.statusDot,
                        {
                          backgroundColor:
                            jornadaAtiva.status === "ativa"
                              ? theme.colors.success
                              : theme.colors.warning,
                        },
                      ]}
                    />
                    <Text style={styles.statusTxt}>
                      {jornadaAtiva.status === "ativa" ? "Jornada em andamento" : "Jornada pausada"}
                    </Text>
                  </View>
                  {jornadaAtiva.started_at ? (
                    <Text style={styles.inicioTxt}>
                      Início:{" "}
                      {new Date(jornadaAtiva.started_at).toLocaleTimeString("pt-BR").slice(0, 5)}
                    </Text>
                  ) : null}
                </View>

                <View style={styles.metricsRow}>
                  <MetricBox
                    icon="time-outline"
                    label="Tempo efetivo"
                    valor={jornadaEngine.formatarSegundos(tempoCorrido)}
                    destaque
                  />
                  <MetricBox
                    icon="navigate-outline"
                    label="Km percorrido"
                    valor={`${tracking.kmAcumulado.toFixed(2)} km`}
                  />
                </View>

                <View style={styles.botoesJornada}>
                  {jornadaAtiva.status === "ativa" ? (
                    <Pressable
                      style={[styles.btnJornada, styles.btnPausar]}
                      onPress={onPausar}
                      disabled={pausar.isPending}
                    >
                      {pausar.isPending ? (
                        <ActivityIndicator size="small" color={theme.colors.warning} />
                      ) : (
                        <Ionicons name="pause" size={18} color={theme.colors.warning} />
                      )}
                      <Text style={[styles.btnJornadaTxt, { color: theme.colors.warning }]}>
                        Pausar
                      </Text>
                    </Pressable>
                  ) : (
                    <Pressable
                      style={[styles.btnJornada, styles.btnContinuar]}
                      onPress={onContinuar}
                      disabled={continuar.isPending}
                    >
                      {continuar.isPending ? (
                        <ActivityIndicator size="small" color={theme.colors.primary} />
                      ) : (
                        <Ionicons name="play" size={18} color={theme.colors.primary} />
                      )}
                      <Text style={[styles.btnJornadaTxt, { color: theme.colors.primary }]}>
                        Continuar
                      </Text>
                    </Pressable>
                  )}
                  <Pressable
                    style={[styles.btnJornada, styles.btnEncerrar]}
                    onPress={onEncerrar}
                    disabled={encerrar.isPending}
                  >
                    {encerrar.isPending ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Ionicons name="stop" size={18} color="#fff" />
                    )}
                    <Text style={[styles.btnJornadaTxt, { color: "#fff" }]}>Encerrar</Text>
                  </Pressable>
                </View>
              </AppCard>
            ) : (
              /* Sem jornada ativa — botão Iniciar */
              <Pressable
                style={styles.iniciarBtn}
                onPress={onIniciar}
                disabled={iniciar.isPending}
              >
                {iniciar.isPending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="play-circle" size={22} color="#fff" />
                )}
                <Text style={styles.iniciarTxt}>Iniciar Jornada</Text>
              </Pressable>
            )}

            {/* Lançar jornada manual */}
            <Pressable
              style={styles.lancarBtn}
              onPress={() => router.push("/(private)/registrar-jornada")}
            >
              <Ionicons name="create-outline" size={16} color={theme.colors.primary} />
              <Text style={styles.lancarTxt}>Lançar jornada manualmente</Text>
            </Pressable>

            {/* Meta do mês */}
            <AppCard style={{ marginTop: 6 }}>
              <Text style={styles.sectionTitle}>Meta do mês</Text>
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
                <Text style={styles.bigValue}>{currencyEngine.formatar(data.ganhoMes)}</Text>
                <Text style={styles.bigMuted}>{currencyEngine.formatar(data.metaMensal)}</Text>
              </View>
              <AppProgressBar percentual={data.percentualMes} rightLabel={`${data.percentualMes}%`} />
              <View style={styles.metaSubRow}>
                {data.percentualMes >= 100 ? (
                  <Text style={styles.helperMt}>Parabéns, você bateu sua meta!</Text>
                ) : (
                  <Text style={styles.helperMt}>
                    Faltam{" "}
                    {currencyEngine.formatar(Math.max(0, data.metaMensal - data.ganhoMes))}
                  </Text>
                )}
                <View style={styles.metaDiariaBadge}>
                  <Text style={styles.metaDiariaLab}>Meta diária</Text>
                  <Text style={styles.metaDiariaVal}>
                    {currencyEngine.formatar(data.metaDiariaAjustada)}
                  </Text>
                </View>
              </View>
            </AppCard>

            {/* Gráfico semanal */}
            <AppCard style={{ marginTop: 14 }}>
              <Text style={styles.sectionTitle}>Ganhos por dia da semana</Text>
              <AppBarChart
                data={data.semanal.map((s) => ({
                  label: s.dia,
                  sublabel: String(s.diaNum).padStart(2, "0"),
                  valor: s.valor,
                }))}
                onPrev={semanaOffset > -4 ? () => setSemanaOffset((n) => n - 1) : undefined}
                onNext={semanaOffset < 0 ? () => setSemanaOffset((n) => n + 1) : undefined}
                navLabel={semanaOffset === 0 ? "esta semana" : `${semanaOffset < 0 ? semanaOffset : `+${semanaOffset}`} sem.`}
              />
            </AppCard>

            {/* Link Relatórios */}
            <Pressable
              style={styles.relBtn}
              onPress={() => router.push("/(private)/relatorios")}
            >
              <Ionicons name="bar-chart-outline" size={16} color={theme.colors.primary} />
              <Text style={styles.relBtnTxt}>Ver relatórios por plataforma</Text>
              <Ionicons name="chevron-forward" size={14} color={theme.colors.primary} />
            </Pressable>

            {/* Composição */}
            <AppCard style={{ marginTop: 14 }}>
              <Text style={styles.sectionTitle}>Composição do mês</Text>
              {data.rosca.length === 0 ? (
                <EmptyState
                  icon="pie-chart"
                  titulo="Sem despesas no mês"
                  mensagem="Adicione despesas para visualizar a composição."
                />
              ) : (
                <AppDonutChart
                  data={data.rosca}
                  centroLabel="Líquido"
                  centroValor={data.ganhoMesLiquido}
                />
              )}
              <View style={styles.legRow}>
                <LegItem
                  label="Ganhos"
                  valor={currencyEngine.formatar(data.ganhoMes)}
                  cor={theme.colors.primary}
                />
                <LegItem
                  label="Despesas"
                  valor={currencyEngine.formatar(data.despesasMes)}
                  cor={theme.colors.danger}
                />
                <LegItem
                  label="Custo fixo"
                  valor={currencyEngine.formatar(data.custoFixoMes)}
                  cor={theme.colors.warning}
                />
              </View>
            </AppCard>

            {/* Última jornada */}
            {data.ultimaJornada ? (
              <AppCard style={{ marginTop: 14 }}>
                <View style={styles.headerRow}>
                  <Text style={styles.sectionTitle}>Última jornada</Text>
                  <Pressable
                    onPress={() => router.push("/(private)/minhas-jornadas")}
                    hitSlop={6}
                  >
                    <Text style={styles.linkSm}>Ver todas</Text>
                  </Pressable>
                </View>
                <View style={styles.jorRow}>
                  <View style={styles.jorIcon}>
                    <Ionicons name="play" size={18} color={theme.colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.jorTit}>
                      {data.ultimaJornada.diaSemana}, {data.ultimaJornada.data}
                    </Text>
                    <Text style={styles.jorSub}>
                      {data.ultimaJornada.plataforma} · {data.ultimaJornada.corridas} corridas
                    </Text>
                  </View>
                  <Text style={styles.jorVal}>
                    {currencyEngine.formatar(data.ultimaJornada.valor)}
                  </Text>
                </View>
              </AppCard>
            ) : null}
          </>
        )}
        <AppFooter />
      </ScrollView>
    </View>
  );
}

function KpiCard({
  titulo,
  valor,
  badge,
  gradient,
  icon,
}: {
  titulo: string;
  valor: number;
  badge?: string;
  gradient: readonly [string, string];
  icon: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <View style={kpi.wrap}>
      <LinearGradient
        colors={gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={kpi.bg}
      >
        <View style={kpi.row}>
          <Ionicons name={icon} size={18} color="#fff" />
          <Text style={kpi.titulo}>{titulo}</Text>
        </View>
        <Text style={kpi.valor}>{currencyEngine.formatar(valor)}</Text>
        {badge ? <Text style={kpi.badge}>{badge}</Text> : null}
      </LinearGradient>
    </View>
  );
}

function MetricBox({
  icon,
  label,
  valor,
  destaque,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  valor: string;
  destaque?: boolean;
}) {
  return (
    <View style={[metric.wrap, destaque && metric.destaqueWrap]}>
      <Ionicons
        name={icon}
        size={18}
        color={destaque ? theme.colors.primary : theme.colors.textMuted}
      />
      <Text style={metric.label}>{label}</Text>
      <Text style={[metric.valor, destaque && { color: theme.colors.primary }]}>{valor}</Text>
    </View>
  );
}

function LegItem({ label, valor, cor }: { label: string; valor: string; cor: string }) {
  return (
    <View style={{ alignItems: "center" }}>
      <View
        style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: cor, marginBottom: 4 }}
      />
      <Text style={styles.legLabel}>{label}</Text>
      <Text style={styles.legVal}>{valor}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  mesRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 4,
    marginBottom: 12,
  },
  mesTxt: { ...theme.font.semibold, fontSize: 17, color: theme.colors.text },
  gridRow: { flexDirection: "row", gap: 10 },
  jornadaLoading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 4,
  },
  jornadaLoadingTxt: {
    ...theme.font.medium,
    fontSize: 15,
    color: theme.colors.textMuted,
  },
  jornadaCard: { marginTop: 12 },
  jornadaHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  statusTxt: { ...theme.font.semibold, fontSize: 16, color: theme.colors.text },
  inicioTxt: { ...theme.font.medium, fontSize: 14, color: theme.colors.textMuted },
  metricsRow: { flexDirection: "row", gap: 10, marginBottom: 14 },
  botoesJornada: { flexDirection: "row", gap: 10 },
  btnJornada: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 11,
    borderRadius: theme.radius.pill,
    borderWidth: 1.5,
  },
  btnPausar: {
    borderColor: theme.colors.warning,
    backgroundColor: theme.colors.warning + "15",
  },
  btnContinuar: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary + "15",
  },
  btnEncerrar: {
    borderColor: theme.colors.danger,
    backgroundColor: theme.colors.danger,
    flex: 1.4,
  },
  btnJornadaTxt: { ...theme.font.semibold, fontSize: 15 },
  iniciarBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.pill,
    paddingVertical: 14,
    marginTop: 12,
    ...theme.shadow.soft,
  },
  iniciarTxt: { color: "#fff", ...theme.font.bold, fontSize: 18 },
  lancarBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    marginTop: 6,
    marginBottom: 6,
  },
  lancarTxt: {
    color: theme.colors.primary,
    ...theme.font.semibold,
    fontSize: 15,
  },
  sectionTitle: {
    ...theme.font.semibold,
    fontSize: 16,
    color: theme.colors.text,
    marginBottom: 10,
  },
  relBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: theme.colors.primary + "12",
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.primary + "30",
  },
  relBtnTxt: {
    flex: 1,
    ...theme.font.semibold,
    fontSize: 15,
    color: theme.colors.primary,
  },
  bigValue: { ...theme.font.bold, fontSize: 22, color: theme.colors.text },
  bigMuted: {
    ...theme.font.medium,
    fontSize: 16,
    color: theme.colors.textMuted,
    alignSelf: "flex-end",
  },
  metaSubRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginTop: 8,
  },
  helperMt: {
    fontSize: 14,
    color: theme.colors.textMuted,
    ...theme.font.regular,
    flex: 1,
  },
  metaDiariaBadge: {
    backgroundColor: theme.colors.primary + "15",
    borderRadius: theme.radius.md,
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignItems: "center",
  },
  metaDiariaLab: { fontSize: 12, color: theme.colors.primary, ...theme.font.medium },
  metaDiariaVal: {
    fontSize: 16,
    color: theme.colors.primary,
    ...theme.font.bold,
    marginTop: 2,
  },
  legRow: { flexDirection: "row", justifyContent: "space-around", marginTop: 14 },
  legLabel: { fontSize: 13, color: theme.colors.textMuted, ...theme.font.medium },
  legVal: { fontSize: 14, color: theme.colors.text, ...theme.font.semibold },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  linkSm: { color: theme.colors.primary, ...theme.font.semibold, fontSize: 14 },
  jorRow: { flexDirection: "row", alignItems: "center", marginTop: 6 },
  jorIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: theme.colors.primary + "1A",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  jorTit: { ...theme.font.semibold, fontSize: 15, color: theme.colors.text },
  jorSub: {
    ...theme.font.regular,
    fontSize: 14,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  jorVal: { ...theme.font.bold, fontSize: 17, color: theme.colors.success },
});

const kpi = StyleSheet.create({
  wrap: { flex: 1, borderRadius: theme.radius.lg, overflow: "hidden", ...theme.shadow.soft },
  bg: { padding: 14, minHeight: 110 },
  row: { flexDirection: "row", alignItems: "center", gap: 6 },
  titulo: { color: "rgba(255,255,255,0.9)", ...theme.font.medium, fontSize: 14 },
  valor: { color: "#fff", ...theme.font.bold, fontSize: 22, marginTop: 8 },
  badge: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 13,
    ...theme.font.medium,
    marginTop: 6,
  },
});

const metric = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: theme.radius.md,
    padding: 12,
    alignItems: "center",
    gap: 4,
  },
  destaqueWrap: { backgroundColor: theme.colors.primary + "12" },
  label: { fontSize: 13, color: theme.colors.textMuted, ...theme.font.medium },
  valor: { fontSize: 20, ...theme.font.bold, color: theme.colors.text },
});
