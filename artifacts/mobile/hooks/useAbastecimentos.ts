import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./AuthContext";
import { abastecimentosService } from "@/services/abastecimentos-service";
import { combustivelEngine } from "@/engines/combustivel-engine";
import type { Abastecimento } from "@/lib/types";

export function useAbastecimentos() {
  const { session, veiculo } = useAuth();
  const userId = session?.user?.id;
  const queryClient = useQueryClient();

  const list = useQuery({
    queryKey: ["abastecimentos", userId],
    queryFn: async () => {
      if (!userId) return [];
      return abastecimentosService.listByProfile(userId);
    },
    enabled: !!userId,
  });

  const ultimos30 = useQuery({
    queryKey: ["abastecimentos-30", userId],
    queryFn: async () => {
      if (!userId) return [];
      return abastecimentosService.ultimos30(userId);
    },
    enabled: !!userId,
  });

  const media = combustivelEngine.mediaUltimos30(ultimos30.data ?? []);
  const padraoVeic = combustivelEngine.valoresVeiculo(veiculo);

  const valoresPadrao = {
    preco_por_litro: media.valida ? media.precoLitro : padraoVeic.precoLitro,
    autonomia_km_litro: media.valida ? media.consumoKmL : padraoVeic.consumoKmL,
  };

  const invalidar = () => {
    queryClient.invalidateQueries({ queryKey: ["abastecimentos"] });
    queryClient.invalidateQueries({ queryKey: ["abastecimentos-30"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  };

  const create = useMutation({
    mutationFn: async (input: Omit<Abastecimento, "id" | "created_at" | "updated_at" | "profile_id">) => {
      if (!userId) throw new Error("Sem sessão");
      return abastecimentosService.create({ ...input, profile_id: userId });
    },
    onSuccess: invalidar,
  });

  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Abastecimento> }) =>
      abastecimentosService.update(id, patch),
    onSuccess: invalidar,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => abastecimentosService.remove(id),
    onSuccess: invalidar,
  });

  return { list, ultimos30, valoresPadrao, create, update, remove };
}
