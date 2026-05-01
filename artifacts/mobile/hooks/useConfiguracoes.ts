import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./AuthContext";
import { profileService } from "@/services/profile-service";
import type { Perfil } from "@/lib/types";

export function useConfiguracoes() {
  const { session, perfil, refreshPerfil } = useAuth();
  const userId = session?.user?.id;
  const queryClient = useQueryClient();

  const salvar = useMutation({
    mutationFn: async (patch: Partial<Perfil>) => {
      if (!userId) throw new Error("Sem sessão");
      return profileService.update(userId, patch);
    },
    onSuccess: async () => {
      await refreshPerfil();
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["despesas-fixas"] });
    },
  });

  return { perfil, salvar };
}
