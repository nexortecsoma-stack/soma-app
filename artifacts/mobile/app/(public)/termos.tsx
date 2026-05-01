import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { theme } from "@/lib/theme";
import { APP_FOOTER, APP_NAME } from "@/lib/constants";
import { AppHeader } from "@/components/ui/AppHeader";

const DATA_ATUALIZACAO = "30 de abril de 2026";

// ─── Seções dos Termos de Uso ─────────────────────────────────────────────

const TERMOS: { titulo: string; texto: string }[] = [
  {
    titulo: "1. Aceitação dos Termos",
    texto:
      `Ao acessar ou utilizar o ${APP_NAME}, o usuário declara que leu, compreendeu e concorda integralmente com estes Termos de Uso e com a Política de Privacidade. Caso não concorde com qualquer disposição, o uso do aplicativo não é permitido.`,
  },
  {
    titulo: "2. Sobre o SOMA",
    texto:
      `O ${APP_NAME} é um aplicativo de gestão financeira e operacional voltado para motoristas de aplicativo, com foco na apuração de resultados reais — incluindo custos operacionais frequentemente desconsiderados. O ${APP_NAME} é uma ferramenta de apoio e não garante resultados financeiros.`,
  },
  {
    titulo: "3. Cadastro e Responsabilidades do Usuário",
    texto:
      `O usuário compromete-se a:\n\n• Fornecer informações verdadeiras, precisas e atualizadas;\n• Manter a confidencialidade de suas credenciais de acesso;\n• Ser o único responsável por toda atividade realizada em sua conta;\n• Utilizar o aplicativo de forma ética e legal, respeitando direitos de terceiros;\n• Não tentar acessar sistemas, dados ou áreas restritas além do permitido.`,
  },
  {
    titulo: "4. Funcionalidades",
    texto:
      `O ${APP_NAME} poderá oferecer:\n\n• Registro de jornadas (manual e automático via GPS);\n• Controle de ganhos, despesas e abastecimentos;\n• Relatórios e gráficos financeiros;\n• Ranking de desempenho entre motoristas;\n• Estimativas de custos fixos e variáveis.\n\nO ${APP_NAME} poderá modificar, suspender ou descontinuar funcionalidades a qualquer momento, sem aviso prévio.`,
  },
  {
    titulo: "5. Ranking, Exposição e Compartilhamento",
    texto:
      `5.1 Participação opcional: o usuário pode ativar ou desativar sua participação no ranking, ocultar sua posição e utilizar nome público ou anonimizado.\n\n5.2 Dados exibidos: indicadores financeiros (bruto/líquido), categoria do veículo e cidade/UF.\n\n5.3 Dados protegidos: CPF, RG, placa, dados bancários e informações sensíveis jamais serão divulgados.\n\n5.4 Compartilhamento em redes sociais: permitido desde que os dados não sejam distorcidos, utilizados de forma enganosa ou associados a promessas de ganhos. O ${APP_NAME} não se responsabiliza pelo uso fora da plataforma.\n\n5.5 Uso indevido: é proibido manipular dados para vantagem no ranking, enganar terceiros ou criar falsas representações de desempenho.`,
  },
  {
    titulo: "6. Propriedade Intelectual",
    texto:
      `Todo o conteúdo do ${APP_NAME} — interface, layout, design, marca, funcionalidades e relatórios — é protegido por direitos autorais.\n\nUso permitido: fins pessoais e compartilhamento não comercial em redes sociais.\n\nUso proibido (sem autorização formal): comercializar imagens ou conteúdo; utilizar para fins comerciais indiretos; revender, licenciar ou replicar design e funcionalidades. O descumprimento poderá resultar em suspensão da conta e medidas judiciais.`,
  },
  {
    titulo: "7. Plano Gratuito e Plano PRO",
    texto:
      `Recursos básicos estão disponíveis no plano gratuito com histórico limitado aos últimos 3 meses. Recursos avançados — como relatórios completos, despesas fixas detalhadas, conferência de hodômetro, ranking e histórico ilimitado — requerem assinatura PRO ativa.`,
  },
  {
    titulo: "8. Limitação de Responsabilidade",
    texto:
      `O ${APP_NAME} não se responsabiliza por:\n\n• Decisões financeiras tomadas com base nos dados do aplicativo;\n• Dados inseridos incorretamente pelo usuário;\n• Falhas externas de GPS, internet ou APIs de terceiros;\n• Perdas financeiras de qualquer natureza.`,
  },
  {
    titulo: "9. Suspensão e Encerramento do Serviço",
    texto:
      `O ${APP_NAME} poderá, a qualquer tempo e a seu exclusivo critério, encerrar, suspender ou limitar suas atividades — de forma total ou parcial, permanente ou temporária — por motivos técnicos, estratégicos, comerciais ou legais, sem necessidade de aviso prévio. Nessas situações, dados poderão ser excluídos e não haverá direito a indenização.`,
  },
  {
    titulo: "10. Alterações dos Termos",
    texto:
      `Estes termos podem ser atualizados a qualquer momento. Mudanças relevantes serão comunicadas no aplicativo. O uso continuado após as alterações representa aceite dos novos termos.`,
  },
  {
    titulo: "11. Contato",
    texto:
      `Dúvidas ou solicitações relacionadas a estes termos:\n\nE-mail: soma.app.br@gmail.com\nWhatsApp: +55 48 99100-7023`,
  },
  {
    titulo: "12. Foro",
    texto:
      `Fica eleito o foro da comarca de Belo Horizonte – MG para dirimir quaisquer conflitos decorrentes destes termos.`,
  },
];

// ─── Seções da Política de Privacidade ──────────────────────────────────

