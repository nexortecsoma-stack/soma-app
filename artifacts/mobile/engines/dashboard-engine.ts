import type {
  Abastecimento,
  Despesa,
  Ganho,
  IpvaAliquota,
  Jornada,
  Manutencao,
  Perfil,
  Plataforma,
  Veiculo,
  DashboardData,
} from "@/lib/types";
import { combustivelEngine } from "./combustivel-engine";
import { dateEngine } from "./date-engine";
import { despesaFixaEngine } from "./despesa-fixa-engine";
import { financeiroEngine } from "./financeiro-engine";
import { metaEngine } from "./meta-engine";

const CORES_ROSCA = [
  "#0EA5E9", "#22D3EE", "#10B981", "#8B5CF6", "#F59E0B",
  "#EF4444", "#EC4899", "#FB923C", "#6366F1", "#64748B",
];

export interface DashboardInput {
  perfil: Perfil | null;
  veiculo: Veiculo | null;
  ganhos: Ganho[];
  despesas: Despesa[];
  jornadas: Jornada[];
  abastecimentos: Abastecimento[];
  plataformas: Plataforma[];
  manutencoes: Manutencao[];
  aliquotasIpva: IpvaAliquota[];
  mesReferencia: Date;
  semanaOffset?: number;
}

export const dashboardEngine = {
  montar(input: DashboardInput): DashboardData {
    const hoje = dateEngine.hoje();
    const ontem = dateEngine.somarDias(hoje, -1);
    const hojeISO = dateEngine.formatarISO(hoje);
    const ontemISO = dateEngine.formatarISO(ontem);

    const ganhosHoje = input.ganhos.filter((g) => g.data_ganho === hojeISO);
    const ganhosOntem = input.ganhos.filter((g) => g.data_ganho === ontemISO);

    const ganhoHoje = financeiroEngine.totalGanhos(ganhosHoje);
    const ganhoOntem = financeiroEngine.totalGanhos(ganhosOntem);
    const variacaoOntem = financeiroEngine.variacaoPercentual(ganhoHoje, ganhoOntem);
    const corridasHoje = financeiroEngine.totalCorridas(ganhosHoje);

    const offset = input.semanaOffset ?? 0;
    const inicioSemana = dateEngine.somarDias(dateEngine.inicioSemana(hoje), offset * 7);
    const fimSemana = dateEngine.somarDias(dateEngine.fimSemana(hoje), offset * 7);
    const inicioSemanaAnterior = dateEngine.somarDias(inicioSemana, -7);
    const fimSemanaAnterior = dateEngine.somarDias(fimSemana, -7);

    const ganhosSemana = input.ganhos.filter((g) => {
      const d = dateEngine.parseISO(g.data_ganho);
      return d >= inicioSemana && d <= fimSemana;
    });
    const ganhosSemanaAnterior = input.ganhos.filter((g) => {
      const d = dateEngine.parseISO(g.data_ganho);
      return d >= inicioSemanaAnterior && d <= fimSemanaAnterior;
    });

    const ganhoSemana = financeiroEngine.totalGanhos(ganhosSemana);
    const ganhoSemanaAnterior = financeiroEngine.totalGanhos(ganhosSemanaAnterior);
    const variacaoSemana = financeiroEngine.variacaoPercentual(ganhoSemana, ganhoSemanaAnterior);

    const despesasSemanaArr = input.despesas.filter((dsp) => {
      const d = dateEngine.parseISO(dsp.data_despesa);
      return d >= inicioSemana && d <= fimSemana;
    });
    const despesasSemana = financeiroEngine.totalDespesas(despesasSemanaArr);
    const lucroLiquidoSemana = ganhoSemana - despesasSemana;

    const inicioMes = dateEngine.primeiroDiaMes(input.mesReferencia);
    const fimMes = dateEngine.ultimoDiaMes(input.mesReferencia);
    const ganhosMes = input.ganhos.filter((g) => {
      const d = dateEngine.parseISO(g.data_ganho);
      return d >= inicioMes && d <= fimMes;
    });
    const despesasMesArr = input.despesas.filter((dsp) => {
      const d = dateEngine.parseISO(dsp.data_despesa);
      return d >= inicioMes && d <= fimMes;
    });
    const jornadasMes = input.jornadas.filter((j) => {
      const d = dateEngine.parseISO(j.data_jornada);
      return d >= inicioMes && d <= fimMes;
    });

    const ganhoMes = financeiroEngine.totalGanhos(ganhosMes);
    const despesasMes = financeiroEngine.totalDespesas(despesasMesArr);

    const kmMes = jornadasMes.reduce((s, j) => s + (Number(j.km_percorrido) || 0), 0);
    const custoCombustivelMes = combustivelEngine.custoEstimado({
      km: kmMes,
      veiculo: input.veiculo,
      abastecimentos: input.abastecimentos,
    });

    const diasTrabalhadosMes = new Set(jornadasMes.map((j) => j.data_jornada)).size;
    const custoFixo = despesaFixaEngine.calcular({
      perfil: input.perfil,
      veiculo: input.veiculo,
      manutencoes: input.manutencoes,
      aliquotasIpva: input.aliquotasIpva,
      diasTrabalhadosMes,
      totalJornadasMes: jornadasMes.length,
      kmMediaDiaria: diasTrabalhadosMes > 0 ? kmMes / diasTrabalhadosMes : 0,
      diasFolgaSemana: input.perfil?.dias_folga_semana ?? 2,
    });

    const ganhoMesLiquido = ganhoMes - despesasMes - custoCombustivelMes - custoFixo.custoMensal;

    const metaMensal = input.perfil?.meta_mensal ?? 10000;
    const metaCalc = metaEngine.calcular({
      metaMensal,
      diasFolgaSemana: input.perfil?.dias_folga_semana ?? 2,
      acumuladoMes: ganhoMes,
      acumuladoAteHoje: ganhoMes,
      diasTrabalhadosMes,
    });
    const metaDiaria = metaCalc.metaDiaria;
    const percentualMetaDiaria = metaEngine.percentual(ganhoHoje, metaDiaria);
    const percentualMes = metaEngine.percentual(ganhoMes, metaMensal);

    const semanal: { dia: string; diaNum: number; valor: number }[] = [];
    for (let i = 0; i < 7; i++) {
      const d = dateEngine.somarDias(inicioSemana, i);
      const iso = dateEngine.formatarISO(d);
      const valor = input.ganhos
        .filter((g) => g.data_ganho === iso)
        .reduce((s, g) => s + (Number(g.valor) || 0), 0);
      semanal.push({ dia: dateEngine.diaSemanaCurto(d), diaNum: d.getDate(), valor });
    }

    const cats = financeiroEngine.agruparPorCategoria(despesasMesArr);
    if (custoCombustivelMes > 0) cats["combustivel"] = custoCombustivelMes;
    if (custoFixo.custoMensal > 0) cats["custo_fixo"] = custoFixo.custoMensal;
    const rosca = Object.entries(cats)
      .map(([categoria, valor], idx) => ({
        categoria,
        valor,
        cor: CORES_ROSCA[idx % CORES_ROSCA.length] ?? "#0EA5E9",
      }))
      .sort((a, b) => b.valor - a.valor);

    // Última jornada: apenas do mês selecionado para não exibir dados de meses anteriores
    const ultimaJornadaRaw = [...jornadasMes].sort(
      (a, b) => (b.data_jornada > a.data_jornada ? 1 : -1),
    )[0];

    let ultimaJornada: DashboardData["ultimaJornada"] = null;
    if (ultimaJornadaRaw) {
      let ganhosUltima = input.ganhos.filter((g) => g.jornada_id === ultimaJornadaRaw.id);
      if (ganhosUltima.length === 0) {
        ganhosUltima = input.ganhos.filter((g) => g.data_ganho === ultimaJornadaRaw.data_jornada);
      }
      const valor = financeiroEngine.totalGanhos(ganhosUltima);
      const corridas = financeiroEngine.totalCorridas(ganhosUltima);
      const platId = ganhosUltima[0]?.plataforma_id;
      const platNome = input.plataformas.find((p) => p.id === platId)?.nome ?? "—";

      ultimaJornada = {
        data: dateEngine.formatarBR(ultimaJornadaRaw.data_jornada),
        diaSemana: dateEngine.diaSemana(ultimaJornadaRaw.data_jornada),
        plataforma: platNome,
        corridas,
        valor,
      };
    }

    const percentualSemana = metaEngine.percentual(ganhoSemana, metaMensal / 4);

    return {
      ganhoHoje,
      ganhoOntem,
      variacaoOntem,
      corridasHoje,
      metaDiaria,
      metaDiariaAjustada: metaCalc.metaDiariaAjustada,
      percentualMetaDiaria,
      ganhoSemana,
      lucroLiquidoSemana,
      ganhoSemanaAnterior,
      variacaoSemana,
      percentualSemana,
      ganhoMes,
      ganhoMesLiquido,
      despesasMes,
      custoFixoMes: custoFixo.custoMensal,
      metaMensal,
      percentualMes,
      semanal,
      rosca,
      ultimaJornada,
    };
  },
};
