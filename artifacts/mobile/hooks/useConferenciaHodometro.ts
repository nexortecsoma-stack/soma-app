import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./AuthContext";
import { conferenciaHodometroService } from "@/services/conferencia-hodometro-service";
import { hodometroEngine } from "@/engines/hodometro-engine";
import { jornadaService } from "@/services/jornada-service";
import { abastecimentosService } from "@/services/abastecimentos-service";
import { dateEngine } from "@/engines/date-engine";

export function useConferenciaHodometro() {
  const { session, veiculo } = useAuth();
  const userId = session?.user?.id;
  const queryClient = useQueryClient();

  // Conferências históricas
  const list = useQuery({
    queryKey: ["conferencias-hodometro", userId],
    queryFn: async () => {
      if (!userId) return [];
      return conferenciaHodometroService.listByProfile(userId);
    },
    enabled: !!userId,
  });

  const ultima = useQuery({
    queryKey: ["conferencia-hodometro-ultima", userId],
    queryFn: async () => {
      if (!userId) return null;
      return conferenciaHodometroService.ultima(userId);
    },
    enabled: !!userId,
  });

  // Todas as jornadas (sem filtro de mês) para cálculo de km_trabalho
  const jornadas = useQuery({
    queryKey: ["jornadas-all", userId],
    queryFn: async () => {
      if (!userId) return [];
      return jornadaService.listByProfile(userId); // sem filtro de mês → todas
    },
    enabled: !!userId,
  });

  // Abastecimentos para custo estimado de combustível
  const abastecimentos = useQuery({
    queryKey: ["abastecimentos-all", userId],
    queryFn: async () => {
      if (!userId) return [];
      return abastecimentosService.listByProfile(userId);
    },
    enabled: !!userId,
  });

  // km atual: usa último registro de conferência ou campo do veículo
  const kmAtual =
    ultima.data?.hodometro_atual ??
    Number(veiculo?.km_atual ?? veiculo?.hodometro_inicial ?? 0);

  const update = useMutation({
    mutationFn: async (input: {
      id: string;
      hodometroAtual: number;
      dataConferencia: string;
    }) => {
      return conferenciaHodometroService.update(input.id, {
        hodometro_atual: input.hodometroAtual,
        data_conferencia: input.dataConferencia,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conferencias-hodometro"] });
      queryClient.invalidateQueries({ queryKey: ["conferencia-hodometro-ultima"] });
      queryClient.invalidateQueries({ queryKey: ["jornadas-all"] });
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      return conferenciaHodometroService.remove(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conferencias-hodometro"] });
      queryClient.invalidateQueries({ queryKey: ["conferencia-hodometro-ultima"] });
    },
  });

  const create = useMutation({
    mutationFn: async (input: { hodometroAtual: number; dataAtual: string }) => {
      if (!userId) throw new Error("Sem sessão");
      const ultimaConf = await conferenciaHodometroService.ultima(userId);
      const hodometroAnterior = ultimaConf?.hodometro_atual ?? veiculo?.hodometro_inicial ?? 0;
      const dataAnterior = ultimaConf?.data_conferencia ?? dateEngine.formatarISO(dateEngine.hoje());
      const [jorns, abasts] = await Promise.all([
        jornadaService.listByProfile(userId),
        abastecimentosService.listByProfile(userId),
      ]);
      const calc = hodometroEngine.calcular({
        hodometroAtual: input.hodometroAtual,
        hodometroAnterior,
        dataAnterior,
        dataAtual: input.dataAtual,
        jornadas: jorns,
        abastecimentos: abasts,
        veiculo,
      });
      return conferenciaHodometroService.create({
        profile_id: userId,
        veiculo_id: veiculo?.id ?? null,
        data_conferencia: input.dataAtual,
        hodometro_anterior: calc.hodometroAnterior,
        hodometro_atual: calc.hodometroAtual,
        km_total_periodo: calc.kmTotalPeriodo,
        km_trabalho_periodo: calc.kmTrabalhoPeriodo,
        km_pessoal_periodo: calc.kmPessoalPeriodo,
        percentual_trabalho: calc.percentualTrabalho,
        percentual_pessoal: calc.percentualPessoal,
        custo_estimado_trabalho: calc.custoEstimadoTrabalho,
        custo_estimado_pessoal: calc.custoEstimadoPessoal,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conferencias-hodometro"] });
      queryClient.invalidateQueries({ queryKey: ["conferencia-hodometro-ultima"] });
      queryClient.invalidateQueries({ queryKey: ["jornadas-all"] });
    },
  });

  const isLoading = jornadas.isLoading || abastecimentos.isLoading || ultima.isLoading;

  return {
    list,
    ultima,
    jornadas: jornadas.data ?? [],
    abastecimentos: abastecimentos.data ?? [],
    kmAtual,
    isLoading,
    create,
    update,
    remove,
  };
}
