import React, { useEffect, useState } from "react";
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { theme } from "@/lib/theme";
import { useAuth } from "@/hooks/AuthContext";
import { useUI } from "@/hooks/UIContext";
import { useOnboardPerfil } from "@/hooks/useOnboardPerfil";
import { UFS, PLANOS_PRO, CATEGORIAS_VEICULO } from "@/lib/constants";
import { profileService } from "@/services/profile-service";
import { AppHeader } from "@/components/ui/AppHeader";
import { AppCard } from "@/components/ui/AppCard";
import { AppKeyboardView } from "@/components/ui/AppKeyboardView";
import { AppInput } from "@/components/ui/AppInput";
import { MaskedInput } from "@/components/ui/MaskedInput";
import { AppDropdown } from "@/components/ui/AppDropdown";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { AppFooter } from "@/components/ui/AppFooter";
import { cpfEngine } from "@/engines/cpf-engine";

export default function PerfilScreen() {
  const insets = useSafeAreaInsets();
  const { signOut, session } = useAuth();
  const { openDrawer, showToast, showModal, hideModal } = useUI();
  const { perfil, salvar, cpfBloqueado } = useOnboardPerfil();

  const [nome, setNome] = useState("");
  const [nomePublico, setNomePublico] = useState("");
  const [categoria, setCategoria] = useState<string | null>(null);
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
  const [enviandoFoto, setEnviandoFoto] = useState(false);
  const [cpf, setCpf] = useState("");
  const [telefone, setTelefone] = useState("");
  const [cidade, setCidade] = useState("");
  const [uf, setUf] = useState<string | null>(null);

  useEffect(() => {
    if (!perfil) return;
    setNome(perfil.nome ?? "");
    setNomePublico(perfil.nome_publico ?? "");
    setCategoria(perfil.categoria ?? null);
    setFotoUrl(perfil.foto_url ?? null);
    setCpf(perfil.cpf ? cpfEngine.aplicarMascara(perfil.cpf) : "");
    setTelefone(perfil.telefone ?? "");
    setCidade(perfil.cidade ?? "");
    setUf(perfil.uf ?? null);
  }, [perfil?.id]);

  const escolherFoto = async () => {
    if (!session?.user?.id) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      showModal({ type: "error", title: "Permissão necessária", message: "Autorize o acesso às fotos para enviar seu avatar." });
      return;
    }
    const r = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (r.canceled || !r.assets?.[0]) return;
    const asset = r.assets[0];
    setEnviandoFoto(true);
    try {
      const url = await profileService.uploadAvatar(session.user.id, asset.uri, asset.mimeType ?? undefined);
      setFotoUrl(url);
      await salvar.mutateAsync({ foto_url: url });
      showToast({ type: "success", message: "Foto atualizada" });
    } catch (e: any) {
      showModal({ type: "error", title: "Falha no envio", message: e?.message ?? "Tente novamente." });
    } finally {
      setEnviandoFoto(false);
    }
  };

  const onSalvar = async () => {
    if (!nome || !cpf || !telefone || !cidade || !uf) {
      showModal({ type: "error", title: "Dados incompletos", message: "Preencha todos os campos do perfil." });
      return;
    }
    if (!cpfBloqueado) {
      const cpfNum = cpfEngine.somenteNumeros(cpf);
      if (!cpfEngine.validar(cpfNum)) {
        showModal({ type: "error", title: "CPF inválido", message: "Verifique o CPF informado." });
        return;
      }
    }
    try {
      await salvar.mutateAsync({
        nome,
        nome_publico: nomePublico || nome,
        categoria,
        cpf: cpfBloqueado ? undefined : cpf,
        telefone,
        cidade,
        uf,
      });
      showToast({ type: "success", message: "Perfil atualizado" });
    } catch (e: any) {
      showModal({ type: "error", title: "Não foi possível salvar", message: e?.message ?? "Tente novamente." });
    }
  };

  const sair = async () => {
    showModal({
      type: "confirm",
      title: "Sair do app?",
      message: "Você precisará entrar novamente.",
      confirmLabel: "Sair",
      cancelLabel: "Cancelar",
      onConfirm: async () => {
        hideModal();
        try {
          await signOut();
          router.replace("/(public)/login");
        } catch { /* ignore */ }
      },
      onCancel: hideModal,
    });
  };

  const planoAtual = perfil?.plano ?? "free";
  const meta = PLANOS_PRO.find((p) => p.id === planoAtual);

  return (
    <View style={{ flex: 1 }}>
      <AppHeader title="Meu Perfil" subtitle="Dados pessoais" onMenuPress={openDrawer} />
      <AppKeyboardView contentContainerStyle={{ padding: 14, paddingBottom: insets.bottom + 90 }}>
        <AppCard>
          <View style={styles.profHead}>
            <Pressable onPress={escolherFoto} style={styles.avatarWrap}>
              {fotoUrl ? (
                <Image source={{ uri: fotoUrl }} style={styles.avatarImg} />
              ) : (
                <View style={styles.avatar}>
                  <Ionicons name="person" size={26} color="#fff" />
                </View>
              )}
              <View style={styles.cameraBadge}>
                {enviandoFoto ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="camera" size={12} color="#fff" />
                )}
              </View>
            </Pressable>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.profNome}>{perfil?.nome ?? perfil?.email}</Text>
              <Text style={styles.profEmail}>{perfil?.email}</Text>
              <Text style={styles.fotoHint}>Toque na foto para trocar</Text>
            </View>
          </View>
          <View style={styles.planoBox}>
            <View style={{ flex: 1 }}>
              <Text style={styles.planoLab}>Plano atual</Text>
              <Text style={styles.planoVal}>{meta?.nome ?? "Free"}</Text>
            </View>
            <Pressable onPress={() => router.push("/(private)/planos")} style={styles.proBtn}>
              <Ionicons name="star" size={14} color="#fff" />
              <Text style={styles.proBtnTxt}>Ver Pro</Text>
            </Pressable>
          </View>
        </AppCard>

        <AppCard style={{ marginTop: 14 }}>
          <Text style={styles.section}>Dados pessoais</Text>
          <AppInput label="Nome completo" placeholder="Como aparece no documento" value={nome} onChangeText={setNome} />
          <MaskedInput
            label="CPF"
            mascara="cpf"
            value={cpf}
            onChangeText={setCpf}
            placeholder="000.000.000-00"
            disabled={cpfBloqueado}
            helper={cpfBloqueado ? "Após salvo, o CPF não pode ser alterado." : "Não pode ser alterado depois de salvo."}
          />
          <MaskedInput label="Telefone" mascara="telefone" value={telefone} onChangeText={setTelefone} placeholder="(11) 99999-9999" />
          <View style={styles.cidadeRow}>
            <View style={{ flex: 1, marginRight: 10 }}>
              <AppInput label="Cidade" placeholder="Sua cidade" value={cidade} onChangeText={setCidade} />
            </View>
            <View style={{ width: 110 }}>
              <AppDropdown label="UF" value={uf} onChange={setUf} options={UFS.map((u) => ({ label: u, value: u }))} placeholder="UF" />
            </View>
          </View>
          <PrimaryButton label="Salvar perfil" icon="checkmark" onPress={onSalvar} loading={salvar.isPending} fullWidth size="lg" />
        </AppCard>

        <AppCard style={{ marginTop: 14 }}>
          <Text style={styles.section}>Ranking SOMA</Text>
          <AppInput
            label="Nome para o ranking"
            placeholder="Ex.: João S."
            value={nomePublico}
            onChangeText={setNomePublico}
            helper="Como seu nome aparecerá publicamente no ranking."
          />
          <AppDropdown
            label="Categoria do veículo"
            value={categoria}
            onChange={setCategoria}
            options={CATEGORIAS_VEICULO.map((c) => ({ label: c.nome, value: c.id }))}
            placeholder="Selecione"
          />
          <Text style={styles.help}>
            Habilite a participação no ranking em Configurações → Visualização.
          </Text>
        </AppCard>

        <PrimaryButton
          label="Sair do app"
          variant="ghost"
          icon="log-out"
          onPress={sair}
          fullWidth
          style={{ marginTop: 16 }}
        />
        <AppFooter />
      </AppKeyboardView>
    </View>
  );
}

