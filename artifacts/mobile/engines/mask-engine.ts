export const maskEngine = {
  telefone(value: string): string {
    const v = (value || "").replace(/\D/g, "").slice(0, 11);
    if (v.length <= 2) return v;
    if (v.length <= 6) return `(${v.slice(0, 2)}) ${v.slice(2)}`;
    if (v.length <= 10) return `(${v.slice(0, 2)}) ${v.slice(2, 6)}-${v.slice(6)}`;
    return `(${v.slice(0, 2)}) ${v.slice(2, 7)}-${v.slice(7)}`;
  },
  somenteNumeros(value: string): string {
    return (value || "").replace(/\D/g, "");
  },
  placa(value: string): string {
    return (value || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 7);
  },
  data(value: string): string {
    const v = (value || "").replace(/\D/g, "").slice(0, 8);
    if (v.length <= 2) return v;
    if (v.length <= 4) return `${v.slice(0, 2)}/${v.slice(2)}`;
    return `${v.slice(0, 2)}/${v.slice(2, 4)}/${v.slice(4)}`;
  },
};
