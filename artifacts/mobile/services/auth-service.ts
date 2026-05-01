import { supabase } from "@/lib/supabase";

export const authService = {
  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  },

  async signUp(email: string, password: string, aceitouTermos: boolean) {
    if (!aceitouTermos) throw new Error("É necessário aceitar os termos");

    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;

    // Cria o perfil imediatamente se houver sessão ativa (confirmação de e-mail desligada).
    // Se a confirmação estiver ligada, o perfil será criado pelo profileService.ensureExists
    // assim que o usuário confirmar o e-mail e logar.
    if (data.user && data.session) {
      const { error: perfilError } = await supabase
        .from("perfil")
        .upsert(
          {
            id: data.user.id,
            email: data.user.email,
            termos_aceite_em: new Date().toISOString(),
          },
          { onConflict: "id" },
        );
      if (perfilError) {
        // Não bloqueia o fluxo — ensureExists no AuthContext tenta de novo
        console.warn("Perfil inicial não criado:", perfilError.message);
      }
    }

    return data;
  },

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  async resetPassword(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) throw error;
  },

  async getSession() {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    return data.session;
  },

  onAuthStateChange(callback: (session: Awaited<ReturnType<typeof supabase.auth.getSession>>["data"]["session"]) => void) {
    return supabase.auth.onAuthStateChange((_event, session) => callback(session));
  },
};
