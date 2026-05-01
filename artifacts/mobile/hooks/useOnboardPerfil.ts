import { useMutation } from "@tanstack/react-query";
import { useAuth } from "./AuthContext";
import { profileService } from "@/services/profile-service";
import { cpfEngine } from "@/engines/cpf-engine";
import type { Perfil } from "@/lib/types";

export function useOnboardPerfil() {
  const { session, perfil, refreshPerfil } = useAuth();
  const userId = session?.user?.id;

  const salvar = useMutation({
    mutationFn: async (input: Partial<Perfil> & { cpf?: string | null }) => {
      if (!userId) throw new Error("Sem sessão");
      const patch: Partial<Perfil> = { ...input };

      if (input.cpf && !perfil?.cpf) {
        const cpfNum = cpfEngine.somenteNumeros(input.cpf);
        if (!cpfEngine.validar(cpfNum)) throw new Error("CPF inválido");
        const existe = await profileService.cpfJaExiste(cpfNum, userId);
        if (existe) throw new Error("CPF já cadastrado em outro usuário");
        patch.cpf = cpfNum;
      } else if (perfil?.cpf) {
        delete patch.cpf;
      }

      return profileService.update(userId, patch);
    },
    onSuccess: async () => {
      await refreshPerfil();
    },
  });

  return { perfil, salvar, cpfBloqueado: !!perfil?.cpf };
}
