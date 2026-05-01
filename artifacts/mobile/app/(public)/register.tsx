import React, { useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { theme } from "@/lib/theme";
import { APP_FOOTER, APP_NAME } from "@/lib/constants";
import { useAuth } from "@/hooks/AuthContext";
import { useUI } from "@/hooks/UIContext";
import { AppInput } from "@/components/ui/AppInput";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { AppKeyboardView } from "@/components/ui/AppKeyboardView";

export default function RegisterScreen() {
  const { signUp } = useAuth();
  const { showModal, showToast } = useUI();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [aceitou, setAceitou] = useState(false);
  const [loading, setLoading] = useState(false);
  const [erros, setErros] = useState<{ email?: string; senha?: string; confirm?: string }>({});

  const handleRegister = async () => {
    const novosErros: typeof erros = {};
    if (!email) novosErros.email = "Informe o e-mail";
    if (!password) novosErros.senha = "Informe a senha";
    else if (password.length < 6) novosErros.senha = "A senha deve ter no mínimo 6 caracteres";
    if (password !== confirm) novosErros.confirm = "As senhas não coincidem";
    setErros(novosErros);
    if (Object.keys(novosErros).length) return;

    if (!aceitou) {
      showModal({
        type: "info",
        title: "Termos de uso",
        message: "Você precisa aceitar os termos de uso para criar a conta.",
      });
      return;
    }

    setLoading(true);
    try {
      await signUp(email.trim(), password, true);
      showToast({ type: "success", message: "Conta criada com sucesso" });
      router.replace("/(private)/dashboard");
    } catch (e: any) {
      const msg: string = e?.message ?? "Não foi possível criar a conta";
      if (/registered|exists|duplicate/i.test(msg)) {
        showModal({ type: "error", title: "E-mail já cadastrado", message: "Tente fazer login ou recuperar a senha." });
      } else {
        showModal({ type: "error", title: "Erro ao criar conta", message: msg });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={theme.gradients.header} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1 }}>
      <AppKeyboardView contentContainerStyle={{ padding: 24, paddingTop: insets.top + 24 }}>
        <View style={styles.brand}>
          <Image source={require("../../assets/images/icon.png")} style={styles.logo} />
          <Text style={styles.title}>{APP_NAME}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Criar nova conta</Text>

          <AppInput
            label="E-mail"
            placeholder="seu@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
            left="mail"
            value={email}
            onChangeText={setEmail}
            error={erros.email}
          />
          <AppInput
            label="Senha"
            placeholder="Mínimo 6 caracteres"
            password
            left="lock-closed"
            value={password}
            onChangeText={setPassword}
            error={erros.senha}
          />
          <AppInput
            label="Confirmar senha"
            placeholder="Repita sua senha"
            password
            left="lock-closed"
            value={confirm}
            onChangeText={setConfirm}
            error={erros.confirm}
          />

          <Pressable style={styles.checkRow} onPress={() => setAceitou((s) => !s)}>
            <View style={[styles.checkbox, aceitou && styles.checkboxOn]}>
              {aceitou ? <Ionicons name="checkmark" size={16} color="#fff" /> : null}
            </View>
            <Text style={styles.checkTxt}>
              Li e concordo com os{" "}
              <Text style={styles.link} onPress={() => router.push("/(public)/termos")}>
                termos de uso
              </Text>
            </Text>
          </Pressable>

          <PrimaryButton label="Criar conta" onPress={handleRegister} loading={loading} fullWidth size="lg" />

          <Pressable onPress={() => router.replace("/(public)/login")} style={{ marginTop: 18, alignSelf: "center" }}>
            <Text style={styles.linkSm}>Já tenho conta — entrar</Text>
          </Pressable>
        </View>

        <Text style={styles.footer}>{APP_FOOTER}</Text>
      </AppKeyboardView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  brand: { alignItems: "center", marginBottom: 18 },
  logo: { width: 60, height: 60, borderRadius: 14, marginBottom: 8 },
  title: { color: "#fff", fontSize: 26, ...theme.font.bold, letterSpacing: 2 },
  card: { backgroundColor: "#fff", borderRadius: theme.radius.xl, padding: 22, ...theme.shadow.card },
  cardTitle: { fontSize: 18, ...theme.font.bold, color: theme.colors.text, marginBottom: 16, textAlign: "center" },
  checkRow: { flexDirection: "row", alignItems: "center", marginBottom: 18, marginTop: 4 },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: theme.colors.border,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  checkboxOn: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  checkTxt: { flex: 1, ...theme.font.regular, fontSize: 13, color: theme.colors.text },
  link: { color: theme.colors.primary, ...theme.font.semibold },
  linkSm: { color: theme.colors.primary, ...theme.font.semibold, fontSize: 14 },
  footer: { textAlign: "center", color: "rgba(255,255,255,0.55)", fontSize: 11, marginTop: 22 },
});
