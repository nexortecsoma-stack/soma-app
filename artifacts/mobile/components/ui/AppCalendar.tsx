import React, { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "@/lib/theme";
import { dateEngine } from "@/engines/date-engine";

interface Props {
  value: Date;
  onChange: (d: Date) => void;
  marcadores?: { iso: string; cor?: string }[];
  minDate?: Date;
  maxDate?: Date;
}

export function AppCalendar({ value, onChange, marcadores = [], maxDate }: Props) {
  const [mes, setMes] = useState<Date>(new Date(value.getFullYear(), value.getMonth(), 1));
  const dias = useMemo(() => buildDias(mes), [mes]);
  const valorISO = dateEngine.formatarISO(value);
  const marcadoresMap = useMemo(() => {
    const m: Record<string, string> = {};
    for (const x of marcadores) m[x.iso] = x.cor ?? theme.colors.primary;
    return m;
  }, [marcadores]);

  const ano = mes.getFullYear();
  const nomeMes = dateEngine.mes(mes);
  const podeAvancar = !maxDate || mes < new Date(maxDate.getFullYear(), maxDate.getMonth(), 1);

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Pressable
          onPress={() => setMes(new Date(mes.getFullYear(), mes.getMonth() - 1, 1))}
          hitSlop={8}
        >
          <Ionicons name="chevron-back" size={20} color={theme.colors.text} />
        </Pressable>
        <Text style={styles.mes}>
          {nomeMes} <Text style={styles.ano}>{ano}</Text>
        </Text>
        <Pressable
          onPress={() => podeAvancar && setMes(new Date(mes.getFullYear(), mes.getMonth() + 1, 1))}
          hitSlop={8}
          style={!podeAvancar ? { opacity: 0.3 } : undefined}
        >
          <Ionicons name="chevron-forward" size={20} color={theme.colors.text} />
        </Pressable>
      </View>

      <View style={styles.weekRow}>
        {dateEngine.diasSemanaCurtos().map((d) => (
          <Text key={d} style={styles.weekTxt}>{d}</Text>
        ))}
      </View>

      <View style={styles.grid}>
        {dias.map((d, idx) => {
          if (!d) return <View key={`v-${idx}`} style={styles.cell} />;
          const iso = dateEngine.formatarISO(d);
          const isSelected = iso === valorISO;
          const marcCor = marcadoresMap[iso];
          const isFuture = maxDate ? d > maxDate : false;

          const cellBg = isSelected
            ? theme.colors.primary
            : marcCor
              ? marcCor + "30"
              : undefined;

          const leftBorderColor = !isSelected && marcCor ? marcCor : "transparent";

          return (
            <Pressable
              key={iso}
              disabled={isFuture}
              onPress={() => onChange(d)}
              style={[
                styles.cell,
                cellBg ? { backgroundColor: cellBg } : undefined,
                !isSelected && marcCor ? { borderLeftWidth: 2, borderLeftColor: leftBorderColor, borderRadius: 6 } : undefined,
                isSelected ? styles.cellAtivo : undefined,
              ]}
            >
              <Text
                style={[
                  styles.dayTxt,
                  isSelected && styles.dayTxtAtivo,
                  !isSelected && marcCor && { color: theme.colors.text, ...theme.font.semibold },
                  isFuture && styles.dayTxtMuted,
                ]}
              >
                {d.getDate()}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function buildDias(refMes: Date): (Date | null)[] {
  const primeiro = new Date(refMes.getFullYear(), refMes.getMonth(), 1);
  const ultimo = new Date(refMes.getFullYear(), refMes.getMonth() + 1, 0);
  const offset = (primeiro.getDay() + 6) % 7;
  const cells: (Date | null)[] = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let d = 1; d <= ultimo.getDate(); d++) {
    cells.push(new Date(refMes.getFullYear(), refMes.getMonth(), d));
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

const styles = StyleSheet.create({
  container: { backgroundColor: "#fff", borderRadius: theme.radius.lg, padding: 14 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  mes: { ...theme.font.semibold, fontSize: 15, color: theme.colors.text },
  ano: { color: theme.colors.textMuted, ...theme.font.regular },
  weekRow: { flexDirection: "row", marginBottom: 4 },
  weekTxt: { flex: 1, textAlign: "center", fontSize: 11, color: theme.colors.textMuted, ...theme.font.medium },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  cell: { width: `${100 / 7}%`, aspectRatio: 1, justifyContent: "center", alignItems: "center", borderRadius: 6 },
  cellAtivo: { backgroundColor: theme.colors.primary },
  dayTxt: { ...theme.font.medium, fontSize: 13, color: theme.colors.text },
  dayTxtAtivo: { color: "#fff", ...theme.font.bold },
  dayTxtMuted: { color: theme.colors.textSubtle },
});
