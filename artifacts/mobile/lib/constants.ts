export const APP_NAME = "SOMA";
export const APP_FULL_NAME = "Sistema Orçamentário para Motorista de Aplicativo";
export const APP_FOOTER = "Desenvolvido por Nexor-Tec - 2026";

export const PLATAFORMAS_FIXAS = [
  { nome: "Uber", tipo: "passageiro", icone: "car", cor: "#000000" },
  { nome: "99Pop", tipo: "passageiro", icone: "car-sport", cor: "#FFD400" },
  { nome: "InDrive", tipo: "passageiro", icone: "car-outline", cor: "#10B981" },
  { nome: "iFood", tipo: "entrega", icone: "fast-food", cor: "#EA1D2C" },
  { nome: "Entregas", tipo: "entrega", icone: "cube", cor: "#F59E0B" },
  { nome: "Particular", tipo: "outro", icone: "person", cor: "#6366F1" },
] as const;

export const CATEGORIAS_DESPESA = [
  { id: "limpeza", nome: "Limpeza", icone: "sparkles", cor: "#22D3EE" },
  { id: "alimentacao", nome: "Alimentação", icone: "restaurant", cor: "#FB923C" },
  { id: "multa", nome: "Multa", icone: "warning", cor: "#EF4444" },
  { id: "estacionamento", nome: "Estacionamento", icone: "location", cor: "#8B5CF6" },
  { id: "internet", nome: "Internet", icone: "wifi", cor: "#0EA5E9" },
  { id: "manutencao", nome: "Manutenção", icone: "build", cor: "#F59E0B" },
  { id: "outros", nome: "Outros", icone: "ellipsis-horizontal", cor: "#64748B" },
] as const;

export const TIPOS_MANUTENCAO = [
  { id: "suspensao", nome: "Suspensão e amortecedores", duracao_km: 60000, duracao_meses: 12 },
  { id: "pneus", nome: "Jogo de pneus", duracao_km: 50000, duracao_meses: 12 },
  { id: "bateria", nome: "Bateria", duracao_km: 0, duracao_meses: 24 },
  { id: "oleo_filtros", nome: "Troca de óleo e filtros", duracao_km: 10000, duracao_meses: 6 },
  { id: "freios", nome: "Freios e pastilhas", duracao_km: 30000, duracao_meses: 12 },
  { id: "outros", nome: "Outros", duracao_km: 0, duracao_meses: 0 },
] as const;

export const UFS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO",
  "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI",
  "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
];

export const TIPOS_COMBUSTIVEL = [
  { id: "gasolina", nome: "Gasolina" },
  { id: "etanol", nome: "Etanol" },
  { id: "gnv", nome: "GNV" },
  { id: "energia", nome: "Energia (Elétrico)" },
] as const;

export const TIPOS_TRACAO = [
  { id: "flex", nome: "Flex" },
  { id: "eletrico", nome: "Elétrico" },
  { id: "hibrido", nome: "Híbrido" },
  { id: "gnv", nome: "GNV" },
] as const;

export const TIPOS_PROPRIEDADE = [
  { id: "proprio", nome: "Próprio" },
  { id: "financiado", nome: "Financiado" },
  { id: "alugado", nome: "Alugado" },
] as const;

export const TIPOS_ALUGUEL = [
  { id: "semanal", nome: "Semanal" },
  { id: "quinzenal", nome: "Quinzenal" },
  { id: "mensal", nome: "Mensal" },
] as const;

export const TIPOS_SEGURO = [
  { id: "mensal", nome: "Mensal" },
  { id: "anual", nome: "Anual" },
] as const;

export const CATEGORIAS_VEICULO = [
  { id: "uberx", nome: "Uber X / 99Pop" },
  { id: "comfort", nome: "Uber Comfort" },
  { id: "black", nome: "Uber Black / 99Top" },
  { id: "moto", nome: "Moto" },
  { id: "entrega", nome: "Entrega" },
  { id: "outro", nome: "Outro" },
] as const;

export const MODOS_JORNADA = [
  { id: "manual", nome: "Manual" },
  { id: "automatica", nome: "Automática (GPS)" },
] as const;

export const STATUS_JORNADA = [
  { id: "rascunho", nome: "Rascunho", cor: "#94A3B8" },
  { id: "ativa", nome: "Em andamento", cor: "#10B981" },
  { id: "pausada", nome: "Pausada", cor: "#F59E0B" },
  { id: "encerrada", nome: "Encerrada", cor: "#0EA5E9" },
] as const;

export const PLANOS_PRO = [
  { id: "mensal", nome: "Mensal", valor: 29.0, dias: 30 },
  { id: "semestral", nome: "Semestral", valor: 99.9, dias: 180 },
  { id: "anual", nome: "Anual", valor: 129.0, dias: 365 },
] as const;

export const DEPRECIACAO_OPCOES = [
  { id: "p12", nome: "1 ano de uso", percentual: 12 },
  { id: "p10", nome: "2 anos de uso", percentual: 10 },
  { id: "p8", nome: "3 anos de uso", percentual: 8 },
  { id: "p6", nome: "4 anos de uso", percentual: 6 },
  { id: "p4", nome: "5 anos ou mais", percentual: 4 },
] as const;

export const FAQ_ITENS = [
  {
    pergunta: "Como o SOMA calcula meu ganho líquido?",
    resposta: "O ganho líquido é o total recebido das plataformas menos as despesas variáveis (combustível, alimentação, multas etc.) e as despesas fixas (financiamento, seguro, IPVA, depreciação, internet e manutenções básicas que você habilitou no perfil).",
  },
  {
    pergunta: "Os meus dados ficam seguros?",
    resposta: "Sim. Cada motorista só consegue acessar os próprios registros. Usamos Supabase com regras de segurança em nível de linha (RLS).",
  },
  {
    pergunta: "Como participar do Ranking SOMA?",
    resposta: "No menu Configurações habilite a opção Participar do Ranking. Em seguida, abra o Perfil para confirmar seu nome público, categoria e foto. Por fim, em Ranking SOMA toque em Atualizar minha posição.",
  },
  {
    pergunta: "Posso usar o SOMA grátis?",
    resposta: "Sim. O plano Free permite cadastrar 2 plataformas fixas + 1 plataforma extra. O plano Pro libera quantas plataformas você quiser e relatórios avançados.",
  },
  {
    pergunta: "Por que meu CPF fica bloqueado depois de salvar?",
    resposta: "Para evitar duplicidade entre contas e proteger seus dados, o CPF é validado uma vez e fica congelado. Se precisar trocar, fale com o suporte.",
  },
  {
    pergunta: "O que é a categoria do veículo?",
    resposta: "É a faixa em que seu carro opera (UberX/99Pop, Comfort, Black, Moto, Entrega ou Outro). Ela é usada para comparar você com motoristas no mesmo nível.",
  },
] as const;

export const CONTATOS_SUPORTE = {
  email: "soma.app.br@gmail.com",
  whatsapp: "+55 48 99100-7023",
  whatsappNumero: "5548991007023",
} as const;