const styles = StyleSheet.create({
  profHead: { flexDirection: "row", alignItems: "center", marginBottom: 14 },
  avatarWrap: { position: "relative", width: 64, height: 64 },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: theme.colors.primary, justifyContent: "center", alignItems: "center" },
  avatarImg: { width: 64, height: 64, borderRadius: 32 },
  cameraBadge: {
    position: "absolute", bottom: 0, right: 0,
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: theme.colors.primaryDark,
    justifyContent: "center", alignItems: "center",
    borderWidth: 2, borderColor: "#fff",
  },
  fotoHint: { fontSize: 10, ...theme.font.regular, color: theme.colors.textMuted, marginTop: 4 },
  profNome: { ...theme.font.bold, fontSize: 16, color: theme.colors.text },
  profEmail: { ...theme.font.regular, fontSize: 12, color: theme.colors.textMuted, marginTop: 2 },
  planoBox: { flexDirection: "row", alignItems: "center", padding: 12, backgroundColor: theme.colors.surfaceMuted, borderRadius: theme.radius.md },
  planoLab: { fontSize: 11, color: theme.colors.textMuted, ...theme.font.medium },
  planoVal: { fontSize: 14, color: theme.colors.text, ...theme.font.bold, marginTop: 2 },
  proBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: theme.colors.warning, borderRadius: theme.radius.pill },
  proBtnTxt: { color: "#fff", ...theme.font.semibold, fontSize: 12 },
  section: { ...theme.font.semibold, fontSize: 14, color: theme.colors.text, marginBottom: 12 },
  help: { ...theme.font.regular, fontSize: 11, color: theme.colors.textMuted, marginTop: 4 },
  cidadeRow: { flexDirection: "row", alignItems: "flex-start" },
});
