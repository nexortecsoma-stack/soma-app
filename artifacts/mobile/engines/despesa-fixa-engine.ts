import type { IpvaAliquota, Manutencao, Perfil, Veiculo } from "@/lib/types";
import { dateEngine } from "./date-engine";
import { manutencaoEngine } from "./manutencao-engine";

export interface CustoDetalhamento {
  formula: string;
  /** Termo natural do contrato / referência (ex: 01/01 → 31/12 para IPVA) */
  termoInicial: string;
  termoFinal: string;
  valorAnual: number;
  diasUteisDesdeInicio: number;
  /** Período efetivo usado para o cálculo SOMA (interseção contrato × registros) */
  somaInicio?: string;
  somaFim?: string;
  diasUteisItemSoma?: number;
  observacao?: string;
}

export interface CustoFixoItem {
  tipo: string;
  descricao: string;
  valorMensal: number;
  valorDiario: number;
  custoSoma: number;
  ativo: boolean;
  detalhamento: CustoDetalhamento;
}

export interface CustoFixoTotal {
  itens: CustoFixoItem[];
  custoMensal: number;
  custoDiario: number;
  custoPorJornada: number;
  custoAcumuladoMes: number;
  custoRestanteMes: number;
  custoSomaTotal: number;
  diasConsiderados: number;
  diasTrabalhados: number;
  diasNaoTrabalhados: number;
  novoCustoDiarioRedistribuido: number;
  diasUteisMes: number;
  diasUteisRestantes: number;
  diasUteisDesdeInicio: number;
  dataInicioRegistros: string;
}

