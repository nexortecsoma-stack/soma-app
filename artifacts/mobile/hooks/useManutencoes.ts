import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./AuthContext";
import { manutencoesService } from "@/services/manutencoes-service";
import type { Manutencao } from "@/lib/types";

export function useManutencoes() {
  const { session, veiculo } = useAuth();
  const userId = session?.user?.id;
  const queryClient = useQueryClient();

  const list = useQuery({
    queryKey: ["manutencoes", userId],
    queryFn: async () => {
      if (!userId) return [];
      return manutencoesService.listByProfile(userId);
    },
    enabled: !!userId,
  });

  const invalidar = () => {
    queryClient.invalidateQueries({ queryKey: ["manutencoes"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  };

  const create = useMutation({
    mutationFn: async (input: Omit<Manutencao, "id" | "created_at" | "updated_at" | "profile_id" | "veiculo_id">) => {
      if (!userId) throw new Error("Sem sessão");
      return manutencoesService.create({ ...input, profile_id: userId, veiculo_id: veiculo?.id ?? null });
    },
    onSuccess: invalidar,
  });

  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Manutencao> }) =>
      manutencoesService.update(id, patch),
    onSuccess: invalidar,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => manutencoesService.remove(id),
    onSuccess: invalidar,
  });

  return { list, create, update, remove };
}
