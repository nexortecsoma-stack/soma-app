const DIAS_SEMANA = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
];

const DIAS_SEMANA_CURTO = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const MESES_CURTO = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

export const dateEngine = {
  hoje(): Date {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  },

  formatarISO(date: Date | string): string {
    const d = typeof date === "string" ? this.parseISO(date) : date;
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  },

  parseISO(s: string): Date {
    if (!s) return new Date();
    const [y, m, d] = s.split("T")[0]!.split("-").map((n) => parseInt(n, 10));
    return new Date(y!, (m ?? 1) - 1, d ?? 1);
  },

  formatarBR(date: Date | string): string {
    const d = typeof date === "string" ? this.parseISO(date) : date;
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    return `${dd}/${mm}/${d.getFullYear()}`;
  },

  diaSemana(date: Date | string): string {
    const d = typeof date === "string" ? this.parseISO(date) : date;
    return DIAS_SEMANA[d.getDay()] ?? "";
  },

  diaSemanaCurto(date: Date | string): string {
    const d = typeof date === "string" ? this.parseISO(date) : date;
    return DIAS_SEMANA_CURTO[d.getDay()] ?? "";
  },

  mes(date: Date | string): string {
    const d = typeof date === "string" ? this.parseISO(date) : date;
    return MESES[d.getMonth()] ?? "";
  },

  mesCurto(date: Date | string): string {
    const d = typeof date === "string" ? this.parseISO(date) : date;
    return MESES_CURTO[d.getMonth()] ?? "";
  },

  primeiroDiaMes(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  },

  ultimoDiaMes(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0);
  },

  diasNoMes(date: Date): number {
    return this.ultimoDiaMes(date).getDate();
  },

  inicioSemana(date: Date): Date {
    const d = new Date(date);
    const diff = (d.getDay() + 6) % 7;
    d.setDate(d.getDate() - diff);
    d.setHours(0, 0, 0, 0);
    return d;
  },

  fimSemana(date: Date): Date {
    const inicio = this.inicioSemana(date);
    const fim = new Date(inicio);
    fim.setDate(fim.getDate() + 6);
    return fim;
  },

  somarDias(date: Date, dias: number): Date {
    const d = new Date(date);
    d.setDate(d.getDate() + dias);
    return d;
  },

  diferencaDias(a: Date | string, b: Date | string): number {
    const da = typeof a === "string" ? this.parseISO(a) : a;
    const db = typeof b === "string" ? this.parseISO(b) : b;
    return Math.round((da.getTime() - db.getTime()) / 86400000);
  },

  saudacao(): string {
    const h = new Date().getHours();
    if (h < 12) return "Bom dia";
    if (h < 18) return "Boa tarde";
    return "Boa noite";
  },

  formatarMesAno(date: Date): string {
    return `${MESES[date.getMonth()]} ${date.getFullYear()}`;
  },

  diasSemanaCurtos(): string[] {
    return ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
  },
};
