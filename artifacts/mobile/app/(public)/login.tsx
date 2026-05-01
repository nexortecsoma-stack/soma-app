import React, { useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { theme } from "@/lib/theme";
import { APP_FOOTER, APP_NAME } from "@/lib/constants";
import { useAuth } from "@/hooks/AuthContext";
import { useUI } from "@/hooks/UIContext";
import { AppInput } from "@/components/ui/AppInput";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { AppKeyboardView } from "@/components/ui/AppKeyboardView";

export default function LoginScreen() {
  const { signIn, resetPassword } = useAuth();
  const { showModal, hideModal, showToast } = useUI();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const handleLogin = async () => {
    setErro(null);
    if (!email || !password) {
      setErro("Informe e-mail e senha");
      return;
    }
    setLoading(true);
    try {
      await signIn(email.trim(), password);
      router.replace("/(private)/dashboard");
    } catch (e: any) {
      setErro("E-mail ou senha incorretos");
    } finally {
      setLoading(false);
    }
  };

  const handleEsqueci = () => {
    if (!email) {
      showModal({
        type: "info",
        title: "Recuperar senha",
        message: "Informe seu e-mail no campo acima e toque novamente em \"Esqueci minha senha\".",
      });
      return;
    }
    showModal({
      type: "confirm",
      title: "Recuperar senha",
      message: `Vamos enviar um link de redefinição para ${email.trim()}. Confirmar?`,
      confirmLabel: "Enviar",
      cancelLabel: "Cancelar",
      onConfirm: async () => {
        hideModal();
        try {
          await resetPassword(email.trim());
          showToast({ type: "success", message: "Link enviado para o seu e-mail" });
        } catch {
          showToast({ type: "error", message: "Não foi possível enviar o link" });
        }
      },
    });
  };

  return (
    <LinearGradient colors={theme.gradients.header} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1 }}>
      <AppKeyboardView contentContainerStyle={{ padding: 24, paddingTop: insets.top + 32 }}>
        <View style={styles.brand}>
          <Image source={require("../../assets/images/icon.png")} style={styles.logo} />
          <Text style={styles.title}>{APP_NAME}</Text>
          <Text style={styles.subtitle}>Sua jornada como motorista, no controle.</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Entrar na conta</Text>

          <AppInput
            label="E-mail"
            placeholder="seu@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
            left="mail"
            value={email}
            onChangeText={setEmail}
          />

          <AppInput
            label="Senha"
            placeholder="••••••••"
            password
            left="lock-closed"
            value={password}
            onChangeText={setPassword}
            error={erro}
          />

          <Pressable onPress={handleEsqueci} hitSlop={6} style={{ alignSelf: "flex-end", marginBottom: 16 }}>
            <Text style={styles.linkSm}>Esqueci minha senha</Text>
          </Pressable>

          <PrimaryButton label="Entrar" onPress={handleLogin} loading={loading} fullWidth size="lg" />

          <View style={styles.divider}>
            <View style={styles.line} />
            <Text style={styles.dividerTxt}>ou</Text>
            <View style={styles.line} />
          </View>

          <PrimaryButton
            label="Criar nova conta"
            onPress={() => router.push("/(public)/register")}
            variant="ghost"
            fullWidth
            size="lg"
          />
        </View>

        <Text style={styles.footer}>{APP_FOOTER}</Text>
      </AppKeyboardView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  brand: { alignItems: "center", marginBottom: 24 },
  logo: { width: 76, height: 76, borderRadius: 18, marginBottom: 12 },
  title: { color: "#fff", fontSize: 30, ...theme.font.bold, letterSpacing: 3 },
  subtitle: { color: theme.colors.accentBright, fontSize: 13, ...theme.font.medium, marginTop: 6, textAlign: "center" },
  card: {
    backgroundColor: "#fff",
    borderRadius: theme.radius.xl,
    padding: 22,
    ...theme.shadow.card,
  },
  cardTitle: { fontSize: 18, ...theme.font.bold, color: theme.colors.text, marginBottom: 18, textAlign: "center" },
  divider: { flexDirection: "row", alignItems: "center", marginVertical: 18 },
  line: { flex: 1, height: 1, backgroundColor: theme.colors.divider },
  dividerTxt: { marginHorizontal: 10, color: theme.colors.textMuted, ...theme.font.medium, fontSize: 12 },
  linkSm: { color: theme.colors.primary, ...theme.font.semibold, fontSize: 13 },
  footer: { textAlign: "center", color: "rgba(255,255,255,0.55)", fontSize: 11, marginTop: 22 },
});
