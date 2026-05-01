export type Plano = "free" | "mensal" | "semestral" | "anual";

export interface Perfil {
  id: string;
  email: string | null;
  nome: string | null;
  nome_publico: string | null;
  categoria: string | null;
  foto_url: string | null;
  tipo_propriedade: string | null;
  tipo_tracao: string | null;
  telefone: string | null;
  cpf: string | null;
  cidade: string | null;
  uf: string | null;
  termos_aceite_em: string | null;
  assinante: boolean;
  plano: Plano;
  meta_mensal: number;
  dias_folga_semana: number;
  considerar_ipva_automatico: boolean;
  considerar_seguro_automatico: boolean;
  considerar_depreciacao_automatico: boolean;
  considerar_internet_automatico: boolean;
  valor_internet_mensal: number;
  considerar_manutencoes_basicas: boolean;
  considerar_custo_soma_automatico: boolean;
  participar_ranking_soma: boolean;
  mostrar_ganhos_liquidos_brutos: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Veiculo {
  id: string;
  profile_id: string;
  placa: string | null;
  uf_placa: string | null;
  nome_veiculo: string | null;
  ano: number | null;
  km_atual: number | null;
  hodometro_inicial: number | null;
  valor_fipe: number | null;
  tipo_propriedade: "proprio" | "financiado" | "alugado" | null;
  valor_parcela: number | null;
  data_vencimento: string | null;
  data_fim_contrato: string | null;
  financiamento_lancar_automaticamente: boolean | null;
  tipo_aluguel: "semanal" | "quinzenal" | "mensal" | null;
  valor_aluguel: number | null;
  vencimento: string | null;
  dia_semana_vencimento: number | null;
  aluguel_lancar_automaticamente: boolean | null;
  tem_seguro: boolean | null;
  tipo_seguro: "mensal" | "anual" | null;
  valor_seguro: number | null;
  data_inicio_seguro: string | null;
  data_fim_seguro: string | null;
  seguro_lancar_automaticamente: boolean | null;
  isento_ipva: boolean | null;
  considerar_ipva_automatico: boolean | null;
  tipo_tracao: "flex" | "eletrico" | "hibrido" | "gnv" | null;
  gasolina_valor: number | null;
  gasolina_consumo_km_l: number | null;
  etanol_valor: number | null;
  etanol_consumo_km_l: number | null;
  gnv_valor: number | null;
  gnv_consumo_km_m3: number | null;
  consumo_principal: string | null;
  bateria: number | null;
  consumo_kwh: number | null;
  valor_kwh: number | null;
  depreciacao_percentual: number | null;
  dia_vencimento_seguro: number | null;
  created_at?: string;
  updated_at?: string;
}

export type ModoJornada = "manual" | "automatica";
export type StatusJornada = "rascunho" | "ativa" | "pausada" | "encerrada";

export interface Jornada {
  id: string;
  profile_id: string;
  veiculo_id: string | null;
  data_jornada: string;
  horas: number;
  minutos: number;
  km_percorrido: number;
  tempo_total_minutos?: number | null;
  modo_jornada: ModoJornada;
  status: StatusJornada;
  started_at: string | null;
  ended_at: string | null;
  tempo_efetivo_minutos: number;
  km_percorrido_real: number;
  ultima_pausa_em: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface PontoJornada {
  id: string;
  profile_id: string;
  jornada_id: string;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  speed: number | null;
  recorded_at: string;
  created_at?: string;
}

export interface RankingSoma {
  profile_id: string;
  nome_publico: string | null;
  categoria: string | null;
  cidade: string | null;
  uf: string | null;
  ganho_bruto: number;
  ganho_liquido: number;
  ganho_por_hora: number;
  ganho_por_km: number;
  horas_trabalhadas: number;
  km_percorrido: number;
  tipo_carro: string | null;
  tipo_tracao: string | null;
  tipo_propriedade: string | null;
  foto_url: string | null;
  periodo_inicio: string | null;
  periodo_fim: string | null;
  atualizado_em?: string;
}

export interface Ganho {
  id: string;
  profile_id: string;
  jornada_id: string | null;
  plataforma_id?: string | null;
  data_ganho: string;
  valor: number;
  corridas: number;
  observacao?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Despesa {
  id: string;
  profile_id: string;
  jornada_id?: string | null;
  categoria: string;
  categoria_personalizada: string | null;
  data_despesa: string;
  valor: number;
  observacao: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Abastecimento {
  id: string;
  profile_id: string;
  veiculo_id?: string | null;
  data_abastecimento: string;
  valor_total: number;
  litros: number | null;
  preco_por_litro: number | null;
  tipo_combustivel?: "gasolina" | "etanol" | "gnv" | "energia" | null;
  autonomia_km_litro?: number | null;
  consumo_kwh?: number | null;
  valor_kwh?: number | null;
  uso?: "trabalho" | "pessoal" | "misto" | null;
  observacao?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Plataforma {
  id: string;
  profile_id: string;
  nome: string;
  tipo?: string | null;
  ativa: boolean;
  fixa?: boolean | null;
  created_at?: string;
  updated_at?: string;
}

export interface Manutencao {
  id: string;
  profile_id: string;
  veiculo_id: string | null;
  tipo_manutencao: string;
  data_manutencao: string;
  valor: number;
  km_troca: number | null;
  duracao_km: number | null;
  duracao_meses: number | null;
  observacao: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ConferenciaHodometro {
  id: string;
  profile_id: string;
  veiculo_id: string | null;
  data_conferencia: string;
  hodometro_anterior: number;
  hodometro_atual: number;
  km_total_periodo: number;
  km_trabalho_periodo: number;
  km_pessoal_periodo: number;
  percentual_trabalho: number;
  percentual_pessoal: number;
  custo_estimado_trabalho: number;
  custo_estimado_pessoal: number;
  created_at?: string;
  updated_at?: string;
}

export interface Assinatura {
  id: string;
  profile_id: string;
  plano: Plano;
  assinante: boolean;
  data_inicio: string | null;
  data_fim: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface DespesaFixa {
  id: string;
  profile_id: string;
  veiculo_id: string | null;
  tipo: string;
  descricao: string | null;
  valor_mensal: number;
  ativo: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ConfiguracaoUsuario {
  id: string;
  profile_id: string;
  chave: string;
  valor: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface IpvaAliquota {
  id: string;
  uf: string;
  tipo_veiculo: string;
  tipo_tracao: string;
  aliquota: number;
  tem_isencao: boolean;
  percentual_reducao: number | null;
  observacao: string | null;
}

export interface DashboardData {
  ganhoHoje: number;
  ganhoOntem: number;
  variacaoOntem: number;
  corridasHoje: number;
  metaDiaria: number;
  percentualMetaDiaria: number;
  ganhoSemana: number;
  ganhoSemanaAnterior: number;
  variacaoSemana: number;
  percentualSemana: number;
  ganhoMes: number;
  ganhoMesLiquido: number;
  despesasMes: number;
  custoFixoMes: number;
  metaMensal: number;
  percentualMes: number;
  metaDiariaAjustada: number;
  semanal: { dia: string; diaNum: number; valor: number }[];
  rosca: { categoria: string; valor: number; cor: string }[];
  ultimaJornada: {
    data: string;
    diaSemana: string;
    plataforma: string;
    corridas: number;
    valor: number;
  } | null;
}
