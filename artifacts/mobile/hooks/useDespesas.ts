import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./AuthContext";
import { despesasService } from "@/services/despesas-service";
import type { Despesa } from "@/lib/types";

export function useDespesas(mes?: Date) {
  const { session } = useAuth();
  const userId = session?.user?.id;
  const queryClient = useQueryClient();
  const mesKey = mes ? `${mes.getFullYear()}-${mes.getMonth()}` : "todos";

  const list = useQuery({
    queryKey: ["despesas", userId, mesKey],
    queryFn: async () => {
      if (!userId) return [];
      return despesasService.listByProfile(userId, { mes });
    },
    enabled: !!userId,
  });

  const invalidar = () => {
    queryClient.invalidateQueries({ queryKey: ["despesas"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  };

  const create = useMutation({
    mutationFn: async (input: Omit<Despesa, "id" | "created_at" | "updated_at" | "profile_id">) => {
      if (!userId) throw new Error("Sem sessão");
      return despesasService.create({ ...input, profile_id: userId });
    },
    onSuccess: invalidar,
  });

  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Despesa> }) => despesasService.update(id, patch),
    onSuccess: invalidar,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => despesasService.remove(id),
    onSuccess: invalidar,
  });

  return { list, create, update, remove };
}
