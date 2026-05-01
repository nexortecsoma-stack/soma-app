import React, { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { theme } from "@/lib/theme";
import { useUI } from "@/hooks/UIContext";
import { useDespesasFixas } from "@/hooks/useDespesasFixas";
import { currencyEngine } from "@/engines/currency-engine";
import type { CustoFixoItem } from "@/engines/despesa-fixa-engine";
import { AppHeader } from "@/components/ui/AppHeader";
import { AppCard } from "@/components/ui/AppCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { AppFooter } from "@/components/ui/AppFooter";

const ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  ipva: "document-text",
  seguro: "shield-checkmark",
  aluguel: "key",
  financiamento: "cash",
  depreciacao: "trending-down",
  internet: "wifi",
  manutencao: "construct",
  custo_soma: "star",
};

export default function DespesasFixas() {
  const insets = useSafeAreaInsets();
  const { openDrawer } = useUI();
  const { data, isLoading } = useDespesasFixas();
  const [itemSelecionado, setItemSelecionado] = useState<CustoFixoItem | null>(null);

  return (
    <View style={{ flex: 1 }}>
      <AppHeader title="Despesas Fixas" subtitle="Custos automáticos" onMenuPress={openDrawer} />
      <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: insets.bottom + 90 }}>
        {isLoading ? (
          <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 24 }} />
        ) : !data ? (
          <AppCard>
            <EmptyState
              icon="wallet"
              titulo="Sem dados"
              mensagem="Configure seu veículo para ver os custos fixos."
            />
          </AppCard>
        ) : (
          <>
            {/* Cards principais: Soma e Mensal lado a lado */}
            <View style={styles.gridRow}>
              <View style={[styles.summaryCard, styles.summaryCardSoma]}>
                <View style={styles.summaryHeaderRow}>
                  <Ionicons name="layers" size={14} color={theme.colors.primary} />
                  <Text style={styles.summaryLabel}>Custo SOMA</Text>
                </View>
                <Text style={styles.summaryVal}>{currencyEngine.formatar(data.custoSomaTotal)}</Text>
                <Text style={styles.summaryHint}>
                  {data.dataInicioRegistros} → hoje{"\n"}
                  {data.diasUteisDesdeInicio} dias úteis
                </Text>
              </View>
              <View style={[styles.summaryCard, styles.summaryCardMensal]}>
                <View style={styles.summaryHeaderRow}>
                  <Ionicons name="calendar" size={14} color={theme.colors.success} />
                  <Text style={[styles.summaryLabel, { color: theme.colors.success }]}>Custo Mensal</Text>
                </View>
                <Text style={[styles.summaryVal, { color: theme.colors.success }]}>
                  {currencyEngine.formatar(data.custoMensal)}
                </Text>
                <Text style={styles.summaryHint}>
                  {data.diasUteisMes} dias úteis/mês{"\n"}
                  {currencyEngine.formatar(data.custoDiario)}/dia
                </Text>
              </View>
            </View>

            {/* Distribuição mês corrente */}
            <AppCard style={{ marginTop: 14 }}>
              <Text style={styles.section}>Mês corrente</Text>
              <View style={styles.statsRow}>
                <Stat label="Acumulado" valor={currencyEngine.formatar(data.custoAcumuladoMes)} />
                <Stat label="Restante" valor={currencyEngine.formatar(data.custoRestanteMes)} destaque />
              </View>
              <View style={styles.statsRow}>
                <Stat label="Dias trabalhados" valor={`${data.diasTrabalhados}`} />
                <Stat label="Dias úteis restantes" valor={`${data.diasUteisRestantes}`} />
              </View>
              <View style={styles.helperRow}>
                <Ionicons name="refresh-outline" size={13} color={theme.colors.textMuted} />
                <Text style={styles.helper}>
                  Redistribuído:{" "}
                  <Text style={{ ...theme.font.semibold }}>
                    {currencyEngine.formatar(data.novoCustoDiarioRedistribuido)}/dia útil restante
                  </Text>
                </Text>
              </View>
            </AppCard>

            {/* Lista de itens */}
            {data.itens.length === 0 ? (
              <AppCard style={{ marginTop: 14 }}>
                <EmptyState
                  icon="information-circle"
                  titulo="Nenhum custo configurado"
                  mensagem="Ative as opções automáticas em Configurações → Perfil."
                />
              </AppCard>
            ) : (
              <>
                {/* Cabeçalho da coluna */}
                <View style={styles.colHeader}>
                  <Text style={[styles.colHeaderTxt, { flex: 1 }]}>Custo fixo</Text>
                  <Text style={styles.colHeaderTxt}>SOMA</Text>
                  <Text style={[styles.colHeaderTxt, { marginLeft: 12 }]}>Mensal</Text>
                </View>
                <AppCard noPadding>
                  {data.itens.map((it, idx) => (
                    <Pressable
                      key={it.tipo}
                      style={[styles.itemRow, idx < data.itens.length - 1 && styles.divider]}
                      onPress={() => setItemSelecionado(it)}
                    >
                      <View style={styles.iconBox}>
                        <Ionicons
                          name={ICONS[it.tipo] ?? "wallet"}
                          size={16}
                          color={theme.colors.primary}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.itemTit}>{it.descricao}</Text>
                        <Text style={styles.itemSub}>
                          {currencyEngine.formatar(it.valorDiario)}/dia útil
                        </Text>
                      </View>
                      {/* SOMA */}
                      <Text style={styles.itemSoma}>{currencyEngine.formatar(it.custoSoma)}</Text>
                      {/* Mensal */}
                      <Text style={styles.itemMensal}>{currencyEngine.formatar(it.valorMensal)}</Text>
                      <Ionicons name="chevron-forward" size={13} color={theme.colors.textMuted} style={{ marginLeft: 2 }} />
                    </Pressable>
                  ))}
                </AppCard>
                <Text style={styles.tapHint}>Toque em um item para ver o detalhamento do cálculo</Text>
              </>
            )}
          </>
        )}
        <AppFooter />
      </ScrollView>

      {/* Modal de detalhamento */}
      <Modal
        visible={!!itemSelecionado}
        transparent
        animationType="slide"
        onRequestClose={() => setItemSelecionado(null)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setItemSelecionado(null)}>
          <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
            {itemSelecionado && (
              <>
                <View style={styles.modalHandle} />
                <View style={styles.modalHeader}>
                  <View style={styles.modalIconBox}>
                    <Ionicons
                      name={ICONS[itemSelecionado.tipo] ?? "wallet"}
                      size={22}
                      color={theme.colors.primary}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalTitulo}>{itemSelecionado.descricao}</Text>
                    <Text style={styles.modalSub}>Detalhamento do custo</Text>
                  </View>
                  <Pressable onPress={() => setItemSelecionado(null)} hitSlop={12}>
                    <Ionicons name="close-circle" size={24} color={theme.colors.textMuted} />
                  </Pressable>
                </View>

                {/* Custo SOMA vs Mensal */}
                <View style={styles.modalValRow}>
                  <ModalVal
                    label="Custo SOMA"
                    sublabel={`${itemSelecionado.detalhamento.diasUteisDesdeInicio} dias úteis`}
                    valor={currencyEngine.formatar(itemSelecionado.custoSoma)}
                    cor={theme.colors.primary}
                  />
                  <ModalVal
                    label="Custo Mensal"
                    sublabel="referência"
                    valor={currencyEngine.formatar(itemSelecionado.valorMensal)}
                    cor={theme.colors.success}
                  />
                  <ModalVal
                    label="Custo Anual"
                    sublabel="referência"
                    valor={currencyEngine.formatar(itemSelecionado.detalhamento.valorAnual)}
                  />
                </View>

                {/* Período */}
                <View style={styles.periodoRow}>
                  <View style={styles.periodoItem}>
                    <Text style={styles.periodoLabel}>Início dos registros</Text>
                    <Text style={styles.periodoVal}>{itemSelecionado.detalhamento.termoInicial}</Text>
                  </View>
                  <Ionicons name="arrow-forward" size={16} color={theme.colors.textMuted} />
                  <View style={[styles.periodoItem, { alignItems: "flex-end" }]}>
                    <Text style={styles.periodoLabel}>Termo final</Text>
                    <Text style={styles.periodoVal}>{itemSelecionado.detalhamento.termoFinal}</Text>
                  </View>
                </View>

                {/* Custo diário */}
                <View style={styles.diariaRow}>
                  <Ionicons name="today-outline" size={14} color={theme.colors.textMuted} />
                  <Text style={styles.diariaLabel}>
                    Custo por dia útil:{" "}
                    <Text style={{ ...theme.font.bold, color: theme.colors.text }}>
                      {currencyEngine.formatar(itemSelecionado.valorDiario)}
                    </Text>
                  </Text>
                </View>

                {/* Fórmula */}
                <View style={styles.formulaBox}>
                  <Text style={styles.formulaLabel}>Cálculo</Text>
                  <Text style={styles.formulaTxt}>{itemSelecionado.detalhamento.formula}</Text>
                </View>

                {itemSelecionado.detalhamento.observacao ? (
                  <View style={styles.obsBox}>
                    <Ionicons name="information-circle" size={15} color={theme.colors.primary} />
                    <Text style={styles.obsTxt}>{itemSelecionado.detalhamento.observacao}</Text>
                  </View>
                ) : null}
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function Stat({ label, valor, destaque }: { label: string; valor: string; destaque?: boolean }) {
  return (
    <View style={[styles.stat, destaque && styles.statDestaque]}>
      <Text style={styles.statLab}>{label}</Text>
      <Text style={[styles.statVal, destaque && { color: theme.colors.primary }]}>{valor}</Text>
    </View>
  );
}

function ModalVal({
  label,
  sublabel,
  valor,
  cor,
}: {
  label: string;
  sublabel?: string;
  valor: string;
  cor?: string;
}) {
  return (
    <View style={styles.modalValItem}>
      <Text style={styles.modalValLabel}>{label}</Text>
      {sublabel ? <Text style={styles.modalValSub}>{sublabel}</Text> : null}
      <Text style={[styles.modalValVal, cor ? { color: cor } : {}]}>{valor}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  gridRow: { flexDirection: "row", gap: 10 },
  summaryCard: {
    flex: 1,
    borderRadius: theme.radius.lg,
    padding: 14,
    ...theme.shadow.soft,
  },
  summaryCardSoma: { backgroundColor: theme.colors.primary + "12", borderWidth: 1.5, borderColor: theme.colors.primary + "30" },
  summaryCardMensal: { backgroundColor: theme.colors.success + "10", borderWidth: 1.5, borderColor: theme.colors.success + "30" },
  summaryHeaderRow: { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 6 },
  summaryLabel: { ...theme.font.semibold, fontSize: 12, color: theme.colors.primary },
  summaryVal: { ...theme.font.bold, fontSize: 20, color: theme.colors.text, marginBottom: 4 },
  summaryHint: { ...theme.font.regular, fontSize: 10, color: theme.colors.textMuted, lineHeight: 14 },
  section: { ...theme.font.semibold, fontSize: 14, color: theme.colors.text, marginBottom: 12 },
  statsRow: { flexDirection: "row", gap: 10, marginBottom: 10 },
  stat: { flex: 1, backgroundColor: theme.colors.surfaceMuted, padding: 10, borderRadius: theme.radius.md },
  statDestaque: { backgroundColor: theme.colors.primary + "12" },
  statLab: { fontSize: 11, color: theme.colors.textMuted, ...theme.font.medium },
  statVal: { fontSize: 15, color: theme.colors.text, ...theme.font.bold, marginTop: 2 },
  helperRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 4 },
  helper: { fontSize: 12, color: theme.colors.textMuted, ...theme.font.regular, flex: 1 },
  colHeader: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 6, marginTop: 14 },
  colHeaderTxt: { ...theme.font.semibold, fontSize: 11, color: theme.colors.textMuted, textTransform: "uppercase", letterSpacing: 0.4 },
  tapHint: { ...theme.font.medium, fontSize: 11, color: theme.colors.textMuted, textAlign: "center", marginTop: 8 },
  itemRow: { flexDirection: "row", alignItems: "center", padding: 14, gap: 8 },
  divider: { borderBottomWidth: 1, borderBottomColor: theme.colors.divider },
  iconBox: {
    width: 34,
    height: 34,
    borderRadius: 9,
    backgroundColor: theme.colors.primary + "1A",
    justifyContent: "center",
    alignItems: "center",
  },
  itemTit: { ...theme.font.semibold, fontSize: 13, color: theme.colors.text },
  itemSub: { ...theme.font.regular, fontSize: 10, color: theme.colors.textMuted, marginTop: 1 },
  itemSoma: { ...theme.font.bold, fontSize: 12, color: theme.colors.primary, minWidth: 60, textAlign: "right" },
  itemMensal: { ...theme.font.semibold, fontSize: 12, color: theme.colors.text, minWidth: 62, textAlign: "right" },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  modalSheet: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 36,
  },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: theme.colors.divider, alignSelf: "center", marginBottom: 16 },
  modalHeader: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 18 },
  modalIconBox: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: theme.colors.primary + "1A",
    justifyContent: "center", alignItems: "center",
  },
  modalTitulo: { ...theme.font.bold, fontSize: 17, color: theme.colors.text },
  modalSub: { ...theme.font.regular, fontSize: 12, color: theme.colors.textMuted },
  modalValRow: { flexDirection: "row", gap: 8, marginBottom: 14 },
  modalValItem: {
    flex: 1, backgroundColor: theme.colors.surfaceMuted,
    borderRadius: theme.radius.md, padding: 10, alignItems: "center",
  },
  modalValLabel: { fontSize: 10, color: theme.colors.textMuted, ...theme.font.semibold, textTransform: "uppercase" },
  modalValSub: { fontSize: 9, color: theme.colors.textMuted, ...theme.font.regular, marginTop: 1 },
  modalValVal: { fontSize: 14, color: theme.colors.text, ...theme.font.bold, marginTop: 4 },
  periodoRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: theme.colors.surfaceMuted, borderRadius: theme.radius.md,
    padding: 12, marginBottom: 10,
  },
  periodoItem: { flex: 1 },
  periodoLabel: { fontSize: 10, color: theme.colors.textMuted, ...theme.font.medium },
  periodoVal: { fontSize: 13, color: theme.colors.text, ...theme.font.semibold, marginTop: 2 },
  diariaRow: {
    flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10,
    backgroundColor: theme.colors.surfaceMuted, borderRadius: theme.radius.md, padding: 10,
  },
  diariaLabel: { ...theme.font.regular, fontSize: 13, color: theme.colors.textMuted, flex: 1 },
  formulaBox: {
    backgroundColor: theme.colors.primary + "0D",
    borderRadius: theme.radius.md, padding: 12, marginBottom: 10,
    borderLeftWidth: 3, borderLeftColor: theme.colors.primary,
  },
  formulaLabel: {
    ...theme.font.semibold, fontSize: 11, color: theme.colors.primary,
    marginBottom: 5, textTransform: "uppercase", letterSpacing: 0.5,
  },
  formulaTxt: { ...theme.font.medium, fontSize: 12, color: theme.colors.text, lineHeight: 18 },
  obsBox: {
    flexDirection: "row", alignItems: "flex-start", gap: 6,
    backgroundColor: theme.colors.primary + "0D", borderRadius: theme.radius.md, padding: 10,
  },
  obsTxt: { ...theme.font.regular, fontSize: 12, color: theme.colors.text, flex: 1, lineHeight: 17 },
});
