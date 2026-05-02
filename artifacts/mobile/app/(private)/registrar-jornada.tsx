import React, { useMemo, useState, useEffect } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { theme } from "@/lib/theme";
import { useUI } from "@/hooks/UIContext";
import { useAuth } from "@/hooks/AuthContext";
import { useJornadas } from "@/hooks/useJornadas";
import { useGanhos } from "@/hooks/useGanhos";
import { usePlataformas } from "@/hooks/usePlataformas";
import { useProtectedAction } from "@/hooks/useProtectedAction";
import { dateEngine } from "@/engines/date-engine";
import { jornadaEngine } from "@/engines/jornada-engine";
import { currencyEngine } from "@/engines/currency-engine";
import { AppHeader } from "@/components/ui/AppHeader";
import { AppCard } from "@/components/ui/AppCard";
import { AppKeyboardView } from "@/components/ui/AppKeyboardView";
import { AppInput } from "@/components/ui/AppInput";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { AppCalendar } from "@/components/ui/AppCalendar";
import { AppDropdown } from "@/components/ui/AppDropdown";
import { CurrencyInput } from "@/components/ui/CurrencyInput";
import { AppFooter } from "@/components/ui/AppFooter";

type GanhoEntry = { id: string; plataformaId: string | null; valor: number; corridas: string };

function novaEntry(): GanhoEntry {
  return { id: String(Date.now() + Math.random()), plataformaId: null, valor: 0, corridas: "" };
}

