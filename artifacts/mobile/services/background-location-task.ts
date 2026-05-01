/**
 * Tarefa de localização em segundo plano do SOMA.
 * Deve ser importada no topo do _layout.tsx para registrar a tarefa antes do uso.
 */
import * as TaskManager from "expo-task-manager";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { locationDistanceEngine, type PontoLatLng } from "@/engines/location-distance-engine";

export const SOMA_BG_TASK = "SOMA_BG_LOCATION";

const KEYS = {
  KM: "SOMA_BG_KM",
  LAST: "SOMA_BG_LAST_PONTO",
  BUFFER: "SOMA_BG_BUFFER",
  JORNADA_ID: "SOMA_BG_JORNADA_ID",
  PROFILE_ID: "SOMA_BG_PROFILE_ID",
} as const;

/** Utilitários de AsyncStorage compartilhados com o hook de rastreamento */
export const bgStorage = {
  async getKm(): Promise<number> {
    const v = await AsyncStorage.getItem(KEYS.KM);
    return v ? parseFloat(v) : 0;
  },
  async setKm(km: number) {
    await AsyncStorage.setItem(KEYS.KM, String(km));
  },
  async addKm(delta: number) {
    const cur = await this.getKm();
    await AsyncStorage.setItem(KEYS.KM, String(cur + delta));
  },
  async getLastPonto(): Promise<PontoLatLng | null> {
    const v = await AsyncStorage.getItem(KEYS.LAST);
    return v ? (JSON.parse(v) as PontoLatLng) : null;
  },
  async setLastPonto(p: PontoLatLng) {
    await AsyncStorage.setItem(KEYS.LAST, JSON.stringify(p));
  },
  async getBuffer(): Promise<Record<string, unknown>[]> {
    const v = await AsyncStorage.getItem(KEYS.BUFFER);
    return v ? (JSON.parse(v) as Record<string, unknown>[]) : [];
  },
  async addToBuffer(item: Record<string, unknown>) {
    const buf = await this.getBuffer();
    buf.push(item);
    await AsyncStorage.setItem(KEYS.BUFFER, JSON.stringify(buf));
  },
  async clearBuffer() {
    await AsyncStorage.removeItem(KEYS.BUFFER);
  },
  async setJornadaInfo(jornadaId: string, profileId: string) {
    await AsyncStorage.setItem(KEYS.JORNADA_ID, jornadaId);
    await AsyncStorage.setItem(KEYS.PROFILE_ID, profileId);
  },
  async getJornadaInfo(): Promise<{ jornadaId: string; profileId: string } | null> {
    const j = await AsyncStorage.getItem(KEYS.JORNADA_ID);
    const p = await AsyncStorage.getItem(KEYS.PROFILE_ID);
    if (!j || !p) return null;
    return { jornadaId: j, profileId: p };
  },
  async clear() {
    await AsyncStorage.multiRemove(Object.values(KEYS));
  },
};

// ── Registro da tarefa — deve rodar antes de qualquer uso ─────────────────────
// O TaskManager exige que a tarefa seja definida no escopo global do módulo.
// Envolvido em try/catch pois expo-task-manager não funciona na web.
try { TaskManager.defineTask(SOMA_BG_TASK, async ({ data, error }: TaskManager.TaskManagerTaskBody) => {
  if (error) {
    console.warn("[SOMA BG] Erro na tarefa:", error.message);
    return;
  }

  const payload = data as { locations?: { coords: { latitude: number; longitude: number; accuracy: number | null; speed: number | null }; timestamp: number }[] } | null;
  const locations = payload?.locations ?? [];
  const info = await bgStorage.getJornadaInfo();
  if (!info) return;

  for (const loc of locations) {
    const p: PontoLatLng = {
      latitude: loc.coords.latitude,
      longitude: loc.coords.longitude,
      accuracy: loc.coords.accuracy ?? null,
      speed: loc.coords.speed ?? null,
    };

    if (!locationDistanceEngine.pontoValido(p)) continue;

    const agora = loc.timestamp ?? Date.now();
    const last = await bgStorage.getLastPonto();

    if (last) {
      const km = locationDistanceEngine.haversine(last, p);
      if (km >= 0.005) {
        await bgStorage.addKm(km);
        await bgStorage.addToBuffer({
          profile_id: info.profileId,
          jornada_id: info.jornadaId,
          latitude: p.latitude,
          longitude: p.longitude,
          accuracy: p.accuracy,
          speed: p.speed,
          recorded_at: new Date(agora).toISOString(),
        });
      }
    }

    await bgStorage.setLastPonto(p);
  }
}); } catch (e) { console.warn("[SOMA BG] defineTask não disponível neste ambiente:", e); }
