import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle, G } from "react-native-svg";
import { theme } from "@/lib/theme";
import { currencyEngine } from "@/engines/currency-engine";

interface Item {
  categoria: string;
  valor: number;
  cor: string;
}

interface Props {
  data: Item[];
  size?: number;
  strokeWidth?: number;
  centroLabel?: string;
  centroValor?: number;
  centroPercent?: number;
  totalRef?: number;
}

export function AppDonutChart({
  data,
  size = 150,
  strokeWidth = 22,
  centroLabel = "Total",
  centroValor,
  centroPercent,
  totalRef,
}: Props) {
  const total = data.reduce((s, d) => s + d.valor, 0);
  const radius = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * radius;
  let acumulado = 0;
  const valorCentral = centroValor != null ? centroValor : total;

  return (
    <View style={styles.row}>
      {/* Rosca */}
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size}>
          <G rotation="-90" origin={`${size / 2}, ${size / 2}`}>
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={theme.colors.divider}
              strokeWidth={strokeWidth}
              fill="none"
            />
            {total > 0
              ? data.map((d, i) => {
                  const portion = d.valor / total;
                  const length = portion * circ;
                  const offset = -acumulado;
                  acumulado += length;
                  return (
                    <Circle
                      key={i}
                      cx={size / 2}
                      cy={size / 2}
                      r={radius}
                      stroke={d.cor}
                      strokeWidth={strokeWidth}
                      strokeDasharray={`${length} ${circ - length}`}
                      strokeDashoffset={offset}
                      fill="none"
                      strokeLinecap="butt"
                    />
                  );
                })
              : null}
          </G>
        </Svg>
        {/* Centro */}
        <View style={[styles.center, { width: size, height: size }]}>
          <Text style={styles.centerLabel}>{centroLabel}</Text>
          <Text style={styles.centerValor}>{currencyEngine.formatar(valorCentral)}</Text>
          {centroPercent != null && (
            <Text style={styles.centerPct}>{centroPercent.toFixed(0)}%</Text>
          )}
        </View>
      </View>

      {/* Legenda ao lado */}
      <View style={styles.legenda}>
        {data.length === 0 ? (
          <Text style={styles.vazio}>Nenhum dado</Text>
        ) : (
          data.slice(0, 6).map((d, i) => {
            const base = totalRef != null && totalRef > 0 ? totalRef : total;
            const pct = base > 0 ? (d.valor / base * 100).toFixed(2) : "0.00";
            return (
              <View key={i} style={styles.legendaItem}>
                <View style={[styles.bullet, { backgroundColor: d.cor }]} />
                <View style={styles.legendaTextos}>
                  <View style={styles.legendaNomeRow}>
                    <Text style={styles.legendaNome}>
                      {legendaCategoria(d.categoria)}
                    </Text>
                    <Text style={[styles.legendaPct, { color: d.cor }]}> {pct}%</Text>
                  </View>
                  <Text style={styles.legendaValor}>
                    ({currencyEngine.formatar(d.valor)})
                  </Text>
                </View>
              </View>
            );
          })
        )}
      </View>
    </View>
  );
}

function legendaCategoria(cat: string): string {
  const map: Record<string, string> = {
    combustivel: "Combustível",
    custo_fixo: "Custo fixo",
    limpeza: "Limpeza",
    alimentacao: "Alimentação",
    multa: "Multa",
    estacionamento: "Estacion.",
    internet: "Internet",
    manutencao: "Manutenção",
    outros: "Outros",
  };
  return map[cat] ?? cat;
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center" },
  center: { position: "absolute", justifyContent: "center", alignItems: "center" },
  centerLabel: { fontSize: 10, color: theme.colors.textMuted, ...theme.font.medium },
  centerValor: { fontSize: 13, color: theme.colors.text, ...theme.font.bold, marginTop: 1 },
  centerPct: { fontSize: 13, color: theme.colors.primary, ...theme.font.bold, marginTop: 1 },
  legenda: { flex: 1, marginLeft: 14, gap: 7 },
  legendaItem: { flexDirection: "row", alignItems: "flex-start" },
  bullet: { width: 8, height: 8, borderRadius: 4, marginRight: 6, marginTop: 3, flexShrink: 0 },
  legendaTextos: { flex: 1 },
  legendaNomeRow: { flexDirection: "row", alignItems: "center" },
  legendaNome: { fontSize: 11, color: theme.colors.text, ...theme.font.medium, flexShrink: 1 },
  legendaPct: { fontSize: 11, ...theme.font.bold, flexShrink: 0 },
  legendaValor: { fontSize: 10, color: theme.colors.textMuted, ...theme.font.regular, marginTop: 1 },
  vazio: { color: theme.colors.textMuted, fontSize: 12, ...theme.font.regular },
});
