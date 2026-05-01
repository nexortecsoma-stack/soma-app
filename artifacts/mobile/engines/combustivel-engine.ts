import type { Abastecimento, Veiculo } from "@/lib/types";

export interface CustoCombustivelInput {
  km: number;
  veiculo: Veiculo | null;
  abastecimentos: Abastecimento[];
}

export const combustivelEngine = {
  mediaUltimos30(abastecimentos: Abastecimento[]): {
    consumoKmL: number;
    precoLitro: number;
    valida: boolean;
  } {
    const ultimos = abastecimentos
      .filter((a) => a.tipo_combustivel !== "energia")
      .slice(0, 30);
    if (ultimos.length === 0) return { consumoKmL: 0, precoLitro: 0, valida: false };

    let somaConsumo = 0;
    let somaPreco = 0;
    let countConsumo = 0;
    let countPreco = 0;

    for (const a of ultimos) {
      if (a.autonomia_km_litro && a.autonomia_km_litro > 0) {
        somaConsumo += Number(a.autonomia_km_litro);
        countConsumo++;
      }
      if (a.preco_por_litro && a.preco_por_litro > 0) {
        somaPreco += Number(a.preco_por_litro);
        countPreco++;
      }
    }

    return {
      consumoKmL: countConsumo ? somaConsumo / countConsumo : 0,
      precoLitro: countPreco ? somaPreco / countPreco : 0,
      valida: countConsumo > 0 && countPreco > 0,
    };
  },

  valoresVeiculo(veiculo: Veiculo | null): { consumoKmL: number; precoLitro: number } {
    if (!veiculo) return { consumoKmL: 0, precoLitro: 0 };
    const principal = veiculo.consumo_principal || "gasolina";
    if (principal === "etanol" && veiculo.etanol_consumo_km_l && veiculo.etanol_valor) {
      return { consumoKmL: Number(veiculo.etanol_consumo_km_l), precoLitro: Number(veiculo.etanol_valor) };
    }
    if (principal === "gnv" && veiculo.gnv_consumo_km_m3 && veiculo.gnv_valor) {
      return { consumoKmL: Number(veiculo.gnv_consumo_km_m3), precoLitro: Number(veiculo.gnv_valor) };
    }
    if (veiculo.gasolina_consumo_km_l && veiculo.gasolina_valor) {
      return { consumoKmL: Number(veiculo.gasolina_consumo_km_l), precoLitro: Number(veiculo.gasolina_valor) };
    }
    return { consumoKmL: 0, precoLitro: 0 };
  },

  custoEstimado(input: CustoCombustivelInput): number {
    const km = Number(input.km) || 0;
    if (km <= 0) return 0;

    if (input.veiculo?.tipo_tracao === "eletrico") {
      const consumoKwh = Number(input.veiculo.consumo_kwh) || 0;
      const valorKwh = Number(input.veiculo.valor_kwh) || 0;
      if (consumoKwh > 0 && valorKwh > 0) {
        return (km * consumoKwh) * valorKwh;
      }
      return 0;
    }

    const media = this.mediaUltimos30(input.abastecimentos);
    let consumoKmL: number;
    let precoLitro: number;

    if (media.valida) {
      consumoKmL = media.consumoKmL;
      precoLitro = media.precoLitro;
    } else {
      const v = this.valoresVeiculo(input.veiculo);
      consumoKmL = v.consumoKmL;
      precoLitro = v.precoLitro;
    }

    if (consumoKmL <= 0 || precoLitro <= 0) return 0;
    return (km / consumoKmL) * precoLitro;
  },

  custoTotalPeriodo(km: number, abastecimentos: Abastecimento[], veiculo: Veiculo | null): number {
    return this.custoEstimado({ km, abastecimentos, veiculo });
  },
};
