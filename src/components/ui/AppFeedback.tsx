import React, { useCallback, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { FeedbackContext, type ConfirmOptions, type Toast, type ToastType } from "./appFeedbackContext";

export const AppFeedbackProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confirmState, setConfirmState] = useState<(ConfirmOptions & { resolve: (value: boolean) => void }) | null>(null);
  const toastId = useRef(0);

  const dismissToast = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, options?: { type?: ToastType; durationMs?: number }) => {
      const id = toastId.current + 1;
      toastId.current = id;
      setToasts((current) => [...current, { id, message, type: options?.type ?? "info" }]);
      window.setTimeout(() => dismissToast(id), options?.durationMs ?? 4200);
    },
    [dismissToast],
  );

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setConfirmState({ ...options, resolve });
    });
  }, []);

  const closeConfirm = (value: boolean) => {
    confirmState?.resolve(value);
    setConfirmState(null);
  };

  const value = useMemo(() => ({ showToast, confirm }), [showToast, confirm]);
  const portalRoot = typeof document === "undefined" ? null : document.body;

  return (
    <FeedbackContext.Provider value={value}>
      {children}
      {portalRoot &&
        createPortal(
          <>
            <div className="pointer-events-none fixed inset-x-0 top-5 z-[100] flex justify-center px-4">
              <div className="flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-3">
              {toasts.map((toast) => (
                <div
                  key={toast.id}
                  className={`pointer-events-auto rounded-2xl border px-4 py-3 text-sm shadow-2xl backdrop-blur-xl ${
                    toast.type === "error"
                      ? "border-red-200/70 bg-red-50/80 text-red-900"
                      : toast.type === "success"
                        ? "border-emerald-200/70 bg-emerald-50/80 text-emerald-950"
                        : "border-slate-200/70 bg-white/75 text-slate-900"
                  }`}
                >
                  {toast.message}
                </div>
              ))}
              </div>
            </div>

            {confirmState && (
              <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/20 px-4 backdrop-blur-sm" role="presentation">
                <div className="w-full max-w-sm rounded-3xl border border-white/50 bg-white/85 p-5 text-slate-950 shadow-2xl backdrop-blur-2xl" role="dialog" aria-modal="true" aria-labelledby="app-confirm-title">
                  <h2 id="app-confirm-title" className="text-lg font-semibold tracking-tight">{confirmState.title}</h2>
                  {confirmState.description && <p className="mt-2 text-sm leading-6 text-slate-600">{confirmState.description}</p>}
                  <div className="mt-5 flex justify-end gap-2">
                    <button className="rounded-full border border-slate-200 bg-white/70 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-white" onClick={() => closeConfirm(false)}>
                      {confirmState.cancelLabel ?? "Cancel"}
                    </button>
                    <button
                      className={`rounded-full px-4 py-2 text-sm font-semibold text-white transition ${
                        confirmState.destructive ? "bg-red-600 hover:bg-red-700" : "bg-slate-950 hover:bg-slate-800"
                      }`}
                      onClick={() => closeConfirm(true)}
                    >
                      {confirmState.confirmLabel ?? "Confirm"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>,
          portalRoot,
        )}
    </FeedbackContext.Provider>
  );
};
