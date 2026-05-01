import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./AuthContext";
import { veiculoService } from "@/services/veiculo-service";
import type { Veiculo } from "@/lib/types";

export function useVeiculo() {
  const { session, veiculo, refreshVeiculo } = useAuth();
  const userId = session?.user?.id;
  const queryClient = useQueryClient();

  const upsert = useMutation({
    mutationFn: async (patch: Partial<Veiculo>) => {
      if (!userId) throw new Error("Sem sessão");
      return veiculoService.upsert({ ...veiculo, ...patch, profile_id: userId });
    },
    onSuccess: async () => {
      await refreshVeiculo();
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  return { veiculo, upsert };
}
