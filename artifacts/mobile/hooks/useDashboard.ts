import { useQuery } from "@tanstack/react-query";
import { useAuth } from "./AuthContext";
import { dashboardService } from "@/services/dashboard-service";
import { dashboardEngine } from "@/engines/dashboard-engine";

export function useDashboard(mesReferencia: Date, semanaOffset = 0) {
  const { session, perfil, veiculo } = useAuth();
  const userId = session?.user?.id;
  const mesKey = `${mesReferencia.getFullYear()}-${mesReferencia.getMonth()}`;
  // Inclui perfil e veiculo no key para forçar recalculo quando carregam
  const perfilKey = perfil?.id ?? "sem-perfil";
  const veiculoKey = veiculo?.id ?? "sem-veiculo";

  const query = useQuery({
    queryKey: ["dashboard", userId, mesKey, semanaOffset, perfilKey, veiculoKey],
    queryFn: async () => {
      if (!userId) return null;
      const raw = await dashboardService.fetchAll(userId, mesReferencia);
      return dashboardEngine.montar({
        perfil,
        veiculo,
        ...raw,
        mesReferencia,
        semanaOffset,
      });
    },
    enabled: !!userId && !!perfil,
    staleTime: 30000,
  });

  return {
    data: query.data,
    loading: query.isLoading,
    refetching: query.isFetching && !query.isLoading,
    refetch: query.refetch,
    error: query.error,
  };
}
