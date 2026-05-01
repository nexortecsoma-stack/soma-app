import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { theme } from "@/lib/theme";

export default function NotFoundScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <Ionicons name="warning-outline" size={56} color={theme.colors.warning} />
      <Text style={styles.titulo}>Página não encontrada</Text>
      <Text style={styles.sub}>A tela que você tentou acessar não existe.</Text>

      <Pressable
        style={styles.btn}
        onPress={() => {
          if (router.canGoBack()) {
            router.back();
          } else {
            router.replace("/(private)/dashboard");
          }
        }}
      >
        <Ionicons name="arrow-back" size={18} color="#fff" />
        <Text style={styles.btnTxt}>Voltar ao início</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bgDeep,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 32,
  },
  titulo: {
    ...theme.font.bold,
    fontSize: 22,
    color: theme.colors.surface,
    textAlign: "center",
    marginTop: 8,
  },
  sub: {
    ...theme.font.regular,
    fontSize: 14,
    color: theme.colors.textMuted,
    textAlign: "center",
  },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: theme.colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: theme.radius.pill,
    marginTop: 16,
  },
  btnTxt: {
    ...theme.font.semibold,
    fontSize: 15,
    color: "#fff",
  },
});
