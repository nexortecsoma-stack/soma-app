import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import type { Session } from "@supabase/supabase-js";
import { authService } from "@/services/auth-service";
import { profileService } from "@/services/profile-service";
import { veiculoService } from "@/services/veiculo-service";

import type { Perfil, Veiculo } from "@/lib/types";
import { onboardValidationEngine, type OnboardStatus } from "@/engines/onboard-validation-engine";

interface AuthContextValue {
  session: Session | null;
  loading: boolean;
  perfil: Perfil | null;
  veiculo: Veiculo | null;
  onboard: OnboardStatus;
  refreshPerfil: () => Promise<void>;
  refreshVeiculo: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, aceitouTermos: boolean) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [veiculo, setVeiculo] = useState<Veiculo | null>(null);

  const refreshPerfil = useCallback(async () => {
    if (!session?.user) {
      setPerfil(null);
      return;
    }
    try {
      const p = await profileService.ensureExists(session.user.id, session.user.email ?? null);
      setPerfil(p);
    } catch (e) {
      console.warn("Erro ao carregar perfil", e);
    }
  }, [session]);

  const refreshVeiculo = useCallback(async () => {
    if (!session?.user) {
      setVeiculo(null);
      return;
    }
    try {
      const v = await veiculoService.getByProfile(session.user.id);
      setVeiculo(v);
    } catch (e) {
      console.warn("Erro ao carregar veículo", e);
    }
  }, [session]);

  useEffect(() => {
    let mounted = true;
    authService
      .getSession()
      .then((s) => {
        if (mounted) {
          setSession(s);
          setLoading(false);
        }
      })
      .catch(() => {
        if (mounted) setLoading(false);
      });

    const { data: sub } = authService.onAuthStateChange((s) => {
      setSession(s);
      setLoading(false);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (session) {
      void refreshPerfil();
      void refreshVeiculo();
    } else {
      setPerfil(null);
      setVeiculo(null);
    }
  }, [session, refreshPerfil, refreshVeiculo]);

  const signIn = useCallback(async (email: string, password: string) => {
    await authService.signIn(email, password);
  }, []);

  const signUp = useCallback(async (email: string, password: string, aceitouTermos: boolean) => {
    await authService.signUp(email, password, aceitouTermos);
  }, []);

  const signOut = useCallback(async () => {
    await authService.signOut();
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    await authService.resetPassword(email);
  }, []);

  const onboard = useMemo(
    () => onboardValidationEngine.validar(perfil, veiculo),
    [perfil, veiculo],
  );

  const value = useMemo(
    () => ({
      session,
      loading,
      perfil,
      veiculo,
      onboard,
      refreshPerfil,
      refreshVeiculo,
      signIn,
      signUp,
      signOut,
      resetPassword,
    }),
    [session, loading, perfil, veiculo, onboard, refreshPerfil, refreshVeiculo, signIn, signUp, signOut, resetPassword],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth precisa estar dentro de AuthProvider");
  return ctx;
}
