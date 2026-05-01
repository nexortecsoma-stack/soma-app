export const cpfEngine = {
  somenteNumeros(cpf: string): string {
    return (cpf || "").replace(/\D/g, "");
  },

  aplicarMascara(cpf: string): string {
    const num = this.somenteNumeros(cpf).slice(0, 11);
    if (num.length <= 3) return num;
    if (num.length <= 6) return `${num.slice(0, 3)}.${num.slice(3)}`;
    if (num.length <= 9) return `${num.slice(0, 3)}.${num.slice(3, 6)}.${num.slice(6)}`;
    return `${num.slice(0, 3)}.${num.slice(3, 6)}.${num.slice(6, 9)}-${num.slice(9)}`;
  },

  validar(cpf: string): boolean {
    const c = this.somenteNumeros(cpf);
    if (c.length !== 11) return false;
    if (/^(\d)\1{10}$/.test(c)) return false;

    let soma = 0;
    for (let i = 0; i < 9; i++) soma += parseInt(c[i] ?? "0", 10) * (10 - i);
    let resto = (soma * 10) % 11;
    if (resto === 10) resto = 0;
    if (resto !== parseInt(c[9] ?? "0", 10)) return false;

    soma = 0;
    for (let i = 0; i < 10; i++) soma += parseInt(c[i] ?? "0", 10) * (11 - i);
    resto = (soma * 10) % 11;
    if (resto === 10) resto = 0;
    if (resto !== parseInt(c[10] ?? "0", 10)) return false;

    return true;
  },
};
