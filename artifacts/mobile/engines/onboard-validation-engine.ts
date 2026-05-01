import type { Perfil, Veiculo } from "@/lib/types";

export interface OnboardStatus {
  perfilCompleto: boolean;
  veiculoCompleto: boolean;
  combustivelConfigurado: boolean;
  hodometroOk: boolean;
  completo: boolean;
  faltando: string[];
}

export const onboardValidationEngine = {
  perfilCompleto(perfil: Perfil | null): boolean {
    if (!perfil) return false;
    return Boolean(perfil.nome && perfil.cpf && perfil.cidade && perfil.uf && perfil.telefone);
  },

  veiculoCompleto(veiculo: Veiculo | null): boolean {
    if (!veiculo) return false;
    return Boolean(
      veiculo.placa &&
        veiculo.uf_placa &&
        veiculo.nome_veiculo &&
        veiculo.ano &&
        veiculo.km_atual != null &&
        veiculo.tipo_propriedade &&
        veiculo.tipo_tracao,
    );
  },

  combustivelConfigurado(veiculo: Veiculo | null): boolean {
    if (!veiculo) return false;
    if (veiculo.tipo_tracao === "eletrico") {
      return Boolean(veiculo.consumo_kwh && veiculo.valor_kwh);
    }
    const temGasolina = !!(veiculo.gasolina_valor && veiculo.gasolina_consumo_km_l);
    const temEtanol = !!(veiculo.etanol_valor && veiculo.etanol_consumo_km_l);
    const temGnv = !!(veiculo.gnv_valor && veiculo.gnv_consumo_km_m3);
    return temGasolina || temEtanol || temGnv;
  },

  hodometroOk(veiculo: Veiculo | null): boolean {
    if (!veiculo) return false;
    return veiculo.hodometro_inicial != null && veiculo.hodometro_inicial >= 0;
  },

  validar(perfil: Perfil | null, veiculo: Veiculo | null): OnboardStatus {
    const perfilCompleto = this.perfilCompleto(perfil);
    const veiculoCompleto = this.veiculoCompleto(veiculo);
    const combustivelConfigurado = this.combustivelConfigurado(veiculo);
    const hodometroOk = this.hodometroOk(veiculo);

    const faltando: string[] = [];
    if (!perfilCompleto) faltando.push("Complete seu perfil (nome, CPF, telefone, cidade e UF)");
    if (!veiculoCompleto) faltando.push("Complete os dados do veículo");
    if (!combustivelConfigurado) faltando.push("Configure o consumo de combustível");
    if (!hodometroOk) faltando.push("Informe o hodômetro inicial");

    return {
      perfilCompleto,
      veiculoCompleto,
      combustivelConfigurado,
      hodometroOk,
      completo: perfilCompleto && veiculoCompleto && combustivelConfigurado && hodometroOk,
      faltando,
    };
  },
};
