import type { Jornada, StatusJornada } from "@/lib/types";

export const jornadaEngine = {
  tempoTotalMinutos(horas: number, minutos: number): number {
    return Math.max(0, (horas || 0) * 60 + (minutos || 0));
  },

  formatarTempo(jornada: Pick<Jornada, "horas" | "minutos">): string {
    const h = String(jornada.horas || 0).padStart(2, "0");
    const m = String(jornada.minutos || 0).padStart(2, "0");
    return `${h}h ${m}min`;
  },

  formatarMinutos(min: number): string {
    const m = Math.max(0, Math.floor(min || 0));
    const h = Math.floor(m / 60);
    const r = m % 60;
    return `${String(h).padStart(2, "0")}h ${String(r).padStart(2, "0")}min`;
  },

  /** Formata segundos totais em hh:mm:ss */
  formatarSegundos(sec: number): string {
    const s = Math.max(0, Math.floor(sec || 0));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const ss = s % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
  },

  validar(input: { horas: number; minutos: number; km: number }): { ok: boolean; erro?: string } {
    if (input.horas < 0 || input.horas > 24) return { ok: false, erro: "Horas inválidas" };
    if (input.minutos < 0 || input.minutos >= 60) return { ok: false, erro: "Minutos inválidos" };
    if (input.horas === 0 && input.minutos === 0) return { ok: false, erro: "Informe o tempo trabalhado (horas e/ou minutos)" };
    if (input.km <= 0) return { ok: false, erro: "Informe os km percorridos" };
    return { ok: true };
  },

  podeIniciar(status: StatusJornada): boolean {
    return status === "rascunho" || status === "encerrada";
  },
  podePausar(status: StatusJornada): boolean {
    return status === "ativa";
  },
  podeContinuar(status: StatusJornada): boolean {
    return status === "pausada";
  },
  podeEncerrar(status: StatusJornada): boolean {
    return status === "ativa" || status === "pausada";
  },

  decompoeMinutos(min: number): { horas: number; minutos: number } {
    const m = Math.max(0, Math.floor(min || 0));
    return { horas: Math.floor(m / 60), minutos: m % 60 };
  },
};
