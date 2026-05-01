import React from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { theme } from "@/lib/theme";
import { useUI } from "@/hooks/UIContext";
import { APP_FULL_NAME, APP_NAME } from "@/lib/constants";
import { AppHeader } from "@/components/ui/AppHeader";
import { AppCard } from "@/components/ui/AppCard";
import { AppKeyboardView } from "@/components/ui/AppKeyboardView";
import { AppFooter } from "@/components/ui/AppFooter";

export default function SobreScreen() {
  const insets = useSafeAreaInsets();
  const { openDrawer } = useUI();

  return (
    <View style={{ flex: 1 }}>
      <AppHeader title="Sobre o SOMA" subtitle="Conheça o app" onMenuPress={openDrawer} />
      <AppKeyboardView contentContainerStyle={{ padding: 14, paddingBottom: insets.bottom + 30 }}>
        <AppCard>
          <View style={styles.head}>
            <Image source={require("../../assets/images/icon.png")} style={styles.logo} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.brand}>{APP_NAME}</Text>
              <Text style={styles.full}>{APP_FULL_NAME}</Text>
            </View>
          </View>
          <Text style={styles.txt}>
            O SOMA é um sistema de gestão financeira pensado para motoristas de aplicativo no Brasil.
            Acompanhe ganhos, despesas, abastecimentos, manutenções e o ganho real por hora e por km.
            Tudo seu, organizado em um só lugar.
          </Text>
        </AppCard>

        <AppCard style={{ marginTop: 12 }}>
          <Text style={styles.section}>O que você consegue fazer</Text>
          <Bullet texto="Registrar jornadas no modo manual ou automático com GPS" />
          <Bullet texto="Lançar ganhos por plataforma (Uber, 99, InDrive, iFood, entrega, particular e suas extras)" />
          <Bullet texto="Controlar despesas variáveis e custos fixos do veículo" />
          <Bullet texto="Calcular o IPVA, depreciação, seguro e financiamento de forma automática" />
          <Bullet texto="Acompanhar o consumo médio e o preço do combustível ao longo do tempo" />
          <Bullet texto="Conferir o ranking SOMA com motoristas de todo o país" />
        </AppCard>

        <AppCard style={{ marginTop: 12 }}>
          <Text style={styles.section}>Quem desenvolve</Text>
          <Text style={styles.txt}>
            O SOMA é desenvolvido pela Nexor-Tec, focada em soluções para o trabalhador da economia digital.
            Nosso compromisso é entregar uma ferramenta justa, simples e que ajude você a ganhar mais.
          </Text>
          <Text style={[styles.txt, { marginTop: 8 }]}>
            Versão atual: 1.0.0
          </Text>
        </AppCard>
        <AppFooter />
      </AppKeyboardView>
    </View>
  );
}

function Bullet({ texto }: { texto: string }) {
  return (
    <View style={styles.bullet}>
      <View style={styles.dot} />
      <Text style={styles.bulletTxt}>{texto}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  logo: { width: 56, height: 56, borderRadius: 14 },
  brand: { ...theme.font.bold, fontSize: 22, color: theme.colors.text, letterSpacing: 1.5 },
  full: { ...theme.font.regular, fontSize: 11, color: theme.colors.textMuted, marginTop: 2 },
  section: { ...theme.font.semibold, fontSize: 14, color: theme.colors.text, marginBottom: 10 },
  txt: { ...theme.font.regular, fontSize: 13, color: theme.colors.textMuted, lineHeight: 19 },
  bullet: { flexDirection: "row", alignItems: "flex-start", marginBottom: 8 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: theme.colors.primary, marginTop: 7, marginRight: 10 },
  bulletTxt: { flex: 1, ...theme.font.regular, fontSize: 13, color: theme.colors.text, lineHeight: 19 },
});
