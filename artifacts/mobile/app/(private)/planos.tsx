import React, { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { PurchasesPackage } from "react-native-purchases";
import { theme } from "@/lib/theme";
import { useUI } from "@/hooks/UIContext";
import { useAuth } from "@/hooks/AuthContext";
import { useSubscription } from "@/lib/revenuecat";
import { profileService } from "@/services/profile-service";
import { AppHeader } from "@/components/ui/AppHeader";
import { AppCard } from "@/components/ui/AppCard";
import { AppKeyboardView } from "@/components/ui/AppKeyboardView";
import { AppFooter } from "@/components/ui/AppFooter";

// ─── MODO BETA ────────────────────────────────────────────────────────────────
// Durante a fase de testes, o pagamento está desativado.
// Clicar em qualquer plano libera o acesso PRO gratuitamente.
// Quando a Play Store liberar, remova esta flag e reative o fluxo do RevenueCat.
const MODO_BETA = true;
// ──────────────────────────────────────────────────────────────────────────────

const RECURSOS_FREE = [
  "2 plataformas fixas + 1 extra",
  "Registro de jornadas manual",
  "Lançamento de ganhos e despesas",
  "Dashboard básico",
];

const RECURSOS_PRO = [
  "Plataformas ilimitadas",
  "Modo automático com GPS",
  "Relatórios avançados de hora e km",
  "Custos fixos automáticos (IPVA, seguro, depreciação)",
  "Ranking completo + sua posição em destaque",
  "Backup em nuvem",
  "Suporte prioritário",
];

function packageLabel(pkg: PurchasesPackage): string {
  const key = pkg.packageType;
  if (key === "MONTHLY") return "Mensal";
  if (key === "SIX_MONTH") return "Semestral";
  if (key === "ANNUAL") return "Anual";
  return pkg.product.title;
}

function packageDays(pkg: PurchasesPackage): string {
  const key = pkg.packageType;
  if (key === "MONTHLY") return "30 dias";
  if (key === "SIX_MONTH") return "180 dias";
  if (key === "ANNUAL") return "365 dias";
  return "";
}

function monthlyPrice(pkg: PurchasesPackage): string | null {
  const key = pkg.packageType;
  if (key === "MONTHLY") return null;
  const months = key === "SIX_MONTH" ? 6 : 12;
  const monthly = pkg.product.price / months;
  const sym = pkg.product.currencyCode === "BRL" ? "R$\u00a0" : pkg.product.currencyCode + " ";
  return `≈ ${sym}${monthly.toFixed(2).replace(".", ",")}/mês`;
}

export default function PlanosScreen() {
  const insets = useSafeAreaInsets();
  const { openDrawer } = useUI();
  const { perfil, refreshPerfil } = useAuth();
  const { offerings, isLoading, purchase, restore, isPurchasing, isRestoring, isSubscribed } =
    useSubscription();

  const [confirming, setConfirming] = useState<PurchasesPackage | null>(null);
  const [liberando, setLiberando] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const packages: PurchasesPackage[] = offerings?.current?.availablePackages ?? [];
  const jaEhPro = isSubscribed || perfil?.assinante === true;

  // ── Liberação manual (modo beta) ──────────────────────────────
  const liberarAcessoBeta = async (pkg: PurchasesPackage) => {
    if (!perfil?.id) return;
    setConfirming(null);
    setLiberando(true);
    setErrorMsg(null);
    try {
      await profileService.update(perfil.id, { assinante: true });
      await refreshPerfil();
      setSuccessMsg(`Acesso PRO ${packageLabel(pkg)} liberado! Aproveite o SOMA completo.`);
    } catch (e: any) {
      setErrorMsg("Erro ao liberar acesso. Tente novamente.");
    } finally {
      setLiberando(false);
    }
  };

  // ── Compra real (RevenueCat) — ativo quando MODO_BETA = false ─
  const handlePurchase = async (pkg: PurchasesPackage) => {
    setConfirming(null);
    setErrorMsg(null);
    try {
      await purchase(pkg);
      await refreshPerfil();
      setSuccessMsg(`Plano ${packageLabel(pkg)} ativado com sucesso! Bem-vindo ao SOMA PRO.`);
    } catch (e: any) {
      if (e?.userCancelled) return;
      setErrorMsg(e?.message ?? "Erro ao processar pagamento. Tente novamente.");
    }
  };

  const handleConfirm = (pkg: PurchasesPackage) => {
    if (MODO_BETA) {
      liberarAcessoBeta(pkg);
    } else {
      handlePurchase(pkg);
    }
  };

  const handleRestore = async () => {
    setErrorMsg(null);
    try {
      await restore();
      await refreshPerfil();
      setSuccessMsg("Compras restauradas com sucesso!");
    } catch (e: any) {
      setErrorMsg(e?.message ?? "Não foi possível restaurar as compras.");
    }
  };

  const isProcessing = liberando || isPurchasing;

  return (
    <View style={{ flex: 1 }}>
      <AppHeader title="Planos SOMA" subtitle="Compare e escolha" onMenuPress={openDrawer} />
      <AppKeyboardView contentContainerStyle={{ padding: 14, paddingBottom: insets.bottom + 30 }}>

        {/* Banner beta */}
        {MODO_BETA && !jaEhPro && (
          <View style={styles.betaBanner}>
            <Ionicons name="flask" size={16} color="#7C3AED" />
            <Text style={styles.betaTxt}>
              Modo teste ativo — selecione qualquer plano para liberar o acesso PRO gratuitamente.
            </Text>
          </View>
        )}

        {/* Plano atual */}
        <AppCard>
          <View style={styles.head}>
            <View style={[styles.headIcon, { backgroundColor: jaEhPro ? "#D97706" : theme.colors.primary }]}>
              <Ionicons name={jaEhPro ? "star" : "lock-closed"} size={20} color="#fff" />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.headLab}>Seu plano atual</Text>
              <Text style={styles.headVal}>{jaEhPro ? "PRO ✓" : "Free"}</Text>
            </View>
            {!jaEhPro && !MODO_BETA && (
              <Pressable onPress={handleRestore} disabled={isRestoring} style={styles.restoreBtn}>
                {isRestoring
                  ? <ActivityIndicator size="small" color={theme.colors.primary} />
                  : <Text style={styles.restoreTxt}>Restaurar</Text>
                }
              </Pressable>
            )}
          </View>
        </AppCard>

        {/* Mensagem de sucesso */}
        {successMsg && (
          <AppCard style={{ backgroundColor: "#ECFDF5", borderLeftWidth: 3, borderLeftColor: theme.colors.success }}>
            <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
              <Ionicons name="checkmark-circle" size={20} color={theme.colors.success} />
              <Text style={[styles.msgTxt, { color: "#065F46" }]}>{successMsg}</Text>
            </View>
          </AppCard>
        )}

        {/* Mensagem de erro */}
        {errorMsg && (
          <AppCard style={{ backgroundColor: "#FEF2F2", borderLeftWidth: 3, borderLeftColor: theme.colors.danger }}>
            <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
              <Ionicons name="alert-circle" size={20} color={theme.colors.danger} />
              <Text style={[styles.msgTxt, { color: "#7F1D1D" }]}>{errorMsg}</Text>
            </View>
          </AppCard>
        )}

        {/* Plano Free */}
        <Text style={styles.section}>Plano Free</Text>
        <AppCard>
          <View style={styles.planoTitRow}>
            <Text style={styles.planoNome}>Free</Text>
            <Text style={styles.planoPreco}>R$ 0,00</Text>
          </View>
          <Text style={styles.planoSub}>Para começar a controlar seus ganhos.</Text>
          {RECURSOS_FREE.map((r, i) => (
            <Linha key={i} texto={r} cor={theme.colors.textMuted} icone="ellipse-outline" />
          ))}
        </AppCard>

        {/* Planos PRO */}
        <Text style={styles.section}>Plano Pro</Text>

        {isLoading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.loadingTxt}>Carregando planos...</Text>
          </View>
        ) : packages.length === 0 ? (
          <AppCard>
            <Text style={{ ...theme.font.medium, color: theme.colors.textMuted, textAlign: "center", padding: 16 }}>
              Planos não disponíveis no momento. Tente novamente em instantes.
            </Text>
          </AppCard>
        ) : (
          packages.map((pkg) => {
            const mensal = monthlyPrice(pkg);
            return (
              <Pressable
                key={pkg.identifier}
                onPress={() => !jaEhPro && !isProcessing && setConfirming(pkg)}
                style={{ marginBottom: 12 }}
                disabled={jaEhPro || isProcessing}
              >
                <LinearGradient
                  colors={theme.gradients.header}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.proCard}
                >
                  <View style={styles.proHead}>
                    <View>
                      <Text style={styles.proNome}>{packageLabel(pkg)}</Text>
                      <Text style={styles.proSub}>{packageDays(pkg)}</Text>
                    </View>
                    <View style={{ alignItems: "flex-end" }}>
                      <Text style={styles.proValor}>{pkg.product.priceString}</Text>
                      {mensal ? <Text style={styles.proMensal}>{mensal}</Text> : null}
                    </View>
                  </View>

                  {jaEhPro ? (
                    <View style={styles.atualBadge}>
                      <Ionicons name="checkmark-circle" size={14} color="#fff" />
                      <Text style={styles.atualTxt}>Plano ativo</Text>
                    </View>
                  ) : isProcessing ? (
                    <View style={styles.cta}>
                      <ActivityIndicator size="small" color="#fff" />
                      <Text style={styles.ctaTxt}>Aguarde...</Text>
                    </View>
                  ) : (
                    <View style={styles.cta}>
                      <Text style={styles.ctaTxt}>
                        {MODO_BETA ? `Ativar ${packageLabel(pkg)} gratuitamente` : `Escolher ${packageLabel(pkg)}`}
                      </Text>
                      <Ionicons name="arrow-forward" size={16} color="#fff" />
                    </View>
                  )}
                </LinearGradient>
              </Pressable>
            );
          })
        )}

        {/* Recursos PRO */}
        <AppCard style={{ marginTop: 4 }}>
          <Text style={styles.section}>O que está incluído no Pro</Text>
          {RECURSOS_PRO.map((r, i) => (
            <Linha key={i} texto={r} cor={theme.colors.success} icone="checkmark-circle" />
          ))}
        </AppCard>

        <AppFooter />
      </AppKeyboardView>

      {/* Modal de confirmação */}
      <Modal
        visible={confirming !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirming(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={[styles.modalIconWrap, MODO_BETA && { backgroundColor: "#EDE9FE" }]}>
              <Ionicons name={MODO_BETA ? "flask" : "star"} size={32} color={MODO_BETA ? "#7C3AED" : "#D97706"} />
            </View>
            <Text style={styles.modalTitle}>
              {MODO_BETA ? "Liberar acesso PRO" : "Confirmar assinatura"}
            </Text>
            <Text style={styles.modalBody}>
              {MODO_BETA
                ? `Você está no modo de testes. Ao confirmar, o acesso PRO será liberado imediatamente de forma gratuita.\n\nPlano: ${confirming ? packageLabel(confirming) : ""}`
                : `Você está prestes a assinar o SOMA PRO — ${confirming ? packageLabel(confirming) : ""}.\n\nValor: ${confirming?.product.priceString}\n\nA cobrança será feita pela Play Store.`
              }
            </Text>
            <View style={styles.modalBtns}>
              <Pressable style={styles.modalCancelar} onPress={() => setConfirming(null)}>
                <Text style={styles.modalCancelarTxt}>Cancelar</Text>
              </Pressable>
              <Pressable
                style={styles.modalConfirmar}
                onPress={() => confirming && handleConfirm(confirming)}
              >
                <LinearGradient
                  colors={MODO_BETA ? ["#7C3AED", "#A78BFA"] : ["#D97706", "#F59E0B"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.modalConfirmarInner}
                >
                  <Ionicons name={MODO_BETA ? "checkmark" : "star"} size={14} color="#fff" />
                  <Text style={styles.modalConfirmarTxt}>
                    {MODO_BETA ? "Liberar acesso" : "Assinar agora"}
                  </Text>
                </LinearGradient>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function Linha({ texto, cor, icone }: { texto: string; cor: string; icone: keyof typeof Ionicons.glyphMap }) {
  return (
    <View style={styles.linha}>
      <Ionicons name={icone} size={16} color={cor} />
      <Text style={styles.linhaTxt}>{texto}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  betaBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: "#EDE9FE",
    borderRadius: theme.radius.md,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: "#7C3AED",
  },
  betaTxt: { ...theme.font.medium, fontSize: 13, color: "#4C1D95", flex: 1, lineHeight: 19 },

  head: { flexDirection: "row", alignItems: "center" },
  headIcon: { width: 42, height: 42, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  headLab: { fontSize: 11, color: theme.colors.textMuted, ...theme.font.medium },
  headVal: { fontSize: 16, color: theme.colors.text, ...theme.font.bold, marginTop: 2 },
  restoreBtn: { paddingHorizontal: 10, paddingVertical: 6 },
  restoreTxt: { ...theme.font.medium, fontSize: 12, color: theme.colors.primary },

  msgTxt: { ...theme.font.medium, fontSize: 13, flex: 1 },

  section: { ...theme.font.semibold, fontSize: 13, color: theme.colors.textMuted, marginTop: 18, marginBottom: 8, marginLeft: 4 },
  planoTitRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" },
  planoNome: { ...theme.font.bold, fontSize: 18, color: theme.colors.text },
  planoPreco: { ...theme.font.bold, fontSize: 18, color: theme.colors.text },
  planoSub: { ...theme.font.regular, fontSize: 12, color: theme.colors.textMuted, marginTop: 2, marginBottom: 12 },
  linha: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 6 },
  linhaTxt: { ...theme.font.regular, fontSize: 13, color: theme.colors.text, flex: 1 },

  loadingWrap: { alignItems: "center", padding: 32, gap: 12 },
  loadingTxt: { ...theme.font.regular, fontSize: 13, color: theme.colors.textMuted },

  proCard: { borderRadius: theme.radius.lg, padding: 16, ...theme.shadow.soft },
  proHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  proNome: { ...theme.font.bold, fontSize: 18, color: "#fff" },
  proSub: { ...theme.font.regular, fontSize: 11, color: theme.colors.accentBright, marginTop: 2 },
  proValor: { ...theme.font.bold, fontSize: 22, color: "#fff" },
  proMensal: { ...theme.font.medium, fontSize: 11, color: theme.colors.accentBright, marginTop: 2 },
  cta: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 14, padding: 10, backgroundColor: "rgba(255,255,255,0.18)", borderRadius: theme.radius.pill },
  ctaTxt: { ...theme.font.semibold, fontSize: 13, color: "#fff" },
  atualBadge: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 14, padding: 10, backgroundColor: "rgba(34,197,94,0.25)", borderRadius: theme.radius.pill },
  atualTxt: { ...theme.font.semibold, fontSize: 13, color: "#fff" },

  modalOverlay: { flex: 1, backgroundColor: "rgba(2,6,23,0.6)", justifyContent: "center", alignItems: "center", padding: 24 },
  modalBox: { backgroundColor: "#fff", borderRadius: 20, padding: 24, width: "100%", maxWidth: 380, alignItems: "center" },
  modalIconWrap: { width: 60, height: 60, borderRadius: 30, backgroundColor: "#FEF3C7", justifyContent: "center", alignItems: "center", marginBottom: 16 },
  modalTitle: { ...theme.font.bold, fontSize: 18, color: theme.colors.text, marginBottom: 12 },
  modalBody: { ...theme.font.regular, fontSize: 14, color: theme.colors.textMuted, textAlign: "center", lineHeight: 22, marginBottom: 24 },
  modalBtns: { flexDirection: "row", gap: 12, width: "100%" },
  modalCancelar: { flex: 1, padding: 14, borderRadius: theme.radius.md, borderWidth: 1.5, borderColor: theme.colors.inputBorder, alignItems: "center" },
  modalCancelarTxt: { ...theme.font.semibold, fontSize: 14, color: theme.colors.textMuted },
  modalConfirmar: { flex: 1, borderRadius: theme.radius.md, overflow: "hidden" },
  modalConfirmarInner: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, padding: 14 },
  modalConfirmarTxt: { ...theme.font.bold, fontSize: 14, color: "#fff" },
});
