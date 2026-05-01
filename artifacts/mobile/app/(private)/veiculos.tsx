import React, { useEffect, useState } from "react";
import { Pressable, StyleSheet, Switch, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { theme } from "@/lib/theme";
import { useAuth } from "@/hooks/AuthContext";
import { useUI } from "@/hooks/UIContext";
import { useVeiculo } from "@/hooks/useVeiculo";
import { TIPOS_PROPRIEDADE, TIPOS_TRACAO, TIPOS_ALUGUEL, TIPOS_SEGURO, UFS, DEPRECIACAO_OPCOES } from "@/lib/constants";
import { AppHeader } from "@/components/ui/AppHeader";
import { AppCard } from "@/components/ui/AppCard";
import { AppKeyboardView } from "@/components/ui/AppKeyboardView";
import { AppInput } from "@/components/ui/AppInput";
import { CurrencyInput } from "@/components/ui/CurrencyInput";
import { MaskedInput } from "@/components/ui/MaskedInput";
import { AppDropdown } from "@/components/ui/AppDropdown";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { AppFooter } from "@/components/ui/AppFooter";

// Formata número com ponto de milhar (ex: 100.000)
function formatHodometro(val: string) {
  const num = val.replace(/\D/g, "");
  return num.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}
function parseHodometro(val: string) {
  return parseFloat(val.replace(/\./g, "").replace(",", ".")) || 0;
}

export default function Veiculos() {
  const insets = useSafeAreaInsets();
  const { veiculo: v } = useAuth();
  const { openDrawer, showToast, showModal } = useUI();
  const { upsert } = useVeiculo();

  const [placa, setPlaca] = useState("");
  const [ufPlaca, setUfPlaca] = useState<string | null>(null);
  const [nome, setNome] = useState("");
  const [ano, setAno] = useState("");
  const [hodometro, setHodometro] = useState("");
  const [valorFipe, setValorFipe] = useState(0);
  const [tipoProp, setTipoProp] = useState<string | null>(null);
  const [tipoTracao, setTipoTracao] = useState<string | null>(null);

  const [valorAluguel, setValorAluguel] = useState(0);
  const [tipoAluguel, setTipoAluguel] = useState<string | null>(null);
  const [valorParcela, setValorParcela] = useState(0);

  const [temSeguro, setTemSeguro] = useState(false);
  const [tipoSeguro, setTipoSeguro] = useState<string | null>("mensal");
  const [valorSeguro, setValorSeguro] = useState(0);
  const [diaVencSeguro, setDiaVencSeguro] = useState("");
  const [dataInicioSeguro, setDataInicioSeguro] = useState("");

  const [isentoIpva, setIsentoIpva] = useState(false);

  // Combustível
  const [gasolinaPreco, setGasolinaPreco] = useState(0);
  const [gasolinaConsumo, setGasolinaConsumo] = useState("");
  const [etanolPreco, setEtanolPreco] = useState(0);
  const [etanolConsumo, setEtanolConsumo] = useState("");
  const [gnvPreco, setGnvPreco] = useState(0);
  const [gnvConsumo, setGnvConsumo] = useState("");
  const [consumoKwh, setConsumoKwh] = useState("");
  const [valorKwh, setValorKwh] = useState(0);
  const [capacidadeBateria, setCapacidadeBateria] = useState("");
  const [consumoPrincipal, setConsumoPrincipal] = useState("gasolina");

  // Depreciação — só uma chave pode estar ativa
  const [depreciacaoId, setDepreciacaoId] = useState<string | null>(null);
  const [depreciacaoCustom, setDepreciacaoCustom] = useState("");

  useEffect(() => {
    if (!v) return;
    setPlaca(v.placa ?? "");
    setUfPlaca(v.uf_placa ?? null);
    setNome(v.nome_veiculo ?? "");
    setAno(v.ano ? String(v.ano) : "");
    const hod = v.hodometro_inicial ?? v.km_atual ?? 0;
    setHodometro(hod ? formatHodometro(String(hod).replace(/\./g, "")) : "");
    setValorFipe(v.valor_fipe ?? 0);
    setTipoProp(v.tipo_propriedade ?? null);
    setTipoTracao(v.tipo_tracao ?? null);
    setValorAluguel(v.valor_aluguel ?? 0);
    setTipoAluguel(v.tipo_aluguel ?? null);
    setValorParcela(v.valor_parcela ?? 0);
    setTemSeguro(v.tem_seguro ?? false);
    setTipoSeguro(v.tipo_seguro ?? "mensal");
    setValorSeguro(v.valor_seguro ?? 0);
    setDiaVencSeguro(v.dia_vencimento_seguro ? String(v.dia_vencimento_seguro) : "");
    setIsentoIpva(v.isento_ipva ?? false);
    setGasolinaPreco(v.gasolina_valor ?? 0);
    setGasolinaConsumo(v.gasolina_consumo_km_l != null ? String(v.gasolina_consumo_km_l) : "");
    setEtanolPreco(v.etanol_valor ?? 0);
    setEtanolConsumo(v.etanol_consumo_km_l != null ? String(v.etanol_consumo_km_l) : "");
    setGnvPreco(v.gnv_valor ?? 0);
    setGnvConsumo(v.gnv_consumo_km_m3 != null ? String(v.gnv_consumo_km_m3) : "");
    setConsumoKwh(v.consumo_kwh != null ? String(v.consumo_kwh) : "");
    setValorKwh(v.valor_kwh ?? 0);
    setCapacidadeBateria(v.bateria != null ? String(v.bateria) : "");
    setConsumoPrincipal(v.consumo_principal ?? "gasolina");
    if (v.depreciacao_percentual) {
      const found = DEPRECIACAO_OPCOES.find((d) => d.percentual === v.depreciacao_percentual);
      if (found) setDepreciacaoId(found.id);
      else {
        setDepreciacaoId("custom");
        setDepreciacaoCustom(String(v.depreciacao_percentual));
      }
    }
  }, [v?.id]);

  // Combustíveis visíveis por tração
  const mostrarGasolina = !tipoTracao || ["flex", "gnv"].includes(tipoTracao ?? "");
  const mostrarEtanol = !tipoTracao || tipoTracao === "flex";
  const mostrarGnv = tipoTracao === "gnv";
  const mostrarEnergia = tipoTracao === "eletrico" || tipoTracao === "hibrido";
  const mostrarGasolinaHibrido = tipoTracao === "hibrido";

  const percDepreciacao = (() => {
    if (!depreciacaoId) return null;
    if (depreciacaoId === "custom") return parseFloat(depreciacaoCustom.replace(",", ".")) || null;
    return DEPRECIACAO_OPCOES.find((d) => d.id === depreciacaoId)?.percentual ?? null;
  })();

  const salvar = async () => {
    const hodNum = parseHodometro(hodometro);
    const anoNum = ano ? parseInt(ano, 10) : null;
    try {
      await upsert.mutateAsync({
        placa: placa || null,
        uf_placa: ufPlaca,
        nome_veiculo: nome || null,
        ano: anoNum,
        km_atual: hodNum || null,
        hodometro_inicial: hodNum || null,
        valor_fipe: valorFipe || null,
        tipo_propriedade: tipoProp as any,
        tipo_tracao: tipoTracao as any,
        valor_aluguel: tipoProp === "alugado" ? valorAluguel || null : null,
        tipo_aluguel: tipoProp === "alugado" ? (tipoAluguel as any) : null,
        valor_parcela: tipoProp === "financiado" ? valorParcela || null : null,
        tem_seguro: temSeguro,
        tipo_seguro: temSeguro ? (tipoSeguro as any) : null,
        valor_seguro: temSeguro && valorSeguro ? valorSeguro : null,
        dia_vencimento_seguro:
          temSeguro && tipoSeguro === "mensal" && diaVencSeguro
            ? parseInt(diaVencSeguro, 10)
            : null,
        data_inicio_seguro:
          temSeguro && tipoSeguro === "anual" && dataInicioSeguro ? dataInicioSeguro : null,
        isento_ipva: isentoIpva,
        gasolina_valor: mostrarGasolina || mostrarGasolinaHibrido ? gasolinaPreco || null : null,
        gasolina_consumo_km_l:
          mostrarGasolina || mostrarGasolinaHibrido
            ? parseFloat(gasolinaConsumo.replace(",", ".")) || null
            : null,
        etanol_valor: mostrarEtanol ? etanolPreco || null : null,
        etanol_consumo_km_l: mostrarEtanol
          ? parseFloat(etanolConsumo.replace(",", ".")) || null
          : null,
        gnv_valor: mostrarGnv ? gnvPreco || null : null,
        gnv_consumo_km_m3: mostrarGnv ? parseFloat(gnvConsumo.replace(",", ".")) || null : null,
        consumo_kwh: mostrarEnergia ? parseFloat(consumoKwh.replace(",", ".")) || null : null,
        valor_kwh: mostrarEnergia ? valorKwh || null : null,
        bateria: mostrarEnergia ? parseFloat(capacidadeBateria.replace(",", ".")) || null : null,
        consumo_principal: consumoPrincipal,
        depreciacao_percentual: percDepreciacao,
      });
      showToast({ type: "success", message: "Veículo salvo com sucesso!" });
    } catch (e: any) {
      const msg = e?.message ?? "Tente novamente";
      showModal({ type: "error", title: "Erro ao salvar veículo", message: msg });
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <AppHeader title="Veículo" subtitle="Dados do seu carro" onMenuPress={openDrawer} />
      <AppKeyboardView contentContainerStyle={{ padding: 14, paddingBottom: insets.bottom + 90 }}>

        {/* Identificação */}
        <AppCard>
          <Text style={styles.cardTitle}>Identificação</Text>
          <View style={styles.row2}>
            <View style={{ flex: 1 }}>
              <MaskedInput label="Placa" mascara="placa" value={placa} onChangeText={setPlaca} placeholder="ABC1D23" />
            </View>
            <View style={{ width: 12 }} />
            <View style={{ flex: 1 }}>
              <AppDropdown label="UF" value={ufPlaca} onChange={setUfPlaca} options={UFS.map((u) => ({ label: u, value: u }))} />
            </View>
          </View>
          <AppInput label="Nome / Modelo" placeholder="Ex.: Onix 2022" value={nome} onChangeText={setNome} autoCapitalize="words" />
          <View style={styles.row2}>
            <View style={{ flex: 1 }}>
              <AppInput label="Ano" keyboardType="numeric" placeholder="2022" value={ano} onChangeText={(t) => setAno(t.replace(/\D/g, "").slice(0, 4))} />
            </View>
            <View style={{ width: 12 }} />
            <View style={{ flex: 1 }}>
              {/* Hodômetro com ponto de milhar */}
              <AppInput
                label="Hodômetro inicial"
                keyboardType="numeric"
                placeholder="100.000"
                value={hodometro}
                onChangeText={(t) => setHodometro(formatHodometro(t.replace(/\D/g, "")))}
              />
            </View>
          </View>
          {/* FIPE abaixo do hodômetro, linha única */}
          <CurrencyInput label="Valor FIPE" value={valorFipe} onChangeValue={setValorFipe} left="cash" />
        </AppCard>

        {/* Propriedade & Tração */}
        <AppCard style={{ marginTop: 14 }}>
          <Text style={styles.cardTitle}>Propriedade & Tração</Text>
          <AppDropdown
            label="Propriedade"
            value={tipoProp}
            onChange={setTipoProp}
            options={TIPOS_PROPRIEDADE.map((t) => ({ label: t.nome, value: t.id }))}
          />
          {tipoProp === "alugado" ? (
            <>
              <CurrencyInput label="Valor do aluguel" value={valorAluguel} onChangeValue={setValorAluguel} />
              <AppDropdown label="Frequência" value={tipoAluguel} onChange={setTipoAluguel} options={TIPOS_ALUGUEL.map((t) => ({ label: t.nome, value: t.id }))} />
            </>
          ) : null}
          {tipoProp === "financiado" ? (
            <CurrencyInput label="Valor da parcela mensal" value={valorParcela} onChangeValue={setValorParcela} />
          ) : null}
          <AppDropdown
            label="Tração"
            value={tipoTracao}
            onChange={(v) => {
              setTipoTracao(v);
              setConsumoPrincipal(v === "eletrico" ? "energia" : v === "hibrido" ? "gasolina" : "gasolina");
            }}
            options={TIPOS_TRACAO.map((t) => ({ label: t.nome, value: t.id }))}
          />
        </AppCard>

        {/* Consumo — baseado na tração selecionada */}
        {tipoTracao ? (
          <AppCard style={{ marginTop: 14 }}>
            <Text style={styles.cardTitle}>Consumo</Text>
            {(mostrarGasolina || mostrarGasolinaHibrido) ? (
              <View style={styles.row2}>
                <View style={{ flex: 1 }}>
                  <CurrencyInput label="R$ Gasolina/L" value={gasolinaPreco} onChangeValue={setGasolinaPreco} />
                </View>
                <View style={{ width: 12 }} />
                <View style={{ flex: 1 }}>
                  <AppInput label="km/L Gasolina" keyboardType="numeric" placeholder="0" value={gasolinaConsumo} onChangeText={(t) => setGasolinaConsumo(t.replace(/[^0-9.,]/g, ""))} />
                </View>
              </View>
            ) : null}
            {mostrarEtanol ? (
              <View style={styles.row2}>
                <View style={{ flex: 1 }}>
                  <CurrencyInput label="R$ Etanol/L" value={etanolPreco} onChangeValue={setEtanolPreco} />
                </View>
                <View style={{ width: 12 }} />
                <View style={{ flex: 1 }}>
                  <AppInput label="km/L Etanol" keyboardType="numeric" placeholder="0" value={etanolConsumo} onChangeText={(t) => setEtanolConsumo(t.replace(/[^0-9.,]/g, ""))} />
                </View>
              </View>
            ) : null}
            {mostrarGnv ? (
              <View style={styles.row2}>
                <View style={{ flex: 1 }}>
                  <CurrencyInput label="R$ GNV/m³" value={gnvPreco} onChangeValue={setGnvPreco} />
                </View>
                <View style={{ width: 12 }} />
                <View style={{ flex: 1 }}>
                  <AppInput label="km/m³ GNV" keyboardType="numeric" placeholder="0" value={gnvConsumo} onChangeText={(t) => setGnvConsumo(t.replace(/[^0-9.,]/g, ""))} />
                </View>
              </View>
            ) : null}
            {mostrarEnergia ? (
              <>
                {/* Capacidade da bateria — necessária para lançar carga por % */}
                <AppInput
                  label="Capacidade da bateria (kWh) *"
                  keyboardType="numeric"
                  placeholder="Ex.: 60"
                  value={capacidadeBateria}
                  onChangeText={(t) => setCapacidadeBateria(t.replace(/[^0-9.,]/g, ""))}
                  helper="Necessário para calcular a carga por porcentagem"
                />
                <View style={styles.row2}>
                  <View style={{ flex: 1 }}>
                    <AppInput label="kWh/100km" keyboardType="numeric" placeholder="0" value={consumoKwh} onChangeText={(t) => setConsumoKwh(t.replace(/[^0-9.,]/g, ""))} />
                  </View>
                  <View style={{ width: 12 }} />
                  <View style={{ flex: 1 }}>
                    <CurrencyInput label="R$ kWh" value={valorKwh} onChangeValue={setValorKwh} />
                  </View>
                </View>
              </>
            ) : null}
          </AppCard>
        ) : null}

        {/* Seguro & IPVA */}
        <AppCard style={{ marginTop: 14 }}>
          <Text style={styles.cardTitle}>Seguro & IPVA</Text>
          <View style={styles.swRow}>
            <Text style={styles.swLab}>Possui seguro?</Text>
            <Switch value={temSeguro} onValueChange={setTemSeguro} trackColor={{ true: theme.colors.primary, false: theme.colors.border }} />
          </View>
          {temSeguro ? (
            <>
              <AppDropdown
                label="Tipo de seguro"
                value={tipoSeguro}
                onChange={setTipoSeguro}
                options={TIPOS_SEGURO.map((t) => ({ label: t.nome, value: t.id }))}
              />
              {tipoSeguro === "mensal" ? (
                <View style={styles.row2}>
                  <View style={{ flex: 2 }}>
                    <CurrencyInput label="Valor mensal" value={valorSeguro} onChangeValue={setValorSeguro} />
                  </View>
                  <View style={{ width: 12 }} />
                  <View style={{ flex: 1 }}>
                    <AppInput
                      label="Dia venc."
                      keyboardType="numeric"
                      placeholder="10"
                      value={diaVencSeguro}
                      onChangeText={(t) => setDiaVencSeguro(t.replace(/\D/g, "").slice(0, 2))}
                    />
                  </View>
                </View>
              ) : (
                <>
                  <CurrencyInput label="Valor do prêmio anual" value={valorSeguro} onChangeValue={setValorSeguro} />
                  <AppInput
                    label="Data início do contrato"
                    placeholder="DD/MM/AAAA"
                    keyboardType="numeric"
                    value={dataInicioSeguro}
                    onChangeText={(t) => {
                      const d = t.replace(/\D/g, "");
                      let fmt = d;
                      if (d.length > 2) fmt = d.slice(0, 2) + "/" + d.slice(2);
                      if (d.length > 4) fmt = d.slice(0, 2) + "/" + d.slice(2, 4) + "/" + d.slice(4, 8);
                      setDataInicioSeguro(fmt);
                    }}
                  />
                </>
              )}
            </>
          ) : null}
          <View style={styles.swRow}>
            <Text style={styles.swLab}>Isento de IPVA?</Text>
            <Switch value={isentoIpva} onValueChange={setIsentoIpva} trackColor={{ true: theme.colors.primary, false: theme.colors.border }} />
          </View>
        </AppCard>

        {/* Depreciação */}
        <AppCard style={{ marginTop: 14 }}>
          <Text style={styles.cardTitle}>Depreciação do veículo</Text>
          <Text style={styles.subHint}>Selecione o tempo de uso para estimar a depreciação anual</Text>
          {DEPRECIACAO_OPCOES.map((op) => (
            <Pressable
              key={op.id}
              style={styles.depRow}
              onPress={() => setDepreciacaoId(depreciacaoId === op.id ? null : op.id)}
            >
              <View style={[styles.radio, depreciacaoId === op.id && styles.radioOn]}>
                {depreciacaoId === op.id ? <View style={styles.radioDot} /> : null}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.depNome}>{op.nome}</Text>
              </View>
              <Text style={styles.depPerc}>{op.percentual}% ao ano</Text>
            </Pressable>
          ))}
          {/* Personalizado */}
          <Pressable
            style={styles.depRow}
            onPress={() => setDepreciacaoId(depreciacaoId === "custom" ? null : "custom")}
          >
            <View style={[styles.radio, depreciacaoId === "custom" && styles.radioOn]}>
              {depreciacaoId === "custom" ? <View style={styles.radioDot} /> : null}
            </View>
            <Text style={[styles.depNome, { flex: 1 }]}>Personalizado</Text>
          </Pressable>
          {depreciacaoId === "custom" ? (
            <AppInput
              label="Percentual personalizado (%)"
              keyboardType="numeric"
              placeholder="0"
              value={depreciacaoCustom}
              onChangeText={(t) => setDepreciacaoCustom(t.replace(/[^0-9.,]/g, ""))}
            />
          ) : null}
        </AppCard>

        <PrimaryButton label="Salvar veículo" icon="checkmark" onPress={salvar} loading={upsert.isPending} fullWidth size="lg" style={{ marginTop: 16 }} />
        <AppFooter />
      </AppKeyboardView>
    </View>
  );
}

const styles = StyleSheet.create({
  cardTitle: { ...theme.font.semibold, fontSize: 15, color: theme.colors.text, marginBottom: 14 },
  subHint: { fontSize: 12, color: theme.colors.textMuted, ...theme.font.regular, marginBottom: 12, marginTop: -8 },
  row2: { flexDirection: "row" },
  swRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 10 },
  swLab: { ...theme.font.medium, fontSize: 13, color: theme.colors.text },
  depRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: theme.colors.divider },
  depNome: { ...theme.font.medium, fontSize: 13, color: theme.colors.text },
  depPerc: { ...theme.font.semibold, fontSize: 13, color: theme.colors.primary },
  radio: {
    width: 22, height: 22, borderRadius: 11, borderWidth: 2,
    borderColor: theme.colors.border, justifyContent: "center", alignItems: "center", marginRight: 12,
  },
  radioOn: { borderColor: theme.colors.primary },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: theme.colors.primary },
});
