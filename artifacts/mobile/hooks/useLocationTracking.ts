import { useCallback, useEffect, useRef, useState } from "react";
import { locationService, type AssinaturaLocalizacao } from "@/services/location-service";
import { bgStorage } from "@/services/background-location-task";
import { pontosJornadaService } from "@/services/pontos-jornada-service";
import { locationDistanceEngine, type PontoLatLng } from "@/engines/location-distance-engine";

interface Opts {
  ativo: boolean;
  jornadaId: string | null;
  profileId: string | null;
}

export function useLocationTracking({ ativo, jornadaId, profileId }: Opts) {
  const [permitido, setPermitido] = useState<boolean | null>(null);
  const [bgAtivo, setBgAtivo] = useState(false);
  const [kmAcumulado, setKmAcumulado] = useState(0);
  const [pontosCount, setPontosCount] = useState(0);
  const [ultimoPonto, setUltimoPonto] = useState<PontoLatLng | null>(null);

  // Rastreamento foreground (fallback quando background não disponível)
  const subRef = useRef<AssinaturaLocalizacao | null>(null);
  const ultimoSalvoRef = useRef<{ ponto: PontoLatLng; em: number } | null>(null);
  const bufferRef = useRef<PontoLatLng[]>([]);

  // Polling do AsyncStorage quando background está ativo
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopForeground = useCallback(() => {
    subRef.current?.remover();
    subRef.current = null;
  }, []);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    setKmAcumulado(0);
    setPontosCount(0);
    setUltimoPonto(null);
    setBgAtivo(false);
    ultimoSalvoRef.current = null;
    bufferRef.current = [];
  }, []);

  useEffect(() => {
    if (!ativo || !jornadaId || !profileId) {
      // Parar tudo ao desativar
      stopForeground();
      stopPolling();
      if (bgAtivo) {
        locationService.stopBackground();
        setBgAtivo(false);
      }
      return;
    }

    let cancelado = false;

    (async () => {
      // 1. Garantir permissão de foreground primeiro
      const fg = await locationService.permissaoAtual();
      const final = fg || (await locationService.pedirPermissao());
      setPermitido(final);
      if (!final || cancelado) return;

      // 2. Tentar iniciar rastreamento em segundo plano
      const bgOk = await locationService.startBackground(jornadaId, profileId);

      if (cancelado) {
        if (bgOk) locationService.stopBackground();
        return;
      }

      if (bgOk) {
        // ── Modo background ─────────────────────────────────────
        setBgAtivo(true);
        // Pollar AsyncStorage a cada 4 segundos para mostrar km atualizado
        pollRef.current = setInterval(async () => {
          const km = await bgStorage.getKm();
          const last = await bgStorage.getLastPonto();
          const buf = await bgStorage.getBuffer();
          setKmAcumulado(km);
          setPontosCount(buf.length);
          if (last) setUltimoPonto(last);
        }, 4000);
      } else {
        // ── Modo foreground (fallback) ───────────────────────────
        setBgAtivo(false);
        subRef.current = await locationService.observar(async (p) => {
          if (!locationDistanceEngine.pontoValido(p)) return;
          const agora = Date.now();
          const last = ultimoSalvoRef.current;
          if (last) {
            const dt = (agora - last.em) / 1000;
            if (locationDistanceEngine.saltoIrreal(last.ponto, p, dt)) return;
            const km = locationDistanceEngine.haversine(last.ponto, p);
            if (km < 0.005) return;
            setKmAcumulado((v) => v + km);
          }
          ultimoSalvoRef.current = { ponto: p, em: agora };
          setUltimoPonto(p);
          setPontosCount((n) => n + 1);
          bufferRef.current.push(p);

          try {
            await pontosJornadaService.insertOne({
              profile_id: profileId,
              jornada_id: jornadaId,
              latitude: p.latitude,
              longitude: p.longitude,
              accuracy: p.accuracy ?? null,
              speed: p.speed ?? null,
              recorded_at: new Date(agora).toISOString(),
            });
          } catch {
            // ponto fica em memória; não crítico
          }
        });
      }
    })();

    return () => {
      cancelado = true;
      stopForeground();
      stopPolling();
    };
  }, [ativo, jornadaId, profileId, stopForeground, stopPolling]);

  /**
   * Deve ser chamado quando a jornada é encerrada.
   * Para o rastreamento e salva os pontos do buffer background no Supabase.
   */
  const flushBackground = useCallback(async (pId: string) => {
    stopPolling();
    await locationService.stopBackground();

    const buffer = await bgStorage.getBuffer();
    if (buffer.length > 0) {
      try {
        await pontosJornadaService.insertBatch(
          buffer as Parameters<typeof pontosJornadaService.insertBatch>[0],
        );
      } catch (e) {
        console.warn("[SOMA] Falha ao salvar pontos do background:", e);
      }
    }
    await bgStorage.clear();
  }, [stopPolling]);

  return { permitido, bgAtivo, kmAcumulado, pontosCount, ultimoPonto, reset, flushBackground };
}
