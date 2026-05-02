import React, { useState } from "react";
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
import { useAuth } from "@/hooks/AuthContext";
import { useUI } from "@/hooks/UIContext";
import { useDashboard } from "@/hooks/useDashboard";
import { AppHeader } from "@/components/ui/AppHeader";
import { AppCard } from "@/components/ui/AppCard";
import { AppBarChart } from "@/components/ui/AppBarChart";
import { AppDonutChart } from "@/components/ui/AppDonutChart";
import { AppProgressBar } from "@/components/ui/AppProgressBar";
import { AppFooter } from "@/components/ui/AppFooter";
import { EmptyState } from "@/components/ui/EmptyState";

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const { perfil, onboard } = useAuth();
  const { openDrawer, showModal, hideModal } = useUI();
  const [mes, setMes] = useState(new Date());
  const [semanaOffset, setSemanaOffset] = useState(0);
  const { data, loading, refetching, refetch } = useDashboard(mes, semanaOffset);

  useFocusEffect(
    React.useCallback(() => {
      void refetch();
    }, [refetch]),
  );

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

  const nomeCompleto = perfil?.nome ?? perfil?.email?.split("@")[0] ?? "Motorista";
  const primeiroNome = nomeCompleto.split(/[\s.]+/)[0] ?? "Motorista";
  const nomeUsuario = primeiroNome.charAt(0).toUpperCase() + primeiroNome.slice(1).toLowerCase();

  const irMesAnterior = () => { setMes(new Date(mes.getFullYear(), mes.getMonth() - 1, 1)); setSemanaOffset(0); };
  const irProxMes = () => { setMes(new Date(mes.getFullYear(), mes.getMonth() + 1, 1)); setSemanaOffset(0); };

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
                lucro={data.lucroLiquidoSemana}
                gradient={theme.gradients.primary as readonly [string, string]}
                icon="calendar"
              />
              <KpiCard
                titulo="Este mês"
                valor={data.ganhoMes}
                lucro={data.ganhoMesLiquido}
                gradient={theme.gradients.success as readonly [string, string]}
                icon="trending-up"
              />
            </View>

            {/* Botão Registrar Jornada */}
            <Pressable
              style={({ pressed }) => [styles.registrarBtn, pressed && { opacity: 0.88 }]}
              onPress={() => router.push("/(private)/registrar-jornada")}
            >
              <Ionicons name="add-circle" size={22} color="#fff" />
              <Text style={styles.registrarTxt}>Registrar Jornada</Text>
            </Pressable>

            {/* Meta do mês */}
            <AppCard style={{ marginTop: 14 }}>
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
              <View style={styles.cardTitleRow}>
                <Text style={styles.sectionTitleNoMb}>Ganhos por dia da semana</Text>
                <Text style={styles.cardBigVal}>{currencyEngine.formatar(data.ganhoSemana)}</Text>
              </View>
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
                  centroPercent={data.ganhoMes > 0 ? (data.ganhoMesLiquido / data.ganhoMes) * 100 : 0}
                  totalRef={data.ganhoMes}
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
  lucro,
  gradient,
  icon,
}: {
  titulo: string;
  valor: number;
  lucro: number;
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
        <View style={kpi.lucroRow}>
          <Ionicons name="leaf-outline" size={11} color="rgba(255,255,255,0.8)" />
          <Text style={kpi.lucroBadge}>
            Líquido: {currencyEngine.formatar(lucro)}
          </Text>
        </View>
      </LinearGradient>
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
  registrarBtn: {
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
  registrarTxt: { color: "#fff", ...theme.font.bold, fontSize: 18 },
  sectionTitle: { ...theme.font.semibold, fontSize: 16, color: theme.colors.text, marginBottom: 10 },
  bigValue: { ...theme.font.bold, fontSize: 22, color: theme.colors.text },
  bigMuted: { ...theme.font.medium, fontSize: 16, color: theme.colors.textMuted, alignSelf: "flex-end", marginBottom: 2 },
  metaSubRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 8 },
  helperMt: { ...theme.font.regular, fontSize: 13, color: theme.colors.textMuted },
  metaDiariaBadge: {
    backgroundColor: theme.colors.primary + "18",
    borderRadius: theme.radius.pill,
    paddingHorizontal: 11,
    paddingVertical: 6,
    alignItems: "center",
  },
  metaDiariaLab: { ...theme.font.regular, fontSize: 10, color: theme.colors.primary },
  metaDiariaVal: { ...theme.font.bold, fontSize: 15, color: theme.colors.primary },
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  sectionTitleNoMb: { ...theme.font.semibold, fontSize: 15, color: theme.colors.text },
  cardBigVal: { ...theme.font.bold, fontSize: 20, color: theme.colors.text },
  relBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    marginTop: 4,
  },
  relBtnTxt: { color: theme.colors.primary, ...theme.font.medium, fontSize: 14 },
  legRow: { flexDirection: "row", justifyContent: "space-around", marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: theme.colors.divider },
  legLabel: { ...theme.font.regular, fontSize: 11, color: theme.colors.textMuted },
  legVal: { ...theme.font.semibold, fontSize: 12, color: theme.colors.text, marginTop: 1 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  linkSm: { ...theme.font.medium, fontSize: 13, color: theme.colors.primary },
  jorRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  jorIcon: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: theme.colors.primary + "20",
    alignItems: "center", justifyContent: "center",
  },
  jorTit: { ...theme.font.semibold, fontSize: 14, color: theme.colors.text },
  jorSub: { ...theme.font.regular, fontSize: 12, color: theme.colors.textMuted, marginTop: 2 },
  jorVal: { ...theme.font.bold, fontSize: 15, color: theme.colors.text },
});

const kpi = StyleSheet.create({
  wrap: { flex: 1 },
  bg: { borderRadius: theme.radius.card, padding: 14, minHeight: 110 },
  row: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 },
  titulo: { color: "rgba(255,255,255,0.85)", ...theme.font.medium, fontSize: 13 },
  valor: { color: "#fff", ...theme.font.bold, fontSize: 20, marginBottom: 6 },
  lucroRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  lucroBadge: { color: "rgba(255,255,255,0.85)", ...theme.font.medium, fontSize: 11 },
});
