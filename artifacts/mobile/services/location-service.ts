import * as Location from "expo-location";
import { SOMA_BG_TASK, bgStorage } from "@/services/background-location-task";
import type { PontoLatLng } from "@/engines/location-distance-engine";

export interface AssinaturaLocalizacao {
  remover: () => void;
}

export const locationService = {
  async pedirPermissao(): Promise<boolean> {
    const { status } = await Location.requestForegroundPermissionsAsync();
    return status === "granted";
  },

  async permissaoAtual(): Promise<boolean> {
    const { status } = await Location.getForegroundPermissionsAsync();
    return status === "granted";
  },

  /** Solicita permissão de localização em segundo plano ("Sempre permitir") */
  async pedirPermissaoBackground(): Promise<boolean> {
    const fg = await this.pedirPermissao();
    if (!fg) return false;
    const { status } = await Location.requestBackgroundPermissionsAsync();
    return status === "granted";
  },

  async permissaoBackgroundAtual(): Promise<boolean> {
    const { status } = await Location.getBackgroundPermissionsAsync();
    return status === "granted";
  },

  async posicaoAtual(): Promise<PontoLatLng | null> {
    try {
      const ok = await this.permissaoAtual();
      if (!ok) return null;
      const r = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      return {
        latitude: r.coords.latitude,
        longitude: r.coords.longitude,
        accuracy: r.coords.accuracy ?? null,
        speed: r.coords.speed ?? null,
      };
    } catch {
      return null;
    }
  },

  /** Rastreamento em primeiro plano (foreground) — fallback */
  async observar(callback: (p: PontoLatLng) => void): Promise<AssinaturaLocalizacao> {
    const sub = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: 5000,
        distanceInterval: 10,
      },
      (r) => {
        callback({
          latitude: r.coords.latitude,
          longitude: r.coords.longitude,
          accuracy: r.coords.accuracy ?? null,
          speed: r.coords.speed ?? null,
        });
      },
    );
    return { remover: () => sub.remove() };
  },

  /**
   * Inicia rastreamento em segundo plano com notificação persistente.
   * Retorna true se o background foi iniciado, false se usará só foreground.
   */
  async startBackground(jornadaId: string, profileId: string): Promise<boolean> {
    try {
      const temPermissao = await this.pedirPermissaoBackground();
      if (!temPermissao) return false;

      await bgStorage.setJornadaInfo(jornadaId, profileId);
      await bgStorage.setKm(0);

      const jaRodando = await Location.hasStartedLocationUpdatesAsync(SOMA_BG_TASK).catch(() => false);
      if (jaRodando) {
        await Location.stopLocationUpdatesAsync(SOMA_BG_TASK);
      }

      await Location.startLocationUpdatesAsync(SOMA_BG_TASK, {
        accuracy: Location.Accuracy.High,
        timeInterval: 5000,
        distanceInterval: 10,
        foregroundService: {
          notificationTitle: "SOMA — Jornada em andamento",
          notificationBody: "Registrando sua rota. Pode usar outros apps normalmente.",
          notificationColor: "#0EA5E9",
        },
        pausesUpdatesAutomatically: false,
        showsBackgroundLocationIndicator: true,
      });

      return true;
    } catch (e) {
      console.warn("[SOMA] startBackground falhou:", e);
      return false;
    }
  },

  /** Para o rastreamento em segundo plano */
  async stopBackground(): Promise<void> {
    try {
      // timeout de 2 s para ambientes que não suportam task tracking (ex: web)
      const never = new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 2000));
      const rodando = await Promise.race([
        Location.hasStartedLocationUpdatesAsync(SOMA_BG_TASK).catch(() => false),
        never,
      ]);
      if (rodando) {
        await Location.stopLocationUpdatesAsync(SOMA_BG_TASK);
      }
    } catch (e) {
      console.warn("[SOMA] stopBackground falhou:", e);
    }
  },
};
