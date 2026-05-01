import React from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { theme } from "@/lib/theme";
import { APP_NAME } from "@/lib/constants";

interface Props {
  title?: string;
  subtitle?: string;
  onMenuPress?: () => void;
  onBackPress?: () => void;
  rightContent?: React.ReactNode;
  showLogo?: boolean;
  showSaudacao?: boolean;
  saudacao?: string;
  nomeUsuario?: string;
}

export function AppHeader(props: Props) {
  const insets = useSafeAreaInsets();
  return (
    <LinearGradient
      colors={theme.gradients.header}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.container, { paddingTop: insets.top + 8 }]}
    >
      <View style={styles.row}>
        <View style={styles.left}>
          {props.onBackPress ? (
            <Pressable onPress={props.onBackPress} hitSlop={12} style={styles.iconBtn}>
              <Ionicons name="chevron-back" size={26} color={theme.colors.textOnDark} />
            </Pressable>
          ) : props.onMenuPress ? (
            <Pressable onPress={props.onMenuPress} hitSlop={12} style={styles.iconBtn}>
              <Ionicons name="menu" size={26} color={theme.colors.textOnDark} />
            </Pressable>
          ) : null}
        </View>

        <View style={styles.center}>
          {props.showLogo ? (
            <View style={styles.logoBlock}>
              <Image source={require("../../assets/images/icon.png")} style={styles.logo} />
              <Text style={styles.brand}>{APP_NAME}</Text>
            </View>
          ) : (
            <Text style={styles.title} numberOfLines={1}>
              {props.title}
            </Text>
          )}
          {props.subtitle ? <Text style={styles.subtitle}>{props.subtitle}</Text> : null}
        </View>

        <View style={styles.right}>{props.rightContent}</View>
      </View>

      {props.showSaudacao && props.nomeUsuario ? (
        <View style={styles.saudacao}>
          <Text style={styles.saudacaoText}>
            {props.saudacao}, <Text style={styles.saudacaoBold}>{props.nomeUsuario}</Text>
          </Text>
        </View>
      ) : null}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.lg,
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
  },
  row: { flexDirection: "row", alignItems: "center", minHeight: 44 },
  left: { width: 44, alignItems: "flex-start", justifyContent: "center" },
  center: { flex: 1, alignItems: "center" },
  right: { width: 44, alignItems: "flex-end", justifyContent: "center" },
  iconBtn: { padding: 6 },
  logoBlock: { flexDirection: "row", alignItems: "center", gap: 8 },
  logo: { width: 32, height: 32, borderRadius: 8 },
  brand: { ...theme.font.bold, color: theme.colors.textOnDark, fontSize: 22, letterSpacing: 1.2 },
  title: { ...theme.font.semibold, color: theme.colors.textOnDark, fontSize: 18 },
  subtitle: { color: theme.colors.textOnDarkMuted, ...theme.font.regular, fontSize: 15, marginTop: 2 },
  saudacao: { marginTop: theme.spacing.md },
  saudacaoText: { color: theme.colors.textOnDark, ...theme.font.regular, fontSize: 16 },
  saudacaoBold: { ...theme.font.semibold },
});
