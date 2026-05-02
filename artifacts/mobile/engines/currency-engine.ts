/** Formata um número como moeda brasileira sem depender de Intl/toLocaleString
 *  (necessário pois o motor Hermes do React Native não suporta locale args). */
function formatBRL(valor: number): string {
  const neg = valor < 0;
  const abs = Math.abs(valor);
  const cents = Math.round(abs * 100);
  const reais = Math.floor(cents / 100);
  const centavos = cents % 100;
  // Separador de milhar com ponto
  const reaisStr = reais
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const result = `R$ ${reaisStr},${centavos.toString().padStart(2, "0")}`;
  return neg ? `-${result}` : result;
}

function formatNum(valor: number, casas: number): string {
  const neg = valor < 0;
  const abs = Math.abs(valor);
  const factor = Math.pow(10, casas);
  const rounded = Math.round(abs * factor);
  const intPart = Math.floor(rounded / factor);
  const decPart = rounded % factor;
  const intStr = intPart.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const decStr = decPart.toString().padStart(casas, "0");
  const result = casas > 0 ? `${intStr},${decStr}` : intStr;
  return neg ? `-${result}` : result;
}

export const currencyEngine = {
  formatar(valor: number | null | undefined): string {
    const n = typeof valor === "number" && Number.isFinite(valor) ? valor : 0;
    return formatBRL(n);
  },

  formatarNumero(valor: number | null | undefined, casas = 2): string {
    const n = typeof valor === "number" && Number.isFinite(valor) ? valor : 0;
    return formatNum(n, casas);
  },

  parseFromInput(input: string): number {
    const limpo = (input || "").replace(/\D/g, "");
    if (!limpo) return 0;
    return parseInt(limpo, 10) / 100;
  },

  formatarParaInput(valor: number | null | undefined): string {
    const n = typeof valor === "number" && Number.isFinite(valor) ? valor : 0;
    return formatNum(n, 2);
  },
};
