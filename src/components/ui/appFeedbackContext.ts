import { createContext, useContext } from "react";

export type ToastType = "success" | "error" | "info";

export interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

export interface ConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
}

export interface FeedbackContextValue {
  showToast: (message: string, options?: { type?: ToastType; durationMs?: number }) => void;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

export const FeedbackContext = createContext<FeedbackContextValue | null>(null);

export const useAppFeedback = () => {
  const context = useContext(FeedbackContext);
  if (!context) throw new Error("useAppFeedback must be used inside AppFeedbackProvider");
  return context;
};
