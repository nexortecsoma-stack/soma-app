import React, { useState } from "react";
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
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { theme } from "@/lib/theme";
import { dateEngine } from "@/engines/date-engine";
import { currencyEngine } from "@/engines/currency-engine";
import { useAuth } from "@/hooks/AuthContext";
import { useCPMA } from "@/hooks/useCPMA";
import type { FiltroPeriodo } from "@/engines/hodometro-engine";
import { APP_FULL_NAME } from "@/lib/constants";

// Largura de cada mini card dentro do card
// ScrollView padding: 16*2=32, cardBg padding: 20*2=40, gaps: 4*2=8
const SHARE_W = Math.floor((Dimensions.get("window").width - 80) / 3);

// ─── Helpers de período ───────────────────────────────────────────────────────

const FILTROS: { id: FiltroPeriodo; label: string }[] = [
  { id: "dia",    label: "Dia" },
  { id: "semana", label: "Semana" },
  { id: "mes",    label: "Mês" },
  { id: "ano",    label: "Ano" },
  { id: "todos",  label: "Tudo" },
];

function refInicial(filtro: FiltroPeriodo): Date {
  const hoje = dateEngine.hoje();
  if (filtro === "mes") return new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  if (filtro === "ano") return new Date(hoje.getFullYear(), 0, 1);
  return hoje;
}

function navAnterior(filtro: FiltroPeriodo, ref: Date): Date {
  if (filtro === "dia")    return dateEngine.somarDias(ref, -1);
  if (filtro === "semana") return dateEngine.somarDias(dateEngine.inicioSemana(ref), -7);
  if (filtro === "mes")    return new Date(ref.getFullYear(), ref.getMonth() - 1, 1);
  if (filtro === "ano")    return new Date(ref.getFullYear() - 1, 0, 1);
  return ref;
}

function navProximo(filtro: FiltroPeriodo, ref: Date): Date {
  if (filtro === "dia")    return dateEngine.somarDias(ref, 1);
  if (filtro === "semana") return dateEngine.somarDias(dateEngine.inicioSemana(ref), 7);
  if (filtro === "mes")    return new Date(ref.getFullYear(), ref.getMonth() + 1, 1);
  if (filtro === "ano")    return new Date(ref.getFullYear() + 1, 0, 1);
  return ref;
}

function proximoBloqueado(filtro: FiltroPeriodo, ref: Date): boolean {
  if (filtro === "todos") return true;
  const hoje = dateEngine.hoje();
  if (filtro === "dia")    return ref >= hoje;
  if (filtro === "semana") return dateEngine.inicioSemana(ref) >= dateEngine.inicioSemana(hoje);
  if (filtro === "mes")    return ref.getFullYear() >= hoje.getFullYear() && ref.getMonth() >= hoje.getMonth();
  if (filtro === "ano")    return ref.getFullYear() >= hoje.getFullYear();
  return false;
}

