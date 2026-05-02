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

const LABEL_H = 34;
const PILL_H = 22; // espaço reservado para o label acima da linha

export function AppBarChart({ data, altura = 160, onPrev, onNext, navLabel, barColor }: Props) {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [chartW, setChartW] = useState(0);

  const max = Math.max(...data.map((d) => d.valor), 1);
  const barAreaH = altura - LABEL_H;

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

      {/* Área total = PILL_H (label acima) + barAreaH + LABEL_H */}
      <View style={{ height: altura + PILL_H }} onLayout={handleLayout}>

        {/* Valor acima da linha, à esquerda */}
        {chartW > 0 && pillValor > 0 && (
          <View style={styles.pillWrap} pointerEvents="none">
            <View style={[styles.pill, { backgroundColor: activeColor }]}>
              <Text style={styles.pillTxt}>
                {`R$${currencyEngine.formatarNumero(pillValor, 0)}`}
              </Text>
            </View>
          </View>
        )}

        {/* Linha pontilhada logo abaixo do label (top = PILL_H) */}
        {chartW > 0 && (
          <View style={[styles.lineRow, { top: PILL_H }]} pointerEvents="none">
            <Svg height={2} width={chartW}>
              <Line
                x1={0} y1={1}
                x2={chartW} y2={1}
                stroke={activeColor}
                strokeWidth={1.5}
                strokeDasharray="5 4"
                strokeOpacity={0.65}
              />
            </Svg>
          </View>
        )}

        {/* Barras: começam em top = PILL_H */}
        <View style={[styles.barArea, { height: barAreaH, marginTop: PILL_H }]}>
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
                <View style={[styles.bar, { height: h, backgroundColor: cor }]} />
              </Pressable>
            );
          })}
        </View>

        {/* Rótulos */}
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
  pillWrap: {
    position: "absolute",
    top: 0,
    left: 0,
    zIndex: 3,
  },
  pill: {
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  pillTxt: { ...theme.font.bold, fontSize: 10, color: "#fff" },
  lineRow: {
    position: "absolute",
    left: 0,
    right: 0,
    zIndex: 2,
  },
  barArea: {
    flexDirection: "row",
    alignItems: "flex-end",
  },
  barCol: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
    height: "100%",
  },
  bar: { width: "82%" },
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