export interface CustoFixoInput {
  perfil: Perfil | null;
  veiculo: Veiculo | null;
  manutencoes: Manutencao[];
  aliquotasIpva: IpvaAliquota[];
  diaAtual?: number;
  diasMes?: number;
  diasTrabalhadosMes: number;
  totalJornadasMes: number;
  kmMediaDiaria?: number;
  kmMediaMensal?: number;
  dataJornadaMaisAntiga?: string | null;
  diasFolgaSemana?: number;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function fmtData(iso: string | null | undefined): string {
  if (!iso) return "—";
  try { return dateEngine.formatarBR(iso); } catch { return iso ?? "—"; }
}

function termoFinalAnoISO(): string {
  return `${new Date().getFullYear()}-12-31`;
}
function termoInicioAnoISO(): string {
  return `${new Date().getFullYear()}-01-01`;
}
function termoFinalAno(): string {
  return `31/12/${new Date().getFullYear()}`;
}
function termoInicioAno(): string {
  return `01/01/${new Date().getFullYear()}`;
}

function seguroTermoFinal(veiculo: Veiculo): string {
  if (veiculo.data_fim_seguro) return fmtData(veiculo.data_fim_seguro);
  if (veiculo.dia_vencimento_seguro) {
    const hoje = new Date();
    let ano = hoje.getFullYear();
    let mes = hoje.getMonth() + 1;
    if (hoje.getDate() > (veiculo.dia_vencimento_seguro ?? 0)) {
      mes += 1;
      if (mes > 12) { mes = 1; ano += 1; }
    }
    return `${String(veiculo.dia_vencimento_seguro).padStart(2, "0")}/${String(mes).padStart(2, "0")}/${ano}`;
  }
  return "aniversário do contrato";
}

function seguroTermoFinalISO(veiculo: Veiculo): string | null {
  if (veiculo.data_fim_seguro) return veiculo.data_fim_seguro;
  if (veiculo.dia_vencimento_seguro) {
    const hoje = new Date();
    let ano = hoje.getFullYear();
    let mes = hoje.getMonth() + 1;
    if (hoje.getDate() > (veiculo.dia_vencimento_seguro ?? 0)) {
      mes += 1;
      if (mes > 12) { mes = 1; ano += 1; }
    }
    return `${ano}-${String(mes).padStart(2, "0")}-${String(veiculo.dia_vencimento_seguro).padStart(2, "0")}`;
  }
  return null;
}

function calcularIPVA(veiculo: Veiculo, aliquotas: IpvaAliquota[]): { valorAnual: number; aliquota: number } {
  if (veiculo.isento_ipva || !veiculo.valor_fipe || !veiculo.uf_placa) return { valorAnual: 0, aliquota: 0 };
  const aliq = aliquotas.find(
    (a) =>
      a.uf === veiculo.uf_placa &&
      (a.tipo_tracao === (veiculo.tipo_tracao || "flex") || a.tipo_tracao === "flex"),
  );
  if (aliq?.tem_isencao) return { valorAnual: 0, aliquota: 0 };
  const pct = aliq ? Number(aliq.aliquota) : 0.04;
  return { valorAnual: Number(veiculo.valor_fipe) * pct, aliquota: pct };
}

function fmtMoeda(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const NOMES_MANUTENCAO: Record<string, string> = {
  suspensao: "Suspensão e amortecedores",
  pneus: "Jogo de pneus",
  bateria: "Bateria",
  oleo_filtros: "Troca de óleo e filtros",
  freios: "Freios e pastilhas",
  outros: "Manutenção diversa",
};

function nomeManutencao(tipo: string): string {
  return NOMES_MANUTENCAO[tipo] ?? tipo.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function fmtPct(v: number) {
  return (v * 100).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 2 }) + "%";
}

/** Dias corridos entre duas datas */
function diasCorridos(isoInicio: string, isoFim: string): number {
  try {
    const a = new Date(isoInicio + "T00:00:00");
    const b = new Date(isoFim + "T00:00:00");
    return Math.max(0, Math.round((b.getTime() - a.getTime()) / 86400000));
  } catch { return 0; }
}

/** Dias úteis entre duas datas ISO, usando proporção folga/semana */
function diasUteisEntre(isoInicio: string, isoFim: string, diasFolgaSemana: number): number {
  if (isoInicio > isoFim) return 0;
  const corridos = diasCorridos(isoInicio, isoFim);
  const fracaoUtil = Math.max(0, Math.min(1, (7 - diasFolgaSemana) / 7));
  return Math.max(0, Math.round(corridos * fracaoUtil));
}

/** Dias úteis no ano, baseado em dias de folga por semana */
function diasUteisNoAno(diasFolgaSemana: number): number {
  return Math.max(1, Math.round(365 * Math.max(0, (7 - diasFolgaSemana) / 7)));
}

/**
 * Calcula a interseção entre o período de registros SOMA (registroInicio→registroFim)
 * e o período do contrato/termo (contratoInicio→contratoFim).
 * Retorna o início efetivo, fim efetivo e dias úteis no intervalo resultante.
 * Se contratoInicio/Fim for null, usa o período de registros integralmente.
 */
function somaEfetiva(
  registroInicio: string,
  registroFim: string,
  contratoInicio: string | null,
  contratoFim: string | null,
  diasFolga: number,
): { inicio: string; fim: string; dias: number } {
  const efInicio = contratoInicio && contratoInicio > registroInicio ? contratoInicio : registroInicio;
  const efFim = contratoFim && contratoFim < registroFim ? contratoFim : registroFim;
  if (efInicio > efFim) return { inicio: efInicio, fim: efFim, dias: 0 };
  return { inicio: efInicio, fim: efFim, dias: diasUteisEntre(efInicio, efFim, diasFolga) };
}

// ─── Engine ─────────────────────────────────────────────────────────────────

export const despesaFixaEngine = {
  calcular(input: CustoFixoInput): CustoFixoTotal {
    const hoje = dateEngine.hoje();
    const hojeISO = dateEngine.formatarISO(hoje);
    const diasMes = input.diasMes ?? dateEngine.diasNoMes(hoje);
    const diaAtual = input.diaAtual ?? hoje.getDate();

    const diasFolga = input.diasFolgaSemana ?? (input.perfil?.dias_folga_semana ?? 2);
    const semanasNoMes = diasMes / 7;
    const diasFolgaMes = Math.min(diasMes, Math.round(diasFolga * semanasNoMes));
    const diasUteisMes = Math.max(1, diasMes - diasFolgaMes);
    const diasTrabalhadosMes = input.diasTrabalhadosMes;
    const diasUteisRestantes = Math.max(1, diasUteisMes - diasTrabalhadosMes);

    const diasUteisAno = diasUteisNoAno(diasFolga);

    // Período de registros SOMA: da jornada mais antiga até hoje
    const inicioISO = input.dataJornadaMaisAntiga ?? hojeISO;
    const termoInicialFmt = fmtData(inicioISO);
    const diasUteisDesdeInicio = diasUteisEntre(inicioISO, hojeISO, diasFolga);

    const itens: CustoFixoItem[] = [];

    if (input.veiculo) {
      const v = input.veiculo;
      const considerarIpva = input.perfil?.considerar_ipva_automatico ?? true;
      const considerarSeguro = input.perfil?.considerar_seguro_automatico ?? true;
      const considerarDepr = input.perfil?.considerar_depreciacao_automatico ?? true;
      const considerarInternet = input.perfil?.considerar_internet_automatico ?? false;
      const considerarManut = input.perfil?.considerar_manutencoes_basicas ?? false;
      const considerarSoma = input.perfil?.considerar_custo_soma_automatico ?? false;

      // ── IPVA ──────────────────────────────────────────────────────────────
      // Contrato: 01/01 → 31/12 do ano corrente
      // SOMA: interseção entre registros e o ano corrente
      if (considerarIpva) {
        const { valorAnual, aliquota } = calcularIPVA(v, input.aliquotasIpva);
        const valorDiario = valorAnual / diasUteisAno;
        const valorMensal = valorDiario * diasUteisMes;
        const soma = somaEfetiva(inicioISO, hojeISO, termoInicioAnoISO(), termoFinalAnoISO(), diasFolga);
        const custoSoma = valorDiario * soma.dias;
        itens.push({
          tipo: "ipva",
          descricao: "IPVA",
          valorMensal,
          valorDiario,
          custoSoma,
          ativo: !v.isento_ipva,
          detalhamento: {
            valorAnual,
            diasUteisDesdeInicio: soma.dias,
            termoInicial: termoInicioAno(),
            termoFinal: termoFinalAno(),
            somaInicio: fmtData(soma.inicio),
            somaFim: fmtData(soma.fim),
            diasUteisItemSoma: soma.dias,
            formula:
              `Valor FIPE ${fmtMoeda(Number(v.valor_fipe ?? 0))} × alíquota ${fmtPct(aliquota)} = ` +
              `${fmtMoeda(valorAnual)}/ano ÷ ${diasUteisAno} dias úteis/ano = ` +
              `${fmtMoeda(valorDiario)}/dia útil\n` +
              `SOMA: ${soma.dias} dias úteis (${fmtData(soma.inicio)} → ${fmtData(soma.fim)}) × ${fmtMoeda(valorDiario)} = ${fmtMoeda(custoSoma)}`,
            observacao: v.isento_ipva ? "Veículo isento de IPVA" : undefined,
          },
        });
      }

      // ── Seguro ────────────────────────────────────────────────────────────
      // Contrato: data_inicio_seguro → data_fim_seguro (ou vencimento)
      // SOMA: interseção entre registros e o contrato
      if (considerarSeguro && v.tem_seguro && v.valor_seguro) {
        const valorAnual = v.tipo_seguro === "anual" ? Number(v.valor_seguro) : Number(v.valor_seguro) * 12;
        const valorDiario = valorAnual / diasUteisAno;
        const valorMensal = valorDiario * diasUteisMes;
        const contratoInicioISO = v.data_inicio_seguro ?? null;
        const contratoFimISO = seguroTermoFinalISO(v);
        const soma = somaEfetiva(inicioISO, hojeISO, contratoInicioISO, contratoFimISO, diasFolga);
        const custoSoma = valorDiario * soma.dias;
        itens.push({
          tipo: "seguro",
          descricao: "Seguro",
          valorMensal,
          valorDiario,
          custoSoma,
          ativo: true,
          detalhamento: {
            valorAnual,
            diasUteisDesdeInicio: soma.dias,
            termoInicial: contratoInicioISO ? fmtData(contratoInicioISO) : termoInicialFmt,
            termoFinal: seguroTermoFinal(v),
            somaInicio: fmtData(soma.inicio),
            somaFim: fmtData(soma.fim),
            diasUteisItemSoma: soma.dias,
            formula:
              v.tipo_seguro === "anual"
                ? `Prêmio anual ${fmtMoeda(Number(v.valor_seguro))} ÷ ${diasUteisAno} dias úteis/ano = ${fmtMoeda(valorDiario)}/dia útil × ${diasUteisMes} dias/mês = ${fmtMoeda(valorMensal)}/mês\nSOMA: ${soma.dias} dias úteis × ${fmtMoeda(valorDiario)} = ${fmtMoeda(custoSoma)}`
                : `Parcela mensal ${fmtMoeda(Number(v.valor_seguro))} × 12 = ${fmtMoeda(valorAnual)}/ano ÷ ${diasUteisAno} dias úteis = ${fmtMoeda(valorDiario)}/dia\nSOMA: ${soma.dias} dias úteis × ${fmtMoeda(valorDiario)} = ${fmtMoeda(custoSoma)}`,
          },
        });
      }

      // ── Aluguel ───────────────────────────────────────────────────────────
      // Sem datas de início/fim específicas → SOMA = período completo de registros
      if (v.tipo_propriedade === "alugado" && v.valor_aluguel) {
        const valorBase = Number(v.valor_aluguel);
        const valorMensalRef = v.tipo_aluguel === "semanal" ? valorBase * 4 : v.tipo_aluguel === "quinzenal" ? valorBase * 2 : valorBase;
        const valorAnual = valorMensalRef * 12;
        const valorDiario = valorAnual / diasUteisAno;
        const valorMensal = valorDiario * diasUteisMes;
        const custoSoma = valorDiario * diasUteisDesdeInicio;
        itens.push({
          tipo: "aluguel",
          descricao: "Aluguel do veículo",
          valorMensal,
          valorDiario,
          custoSoma,
          ativo: true,
          detalhamento: {
            valorAnual,
            diasUteisDesdeInicio,
            termoInicial: termoInicialFmt,
            termoFinal: "Contrato vigente",
            somaInicio: termoInicialFmt,
            somaFim: fmtData(hojeISO),
            diasUteisItemSoma: diasUteisDesdeInicio,
            formula:
              v.tipo_aluguel === "semanal"
                ? `${fmtMoeda(valorBase)}/sem × 4 = ${fmtMoeda(valorMensalRef)}/mês × 12 ÷ ${diasUteisAno} dias úteis = ${fmtMoeda(valorDiario)}/dia`
                : v.tipo_aluguel === "quinzenal"
                ? `${fmtMoeda(valorBase)}/quinzena × 2 = ${fmtMoeda(valorMensalRef)}/mês × 12 ÷ ${diasUteisAno} dias úteis = ${fmtMoeda(valorDiario)}/dia`
                : `${fmtMoeda(valorMensalRef)}/mês × 12 ÷ ${diasUteisAno} dias úteis = ${fmtMoeda(valorDiario)}/dia`,
          },
        });
      }

      // ── Financiamento ─────────────────────────────────────────────────────
      if (v.tipo_propriedade === "financiado" && v.valor_parcela) {
        const valorMensalRef = Number(v.valor_parcela);
        const valorAnual = valorMensalRef * 12;
        const valorDiario = valorAnual / diasUteisAno;
        const valorMensal = valorDiario * diasUteisMes;
        const custoSoma = valorDiario * diasUteisDesdeInicio;
        itens.push({
          tipo: "financiamento",
          descricao: "Financiamento",
          valorMensal,
          valorDiario,
          custoSoma,
          ativo: true,
          detalhamento: {
            valorAnual,
            diasUteisDesdeInicio,
            termoInicial: termoInicialFmt,
            termoFinal: "Término do contrato",
            somaInicio: termoInicialFmt,
            somaFim: fmtData(hojeISO),
            diasUteisItemSoma: diasUteisDesdeInicio,
            formula: `Parcela ${fmtMoeda(valorMensalRef)}/mês × 12 ÷ ${diasUteisAno} dias úteis/ano = ${fmtMoeda(valorDiario)}/dia útil`,
          },
        });
      }

      // ── Depreciação ───────────────────────────────────────────────────────
      // Contrato: 01/01 → 31/12 do ano corrente (anual, como o IPVA)
      if (considerarDepr && v.valor_fipe) {
        const pct = v.depreciacao_percentual ? Number(v.depreciacao_percentual) / 100 : 0.10;
        const valorAnual = Number(v.valor_fipe) * pct;
        const valorDiario = valorAnual / diasUteisAno;
        const valorMensal = valorDiario * diasUteisMes;
        const soma = somaEfetiva(inicioISO, hojeISO, termoInicioAnoISO(), termoFinalAnoISO(), diasFolga);
        const custoSoma = valorDiario * soma.dias;
        itens.push({
          tipo: "depreciacao",
          descricao: "Depreciação",
          valorMensal,
          valorDiario,
          custoSoma,
          ativo: true,
          detalhamento: {
            valorAnual,
            diasUteisDesdeInicio: soma.dias,
            termoInicial: termoInicioAno(),
            termoFinal: termoFinalAno(),
            somaInicio: fmtData(soma.inicio),
            somaFim: fmtData(soma.fim),
            diasUteisItemSoma: soma.dias,
            formula:
              `Valor FIPE ${fmtMoeda(Number(v.valor_fipe))} × ${fmtPct(pct)}/ano = ${fmtMoeda(valorAnual)} ÷ ${diasUteisAno} dias úteis = ` +
              `${fmtMoeda(valorDiario)}/dia útil × ${diasUteisMes} dias/mês = ${fmtMoeda(valorMensal)}/mês\n` +
              `SOMA: ${soma.dias} dias úteis (${fmtData(soma.inicio)} → ${fmtData(soma.fim)}) × ${fmtMoeda(valorDiario)} = ${fmtMoeda(custoSoma)}`,
          },
        });
      }

      // ── Internet ──────────────────────────────────────────────────────────
      if (considerarInternet) {
        const mensalInternet = Number(input.perfil?.valor_internet_mensal ?? 80);
        const valorAnual = mensalInternet * 12;
        const valorDiario = valorAnual / diasUteisAno;
        const valorMensal = valorDiario * diasUteisMes;
        const custoSoma = valorDiario * diasUteisDesdeInicio;
        itens.push({
          tipo: "internet",
          descricao: "Internet (plano de dados)",
          valorMensal,
          valorDiario,
          custoSoma,
          ativo: true,
          detalhamento: {
            valorAnual,
            diasUteisDesdeInicio,
            termoInicial: termoInicialFmt,
            termoFinal: "Plano vigente",
            somaInicio: termoInicialFmt,
            somaFim: fmtData(hojeISO),
            diasUteisItemSoma: diasUteisDesdeInicio,
            formula: `${fmtMoeda(mensalInternet)}/mês × 12 ÷ ${diasUteisAno} dias úteis/ano = ${fmtMoeda(valorDiario)}/dia`,
          },
        });
      }

      // ── Manutenções (item por item) ────────────────────────────────────────
      // SOMA: interseção entre registros e a vida útil de cada peça
      if (considerarManut && input.manutencoes.length > 0) {
        const kmMediaMensal = input.kmMediaMensal ?? ((input.kmMediaDiaria ?? 0) * 30);
        const kmAtual = Number(input.veiculo?.km_atual ?? 0);
        const ativas = manutencaoEngine.agrupar(input.manutencoes).filter((m) => m.ativo);
        for (const m of ativas) {
          const valor = Number(m.valor) || 0;
          if (valor <= 0) continue;
          const status = manutencaoEngine.status(m, kmAtual, kmMediaMensal);
          if (status.rateioMensal <= 0) continue;
          const valorMensal = status.rateioMensal;
          const valorDiario = valorMensal / diasUteisMes;
          // SOMA: de max(inicioRegistros, data_manutencao) até min(hoje, termoFinalEfetivo)
          const soma = somaEfetiva(
            inicioISO, hojeISO,
            m.data_manutencao,
            status.termoFinalEfetivoISO,
            diasFolga,
          );
          const custoSoma = valorDiario * soma.dias;
          const termoInicial = `${fmtData(m.data_manutencao)}${m.km_troca != null ? ` · ${Number(m.km_troca).toLocaleString("pt-BR")} km` : ""}`;
          const termoFinal = status.termoFinalEfetivoFmt ?? "Baseado em histórico";
          const vidaUtil = status.vidaUtilMeses != null ? status.vidaUtilMeses.toFixed(1) : "?";
          const fonteLabel = status.termoEfetivoFonte === "km" ? " (km)" : status.termoEfetivoFonte === "tempo" ? " (tempo)" : "";
          const formula =
            `${fmtMoeda(valor)} ÷ ${vidaUtil} meses de vida útil${fonteLabel}` +
            ` = ${fmtMoeda(status.rateioMensal)}/mês · ${fmtMoeda(status.rateioDiario)}/dia\n` +
            `SOMA: ${soma.dias} dias úteis (${fmtData(soma.inicio)} → ${fmtData(soma.fim)}) × ${fmtMoeda(valorDiario)} = ${fmtMoeda(custoSoma)}`;
          const obs: string[] = [];
          if (status.dataPrevistaKmFmt) obs.push(`Prazo por km: ${status.dataPrevistaKmFmt}`);
          if (status.termoFinalFmt) obs.push(`Prazo por tempo: ${status.termoFinalFmt}`);
          if (status.kmFim) obs.push(`Km de substituição: ${Number(status.kmFim).toLocaleString("pt-BR")} km`);
          itens.push({
            tipo: "manutencao",
            descricao: nomeManutencao(m.tipo_manutencao),
            valorMensal,
            valorDiario,
            custoSoma,
            ativo: true,
            detalhamento: {
              valorAnual: valorMensal * 12,
              diasUteisDesdeInicio: soma.dias,
              termoInicial,
              termoFinal,
              somaInicio: fmtData(soma.inicio),
              somaFim: fmtData(soma.fim),
              diasUteisItemSoma: soma.dias,
              formula,
              observacao: obs.length > 0 ? obs.join("\n") : undefined,
            },
          });
        }
      }

      // ── Assinatura SOMA ───────────────────────────────────────────────────
      if (considerarSoma && input.perfil?.assinante) {
        const planoMap: Record<string, number> = {
          mensal: (29.0 * 12) / diasUteisAno,
          semestral: (99.9 * 2) / diasUteisAno,
          anual: 129.0 / diasUteisAno,
        };
        const valorDiario = planoMap[input.perfil.plano] ?? 0;
        const valorMensal = valorDiario * diasUteisMes;
        const custoSoma = valorDiario * diasUteisDesdeInicio;
        itens.push({
          tipo: "custo_soma",
          descricao: "Assinatura SOMA",
          valorMensal,
          valorDiario,
          custoSoma,
          ativo: true,
          detalhamento: {
            valorAnual: valorDiario * diasUteisAno,
            diasUteisDesdeInicio,
            termoInicial: termoInicialFmt,
            termoFinal: "Vigência do plano",
            somaInicio: termoInicialFmt,
            somaFim: fmtData(hojeISO),
            diasUteisItemSoma: diasUteisDesdeInicio,
            formula: `Plano ${input.perfil.plano} ÷ ${diasUteisAno} dias úteis/ano = ${fmtMoeda(valorDiario)}/dia útil`,
          },
        });
      }
    }

    // ── Totais ───────────────────────────────────────────────────────────────
    const custoMensal = itens.reduce((s, i) => (i.ativo ? s + i.valorMensal : s), 0);
    const custoDiario = diasUteisMes > 0 ? custoMensal / diasUteisMes : 0;
    const custoPorJornada = input.totalJornadasMes > 0 ? custoMensal / input.totalJornadasMes : custoDiario;
    const custoSomaTotal = itens.reduce((s, i) => (i.ativo ? s + i.custoSoma : s), 0);

    const diasConsiderados = diaAtual;
    const diasNaoTrabalhados = Math.max(0, diasConsiderados - diasTrabalhadosMes);
    const custoAcumuladoMes = custoDiario * diasTrabalhadosMes;
    const custoRestanteMes = Math.max(0, custoMensal - custoAcumuladoMes);
    const novoCustoDiarioRedistribuido = diasUteisRestantes > 0 ? custoRestanteMes / diasUteisRestantes : 0;

    return {
      itens,
      custoMensal,
      custoDiario,
      custoPorJornada,
      custoAcumuladoMes,
      custoRestanteMes,
      custoSomaTotal,
      diasConsiderados,
      diasTrabalhados: diasTrabalhadosMes,
      diasNaoTrabalhados,
      novoCustoDiarioRedistribuido,
      diasUteisMes,
      diasUteisRestantes,
      diasUteisDesdeInicio,
      dataInicioRegistros: fmtData(inicioISO),
    };
  },
};
