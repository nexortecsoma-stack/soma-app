import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./AuthContext";
import { plataformasService } from "@/services/plataformas-service";
import { PLATAFORMAS_FIXAS } from "@/lib/constants";
import type { Plataforma } from "@/lib/types";

// Plataforma com id nullable para as fixas ainda não salvas no banco
export type PlataformaDisplay = Omit<Plataforma, "id"> & { id: string | null };

export function usePlataformas() {
  const { session, perfil } = useAuth();
  const userId = session?.user?.id;
  const queryClient = useQueryClient();

  // Só faz SELECT — não depende do INSERT para aparecer
  const list = useQuery({
    queryKey: ["plataformas", userId],
    queryFn: async () => {
      if (!userId) return [] as Plataforma[];
      return plataformasService.listByProfile(userId);
    },
    enabled: !!userId,
    retry: 1,
    staleTime: 30_000,
  });

  const dbData = list.data ?? [];

  // Nomes das plataformas fixas (em minúsculo para comparação)
  const nomesFixos = useMemo(
    () => new Set(PLATAFORMAS_FIXAS.map((p) => p.nome.toLowerCase())),
    [],
  );

  // Plataformas fixas: sempre visíveis, estado de toggle vem do banco por nome
  const fixas: PlataformaDisplay[] = useMemo(() =>
    PLATAFORMAS_FIXAS.map((c) => {
      const dbRow = dbData.find(
        (r) => r.nome.toLowerCase() === c.nome.toLowerCase(),
      );
      return {
        id: dbRow?.id ?? null,
        profile_id: userId ?? "",
        nome: c.nome,
        tipo: c.tipo,
        ativa: dbRow?.ativa ?? false,
        fixa: true,
      };
    }),
  [dbData, userId]);

  // Plataformas extras: linhas do banco cujo nome não é uma plataforma fixa
  const extras: PlataformaDisplay[] = useMemo(
    () =>
      dbData
        .filter((p) => !nomesFixos.has(p.nome.toLowerCase()))
        .map((p) => ({ ...p, fixa: false })),
    [dbData, nomesFixos],
  );

  const isFree = !perfil?.assinante;
  const limiteFixasAtivas = isFree ? 2 : Infinity;
  const limiteExtras = isFree ? 1 : Infinity;
  const fixasAtivas = fixas.filter((p) => p.ativa).length;
  const extrasAtivas = extras.filter((p) => p.ativa).length;
  // Todas as plataformas ativas (fixas + extras com id real no banco)
  const ativas: PlataformaDisplay[] = useMemo(
    () => [...fixas, ...extras].filter((p) => p.ativa),
    [fixas, extras],
  );

  const invalidar = () => queryClient.invalidateQueries({ queryKey: ["plataformas"] });

  const toggle = useMutation({
    mutationFn: async ({ plataforma, ativa }: { plataforma: PlataformaDisplay; ativa: boolean }) => {
      if (!userId) throw new Error("Sem sessão");
      let id = plataforma.id;
      // Se a plataforma fixa ainda não existe no banco, insere antes de togglear
      if (!id && plataforma.fixa) {
        const nova = await plataformasService.inserirFixa(userId, plataforma.nome);
        id = nova.id;
      }
      if (!id) throw new Error("ID não encontrado");
      return plataformasService.toggle(id, ativa);
    },
    onSuccess: invalidar,
  });

  const addExtra = useMutation({
    mutationFn: async ({ nome }: { nome: string }) => {
      if (!userId) throw new Error("Sem sessão");
      return plataformasService.addExtra(userId, nome);
    },
    onSuccess: invalidar,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => plataformasService.remove(id),
    onSuccess: invalidar,
  });

  return {
    list,
    fixas,
    extras,
    ativas,
    fixasAtivas,
    extrasAtivas,
    limiteFixasAtivas,
    limiteExtras,
    isFree,
    toggle,
    addExtra,
    remove,
  };
}
