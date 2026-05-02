import React, { useEffect, useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "@/lib/theme";
import { dateEngine } from "@/engines/date-engine";
import { jornadaEngine } from "@/engines/jornada-engine";
import { currencyEngine } from "@/engines/currency-engine";
import { AppCalendar } from "@/components/ui/AppCalendar";
import { AppDropdown } from "@/components/ui/AppDropdown";
import { AppInput } from "@/components/ui/AppInput";
import { CurrencyInput } from "@/components/ui/CurrencyInput";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import type { Ganho, Jornada } from "@/lib/types";

// ─── Tipos exportados ────────────────────────────────────────────────────────

export type EdEntry = {
  tempId: string;
  ganhoId: string | null;
  plataformaId: string | null;
  valor: number;
  corridas: string;
};

export interface SavePayload {
  novaDataISO: string;
  jornadaPatch?: {
    horas: number;
    minutos: number;
    km_percorrido: number;
    km_percorrido_real: number;
  };
  ganhoUpdates: { id: string; data_ganho: string; plataforma_id: string | null; valor: number; corridas: number }[];
  ganhoCreates: { data_ganho: string; plataforma_id: string | null; valor: number; corridas: number; jornada_id: string | null }[];
  ganhoDeletes: string[];
}

export interface PlataformaOpt {
  id: string | null;
  nome: string;
}

export interface EditarDiaModalProps {
  visible: boolean;
  onClose: () => void;
  dataISO: string;
  jornada: Jornada | null;
  ganhosDia: Ganho[];
  datasOcupadas: string[];
  marcadores: { iso: string; cor: string }[];
  plataformas: PlataformaOpt[];
  onSave: (payload: SavePayload) => Promise<void>;
  isSaving: boolean;
}

// ─── Helper interno ───────────────────────────────────────────────────────────

function novaEdEntry(): EdEntry {
  return {
    tempId: String(Date.now() + Math.random()),
    ganhoId: null,
    plataformaId: null,
    valor: 0,
    corridas: "",
  };
}

// ─── Componente ───────────────────────────────────────────────────────────────

export function EditarDiaModal({
  visible,
  onClose,
  dataISO,
  jornada,
  ganhosDia,
  datasOcupadas,
  marcadores,
  plataformas,
  onSave,
  isSaving,
}: EditarDiaModalProps) {
  const [edData, setEdData] = useState<Date>(dateEngine.hoje());
  const [edHoras, setEdHoras] = useState("");
  const [edMin, setEdMin] = useState("");
  const [edKm, setEdKm] = useState("");
  const [edEntries, setEdEntries] = useState<EdEntry[]>([novaEdEntry()]);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setErro(null);
    setEdData(dateEngine.parseISO(dataISO));

    if (jornada) {
      setEdHoras(String(jornada.horas ?? 0));
      setEdMin(String(jornada.minutos ?? 0));
      const kmReal = Number(jornada.km_percorrido_real);
      const kmDec = Number(jornada.km_percorrido);
      const kmVal = kmReal > 0 ? kmReal : kmDec > 0 ? kmDec : 0;
      setEdKm(kmVal > 0 ? String(kmVal) : "");
    } else {
      setEdHoras("");
      setEdMin("");
      setEdKm("");
    }

    setEdEntries(
      ganhosDia.length > 0
        ? ganhosDia.map((g) => ({
            tempId: g.id,
            ganhoId: g.id,
            plataformaId: g.plataforma_id ?? null,
            valor: Number(g.valor) || 0,
            corridas: g.corridas != null ? String(g.corridas) : "",
          }))
        : [novaEdEntry()],
    );
  }, [visible, dataISO]);

  const todasPlatOptions = useMemo(
    () =>
      plataformas
        .filter((p) => p.id !== null)
        .map((p) => ({ label: p.nome, value: p.id! })),
    [plataformas],
  );

  const platOptionsPara = (tempId: string) => {
    const selecionadas = new Set(
      edEntries
        .filter((e) => e.tempId !== tempId && e.plataformaId)
        .map((e) => e.plataformaId!),
    );
    return todasPlatOptions.filter((o) => !selecionadas.has(o.value));
  };

  const atualizarEntry = (tempId: string, patch: Partial<EdEntry>) =>
    setEdEntries((prev) =>
      prev.map((e) => (e.tempId === tempId ? { ...e, ...patch } : e)),
    );

  const removerEntry = (tempId: string) =>
    setEdEntries((prev) => prev.filter((e) => e.tempId !== tempId));

  const totalGanhos = edEntries.reduce((s, e) => s + e.valor, 0);

  const handleSave = async () => {
    setErro(null);
    const novaDataISO = dateEngine.formatarISO(edData);

    if (novaDataISO !== dataISO && datasOcupadas.includes(novaDataISO)) {
      setErro(`Já existe um registro em ${dateEngine.formatarBR(novaDataISO)}`);
      return;
    }

    let jornadaPatch: SavePayload["jornadaPatch"];
    if (jornada) {
      const h = parseInt(edHoras || "0", 10);
      const m = parseInt(edMin || "0", 10);
      const k = parseFloat((edKm || "0").replace(",", "."));
      const v = jornadaEngine.validar({ horas: h, minutos: m, km: k });
      if (!v.ok) {
        setErro(v.erro ?? "Dados de jornada inválidos");
        return;
      }
      jornadaPatch = { horas: h, minutos: m, km_percorrido: k, km_percorrido_real: k };
    }

    const plats = edEntries.map((e) => e.plataformaId).filter(Boolean);
    if (plats.length !== new Set(plats).size) {
      setErro("Cada plataforma pode ser lançada apenas uma vez por dia");
      return;
    }

    const originalIds = new Set(ganhosDia.map((g) => g.id));
    const currentGanhoIds = new Set(
      edEntries.filter((e) => e.ganhoId).map((e) => e.ganhoId!),
    );
    const ganhoDeletes = [...originalIds].filter((id) => !currentGanhoIds.has(id));

    const ganhoUpdates = edEntries
      .filter((e) => e.ganhoId && e.valor > 0)
      .map((e) => ({
        id: e.ganhoId!,
        data_ganho: novaDataISO,
        plataforma_id: e.plataformaId,
        valor: e.valor,
        corridas: parseInt(e.corridas || "0", 10) || 0,
      }));

    const ganhoCreates = edEntries
      .filter((e) => !e.ganhoId && e.valor > 0)
      .map((e) => ({
        data_ganho: novaDataISO,
        plataforma_id: e.plataformaId,
        valor: e.valor,
        corridas: parseInt(e.corridas || "0", 10) || 0,
        jornada_id: jornada?.id ?? null,
      }));

    await onSave({
      novaDataISO,
      jornadaPatch,
      ganhoUpdates,
      ganhoCreates,
      ganhoDeletes,
    });
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={s.backdrop}>
        <View style={s.card}>
          {/* Cabeçalho */}
          <View style={s.head}>
            <Text style={s.tit}>Editar dia</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={22} color={theme.colors.text} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* Legenda do calendário */}
            <View style={s.calLegendRow}>
              <View style={s.calLeg}>
                <View style={[s.calDot, { backgroundColor: theme.colors.success }]} />
                <Text style={s.calLegTxt}>Com registro</Text>
              </View>
              <View style={s.calLeg}>
                <View style={[s.calDot, { backgroundColor: "#EF4444" }]} />
                <Text style={s.calLegTxt}>Sem registro</Text>
              </View>
            </View>

            <AppCalendar
              value={edData}
              onChange={setEdData}
              maxDate={dateEngine.hoje()}
              marcadores={marcadores}
            />

            {/* Seção Jornada */}
            {jornada ? (
              <>
                <View style={s.secDivider} />
                <View style={s.secHeader}>
                  <Ionicons name="time-outline" size={14} color={theme.colors.primary} />
                  <Text style={s.secTit}>Jornada</Text>
                </View>
                <View style={s.row3}>
                  <View style={{ flex: 1 }}>
                    <AppInput
                      label="Horas"
                      placeholder="0"
                      keyboardType="numeric"
                      value={edHoras}
                      onChangeText={(t) => setEdHoras(t.replace(/\D/g, "").slice(0, 2))}
                    />
                  </View>
                  <View style={{ width: 8 }} />
                  <View style={{ flex: 1 }}>
                    <AppInput
                      label="Min"
                      placeholder="0"
                      keyboardType="numeric"
                      value={edMin}
                      onChangeText={(t) => setEdMin(t.replace(/\D/g, "").slice(0, 2))}
                    />
                  </View>
                  <View style={{ width: 8 }} />
                  <View style={{ flex: 2 }}>
                    <AppInput
                      label="Km percorrido"
                      placeholder="0"
                      keyboardType="numeric"
                      value={edKm}
                      onChangeText={(t) => setEdKm(t.replace(/[^0-9.,]/g, ""))}
                    />
                  </View>
                </View>
              </>
            ) : null}

            {/* Seção Ganhos */}
            <View style={s.secDivider} />
            <View style={[s.secHeader, { justifyContent: "space-between" }]}>
              <View style={s.secHeader}>
                <Ionicons name="cash-outline" size={14} color={theme.colors.success} />
                <Text style={[s.secTit, { color: theme.colors.success }]}>Ganhos do dia</Text>
              </View>
              {totalGanhos > 0 ? (
                <Text style={s.totalGanhos}>{currencyEngine.formatar(totalGanhos)}</Text>
              ) : null}
            </View>

            {edEntries.map((entry, idx) => (
              <View key={entry.tempId} style={s.entryBox}>
                <AppDropdown
                  label={idx === 0 ? "Plataforma" : undefined}
                  value={entry.plataformaId}
                  onChange={(v) => atualizarEntry(entry.tempId, { plataformaId: v })}
                  options={platOptionsPara(entry.tempId)}
                  placeholder="Particular / sem plataforma"
                />
                <View style={s.row3}>
                  <View style={{ flex: 3 }}>
                    <CurrencyInput
                      label={idx === 0 ? "Valor recebido" : undefined}
                      value={entry.valor}
                      onChangeValue={(v) => atualizarEntry(entry.tempId, { valor: v })}
                    />
                  </View>
                  <View style={{ width: 8 }} />
                  <View style={{ flex: 2 }}>
                    <AppInput
                      label={idx === 0 ? "Corridas" : undefined}
                      placeholder="0"
                      keyboardType="numeric"
                      value={entry.corridas}
                      onChangeText={(t) =>
                        atualizarEntry(entry.tempId, { corridas: t.replace(/\D/g, "").slice(0, 3) })
                      }
                    />
                  </View>
                  {edEntries.length > 1 ? (
                    <Pressable
                      onPress={() => removerEntry(entry.tempId)}
                      hitSlop={8}
                      style={s.removeBtn}
                    >
                      <Ionicons name="close-circle" size={20} color={theme.colors.danger} />
                    </Pressable>
                  ) : null}
                </View>
                {idx < edEntries.length - 1 ? <View style={s.entryDivider} /> : null}
              </View>
            ))}

            <Pressable
              style={s.addPlatBtn}
              onPress={() => setEdEntries((prev) => [...prev, novaEdEntry()])}
            >
              <Ionicons name="add-circle-outline" size={18} color={theme.colors.primary} />
              <Text style={s.addPlatTxt}>Adicionar plataforma</Text>
            </Pressable>

            {erro ? <Text style={s.erroTxt}>{erro}</Text> : null}

            <PrimaryButton
              label="Salvar alterações"
              icon="checkmark"
              onPress={handleSave}
              loading={isSaving}
              fullWidth
              size="lg"
              style={{ marginTop: 8 }}
            />
            <View style={{ height: 8 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    padding: 16,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: theme.radius.lg,
    padding: 16,
    ...theme.shadow.soft,
    maxHeight: "92%",
  },
  head: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  tit: { ...theme.font.bold, fontSize: 16, color: theme.colors.text },
  calLegendRow: { flexDirection: "row", gap: 16, marginBottom: 8 },
  calLeg: { flexDirection: "row", alignItems: "center", gap: 5 },
  calDot: { width: 8, height: 8, borderRadius: 4 },
  calLegTxt: { fontSize: 11, ...theme.font.medium, color: theme.colors.textMuted },
  secDivider: { height: 1, backgroundColor: theme.colors.divider, marginVertical: 12 },
  secHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 },
  secTit: {
    ...theme.font.semibold,
    fontSize: 13,
    color: theme.colors.primary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  row3: { flexDirection: "row", alignItems: "flex-start" },
  totalGanhos: { ...theme.font.bold, fontSize: 15, color: theme.colors.success },
  entryBox: { marginBottom: 4 },
  entryDivider: { height: 1, backgroundColor: theme.colors.divider, marginVertical: 8 },
  removeBtn: { alignSelf: "flex-end", paddingBottom: 14, marginLeft: 4 },
  addPlatBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 10,
  },
  addPlatTxt: { color: theme.colors.primary, ...theme.font.semibold, fontSize: 13 },
  erroTxt: { color: theme.colors.danger, ...theme.font.medium, fontSize: 13, marginTop: 6 },
});
