import React, { useEffect, useRef, useState } from "react";
import { Animated, Dimensions, Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { theme } from "@/lib/theme";
import { APP_FOOTER, APP_NAME } from "@/lib/constants";
import { useUI } from "@/hooks/UIContext";
import { useAuth } from "@/hooks/AuthContext";

const DRAWER_WIDTH = Math.min(Dimensions.get("window").width * 0.82, 320);

interface Item {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  href: string;
  pro?: boolean;
}

const ITEMS: Item[] = [
  { label: "Painel", icon: "grid", href: "/(private)/dashboard" },
  { label: "Registrar Jornada", icon: "play-circle", href: "/(private)/registrar-jornada" },
  { label: "Minhas Jornadas", icon: "calendar", href: "/(private)/minhas-jornadas" },
  { label: "Histórico GPS", icon: "navigate", href: "/(private)/historico-gps" },
  { label: "Ganhos por Plataforma", icon: "pie-chart", href: "/(private)/ganhos" },
  { label: "Meus Ganhos", icon: "cash", href: "/(private)/meus-ganhos" },
  { label: "Adicionar Despesa", icon: "remove-circle", href: "/(private)/despesas" },
  { label: "Minhas Despesas", icon: "receipt", href: "/(private)/minhas-despesas" },
  { label: "Abastecimentos", icon: "speedometer", href: "/(private)/abastecimentos" },
  { label: "Gastos de Combustível", icon: "flame", href: "/(private)/gastos-combustivel" },
  { label: "Veículo", icon: "car-sport", href: "/(private)/veiculos" },
  { label: "Plataformas", icon: "apps", href: "/(private)/plataformas" },
  { label: "Relatórios", icon: "bar-chart", href: "/(private)/relatorios", pro: true },
  { label: "Manutenções", icon: "construct", href: "/(private)/manutencoes", pro: true },
  { label: "Despesas Fixas", icon: "wallet", href: "/(private)/despesas-fixas", pro: true },
  { label: "Conferir Hodômetro", icon: "git-compare", href: "/(private)/conferir-hodometro", pro: true },
  { label: "Ranking SOMA", icon: "trophy", href: "/(private)/ranking", pro: true },
  { label: "Configurações", icon: "settings", href: "/(private)/configuracoes" },
  { label: "Perfil", icon: "person", href: "/(private)/perfil" },
  { label: "Planos detalhados", icon: "star", href: "/(private)/planos" },
  { label: "Dúvidas frequentes", icon: "help-circle", href: "/(private)/faq" },
  { label: "Termos de Uso", icon: "document-text", href: "/(public)/termos" },
  { label: "Sobre o SOMA", icon: "information-circle", href: "/(private)/sobre" },
  { label: "Contato e suporte", icon: "headset", href: "/(private)/contato" },
];

export function AppDrawer() {
  const { drawerOpen, closeDrawer } = useUI();
  const { signOut, perfil } = useAuth();
  const insets = useSafeAreaInsets();
  const assinante = perfil?.assinante === true;

  // ── Animação deslize da esquerda ──────────────────────────────
  const [modalVisible, setModalVisible] = useState(false);
  const slideAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (drawerOpen) {
      setModalVisible(true);
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 70,
          friction: 12,
        }),
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -DRAWER_WIDTH,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) setModalVisible(false);
      });
    }
  }, [drawerOpen]);

  const navegar = (it: Item) => {
    closeDrawer();
    if (it.pro && !assinante) {
      setTimeout(() => router.push("/(private)/planos"), 280);
      return;
    }
    setTimeout(() => router.push(it.href as any), 280);
  };

  const sair = async () => {
    closeDrawer();
    try {
      await signOut();
      setTimeout(() => router.replace("/(public)/login"), 280);
    } catch {
      /* ignore */
    }
  };

  return (
    <Modal visible={modalVisible} transparent animationType="none" onRequestClose={closeDrawer}>
      <View style={styles.overlay}>
        {/* Drawer deslizante */}
        <Animated.View
          style={[
            styles.drawer,
            { transform: [{ translateX: slideAnim }] },
          ]}
        >
          <LinearGradient
            colors={theme.gradients.header}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.header, { paddingTop: insets.top + 18 }]}
          >
            <Image source={require("../../assets/images/icon.png")} style={styles.logo} />
            <Text style={styles.brand}>{APP_NAME}</Text>
            <Text style={styles.user} numberOfLines={1}>
              {perfil?.nome || "Bem-vindo"}
            </Text>
            {(perfil?.email) ? (
              <Text style={styles.email} numberOfLines={1}>{perfil.email}</Text>
            ) : null}
            {assinante ? (
              <View style={styles.planoBadgePro}>
                <Ionicons name="star" size={11} color="#fff" />
                <Text style={styles.planoBadgeProTxt}>PRO</Text>
              </View>
            ) : (
              <View style={styles.planoBadgeFree}>
                <Text style={styles.planoBadgeFreeTxt}>Conta Gratuita</Text>
              </View>
            )}
          </LinearGradient>

          <ScrollView contentContainerStyle={{ paddingVertical: 8 }}>
            {ITEMS.map((it) => {
              const bloqueado = it.pro && !assinante;
              return (
                <Pressable
                  key={it.href}
                  style={({ pressed }) => [
                    styles.item,
                    pressed && styles.itemPressed,
                    bloqueado && styles.itemBloqueado,
                  ]}
                  onPress={() => navegar(it)}
                >
                  <Ionicons
                    name={it.icon}
                    size={20}
                    color={bloqueado ? theme.colors.textMuted : theme.colors.primary}
                    style={{ marginRight: 12 }}
                  />
                  <Text style={[styles.itemTxt, bloqueado && styles.itemTxtBloqueado]}>
                    {it.label}
                  </Text>
                  {bloqueado && (
                    <View style={styles.proBadge}>
                      <Ionicons name="lock-closed" size={9} color="#fff" />
                      <Text style={styles.proBadgeTxt}>PRO</Text>
                    </View>
                  )}
                  {it.pro && assinante && (
                    <View style={styles.proUnlocked}>
                      <Ionicons name="star" size={9} color="#D97706" />
                    </View>
                  )}
                </Pressable>
              );
            })}

            {!assinante && (
              <Pressable
                style={({ pressed }) => [styles.upgradeBtn, pressed && { opacity: 0.85 }]}
                onPress={() => {
                  closeDrawer();
                  setTimeout(() => router.push("/(private)/planos"), 280);
                }}
              >
                <LinearGradient
                  colors={["#D97706", "#F59E0B"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.upgradeBtnInner}
                >
                  <Ionicons name="star" size={15} color="#fff" />
                  <Text style={styles.upgradeBtnTxt}>Seja PRO — Desbloqueie tudo</Text>
                </LinearGradient>
              </Pressable>
            )}

            <Pressable style={({ pressed }) => [styles.item, pressed && styles.itemPressed]} onPress={sair}>
              <Ionicons name="log-out" size={20} color={theme.colors.danger} style={{ marginRight: 12 }} />
              <Text style={[styles.itemTxt, { color: theme.colors.danger }]}>Sair</Text>
            </Pressable>
          </ScrollView>

          <Text style={styles.footer}>{APP_FOOTER}</Text>
        </Animated.View>

        {/* Backdrop com fade */}
        <Animated.View style={[styles.backdropWrap, { opacity: backdropAnim }]}>
          <Pressable style={{ flex: 1 }} onPress={closeDrawer} />
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, flexDirection: "row" },
  drawer: {
    width: DRAWER_WIDTH,
    backgroundColor: "#fff",
    elevation: 12,
    shadowColor: "#000",
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
  },
  header: { padding: 18, alignItems: "center", borderBottomLeftRadius: 18, borderBottomRightRadius: 18 },
  logo: { width: 60, height: 60, borderRadius: 14, marginBottom: 8 },
  brand: { color: "#fff", ...theme.font.bold, fontSize: 22, letterSpacing: 1.5 },
  user: { color: theme.colors.accentBright, ...theme.font.medium, fontSize: 15, marginTop: 6 },
  email: { color: "rgba(255,255,255,0.65)", ...theme.font.regular, fontSize: 12, marginTop: 2 },

  planoBadgePro: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#D97706",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginTop: 8,
  },
  planoBadgeProTxt: { ...theme.font.bold, fontSize: 12, color: "#fff" },
  planoBadgeFree: {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginTop: 8,
  },
  planoBadgeFreeTxt: { ...theme.font.medium, fontSize: 12, color: "#fff" },

  item: { flexDirection: "row", alignItems: "center", paddingVertical: 12, paddingHorizontal: 18 },
  itemPressed: { backgroundColor: theme.colors.surfaceMuted },
  itemBloqueado: { opacity: 0.65 },
  itemTxt: { ...theme.font.medium, fontSize: 17, color: theme.colors.text, flex: 1 },
  itemTxtBloqueado: { color: theme.colors.textMuted },

  proBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#D97706",
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  proBadgeTxt: { ...theme.font.bold, fontSize: 11, color: "#fff" },

  proUnlocked: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#FEF3C7",
    alignItems: "center",
    justifyContent: "center",
  },

  upgradeBtn: { marginHorizontal: 16, marginTop: 6, marginBottom: 4, borderRadius: 12, overflow: "hidden" },
  upgradeBtnInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  upgradeBtnTxt: { ...theme.font.bold, fontSize: 15, color: "#fff" },

  footer: { textAlign: "center", padding: 14, fontSize: 13, color: theme.colors.textMuted, ...theme.font.regular },
  backdropWrap: { flex: 1, backgroundColor: "rgba(2,6,23,0.5)" },
});
