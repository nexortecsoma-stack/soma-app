import React, { createContext, useCallback, useContext, useMemo, useState } from "react";

interface UIContextValue {
  drawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  modal: ModalState | null;
  showModal: (m: ModalState) => void;
  hideModal: () => void;
  toast: ToastState | null;
  showToast: (t: ToastState) => void;
}

export interface ModalState {
  type: "info" | "confirm" | "success" | "error" | "onboard" | "pro";
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
}

interface ToastState {
  type: "success" | "error" | "info";
  message: string;
}

const UIContext = createContext<UIContextValue | null>(null);

export function UIProvider({ children }: { children: React.ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [modal, setModal] = useState<ModalState | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);

  const openDrawer = useCallback(() => setDrawerOpen(true), []);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);
  const showModal = useCallback((m: ModalState) => setModal(m), []);
  const hideModal = useCallback(() => setModal(null), []);
  const showToast = useCallback((t: ToastState) => {
    setToast(t);
    setTimeout(() => setToast(null), 3500);
  }, []);

  const value = useMemo(
    () => ({ drawerOpen, openDrawer, closeDrawer, modal, showModal, hideModal, toast, showToast }),
    [drawerOpen, openDrawer, closeDrawer, modal, showModal, hideModal, toast, showToast],
  );

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
}

export function useUI() {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error("useUI precisa estar dentro de UIProvider");
  return ctx;
}
