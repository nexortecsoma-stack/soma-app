import React, { useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { theme } from "@/lib/theme";
import { useUI } from "@/hooks/UIContext";
import { AppHeader } from "@/components/ui/AppHeader";
import { AppCard } from "@/components/ui/AppCard";
import { AppFooter } from "@/components/ui/AppFooter";
import { AppKeyboardView } from "@/components/ui/AppKeyboardView";

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface SecaoProps {
  icone: keyof typeof Ionicons.glyphMap;
  cor: string;
  titulo: string;
  subtitulo?: string;
  children: React.ReactNode;
}

interface InfoBoxProps {
  tipo?: "info" | "dica" | "atencao" | "exemplo";
  children: React.ReactNode;
}

interface FormulaProps {
  linha: string;
  destaque?: boolean;
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function Secao({ icone, cor, titulo, subtitulo, children }: SecaoProps) {
  return (
    <AppCard style={s.secao}>
      <View style={s.secaoHeader}>
        <View style={[s.secaoIconeWrap, { backgroundColor: cor + "20" }]}>
          <Ionicons name={icone} size={22} color={cor} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.secaoTitulo}>{titulo}</Text>
          {subtitulo ? <Text style={s.secaoSub}>{subtitulo}</Text> : null}
        </View>
      </View>
      <View style={s.secaoBody}>{children}</View>
    </AppCard>
  );
}

function InfoBox({ tipo = "info", children }: InfoBoxProps) {
  const cfg = {
    info:    { cor: theme.colors.primary,    icon: "information-circle" as const, bg: theme.colors.primary + "12"    },
    dica:    { cor: "#16A34A",               icon: "bulb"               as const, bg: "#16A34A12"                    },
    atencao: { cor: "#D97706",               icon: "warning"            as const, bg: "#D9770612"                    },
    exemplo: { cor: "#7C3AED",               icon: "calculator"         as const, bg: "#7C3AED12"                    },
  }[tipo];

  return (
    <View style={[s.infoBox, { backgroundColor: cfg.bg, borderLeftColor: cfg.cor }]}>
      <Ionicons name={cfg.icon} size={16} color={cfg.cor} style={{ marginTop: 1 }} />
      <Text style={[s.infoTxt, { color: cfg.cor === theme.colors.primary ? theme.colors.text : theme.colors.text }]}>
        {children}
      </Text>
    </View>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <Text style={s.paragrafo}>{children}</Text>;
}

function Topico({ children }: { children: React.ReactNode }) {
  return (
    <View style={s.topicoRow}>
      <View style={s.topicoBullet} />
      <Text style={s.topicoTxt}>{children}</Text>
    </View>
  );
}

function FormulaBox({ linhas }: { linhas: { texto: string; destaque?: boolean }[] }) {
  return (
    <View style={s.formulaBox}>
      {linhas.map((l, i) => (
        <Text
          key={i}
          style={[s.formulaLinha, l.destaque && s.formulaDestaque]}
        >
          {l.texto}
        </Text>
      ))}
    </View>
  );
}

function Divisor() {
  return <View style={s.divisor} />;
}

// ─── Tela ─────────────────────────────────────────────────────────────────────

export default function DicasScreen() {
  const insets = useSafeAreaInsets();
  const { openDrawer } = useUI();
  const [deprAberta, setDeprAberta] = useState(true);

  return (
    <View style={{ flex: 1 }}>
      <AppHeader title="Dicas SOMA" subtitle="Entenda suas finanças" onMenuPress={openDrawer} />
      <AppKeyboardView contentContainerStyle={{ padding: 14, paddingBottom: insets.bottom + 30 }}>

        {/* ── Introdução ── */}
        <LinearGradient
          colors={[theme.colors.primaryDark, "#0d1f3c"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={s.banner}
        >
          <Ionicons name="bulb" size={28} color="#F59E0B" />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={s.bannerTitulo}>Aprenda a usar o SOMA</Text>
            <Text style={s.bannerSub}>
              Aqui você encontra explicações sobre como cada cálculo funciona e como
              usar essas informações a seu favor.
            </Text>
          </View>
        </LinearGradient>

        {/* ── Depreciação ── */}
        <Secao
          icone="trending-down"
          cor="#D97706"
          titulo="Depreciação do Veículo"
          subtitulo="O custo invisível que a maioria ignora"
        >
          {/* O que é */}
          <P>
            <Text style={s.negrito}>Depreciação</Text> é a desvalorização do seu veículo com o tempo.
            Todo carro perde valor — mesmo que você não perceba, isso acontece dia após dia.
          </P>
          <P>
            Para o motorista de aplicativo, isso é um{" "}
            <Text style={s.negrito}>custo real de operação</Text>. Se você não contabilizá-lo,
            vai achar que está lucrando mais do que realmente está.
          </P>

          <InfoBox tipo="atencao">
            Ignorar a depreciação é como não contar o desgaste do pneu como custo. Você paga, só
            não paga todo dia — mas o SOMA distribui esse custo diariamente para você enxergar a realidade.
          </InfoBox>

          <Divisor />

          {/* Como o SOMA calcula */}
          <Text style={s.subtitulo}>Como o SOMA calcula</Text>
          <P>
            O cálculo usa o <Text style={s.negrito}>Valor FIPE</Text> do seu veículo (cadastrado em{" "}
            <Text style={s.link}>Veículo</Text>) e uma taxa anual de depreciação — por padrão{" "}
            <Text style={s.negrito}>10% ao ano</Text>, que pode ser ajustada no cadastro.
          </P>

          <FormulaBox
            linhas={[
              { texto: "Valor FIPE  ×  taxa (% ao ano)  =  depreciação anual" },
              { texto: "Depreciação anual  ÷  dias úteis no ano  =  custo diário" },
              { texto: "Custo diário  ×  dias úteis no mês  =  custo mensal", destaque: true },
            ]}
          />

          <InfoBox tipo="exemplo">
            {"Exemplo prático:\n"}
            {"Veículo FIPE: R$ 50.000  |  Taxa: 10%/ano\n"}
            {"→ Depreciação anual: R$ 5.000\n"}
            {"→ Custo diário: R$ 5.000 ÷ 254 dias ≈ R$ 19,69/dia\n"}
            {"→ Custo mensal: R$ 19,69 × 21,5 dias ≈ R$ 423/mês"}
          </InfoBox>

          <Divisor />

          {/* Para que serve */}
          <Text style={s.subtitulo}>Para que serve esse valor?</Text>
          <P>
            O valor diário da depreciação deve ser tratado como uma{" "}
            <Text style={s.negrito}>reserva obrigatória</Text>. É dinheiro que você "deve" ao seu
            próximo veículo.
          </P>

          <Topico>
            Cada dia trabalhado, seu carro vale um pouco menos. Esse valor existe, mesmo que você
            não o pague para ninguém hoje.
          </Topico>
          <Topico>
            Ao guardar esse valor diariamente, você constrói um{" "}
            <Text style={s.negrito}>fundo de substituição do veículo</Text>.
          </Topico>
          <Topico>
            Quando chegar a hora de trocar de carro, você já terá o dinheiro reservado — sem
            precisar de financiamento ou se endividar.
          </Topico>

          <InfoBox tipo="dica">
            {"Dica prática: crie uma conta poupança ou investimento separada e transfira o valor\n"}
            {"da depreciação diária (ou mensal) automaticamente. Trate como se fosse uma conta a pagar.\n\n"}
            {"No exemplo acima: poupar ~R$ 423/mês por 10 anos = ~R$ 50.800 — o valor de um carro novo."}
          </InfoBox>

          <Divisor />

          {/* Onde ver no SOMA */}
          <Text style={s.subtitulo}>Onde ver no SOMA</Text>
          <View style={s.localCard}>
            <View style={s.localItem}>
              <Ionicons name="stats-chart" size={18} color={theme.colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={s.localTitulo}>CPMA – Controle Geral</Text>
                <Text style={s.localDesc}>
                  Mostra a depreciação como item de custo fixo, com valor diário, mensal e o total
                  acumulado desde o início dos seus registros.
                </Text>
              </View>
            </View>
            <View style={[s.localItem, { marginTop: 10 }]}>
              <Ionicons name="wallet" size={18} color={theme.colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={s.localTitulo}>Despesas Fixas</Text>
                <Text style={s.localDesc}>
                  Lista a depreciação junto com IPVA, seguro e outros custos fixos.
                  Você pode desativar o cálculo automático e inserir um valor manual.
                </Text>
              </View>
            </View>
            <View style={[s.localItem, { marginTop: 10 }]}>
              <Ionicons name="car-sport" size={18} color={theme.colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={s.localTitulo}>Cadastro do Veículo</Text>
                <Text style={s.localDesc}>
                  Informe o Valor FIPE e a taxa de depreciação para o cálculo ficar preciso.
                  Mantenha o valor atualizado ao fazer pesquisa na tabela FIPE periodicamente.
                </Text>
              </View>
            </View>
          </View>
        </Secao>

        {/* ── Mais dicas em breve ── */}
        <AppCard style={[s.secao, { alignItems: "center", paddingVertical: 22 }]}>
          <Ionicons name="construct-outline" size={28} color={theme.colors.textMuted} />
          <Text style={s.emBreve}>Mais dicas em breve</Text>
          <Text style={s.emBreveSub}>
            Estamos preparando explicações sobre Ganho Real por Hora, CPMA, Hodômetro e muito mais.
          </Text>
        </AppCard>

        <AppFooter />
      </AppKeyboardView>
    </View>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderRadius: theme.radius.lg,
    padding: 18,
    marginBottom: 14,
    ...theme.shadow.soft,
  },
  bannerTitulo: { ...theme.font.bold, fontSize: 16, color: "#fff", marginBottom: 4 },
  bannerSub: { ...theme.font.regular, fontSize: 12, color: "rgba(255,255,255,0.7)", lineHeight: 17 },

  secao: { marginBottom: 14 },
  secaoHeader: { flexDirection: "row", alignItems: "flex-start", gap: 12, marginBottom: 14 },
  secaoIconeWrap: {
    width: 44, height: 44, borderRadius: 12,
    alignItems: "center", justifyContent: "center",
  },
  secaoTitulo: { ...theme.font.bold, fontSize: 16, color: theme.colors.text },
  secaoSub: { ...theme.font.regular, fontSize: 12, color: theme.colors.textMuted, marginTop: 2 },
  secaoBody: { gap: 10 },

  subtitulo: { ...theme.font.semibold, fontSize: 14, color: theme.colors.text, marginTop: 2 },

  paragrafo: {
    ...theme.font.regular, fontSize: 13,
    color: theme.colors.textMuted, lineHeight: 20,
  },
  negrito: { ...theme.font.semibold, color: theme.colors.text },
  link: { ...theme.font.semibold, color: theme.colors.primary },

  topicoRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  topicoBullet: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: theme.colors.primary, marginTop: 7, flexShrink: 0,
  },
  topicoTxt: { ...theme.font.regular, fontSize: 13, color: theme.colors.textMuted, lineHeight: 20, flex: 1 },

  infoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 12,
    borderRadius: 10,
    borderLeftWidth: 3,
  },
  infoTxt: { ...theme.font.regular, fontSize: 12, lineHeight: 18, flex: 1, color: theme.colors.text },

  formulaBox: {
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: 10,
    padding: 14,
    gap: 6,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  formulaLinha: { ...theme.font.regular, fontSize: 12, color: theme.colors.textMuted, lineHeight: 19 },
  formulaDestaque: { ...theme.font.semibold, color: theme.colors.primary },

  divisor: { height: 1, backgroundColor: theme.colors.border, marginVertical: 4 },

  localCard: {
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  localItem: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  localTitulo: { ...theme.font.semibold, fontSize: 13, color: theme.colors.text, marginBottom: 2 },
  localDesc: { ...theme.font.regular, fontSize: 12, color: theme.colors.textMuted, lineHeight: 17 },

  emBreve: { ...theme.font.semibold, fontSize: 14, color: theme.colors.textMuted, marginTop: 10 },
  emBreveSub: { ...theme.font.regular, fontSize: 12, color: theme.colors.textSubtle, textAlign: "center", marginTop: 4, lineHeight: 18 },
});
