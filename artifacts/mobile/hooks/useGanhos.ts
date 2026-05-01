import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./AuthContext";
import { ganhosService } from "@/services/ganhos-service";
import type { Ganho } from "@/lib/types";

export function useGanhos(mes?: Date) {
  const { session } = useAuth();
  const userId = session?.user?.id;
  const queryClient = useQueryClient();
  const mesKey = mes ? `${mes.getFullYear()}-${mes.getMonth()}` : "todos";

  const list = useQuery({
    queryKey: ["ganhos", userId, mesKey],
    queryFn: async () => {
      if (!userId) return [];
      return ganhosService.listByProfile(userId, { mes });
    },
    enabled: !!userId,
  });

  const invalidar = () => {
    queryClient.invalidateQueries({ queryKey: ["ganhos"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  };

  const create = useMutation({
    mutationFn: async (input: Omit<Ganho, "id" | "created_at" | "updated_at" | "profile_id">) => {
      if (!userId) throw new Error("Sem sessão");
      return ganhosService.create({ ...input, profile_id: userId });
    },
    onSuccess: invalidar,
  });

  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Ganho> }) => ganhosService.update(id, patch),
    onSuccess: invalidar,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => ganhosService.remove(id),
    onSuccess: invalidar,
  });

  return { list, create, update, remove };
}