const PRIVACIDADE: { titulo: string; texto: string }[] = [
  {
    titulo: "1. Dados Coletados",
    texto:
      `1.1 Informações fornecidas pelo usuário: nome, e-mail, CPF, telefone, cidade/UF, dados do veículo e informações financeiras.\n\n1.2 Dados gerados automaticamente: localização (quando autorizada), quilometragem percorrida, tempo de jornada e interações no aplicativo.`,
  },
  {
    titulo: "2. Finalidade",
    texto:
      `Os dados são utilizados para:\n\n• Operação e melhoria do aplicativo;\n• Cálculo de resultados financeiros;\n• Geração de relatórios e gráficos;\n• Participação no Ranking SOMA (quando autorizado pelo usuário).`,
  },
  {
    titulo: "3. Compartilhamento",
    texto:
      `O ${APP_NAME}:\n\n• Não vende dados pessoais;\n• Não compartilha informações sensíveis com terceiros;\n• Pode utilizar dados anonimizados e agregados para fins estatísticos;\n• Pode compartilhar dados com provedores de serviço essenciais (ex.: infraestrutura em nuvem), sob acordo de confidencialidade.`,
  },
  {
    titulo: "4. Segurança",
    texto:
      `Os dados são armazenados com controle de acesso por Row Level Security (RLS), garantindo que somente você acesse seu histórico. Medidas técnicas são empregadas para proteção, porém nenhum sistema oferece garantia absoluta de segurança.`,
  },
  {
    titulo: "5. Direitos do Usuário",
    texto:
      `Você pode, a qualquer momento:\n\n• Acessar e corrigir seus dados;\n• Solicitar a exclusão de sua conta e dados;\n• Desativar sua participação no Ranking;\n• Revogar a autorização de coleta de localização via configurações do dispositivo.`,
  },
  {
    titulo: "6. Retenção de Dados",
    texto:
      `Os dados são mantidos enquanto a conta estiver ativa. Em caso de encerramento do serviço ou exclusão de conta, os dados poderão ser removidos de forma definitiva.`,
  },
  {
    titulo: "7. Cookies e Rastreamento",
    texto:
      `O ${APP_NAME} não utiliza cookies. Dados de uso são coletados apenas para fins operacionais e de melhoria do serviço.`,
  },
  {
    titulo: "8. Alterações desta Política",
    texto:
      `Esta política pode ser atualizada a qualquer momento. Alterações relevantes serão comunicadas pelo aplicativo.`,
  },
  {
    titulo: "9. Contato",
    texto:
      `E-mail: soma.app.br@gmail.com\nWhatsApp: +55 48 99100-7023`,
  },
  {
    titulo: "10. Foro",
    texto:
      `Belo Horizonte – MG.`,
  },
];

// ─── Componente ──────────────────────────────────────────────────────────

export default function TermosScreen() {
  const insets = useSafeAreaInsets();
  const [aba, setAba] = useState<"termos" | "privacidade">("termos");

  const secoes = aba === "termos" ? TERMOS : PRIVACIDADE;

  return (
    <LinearGradient colors={["#020617", "#0B1430"]} style={{ flex: 1 }}>
      <AppHeader title={aba === "termos" ? "Termos de Uso" : "Política de Privacidade"} onBackPress={() => router.back()} />

      {/* Abas */}
      <View style={styles.tabRow}>
        <Pressable style={[styles.tab, aba === "termos" && styles.tabAtivo]} onPress={() => setAba("termos")}>
          <Ionicons name="document-text-outline" size={14} color={aba === "termos" ? "#fff" : theme.colors.textOnDarkMuted} />
          <Text style={[styles.tabTxt, aba === "termos" && styles.tabTxtAtivo]}>Termos de Uso</Text>
        </Pressable>
        <Pressable style={[styles.tab, aba === "privacidade" && styles.tabAtivo]} onPress={() => setAba("privacidade")}>
          <Ionicons name="shield-checkmark-outline" size={14} color={aba === "privacidade" ? "#fff" : theme.colors.textOnDarkMuted} />
          <Text style={[styles.tabTxt, aba === "privacidade" && styles.tabTxtAtivo]}>Privacidade</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: insets.bottom + 24 }}>
        <View style={styles.card}>
          <Text style={styles.atualizacao}>Última atualização: {DATA_ATUALIZACAO}</Text>

          {secoes.map((s) => (
            <View key={s.titulo} style={styles.secao}>
              <Text style={styles.titulo}>{s.titulo}</Text>
              <Text style={styles.texto}>{s.texto}</Text>
            </View>
          ))}

          <View style={styles.separador} />
          <Text style={styles.footer}>{APP_FOOTER}</Text>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  tabRow: {
    flexDirection: "row",
    paddingHorizontal: 18,
    paddingVertical: 10,
    gap: 8,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  tabAtivo: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  tabTxt: {
    ...theme.font.medium,
    fontSize: 13,
    color: theme.colors.textOnDarkMuted,
  },
  tabTxtAtivo: {
    color: "#fff",
    ...theme.font.semibold,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: theme.radius.lg,
    padding: 20,
  },
  atualizacao: {
    ...theme.font.regular,
    fontSize: 11,
    color: theme.colors.textSubtle,
    marginBottom: 16,
    textAlign: "center",
  },
  secao: {
    marginBottom: 20,
  },
  titulo: {
    ...theme.font.bold,
    fontSize: 14,
    color: theme.colors.text,
    marginBottom: 6,
  },
  texto: {
    ...theme.font.regular,
    fontSize: 13,
    color: theme.colors.textMuted,
    lineHeight: 20,
  },
  separador: {
    height: 1,
    backgroundColor: theme.colors.divider,
    marginVertical: 16,
  },
  footer: {
    textAlign: "center",
    color: theme.colors.textSubtle,
    fontSize: 11,
  },
});