function labelPeriodo(filtro: FiltroPeriodo, ref: Date): string {
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

// ─── Utilitário ───────────────────────────────────────────────────────────────

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

// ─── Mini card ────────────────────────────────────────────────────────────────

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

// ─── Separador de seção (fundo escuro) ───────────────────────────────────────

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
  const { data: dataParam } = useLocalSearchParams<{ data?: string }>();

  // Quando vem de "Meus Ganhos" com uma data específica, fixamos no dia
  const modoGanho = !!dataParam;

  const [filtro, setFiltro] = useState<FiltroPeriodo>(() => modoGanho ? "dia" : "mes");
  const [refDate, setRefDate] = useState<Date>(() => {
    if (modoGanho && dataParam) {
      const [y, m, d] = dataParam.split("-").map(Number);
      return new Date(y!, m! - 1, d!);
    }
    return refInicial("mes");
  });

  const mudarFiltro = (novo: FiltroPeriodo) => {
    setFiltro(novo);
    setRefDate(refInicial(novo));
  };

  const bloqueado = proximoBloqueado(filtro, refDate);
  const periodoLabel = labelPeriodo(filtro, refDate);

  const { data, isLoading, isFetching, refetch } = useCPMA(filtro, refDate);

  useFocusEffect(
    React.useCallback(() => {
      void refetch();
    }, [refetch]),
  );

  const nomeExibir = perfil?.nome_publico || perfil?.nome || "Motorista";
  const cidade = perfil?.cidade ? `${perfil.cidade}${perfil.uf ? `/${perfil.uf}` : ""}` : null;

  const fmt    = (v: number) => currencyEngine.formatar(v);
  const fmtN   = (v: number, dec = 1) => v.toFixed(dec).replace(".", ",");
  const fmtKm  = (v: number) => `${fmtN(v, 1)} km`;
  const fmtH   = (h: number) => {
    const hh = Math.floor(h);
    const mm = Math.round((h - hh) * 60);
    return mm > 0 ? `${hh}h${String(mm).padStart(2, "0")}min` : `${hh}h`;
  };

  const loading = isLoading || isFetching;

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.surfaceMuted }}>
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingTop: insets.top + 8, paddingBottom: insets.bottom + 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Voltar ─────────────────────────────────────────────────────── */}
        <Pressable
          onPress={() => router.back()}
          hitSlop={16}
          style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}
        >
          <Ionicons name="arrow-back" size={16} color={theme.colors.textMuted} />
          <Text style={styles.backTxt}>Voltar</Text>
        </Pressable>

        {/* ── Chips e navegação — apenas no modo livre (sem data específica) ── */}
        {!modoGanho && (
          <>
            <View style={styles.chipsRow}>
              {FILTROS.map((f) => (
                <Pressable
                  key={f.id}
                  style={[styles.chip, filtro === f.id && styles.chipActive]}
                  onPress={() => mudarFiltro(f.id)}
                >
                  <Text style={[styles.chipTxt, filtro === f.id && styles.chipTxtActive]}>
                    {f.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.navRow}>
              {filtro !== "todos" ? (
                <Pressable onPress={() => setRefDate(navAnterior(filtro, refDate))} hitSlop={12} style={styles.navBtn}>
                  <Ionicons name="chevron-back" size={20} color={theme.colors.primary} />
                </Pressable>
              ) : <View style={styles.navBtn} />}
              <Text style={styles.navLabel}>{periodoLabel}</Text>
              {filtro !== "todos" ? (
                <Pressable
                  onPress={() => !bloqueado && setRefDate(navProximo(filtro, refDate))}
                  hitSlop={12}
                  style={[styles.navBtn, bloqueado && { opacity: 0.25 }]}
                  disabled={bloqueado}
                >
                  <Ionicons name="chevron-forward" size={20} color={theme.colors.primary} />
                </Pressable>
              ) : <View style={styles.navBtn} />}
            </View>
          </>
        )}

        {/* ── Card ───────────────────────────────────────────────────────── */}
        <LinearGradient
          colors={["#020617", "#0B1430", "#0EA5E9"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.card}
        >
          {/* Cabeçalho */}
          <View style={styles.imgHeader}>
            <Image
              source={require("../../assets/images/icon.png")}
              style={styles.imgLogo}
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.imgBrand}>SOMA</Text>
              <Text style={styles.imgFullName} numberOfLines={2}>{APP_FULL_NAME}</Text>
            </View>
            <View style={styles.periodoTag}>
              <Text style={styles.periodoTagTxt}>{periodoLabel}</Text>
            </View>
          </View>

          {/* Motorista */}
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

          {/* Conteúdo */}
          {loading || !data ? (
            <View style={{ paddingVertical: 40, alignItems: "center" }}>
              <ActivityIndicator color={theme.colors.accentBright} />
              <Text style={[styles.driverCity, { marginTop: 8 }]}>Carregando…</Text>
            </View>
          ) : modoGanho ? (
            /* ── Modo jornada do dia ── */
            <>
              {/* KPIs principais */}
              <View style={styles.kpiRow}>
                <View style={styles.kpiBlock}>
                  <Text style={styles.kpiLabel}>Ganho Bruto</Text>
                  <Text style={styles.kpiValue}>{fmt(data.ganhoBruto)}</Text>
                </View>
                <View style={styles.kpiSep} />
                <View style={styles.kpiBlock}>
                  <Text style={styles.kpiLabel}>Ganho Líquido</Text>
                  <Text style={[styles.kpiValue, { color: theme.colors.accentBright }]}>{fmt(data.ganhoLiquido)}</Text>
                  {data.pctLiquido > 0 && <Text style={styles.kpiPct}>{data.pctLiquido}% do bruto</Text>}
                </View>
                <View style={styles.kpiSep} />
                <View style={styles.kpiBlock}>
                  <Text style={styles.kpiLabel}>Ganho Real</Text>
                  <Text style={[styles.kpiValue, { color: data.ganhoReal >= 0 ? theme.colors.success : theme.colors.danger }]}>{fmt(data.ganhoReal)}</Text>
                  {data.pctReal !== 0 && <Text style={styles.kpiPct}>{data.pctReal}% do bruto</Text>}
                </View>
              </View>

              {/* Atividade do dia */}
              <View style={styles.atividadeRow}>
                {data.corridas > 0 && (
                  <View style={styles.atividadeItem}>
                    <Ionicons name="navigate" size={13} color="rgba(255,255,255,0.6)" />
                    <Text style={styles.atividadeTxt}>{data.corridas} corridas</Text>
                  </View>
                )}
                {data.kmTrabalho > 0 && (
                  <View style={styles.atividadeItem}>
                    <Ionicons name="car" size={13} color="rgba(255,255,255,0.6)" />
                    <Text style={styles.atividadeTxt}>{fmtKm(data.kmTrabalho)}</Text>
                  </View>
                )}
                {data.horas > 0 && (
                  <View style={styles.atividadeItem}>
                    <Ionicons name="time" size={13} color="rgba(255,255,255,0.6)" />
                    <Text style={styles.atividadeTxt}>{fmtH(data.horas)}</Text>
                  </View>
                )}
              </View>

              {/* Breakdown Ganho Líquido */}
              <SecLabel>Ganho Líquido</SecLabel>
              <View style={styles.bdRow}>
                <Text style={styles.bdLbl}>Ganho bruto</Text>
                <Text style={styles.bdVal}>{fmt(data.ganhoBruto)}</Text>
              </View>
              {data.despesasItems.map((item) => (
                <View key={item.nome} style={styles.bdRow}>
                  <Text style={styles.bdLbl}>{item.nome}</Text>
                  <Text style={[styles.bdVal, { color: theme.colors.danger }]}>- {fmt(item.valor)}</Text>
                </View>
              ))}
              {data.custoCombustivel > 0 && (
                <View style={styles.bdRow}>
                  <Text style={styles.bdLbl}>
                    Combustível{data.kmTrabalho > 0 ? ` (${Math.round(data.kmTrabalho)} km)` : ""}
                  </Text>
                  <Text style={[styles.bdVal, { color: theme.colors.warning }]}>- {fmt(data.custoCombustivel)}</Text>
                </View>
              )}
              <View style={styles.bdTotal}>
                <Text style={styles.bdTotalLbl}>= Ganho líquido</Text>
                <Text style={[styles.bdTotalVal, { color: theme.colors.accentBright }]}>{fmt(data.ganhoLiquido)}</Text>
              </View>

              {/* Breakdown Ganho Real */}
              {data.custoFixo > 0 && (
                <>
                  <SecLabel>Ganho Real</SecLabel>
                  <View style={styles.bdRow}>
                    <Text style={styles.bdLbl}>Ganho líquido</Text>
                    <Text style={styles.bdVal}>{fmt(data.ganhoLiquido)}</Text>
                  </View>
                  <View style={styles.bdRow}>
                    <Text style={styles.bdLbl}>Custos fixos</Text>
                    <Text style={[styles.bdVal, { color: theme.colors.danger }]}>- {fmt(data.custoFixo)}</Text>
                  </View>
                  <View style={styles.bdTotal}>
                    <Text style={styles.bdTotalLbl}>= Ganho real</Text>
                    <Text style={[styles.bdTotalVal, { color: data.ganhoReal >= 0 ? theme.colors.success : theme.colors.danger }]}>{fmt(data.ganhoReal)}</Text>
                  </View>
                </>
              )}

              {/* Médias brutas */}
              {(data.ganhoPorCorrida > 0 || data.ganhoPorHora > 0 || data.ganhoPorKm > 0) && (
                <>
                  <SecLabel>Médias</SecLabel>
                  <View style={styles.mediasRow}>
                    {data.ganhoPorCorrida > 0 && (
                      <View style={styles.mediaItem}>
                        <Text style={styles.mediaVal}>{fmt(data.ganhoPorCorrida)}</Text>
                        <Text style={styles.mediaLbl}>por corrida</Text>
                      </View>
                    )}
                    {data.ganhoPorHora > 0 && (
                      <View style={styles.mediaItem}>
                        <Text style={styles.mediaVal}>{fmt(data.ganhoPorHora)}</Text>
                        <Text style={styles.mediaLbl}>por hora</Text>
                      </View>
                    )}
                    {data.ganhoPorKm > 0 && (
                      <View style={styles.mediaItem}>
                        <Text style={styles.mediaVal}>{`R$ ${fmtN(data.ganhoPorKm, 2)}`}</Text>
                        <Text style={styles.mediaLbl}>por km</Text>
                      </View>
                    )}
                  </View>
                </>
              )}

              {/* Médias reais */}
              {(data.ganhoRealPorHora !== 0 || data.ganhoPorKmReal !== 0 || data.ganhoRealPorDia !== 0) && (
                <>
                  <SecLabel>Médias Reais</SecLabel>
                  <View style={styles.mediasRow}>
                    <View style={styles.mediaItem}>
                      <Text style={[styles.mediaVal, { color: data.ganhoRealPorHora >= 0 ? theme.colors.success : theme.colors.danger }]}>
                        {data.ganhoRealPorHora !== 0 ? fmt(data.ganhoRealPorHora) : "—"}
                      </Text>
                      <Text style={styles.mediaLbl}>real / hora</Text>
                    </View>
                    <View style={styles.mediaItem}>
                      <Text style={[styles.mediaVal, { color: data.ganhoPorKmReal >= 0 ? theme.colors.success : theme.colors.danger }]}>
                        {data.ganhoPorKmReal !== 0 ? `R$ ${fmtN(data.ganhoPorKmReal, 2)}` : "—"}
                      </Text>
                      <Text style={styles.mediaLbl}>real / km</Text>
                    </View>
                    <View style={styles.mediaItem}>
                      <Text style={[styles.mediaVal, { color: data.ganhoRealPorDia >= 0 ? theme.colors.success : theme.colors.danger }]}>
                        {data.ganhoRealPorDia !== 0 ? fmt(data.ganhoRealPorDia) : "—"}
                      </Text>
                      <Text style={styles.mediaLbl}>real / dia</Text>
                    </View>
                  </View>
                </>
              )}
            </>
          ) : (
            /* ── Modo CPMA completo ── */
            <>
              <SecLabel>Financeiro</SecLabel>
              <View style={styles.grid}>
                <MiniCard icon="cash"  label="Ganho Bruto"   value={fmt(data.ganhoBruto)}  color={theme.colors.primary} />
                <MiniCard icon="leaf"  label="Ganho Líquido" value={fmt(data.ganhoLiquido)} color={theme.colors.success} pct={data.pctLiquido} />
                <MiniCard icon="star"  label="Ganho Real"    value={fmt(data.ganhoReal)}    color={data.ganhoReal >= 0 ? theme.colors.accent : theme.colors.danger} pct={data.pctReal} />
              </View>

              <SecLabel>Custos</SecLabel>
              <View style={styles.grid}>
                <MiniCard icon="alert-circle" label="Total Custos" value={fmt(data.totalCustos)}      color={theme.colors.danger}  pct={data.pctCustos} />
                <MiniCard icon="flame"        label="Combustível"  value={fmt(data.custoCombustivel)} color={theme.colors.warning} pct={data.pctCombustivel} />
                <MiniCard icon="wallet"       label="Custo Fixo"   value={fmt(data.custoFixo)}        color={theme.colors.purple}  pct={data.pctCustoFixo} />
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
                <MiniCard icon="car"   label="KM Trabalhado" value={data.kmTrabalho > 0 ? fmtKm(data.kmTrabalho) : "—"} color={theme.colors.primary} />
                <MiniCard icon="time"  label="Horas Trab."   value={data.horas > 0 ? fmtH(data.horas) : "—"}            color={theme.colors.accent} />
                <MiniCard icon="home"  label="KM Pessoal"    value={data.kmPessoal != null ? fmtKm(data.kmPessoal) : "—"} color={theme.colors.indigo} />
              </View>
              <View style={styles.grid}>
                <MiniCard icon="sunny"    label="Dias Trab."    value={String(data.diasTrabalhados)}  color={theme.colors.success} />
                <MiniCard icon="navigate" label="Corridas"      value={String(data.corridas)}         color={theme.colors.primary} />
                <MiniCard icon="timer"    label="Corridas/hora" value={data.corridasPorHora > 0 ? fmtN(data.corridasPorHora) : "—"} color={theme.colors.warning} />
              </View>

              <SecLabel>Médias</SecLabel>
              <View style={styles.grid}>
                <MiniCard icon="calendar"            label="Ganho / dia"   value={data.ganhoPorDia > 0 ? fmt(data.ganhoPorDia) : "—"}   color={theme.colors.primary} />
                <MiniCard icon="hourglass"           label="Horas / dia"   value={data.horasPorDia > 0 ? fmtH(data.horasPorDia) : "—"}  color={theme.colors.accent} />
                <MiniCard icon="speedometer-outline" label="KM/corrida"    value={data.kmPorCorrida > 0 ? fmtKm(data.kmPorCorrida) : "—"} color={theme.colors.indigo} />
              </View>
              <View style={styles.grid}>
                <MiniCard icon="cash-outline" label="Ganho/corrida" value={data.ganhoPorCorrida > 0 ? fmt(data.ganhoPorCorrida) : "—"}  color={theme.colors.success} />
                <MiniCard icon="trending-up"  label="Ganho / hora"  value={data.ganhoPorHora > 0 ? fmt(data.ganhoPorHora) : "—"}        color={theme.colors.primary} />
                <MiniCard icon="leaf"         label="Real / hora"   value={data.ganhoRealPorHora !== 0 ? fmt(data.ganhoRealPorHora) : "—"} color={data.ganhoRealPorHora >= 0 ? theme.colors.success : theme.colors.danger} />
              </View>

              <SecLabel>Índices</SecLabel>
              <View style={styles.grid}>
                <MiniCard icon="trending-down"  label="Custo / hora"  value={data.custoPorHora > 0 ? fmt(data.custoPorHora) : "—"}    color={theme.colors.danger} />
                <MiniCard icon="remove-circle"  label="Custo/corrida" value={data.custoPorCorrida > 0 ? fmt(data.custoPorCorrida) : "—"} color={theme.colors.orange} />
                <MiniCard icon="analytics"      label="Custo / km"    value={data.custoPorKm > 0 ? `R$ ${fmtN(data.custoPorKm, 2)}` : "—"} color={theme.colors.warning} />
              </View>
              <View style={styles.grid}>
                <MiniCard icon="add-circle"   label="Ganho / km" value={data.ganhoPorKm > 0 ? `R$ ${fmtN(data.ganhoPorKm, 2)}` : "—"} color={theme.colors.primary} />
                <MiniCard icon="leaf-outline" label="Real / km"  value={data.ganhoPorKmReal !== 0 ? `R$ ${fmtN(data.ganhoPorKmReal, 2)}` : "—"} color={data.ganhoPorKmReal >= 0 ? theme.colors.success : theme.colors.danger} />
                <View style={{ width: SHARE_W }} />
              </View>
            </>
          )}

          {/* Rodapé */}
          <View style={styles.footer}>
            <View style={styles.footerLine} />
            <Text style={styles.footerTxt}>nexortec.com.br · SOMA App 2026</Text>
          </View>
        </LinearGradient>

        {/* ── Dica discreta ──────────────────────────────────────────────── */}
        <Text style={styles.dica}>Tire um print para compartilhar seus resultados.</Text>
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    marginBottom: 14,
  },
  backTxt: {
    ...theme.font.medium,
    fontSize: 13,
    color: theme.colors.textMuted,
  },

  chipsRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 10,
    flexWrap: "wrap",
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  chipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  chipTxt: {
    ...theme.font.medium,
    fontSize: 13,
    color: theme.colors.textMuted,
  },
  chipTxtActive: {
    color: "#fff",
  },

  navRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  navBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  navLabel: {
    ...theme.font.semibold,
    fontSize: 14,
    color: theme.colors.text,
    flex: 1,
    textAlign: "center",
  },

  card: {
    borderRadius: 20,
    padding: 20,
    ...theme.shadow.soft,
  },

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
  periodoTag: {
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  periodoTagTxt: {
    ...theme.font.semibold,
    fontSize: 11,
    color: theme.colors.accentBright,
  },

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

  grid: {
    flexDirection: "row",
    gap: 4,
    marginBottom: 4,
  },

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

  dica: {
    ...theme.font.regular,
    fontSize: 12,
    color: theme.colors.textSubtle,
    textAlign: "center",
    marginTop: 14,
  },

  // ── Modo ganho: KPIs principais ──────────────────────────────────────────
  kpiRow: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 14,
    marginBottom: 12,
    overflow: "hidden",
  },
  kpiBlock: {
    flex: 1,
    padding: 10,
    alignItems: "center",
  },
  kpiSep: {
    width: 1,
    backgroundColor: "rgba(255,255,255,0.15)",
    marginVertical: 8,
  },
  kpiLabel: {
    ...theme.font.regular,
    fontSize: 9,
    color: "rgba(255,255,255,0.6)",
    marginBottom: 4,
    textAlign: "center",
  },
  kpiValue: {
    ...theme.font.bold,
    fontSize: 13,
    color: "#fff",
    textAlign: "center",
  },
  kpiPct: {
    ...theme.font.medium,
    fontSize: 9,
    color: "rgba(255,255,255,0.5)",
    marginTop: 2,
  },

  // ── Modo ganho: atividade inline ──────────────────────────────────────────
  atividadeRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 14,
    marginBottom: 4,
    flexWrap: "wrap",
  },
  atividadeItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  atividadeTxt: {
    ...theme.font.medium,
    fontSize: 12,
    color: "rgba(255,255,255,0.65)",
  },

  // ── Modo ganho: breakdown rows ────────────────────────────────────────────
  bdRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 3,
  },
  bdLbl: {
    ...theme.font.regular,
    fontSize: 12,
    color: "rgba(255,255,255,0.65)",
    flex: 1,
  },
  bdVal: {
    ...theme.font.semibold,
    fontSize: 12,
    color: "#fff",
  },
  bdTotal: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.2)",
    marginTop: 4,
    paddingTop: 5,
    marginBottom: 2,
  },
  bdTotalLbl: {
    ...theme.font.bold,
    fontSize: 13,
    color: "#fff",
  },
  bdTotalVal: {
    ...theme.font.bold,
    fontSize: 15,
  },

  // ── Modo ganho: médias ────────────────────────────────────────────────────
  mediasRow: {
    flexDirection: "row",
    gap: 6,
  },
  mediaItem: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 10,
    padding: 10,
    alignItems: "center",
  },
  mediaVal: {
    ...theme.font.bold,
    fontSize: 13,
    color: theme.colors.accentBright,
    marginBottom: 2,
  },
  mediaLbl: {
    ...theme.font.regular,
    fontSize: 10,
    color: "rgba(255,255,255,0.55)",
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

// ─── Section label styles (fundo escuro) ─────────────────────────────────────

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
