import React, { useEffect, useState } from "react";
import { StyleSheet, Switch, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { theme } from "@/lib/theme";
import { useAuth } from "@/hooks/AuthContext";
import { useUI } from "@/hooks/UIContext";
import { useConfiguracoes } from "@/hooks/useConfiguracoes";
import { AppHeader } from "@/components/ui/AppHeader";
import { AppCard } from "@/components/ui/AppCard";
import { CurrencyInput } from "@/components/ui/CurrencyInput";
import { AppDropdown } from "@/components/ui/AppDropdown";
import { AppInput } from "@/components/ui/AppInput";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { AppKeyboardView } from "@/components/ui/AppKeyboardView";
import { AppFooter } from "@/components/ui/AppFooter";

export default function Configuracoes() {
  const insets = useSafeAreaInsets();
  const { perfil } = useAuth();
  const { openDrawer, showToast } = useUI();
  const { salvar } = useConfiguracoes();

  const [meta, setMeta] = useState(0);
  const [folga, setFolga] = useState<string>("2");
  const [autoIpva, setAutoIpva] = useState(true);
  const [autoSeg, setAutoSeg] = useState(true);
  const [autoDepr, setAutoDepr] = useState(true);
  const [autoNet, setAutoNet] = useState(false);
  const [valorInternet, setValorInternet] = useState("80");
  const [autoManut, setAutoManut] = useState(false);
  const [autoSoma, setAutoSoma] = useState(false);
  const [ranking, setRanking] = useState(false);
  const [mostrarLiquido, setMostrarLiquido] = useState(true);

  useEffect(() => {
    if (!perfil) return;
    setMeta(perfil.meta_mensal ?? 10000);
    setFolga(String(perfil.dias_folga_semana ?? 2));
    setAutoIpva(perfil.considerar_ipva_automatico ?? true);
    setAutoSeg(perfil.considerar_seguro_automatico ?? true);
    setAutoDepr(perfil.considerar_depreciacao_automatico ?? true);
    setAutoNet(perfil.considerar_internet_automatico ?? false);
    setValorInternet(String(perfil.valor_internet_mensal ?? 80));
    setAutoManut(perfil.considerar_manutencoes_basicas ?? false);
    setAutoSoma(perfil.considerar_custo_soma_automatico ?? false);
    setRanking(perfil.participar_ranking_soma ?? false);
    setMostrarLiquido(perfil.mostrar_ganhos_liquidos_brutos ?? true);
  }, [perfil?.id]);

  const onSalvar = async () => {
    try {
      await salvar.mutateAsync({
        meta_mensal: meta,
        dias_folga_semana: parseInt(folga || "2", 10),
        considerar_ipva_automatico: autoIpva,
        considerar_seguro_automatico: autoSeg,
        considerar_depreciacao_automatico: autoDepr,
        considerar_internet_automatico: autoNet,
        valor_internet_mensal: parseFloat(valorInternet.replace(",", ".")) || 80,
        considerar_manutencoes_basicas: autoManut,
        considerar_custo_soma_automatico: autoSoma,
        participar_ranking_soma: ranking,
        mostrar_ganhos_liquidos_brutos: mostrarLiquido,
      });
      showToast({ type: "success", message: "Preferências salvas!" });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erro ao salvar";
      showToast({ type: "error", message: msg });
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <AppHeader title="Configurações" subtitle="Ajuste suas preferências" onMenuPress={openDrawer} />
      <AppKeyboardView contentContainerStyle={{ padding: 14, paddingBottom: insets.bottom + 90 }}>
        <AppCard>
          <Text style={styles.section}>Meta financeira</Text>
          {/* Meta mensal + dias de folga na mesma linha */}
          <View style={styles.rowInputs}>
            <View style={{ flex: 2 }}>
              <CurrencyInput label="Meta mensal" value={meta} onChangeValue={setMeta} />
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <AppDropdown
                label="Folga/sem."
                value={folga}
                onChange={setFolga}
                options={[0, 1, 2, 3, 4].map((n) => ({ label: `${n}d`, value: String(n) }))}
              />
            </View>
          </View>
        </AppCard>

        <AppCard style={{ marginTop: 14 }}>
          <Text style={styles.section}>Custos automáticos</Text>
          <Toggle label="Considerar IPVA" valor={autoIpva} onChange={setAutoIpva} />
          <Toggle label="Considerar Seguro" valor={autoSeg} onChange={setAutoSeg} />
          <Toggle label="Considerar Depreciação" valor={autoDepr} onChange={setAutoDepr} />
          <Toggle label="Considerar Internet" valor={autoNet} onChange={setAutoNet} />
          {autoNet && (
            <View style={styles.subInput}>
              <AppInput
                label="Valor mensal do plano (R$)"
                keyboardType="numeric"
                value={valorInternet}
                onChangeText={(t) => setValorInternet(t.replace(/[^0-9.,]/g, ""))}
              />
            </View>
          )}
          <Toggle label="Considerar Manutenções Básicas" valor={autoManut} onChange={setAutoManut} />
          <Toggle label="Considerar Custo da Assinatura SOMA" valor={autoSoma} onChange={setAutoSoma} />
        </AppCard>

        <AppCard style={{ marginTop: 14 }}>
          <Text style={styles.section}>Visualização</Text>
          <Toggle label="Mostrar ganhos líquidos / brutos" valor={mostrarLiquido} onChange={setMostrarLiquido} />
          <Toggle label="Participar do Ranking SOMA (futuro)" valor={ranking} onChange={setRanking} />
        </AppCard>

        <PrimaryButton label="Salvar preferências" icon="checkmark" onPress={onSalvar} loading={salvar.isPending} fullWidth size="lg" style={{ marginTop: 16 }} />
        <AppFooter />
      </AppKeyboardView>
    </View>
  );
}

function Toggle({ label, valor, onChange }: { label: string; valor: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={styles.tRow}>
      <Text style={styles.tLab}>{label}</Text>
      <Switch value={valor} onValueChange={onChange} trackColor={{ true: theme.colors.primary, false: theme.colors.border }} />
    </View>
  );
}

const styles = StyleSheet.create({
  section: { ...theme.font.semibold, fontSize: 14, color: theme.colors.text, marginBottom: 12 },
  rowInputs: { flexDirection: "row", alignItems: "flex-end" },
  subInput: { marginLeft: 16, marginBottom: 4, borderLeftWidth: 2, borderLeftColor: theme.colors.primary + "40", paddingLeft: 12 },
  tRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 10 },
  tLab: { ...theme.font.medium, fontSize: 13, color: theme.colors.text, flex: 1, paddingRight: 8 },
});
