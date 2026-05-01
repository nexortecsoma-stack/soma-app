import React, { useEffect } from "react";
import { ActivityIndicator, Image, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { theme } from "@/lib/theme";
import { APP_FOOTER, APP_NAME } from "@/lib/constants";
import { useAuth } from "@/hooks/AuthContext";

export default function SplashIndex() {
  const { session, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    const t = setTimeout(() => {
      if (session) {
        router.replace("/(private)/dashboard");
      } else {
        router.replace("/(public)/login");
      }
    }, 700);
    return () => clearTimeout(t);
  }, [session, loading]);

  return (
    <LinearGradient
      colors={theme.gradients.header}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.wrap}
    >
      <View style={styles.center}>
        <Image source={require("../assets/images/icon.png")} style={styles.logo} />
        <Text style={styles.brand}>{APP_NAME}</Text>
        <Text style={styles.sub}>Sistema Orçamentário para</Text>
        <Text style={styles.sub}>Motorista de Aplicativo</Text>
        <ActivityIndicator color={theme.colors.accentBright} style={{ marginTop: 32 }} />
      </View>
      <Text style={styles.footer}>{APP_FOOTER}</Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  center: { alignItems: "center" },
  logo: { width: 110, height: 110, borderRadius: 26, marginBottom: 22 },
  brand: { color: "#fff", ...theme.font.bold, fontSize: 38, letterSpacing: 4, textAlign: "center" },
  sub: { color: theme.colors.accentBright, ...theme.font.medium, fontSize: 13, marginTop: 2, textAlign: "center" },
  footer: { position: "absolute", bottom: 32, color: "rgba(255,255,255,0.6)", fontSize: 12 },
});
