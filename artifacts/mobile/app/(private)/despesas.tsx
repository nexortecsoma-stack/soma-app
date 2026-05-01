import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "@/lib/theme";
import { useUI } from "@/hooks/UIContext";
import { useDespesas } from "@/hooks/useDespesas";
import { useProtectedAction } from "@/hooks/useProtectedAction";
import { dateEngine } from "@/engines/date-engine";
import { CATEGORIAS_DESPESA } from "@/lib/constants";
import { AppHeader } from "@/components/ui/AppHeader";
import { AppCard } from "@/components/ui/AppCard";
import { AppKeyboardView } from "@/components/ui/AppKeyboardView";
import { AppInput } from "@/components/ui/AppInput";
import { CurrencyInput } from "@/components/ui/CurrencyInput";
import { AppCalendar } from "@/components/ui/AppCalendar";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { AppFooter } from "@/components/ui/AppFooter";

export default function AdicionarDespesa() {
  const insets = useSafeAreaInsets();
  const { openDrawer, showToast, showModal } = useUI();
  const protect = useProtectedAction();
  const { create } = useDespesas();

  const [data, setData] = useState(dateEngine.hoje());
  const [valor, setValor] = useState(0);
  const [categoria, setCategoria] = useState("limpeza");
  const [nomeCustom, setNomeCustom] = useState("");
  const [obs, setObs] = useState("");

  const isOutros = categoria === "outros";

  const salvar = () => {
    if (valor <= 0) {
      showModal({ type: "error", title: "Valor obrigatório", message: "Informe o valor da despesa." });
      return;
    }
    if (isOutros && !nomeCustom.trim()) {
      showModal({ type: "error", title: "Nome obrigatório", message: "Informe o nome da despesa." });
      return;
    }
    protect(async () => {
      try {
        await create.mutateAsync({
          jornada_id: null,
          categoria,
          categoria_personalizada: isOutros ? nomeCustom.trim() : null,
          data_despesa: dateEngine.formatarISO(data),
          valor,
          observacao: obs || null,
        });
        showToast({ type: "success", message: "Despesa registrada" });
        setValor(0);
        setObs("");
        setNomeCustom("");
      } catch (e: any) {
        showToast({ type: "error", message: e?.message ?? "Erro ao salvar" });
      }
    });
  };

  return (
    <View style={{ flex: 1 }}>
      <AppHeader title="Adicionar Despesa" subtitle="Lance custos do dia" onMenuPress={openDrawer} />
      <AppKeyboardView contentContainerStyle={{ padding: 14, paddingBottom: insets.bottom + 90 }}>
        <AppCard>
          <Text style={styles.lab}>Data</Text>
          <AppCalendar value={data} onChange={setData} maxDate={dateEngine.hoje()} />
        </AppCard>

        <AppCard style={{ marginTop: 14 }}>
          <Text style={styles.title}>Categoria</Text>
          <View style={styles.catGrid}>
            {CATEGORIAS_DESPESA.map((c) => {
              const active = categoria === c.id;
              return (
                <Pressable
                  key={c.id}
                  onPress={() => setCategoria(c.id)}
                  style={[styles.cat, active && { borderColor: c.cor, backgroundColor: c.cor + "1A" }]}
                >
                  <Ionicons name={c.icone as any} size={18} color={c.cor} />
                  <Text style={styles.catTxt}>{c.nome}</Text>
                </Pressable>
              );
            })}
          </View>

          {isOutros ? (
            <AppInput
              label="Descreva a despesa"
              placeholder="Ex.: Pedágio extra"
              value={nomeCustom}
              onChangeText={setNomeCustom}
            />
          ) : null}

          <CurrencyInput label="Valor" value={valor} onChangeValue={setValor} left="cash" />
          <AppInput
            label="Observação (opcional)"
            placeholder="Ex.: Lavagem rápida"
            value={obs}
            onChangeText={setObs}
          />
          <PrimaryButton label="Salvar despesa" icon="checkmark" onPress={salvar} loading={create.isPending} fullWidth size="lg" />
        </AppCard>

        <Pressable onPress={() => router.push("/(private)/minhas-despesas")} style={styles.linkBox}>
          <Text style={styles.link}>Ver minhas despesas</Text>
        </Pressable>
        <AppFooter />
      </AppKeyboardView>
    </View>
  );
}

const styles = StyleSheet.create({
  lab: { ...theme.font.medium, fontSize: 13, color: theme.colors.text, marginBottom: 6 },
  title: { ...theme.font.semibold, fontSize: 15, color: theme.colors.text, marginBottom: 14 },
  catGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 18 },
  cat: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingVertical: 8, paddingHorizontal: 12,
    borderRadius: theme.radius.md, borderWidth: 1.5,
    borderColor: theme.colors.border, backgroundColor: "#fff",
  },
  catTxt: { ...theme.font.medium, fontSize: 12, color: theme.colors.text },
  linkBox: { padding: 14, alignItems: "center" },
  link: { color: theme.colors.primary, ...theme.font.semibold, fontSize: 14 },
});
