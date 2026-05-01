import React, { useState } from "react";
import { LayoutChangeEvent, Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Line } from "react-native-svg";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "@/lib/theme";
import { currencyEngine } from "@/engines/currency-engine";

export interface BarItem { label: string; sublabel?: string; valor: number }

interface Props {
  data: BarItem[];
  altura?: number;
  onPrev?: () => void;
  onNext?: () => void;
  navLabel?: string;
  barColor?: string;
}

const LABEL_H = 34; // altura fixa da área de rótulos abaixo das barras

export function AppBarChart({ data, altura = 160, onPrev, onNext, navLabel, barColor }: Props) {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [chartW, setChartW] = useState(0);

  const max = Math.max(...data.map((d) => d.valor), 1);
  const barAreaH = altura - LABEL_H; // altura da área de barras

  const pillValor =
    selectedIdx !== null && data[selectedIdx]
      ? data[selectedIdx]!.valor
      : max;

  const activeColor = barColor ?? theme.colors.primary;

  const handleLayout = (e: LayoutChangeEvent) => setChartW(e.nativeEvent.layout.width);

  return (
    <View style={styles.wrap}>
      {(onPrev || onNext || navLabel) && (
        <View style={styles.navRow}>
          <Pressable onPress={onPrev} hitSlop={10} disabled={!onPrev}>
            <Ionicons name="chevron-back" size={18} color={onPrev ? theme.colors.text : theme.colors.border} />
          </Pressable>
          {navLabel ? <Text style={styles.navLab}>{navLabel}</Text> : null}
          <Pressable onPress={onNext} hitSlop={10} disabled={!onNext}>
            <Ionicons name="chevron-forward" size={18} color={onNext ? theme.colors.text : theme.colors.border} />
          </Pressable>
        </View>
      )}

      {/* Área total do gráfico */}
      <View style={{ height: altura }} onLayout={handleLayout}>

        {/* Linha pontilhada: top: 0 = topo exato das barras = nível da maior barra */}
        {chartW > 0 && (
          <View
            style={[styles.lineRow, { top: 0 }]}
            pointerEvents="none"
          >
            <Svg height={2} width={chartW - 58} style={styles.svg}>
              <Line
                x1={0} y1={1}
                x2={chartW - 58} y2={1}
                stroke={activeColor}
                strokeWidth={1.5}
                strokeDasharray="5 4"
                strokeOpacity={0.65}
              />
            </Svg>
            <View style={[styles.pill, { backgroundColor: activeColor }]}>
              <Text style={styles.pillTxt}>
                {pillValor > 0 ? `R$${currencyEngine.formatarNumero(pillValor, 0)}` : ""}
              </Text>
            </View>
          </View>
        )}

        {/* Área de barras: ocupa top:0 até bottom:LABEL_H */}
        <View style={[styles.barArea, { height: barAreaH }]}>
          {data.map((d, i) => {
            const h = max > 0 ? Math.max(4, (d.valor / max) * barAreaH) : 4;
            const isSelected = selectedIdx === i;
            const cor =
              d.valor > 0
                ? isSelected ? theme.colors.accent : activeColor
                : theme.colors.border;
            return (
              <Pressable
                key={i}
                style={styles.barCol}
                onPress={() => setSelectedIdx(isSelected ? null : i)}
                hitSlop={4}
              >
                {/* Barra crescendo a partir do fundo */}
                <View style={[styles.bar, { height: h, backgroundColor: cor }]} />
              </Pressable>
            );
          })}
        </View>

        {/* Área de rótulos: fixo na base */}
        <View style={[styles.labelArea, { height: LABEL_H }]}>
          {data.map((d, i) => {
            const isSelected = selectedIdx === i;
            return (
              <Pressable
                key={i}
                style={styles.labelCol}
                onPress={() => setSelectedIdx(selectedIdx === i ? null : i)}
                hitSlop={4}
              >
                <Text style={[styles.label, isSelected && { color: activeColor }]}>
                  {d.label}
                </Text>
                {d.sublabel ? (
                  <Text style={[styles.sublabel, isSelected && { color: theme.colors.accent }]}>
                    {d.sublabel}
                  </Text>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingTop: 4 },
  navRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  navLab: { ...theme.font.semibold, fontSize: 12, color: theme.colors.textMuted },
  lineRow: {
    position: "absolute",
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    zIndex: 2,
  },
  svg: { flex: 1 },
  pill: {
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 2,
    marginLeft: 4,
    minWidth: 48,
    alignItems: "center",
  },
  pillTxt: { ...theme.font.bold, fontSize: 9, color: "#fff" },
  barArea: {
    flexDirection: "row",
    alignItems: "flex-end", // barras crescem para cima a partir da base
  },
  barCol: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
    height: "100%",
  },
  bar: { width: "65%", borderTopLeftRadius: 6, borderTopRightRadius: 6 },
  labelArea: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingTop: 4,
  },
  labelCol: { flex: 1, alignItems: "center" },
  label: {
    fontSize: 10,
    color: theme.colors.textMuted,
    ...theme.font.medium,
  },
  sublabel: { fontSize: 9, color: theme.colors.textSubtle, ...theme.font.regular },
});