export default function RegistrarJornada() {
  const insets = useSafeAreaInsets();
  const { openDrawer, showToast, showModal, hideModal } = useUI();
  const { session } = useAuth();
  const { create, list: jornadasList } = useJornadas();
  const { create: criarGanho } = useGanhos();
  const { ativas: plataformasAtivas } = usePlataformas();
  const protect = useProtectedAction();

  const params = useLocalSearchParams<{ data?: string; horas?: string; minutos?: string; km?: string }>();

  const [data, setData] = useState<Date>(dateEngine.hoje());
  const [horas, setHoras] = useState("");
  const [minutos, setMinutos] = useState("");
  const [km, setKm] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [ganhos, setGanhos] = useState<GanhoEntry[]>([novaEntry()]);

  void session;

  // Pré-preenche a plataforma da primeira entrada assim que a lista carrega
  useEffect(() => {
    const primeiraId = plataformasAtivas.find((p) => p.id !== null)?.id ?? null;
    if (!primeiraId) return;
    setGanhos((prev) =>
      prev.map((g, i) => (i === 0 && g.plataformaId === null ? { ...g, plataformaId: primeiraId } : g)),
    );
  }, [plataformasAtivas]);

  // Pré-preenche a partir dos parâmetros enviados pelo Histórico GPS
  // Reage a mudanças de params para funcionar mesmo quando a tela já está na pilha
  useEffect(() => {
    if (params.data) setData(dateEngine.parseISO(params.data));
    if (params.horas !== undefined && params.horas !== "") setHoras(params.horas);
    if (params.minutos !== undefined && params.minutos !== "") setMinutos(params.minutos);
    if (params.km !== undefined && params.km !== "") setKm(params.km);
  }, [params.data, params.horas, params.minutos, params.km]);

  // Marcadores do calendário
  const marcadores = useMemo(() => {
    const jornadas = jornadasList.data ?? [];
    const dataCom = new Set(jornadas.map((j) => j.data_jornada));
    const hoje = dateEngine.hoje();
    const hojeISO = dateEngine.formatarISO(hoje);
    const resultado: { iso: string; cor: string }[] = [];

    for (let i = 1; i <= 60; i++) {
      const d = dateEngine.somarDias(hoje, -i);
      const iso = dateEngine.formatarISO(d);
      if (iso > hojeISO) continue;
      resultado.push({ iso, cor: dataCom.has(iso) ? theme.colors.success : "#EF4444" });
    }
    for (const iso of dataCom) {
      const found = resultado.find((m) => m.iso === iso);
      if (found) found.cor = theme.colors.success;
      else resultado.push({ iso, cor: theme.colors.success });
    }
    return resultado;
  }, [jornadasList.data]);

  // Plataformas por entry (evita duplicar)
  const todasPlatOptions = plataformasAtivas
    .filter((p) => p.id !== null)
    .map((p) => ({ label: p.nome, value: p.id! }));

  const platOptionsPara = (entryId: string) => {
    const selecionadas = new Set(
      ganhos.filter((g) => g.id !== entryId && g.plataformaId).map((g) => g.plataformaId!),
    );
    return todasPlatOptions.filter((o) => !selecionadas.has(o.value));
  };

  const totalGanhos = ganhos.reduce((s, g) => s + g.valor, 0);

  const atualizarEntry = (id: string, patch: Partial<GanhoEntry>) =>
    setGanhos((prev) => prev.map((g) => (g.id === id ? { ...g, ...patch } : g)));

  const removerEntry = (id: string) =>
    setGanhos((prev) => prev.filter((g) => g.id !== id));

  const salvar = () => {
    setErro(null);
    if (!horas.trim()) { setErro("Preencha as horas trabalhadas"); return; }
    if (!minutos.trim()) { setErro("Preencha os minutos trabalhados"); return; }
    if (!km.trim()) { setErro("Preencha o km percorrido"); return; }
    const h = parseInt(horas, 10);
    const m = parseInt(minutos, 10);
    const k = parseFloat(km.replace(",", "."));
    const v = jornadaEngine.validar({ horas: h, minutos: m, km: k });
    if (!v.ok) {
      setErro(v.erro ?? "Dados inválidos");
      return;
    }
    const platsSelecionadas = ganhos.map((g) => g.plataformaId).filter(Boolean);
    if (platsSelecionadas.length !== new Set(platsSelecionadas).size) {
      setErro("Cada plataforma pode ser lançada apenas uma vez por dia");
      return;
    }
    const dataISO = dateEngine.formatarISO(data);
    const duplicada = (jornadasList.data ?? []).some((j) => j.data_jornada === dataISO);
    if (duplicada) {
      setErro(`Já existe uma jornada registrada em ${dateEngine.formatarBR(dataISO)}. Edite ou remova a existente em "Minhas Jornadas".`);
      return;
    }
    executarSalvar(h, m, k, dataISO);
  };

  const executarSalvar = (h: number, m: number, k: number, dataISO: string) => {
    protect(async () => {
      try {
        const jornada = await create.mutateAsync({
          data_jornada: dataISO,
          horas: h,
          minutos: m,
          km_percorrido: k,
        });
        const ganhosValidos = ganhos.filter((g) => g.valor > 0);
        for (const g of ganhosValidos) {
          await criarGanho.mutateAsync({
            jornada_id: jornada.id,
            plataforma_id: g.plataformaId ?? null,
            data_ganho: dataISO,
            valor: g.valor,
            corridas: parseInt(g.corridas || "0", 10) || 0,
          });
        }
        showToast({ type: "success", message: "Jornada registrada" });
        setHoras("");
        setMinutos("");
        setKm("");
        setGanhos([{ ...novaEntry(), plataformaId: plataformasAtivas.find((p) => p.id !== null)?.id ?? null }]);
        router.back();
      } catch (e: any) {
        const msg = e?.message ?? String(e) ?? "Erro desconhecido";
        showToast({ type: "error", message: `Erro: ${msg.slice(0, 80)}` });
      }
    });
  };

  return (
    <View style={{ flex: 1 }}>
      <AppHeader title="Lançar Jornada" subtitle="Registro manual de trabalho" onMenuPress={openDrawer} />
      <AppKeyboardView contentContainerStyle={{ padding: 14, paddingBottom: insets.bottom + 90 }}>

        {/* Calendário */}
        <AppCard>
          <View style={styles.calLegendRow}>
            <View style={styles.calLeg}>
              <View style={[styles.calDot, { backgroundColor: theme.colors.success }]} />
              <Text style={styles.calLegTxt}>Com jornada</Text>
            </View>
            <View style={styles.calLeg}>
              <View style={[styles.calDot, { backgroundColor: "#EF4444" }]} />
              <Text style={styles.calLegTxt}>Sem jornada</Text>
            </View>
          </View>
          <AppCalendar value={data} onChange={setData} maxDate={dateEngine.hoje()} marcadores={marcadores} />
        </AppCard>

        {/* Tempo & Distância */}
        <AppCard style={{ marginTop: 14 }}>
          <Text style={[styles.cardTitle, { marginBottom: 14 }]}>Tempo & Distância</Text>
          <View style={styles.row3}>
            <View style={{ flex: 1 }}>
              <AppInput
                label="Horas"
                placeholder="0"
                keyboardType="numeric"
                value={horas}
                onChangeText={(t) => setHoras(t.replace(/\D/g, "").slice(0, 2))}
              />
            </View>
            <View style={{ width: 8 }} />
            <View style={{ flex: 1 }}>
              <AppInput
                label="Min"
                placeholder="0"
                keyboardType="numeric"
                value={minutos}
                onChangeText={(t) => setMinutos(t.replace(/\D/g, "").slice(0, 2))}
              />
            </View>
            <View style={{ width: 8 }} />
            <View style={{ flex: 2 }}>
              <AppInput
                label="Km percorrido"
                placeholder="0"
                keyboardType="numeric"
                value={km}
                onChangeText={(t) => setKm(t.replace(/[^0-9.,]/g, ""))}
                error={erro}
              />
            </View>
          </View>
        </AppCard>

        {/* Ganhos do dia */}
        <AppCard style={{ marginTop: 14 }}>
          <View style={styles.ganhoHead}>
            <Text style={styles.cardTitle}>Ganhos do dia</Text>
            {totalGanhos > 0 ? (
              <Text style={styles.ganhoTotal}>{currencyEngine.formatar(totalGanhos)}</Text>
            ) : null}
          </View>
          {ganhos.map((g, idx) => (
            <View key={g.id} style={styles.ganhoEntry}>
              <AppDropdown
                label={idx === 0 ? "Plataforma" : undefined}
                value={g.plataformaId}
                onChange={(v) => atualizarEntry(g.id, { plataformaId: v })}
                options={platOptionsPara(g.id)}
                placeholder="Plataforma..."
              />
              <View style={styles.row3}>
                <View style={{ flex: 3 }}>
                  <CurrencyInput
                    label={idx === 0 ? "Valor recebido" : undefined}
                    value={g.valor}
                    onChangeValue={(v) => atualizarEntry(g.id, { valor: v })}
                  />
                </View>
                <View style={{ width: 8 }} />
                <View style={{ flex: 2 }}>
                  <AppInput
                    label={idx === 0 ? "Corridas" : undefined}
                    placeholder="0"
                    keyboardType="numeric"
                    value={g.corridas}
                    onChangeText={(t) =>
                      atualizarEntry(g.id, { corridas: t.replace(/\D/g, "").slice(0, 3) })
                    }
                  />
                </View>
                {ganhos.length > 1 ? (
                  <Pressable onPress={() => removerEntry(g.id)} hitSlop={8} style={styles.removeBtn}>
                    <Ionicons name="close-circle" size={20} color={theme.colors.danger} />
                  </Pressable>
                ) : null}
              </View>
              {idx < ganhos.length - 1 ? <View style={styles.divider} /> : null}
            </View>
          ))}
          <Pressable
            style={styles.addPlatBtn}
            onPress={() => {
              const selecionadas = new Set(ganhos.filter((g) => g.plataformaId).map((g) => g.plataformaId!));
              const primeiraLivre = todasPlatOptions.find((o) => !selecionadas.has(o.value))?.value ?? null;
              setGanhos((prev) => [...prev, { ...novaEntry(), plataformaId: primeiraLivre }]);
            }}
          >
            <Ionicons name="add-circle-outline" size={18} color={theme.colors.primary} />
            <Text style={styles.addPlatTxt}>Adicionar plataforma</Text>
          </Pressable>
        </AppCard>

        {/* Atalhos */}
        <View style={styles.shortcutsRow}>
          <Pressable style={styles.shortcut} onPress={() => router.push("/(private)/despesas")}>
            <Ionicons name="receipt-outline" size={18} color={theme.colors.warning} />
            <Text style={styles.shortcutTxt}>Registrar despesa</Text>
          </Pressable>
          <Pressable
            style={styles.shortcut}
            onPress={() => router.push("/(private)/abastecimentos")}
          >
            <Ionicons name="speedometer-outline" size={18} color={theme.colors.primary} />
            <Text style={styles.shortcutTxt}>Lançar abastecimento</Text>
          </Pressable>
        </View>

        <PrimaryButton
          label="Salvar jornada"
          icon="checkmark-circle"
          onPress={salvar}
          loading={create.isPending || criarGanho.isPending}
          fullWidth
          size="lg"
          style={{ marginTop: 8 }}
        />

        <Pressable onPress={() => router.push("/(private)/minhas-jornadas")} style={styles.linkBox}>
          <Text style={styles.link}>Ver minhas jornadas</Text>
        </Pressable>
        <AppFooter />
      </AppKeyboardView>
    </View>
  );
}

