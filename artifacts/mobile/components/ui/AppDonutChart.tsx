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
}

export function AppDonutChart({ data, size = 170, strokeWidth = 22, centroLabel = "Total", centroValor }: Props) {
  const total = data.reduce((s, d) => s + d.valor, 0);
  const radius = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * radius;
  let acumulado = 0;
  const valorCentral = centroValor != null ? centroValor : total;

  return (
    <View style={styles.row}>
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
        <View style={[styles.center, { width: size, height: size }]}>
          <Text style={styles.centerLabel}>{centroLabel}</Text>
          <Text style={styles.centerValor}>{currencyEngine.formatar(valorCentral)}</Text>
        </View>
      </View>
      <View style={styles.legenda}>
        {data.length === 0 ? (
          <Text style={styles.vazio}>Nenhum dado</Text>
        ) : (
          data.slice(0, 6).map((d, i) => {
            const pct = total > 0 ? Math.round((d.valor / total) * 100) : 0;
            return (
              <View key={i} style={styles.legendaItem}>
                <View style={[styles.bullet, { backgroundColor: d.cor }]} />
                <Text style={styles.legendaTxt} numberOfLines={1}>
                  {legendaCategoria(d.categoria)}
                </Text>
                <Text style={styles.legendaPct}>{pct}%</Text>
                <Text style={styles.legendaValor}>{currencyEngine.formatar(d.valor)}</Text>
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
    estacionamento: "Estacionamento",
    internet: "Internet",
    manutencao: "Manutenção",
    outros: "Outros",
  };
  return map[cat] ?? cat;
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  center: { position: "absolute", justifyContent: "center", alignItems: "center" },
  centerLabel: { fontSize: 11, color: theme.colors.textMuted, ...theme.font.medium },
  centerValor: { fontSize: 16, color: theme.colors.text, ...theme.font.bold, marginTop: 2 },
  legenda: { flex: 1, marginLeft: 16 },
  legendaItem: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  bullet: { width: 9, height: 9, borderRadius: 5, marginRight: 7 },
  legendaTxt: { flex: 1, fontSize: 12, color: theme.colors.text, ...theme.font.regular },
  legendaPct: { fontSize: 11, color: theme.colors.textMuted, ...theme.font.medium, marginRight: 6 },
  legendaValor: { fontSize: 12, color: theme.colors.text, ...theme.font.semibold },
  vazio: { color: theme.colors.textMuted, fontSize: 12, ...theme.font.regular },
});
