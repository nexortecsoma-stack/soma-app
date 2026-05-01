export interface PontoLatLng {
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  speed?: number | null;
}

const RAIO_TERRA_KM = 6371;

export const locationDistanceEngine = {
  haversine(a: PontoLatLng, b: PontoLatLng): number {
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const dLat = toRad(b.latitude - a.latitude);
    const dLng = toRad(b.longitude - a.longitude);
    const lat1 = toRad(a.latitude);
    const lat2 = toRad(b.latitude);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
    return 2 * RAIO_TERRA_KM * Math.asin(Math.min(1, Math.sqrt(h)));
  },

  pontoValido(p: PontoLatLng): boolean {
    if (!isFinite(p.latitude) || !isFinite(p.longitude)) return false;
    if (p.latitude < -90 || p.latitude > 90) return false;
    if (p.longitude < -180 || p.longitude > 180) return false;
    if (p.accuracy != null && p.accuracy > 100) return false;
    return true;
  },

  saltoIrreal(prev: PontoLatLng, novo: PontoLatLng, dtSegundos: number): boolean {
    if (dtSegundos <= 0) return true;
    const km = this.haversine(prev, novo);
    const kmH = (km / dtSegundos) * 3600;
    return kmH > 250;
  },

  acumularDistancia(pontos: PontoLatLng[]): number {
    if (pontos.length < 2) return 0;
    let total = 0;
    for (let i = 1; i < pontos.length; i++) {
      const a = pontos[i - 1]!;
      const b = pontos[i]!;
      total += this.haversine(a, b);
    }
    return total;
  },
};