const styles = StyleSheet.create({
  cardTitle: { ...theme.font.semibold, fontSize: 15, color: theme.colors.text },
  row3: { flexDirection: "row", alignItems: "flex-start" },
  calLegendRow: { flexDirection: "row", gap: 16, marginBottom: 8 },
  calLeg: { flexDirection: "row", alignItems: "center", gap: 5 },
  calDot: { width: 8, height: 8, borderRadius: 4 },
  calLegTxt: { fontSize: 11, ...theme.font.medium, color: theme.colors.textMuted },
  ganhoHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  ganhoTotal: { ...theme.font.bold, fontSize: 16, color: theme.colors.success },
  ganhoEntry: { marginBottom: 4 },
  divider: { height: 1, backgroundColor: theme.colors.divider, marginVertical: 10 },
  removeBtn: { alignSelf: "flex-end", paddingBottom: 14, marginLeft: 4 },
  addPlatBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 10 },
  addPlatTxt: { color: theme.colors.primary, ...theme.font.semibold, fontSize: 13 },
  shortcutsRow: { flexDirection: "row", gap: 10, marginTop: 12 },
  shortcut: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#fff",
    borderRadius: theme.radius.md,
    paddingVertical: 12,
    ...theme.shadow.soft,
  },
  shortcutTxt: { ...theme.font.medium, fontSize: 12, color: theme.colors.text },
  linkBox: { padding: 14, alignItems: "center" },
  link: { color: theme.colors.primary, ...theme.font.semibold, fontSize: 14 },
});
