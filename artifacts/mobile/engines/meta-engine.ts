import { dateEngine } from "./date-engine";

export interface MetaCalculo {
  metaMensal: number;
  metaSemanal: number;
  metaDiaria: number;
  diasUteisMes: number;
  diasUteisRestantes: number;
  diferencaAcumulada: number;
  metaDiariaAjustada: number;
}

export interface MetaInput {
  metaMensal: number;
  diasFolgaSemana: number;
  hoje?: Date;
  acumuladoMes: number;
  acumuladoAteHoje: number;
  diasTrabalhadosMes?: number;
}

export const metaEngine = {
  calcular(input: MetaInput): MetaCalculo {
    const hoje = input.hoje ?? dateEngine.hoje();
    const diasMes = dateEngine.diasNoMes(hoje);
    // Número de semanas completas + parciais no mês (≈4.3)
    const semanasNoMes = diasMes / 7;
    const diasFolgaMes = Math.min(diasMes, Math.round((input.diasFolgaSemana || 0) * semanasNoMes));
    const diasUteisMes = Math.max(1, diasMes - diasFolgaMes);
    const metaDiariaBase = input.metaMensal / diasUteisMes;

    // Dias úteis já cumpridos: usa o real se passado, senão estima proporcionalmente
    const diasTrabalhadosMes = input.diasTrabalhadosMes ?? 0;
    const diasUteisRestantes = Math.max(1, diasUteisMes - diasTrabalhadosMes);

    const metaAcumuladaEsperada = metaDiariaBase * diasTrabalhadosMes;
    const diferencaAcumulada = metaAcumuladaEsperada - input.acumuladoAteHoje;

    const restanteParaMeta = Math.max(0, input.metaMensal - input.acumuladoAteHoje);
    const metaDiariaAjustada = restanteParaMeta / diasUteisRestantes;

    return {
      metaMensal: input.metaMensal,
      metaSemanal: input.metaMensal / 4,
      metaDiaria: metaDiariaBase,
      diasUteisMes,
      diasUteisRestantes,
      diferencaAcumulada,
      metaDiariaAjustada,
    };
  },

  percentual(realizado: number, meta: number): number {
    if (meta <= 0) return 0;
    return Math.min(100, Math.round((realizado / meta) * 100));
  },
};
