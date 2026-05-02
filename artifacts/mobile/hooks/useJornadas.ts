import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./AuthContext";
import { jornadaService } from "@/services/jornada-service";
import { ganhosService } from "@/services/ganhos-service";
import { abastecimentosService } from "@/services/abastecimentos-service";
import { pontosJornadaService } from "@/services/pontos-jornada-service";
import { jornadaEngine } from "@/engines/jornada-engine";
import { dateEngine } from "@/engines/date-engine";
import type { Jornada } from "@/lib/types";

export function useJornadas(mes?: Date) {
  const { session, veiculo } = useAuth();
  const userId = session?.user?.id;
  const queryClient = useQueryClient();
  const mesKey = mes ? `${mes.getFullYear()}-${mes.getMonth()}` : "todas";

  const list = useQuery({
    queryKey: ["jornadas", userId, mesKey],
    queryFn: async () => {
      if (!userId) return [];
      return jornadaService.listByProfile(userId, { mes, modo: "manual" });
    },
    enabled: !!userId,
  });

  const listAuto = useQuery({
    queryKey: ["jornadas", userId, "auto"],
    queryFn: async () => {
      if (!userId) return [];
      return jornadaService.listByProfile(userId, { modo: "automatica" });
    },
    enabled: !!userId,
  });

  const ativa = useQuery({
    queryKey: ["jornada-ativa", userId],
    queryFn: async () => {
      if (!userId) return null;
      return jornadaService.getAtiva(userId);
    },
    enabled: !!userId,
  });

  const invalidar = () => {
    queryClient.invalidateQueries({ queryKey: ["jornadas"] });
    queryClient.invalidateQueries({ queryKey: ["jornada-ativa"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  };

  const create = useMutation({
    mutationFn: async (input: { data_jornada: string; horas: number; minutos: number; km_percorrido: number }) => {
      if (!userId) throw new Error("Sem sessão");
      const total = jornadaEngine.tempoTotalMinutos(input.horas, input.minutos);
      return jornadaService.create({
        profile_id: userId,
        veiculo_id: veiculo?.id ?? null,
        data_jornada: input.data_jornada,
        horas: input.horas,
        minutos: input.minutos,
        km_percorrido: input.km_percorrido,
        tempo_total_minutos: total,
        tempo_efetivo_minutos: total,
        km_percorrido_real: 0,
        modo_jornada: "manual",
        status: "encerrada",
      });
    },
    onSuccess: invalidar,
  });

  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Jornada> }) => {
      const tempo = patch.horas != null || patch.minutos != null
        ? jornadaEngine.tempoTotalMinutos(patch.horas ?? 0, patch.minutos ?? 0)
        : undefined;
      const finalPatch = tempo != null ? { ...patch, tempo_total_minutos: tempo } : patch;
      return jornadaService.update(id, finalPatch);
    },
    onSuccess: invalidar,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => jornadaService.remove(id),
    onSuccess: invalidar,
  });

  /** Remove jornada, todos os ganhos e os abastecimentos do mesmo dia */
  const removeComGanhos = useMutation({
    mutationFn: async (jornada: Jornada) => {
      if (userId) {
        await ganhosService.removeByDate(userId, jornada.data_jornada);
        await abastecimentosService.removeByDate(userId, jornada.data_jornada);
      }
      await jornadaService.remove(jornada.id);
    },
    onSuccess: () => {
      invalidar();
      queryClient.invalidateQueries({ queryKey: ["ganhos"] });
      queryClient.invalidateQueries({ queryKey: ["abastecimentos"] });
    },
  });

  // Modo automático: ciclo de vida
  const iniciar = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error("Sem sessão");
      const agora = new Date();
      return jornadaService.create({
        profile_id: userId,
        veiculo_id: veiculo?.id ?? null,
        data_jornada: dateEngine.formatarISO(agora),
        horas: 0,
        minutos: 0,
        km_percorrido: 0,
        tempo_total_minutos: 0,
        tempo_efetivo_minutos: 0,
        km_percorrido_real: 0,
        modo_jornada: "automatica",
        status: "ativa",
        started_at: agora.toISOString(),
      });
    },
    onSuccess: invalidar,
  });

  const pausar = useMutation({
    mutationFn: async (jornada: Jornada) => {
      if (!jornadaEngine.podePausar(jornada.status)) throw new Error("Jornada não está ativa");
      const inicio = new Date(jornada.started_at ?? jornada.created_at ?? Date.now()).getTime();
      const ultimaPausa = new Date().getTime();
      const acumulado = (jornada.tempo_efetivo_minutos || 0) + Math.max(0, Math.floor((ultimaPausa - inicio) / 60000));
      return jornadaService.update(jornada.id, {
        status: "pausada",
        tempo_efetivo_minutos: acumulado,
        ultima_pausa_em: new Date(ultimaPausa).toISOString(),
      });
    },
    onSuccess: invalidar,
  });

  const continuar = useMutation({
    mutationFn: async (jornada: Jornada) => {
      if (!jornadaEngine.podeContinuar(jornada.status)) throw new Error("Jornada não está pausada");
      return jornadaService.update(jornada.id, {
        status: "ativa",
        started_at: new Date().toISOString(),
      });
    },
    onSuccess: invalidar,
  });

  const encerrar = useMutation({
    mutationFn: async ({ jornada, kmReal }: { jornada: Jornada; kmReal: number }) => {
      if (!jornadaEngine.podeEncerrar(jornada.status)) throw new Error("Jornada não está em andamento");
      const agora = new Date();
      let efetivo = jornada.tempo_efetivo_minutos || 0;
      if (jornada.status === "ativa" && jornada.started_at) {
        efetivo += Math.max(0, Math.floor((agora.getTime() - new Date(jornada.started_at).getTime()) / 60000));
      }
      const totalDesdeInicio = Math.max(
        efetivo,
        Math.floor((agora.getTime() - new Date(jornada.created_at ?? agora).getTime()) / 60000),
      );
      const decomp = jornadaEngine.decompoeMinutos(efetivo);
      return jornadaService.update(jornada.id, {
        status: "encerrada",
        ended_at: agora.toISOString(),
        tempo_efetivo_minutos: efetivo,
        tempo_total_minutos: totalDesdeInicio,
        horas: decomp.horas,
        minutos: decomp.minutos,
        km_percorrido_real: kmReal,
        km_percorrido: kmReal,
      });
    },
    onSuccess: invalidar,
  });

  const cancelar = useMutation({
    mutationFn: async (jornada: Jornada) => {
      await pontosJornadaService.removeByJornada(jornada.id);
      await jornadaService.remove(jornada.id);
    },
    onSuccess: invalidar,
  });

  return { list, listAuto, ativa, create, update, remove, removeComGanhos, iniciar, pausar, continuar, encerrar, cancelar };
}
