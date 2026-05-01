import { useCallback } from "react";
import { router } from "expo-router";
import { useAuth } from "./AuthContext";
import { useUI } from "./UIContext";

export function useProtectedAction() {
  const { onboard } = useAuth();
  const { showModal, hideModal } = useUI();

  return useCallback(
    (action: () => void | Promise<void>) => {
      if (onboard.completo) {
        void action();
        return;
      }
      showModal({
        type: "onboard",
        title: "Complete seu cadastro",
        message:
          "Para salvar dados financeiros, você precisa completar seu perfil e os dados do veículo. " +
          (onboard.faltando.length > 0 ? "\n\nFalta:\n• " + onboard.faltando.join("\n• ") : ""),
        confirmLabel: "Completar agora",
        cancelLabel: "Depois",
        onConfirm: () => {
          hideModal();
          router.push("/(private)/perfil");
        },
        onCancel: () => hideModal(),
      });
    },
    [onboard, showModal, hideModal],
  );
}
