import { useState, useEffect, useCallback } from "react";
import { create } from "zustand";
import { X, CheckCircle2, AlertTriangle, Info, RotateCcw } from "lucide-react";

// ─── Toast Store ────────────────────────────────────────────────────────────

export type ToastVariant = "success" | "error" | "info";

export interface ToastItem {
  id: string;
  message: string;
  variant: ToastVariant;
  action?: { label: string; onClick: () => void };
  duration?: number; // ms, default 4000
}

interface ToastStore {
  toasts: ToastItem[];
  addToast: (toast: Omit<ToastItem, "id">) => void;
  removeToast: (id: string) => void;
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  addToast: (toast) => {
    const id = crypto.randomUUID();
    set((state) => ({ toasts: [...state.toasts, { ...toast, id }] }));
  },
  removeToast: (id) => {
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
  },
}));

// ─── Convenience helpers ────────────────────────────────────────────────────

export function toast(message: string, variant: ToastVariant = "info", action?: ToastItem["action"]) {
  useToastStore.getState().addToast({ message, variant, action });
}

// ─── Single Toast Bubble ────────────────────────────────────────────────────

function ToastBubble({ item, onDismiss }: { item: ToastItem; onDismiss: () => void }) {
  const [isExiting, setIsExiting] = useState(false);

  const dismiss = useCallback(() => {
    setIsExiting(true);
    setTimeout(onDismiss, 250); // allow exit animation
  }, [onDismiss]);

  useEffect(() => {
    const timer = setTimeout(dismiss, item.duration ?? 4000);
    return () => clearTimeout(timer);
  }, [dismiss, item.duration]);

  const variantStyles: Record<ToastVariant, string> = {
    success: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
    error: "border-destructive/30 bg-destructive/10 text-destructive",
    info: "border-primary/30 bg-primary/10 text-primary",
  };

  const IconComponent = {
    success: CheckCircle2,
    error: AlertTriangle,
    info: Info,
  }[item.variant];

  return (
    <div
      className={`
        flex items-center gap-3 rounded-xl border px-4 py-3 shadow-lg backdrop-blur-md
        transition-all duration-250 ease-out
        ${variantStyles[item.variant]}
        ${isExiting ? "translate-x-full opacity-0" : "translate-x-0 opacity-100"}
      `}
      role="alert"
    >
      <IconComponent className="h-4.5 w-4.5 shrink-0" />
      <span className="flex-1 text-sm font-medium text-foreground">{item.message}</span>

      {item.action && (
        <button
          onClick={() => {
            item.action!.onClick();
            dismiss();
          }}
          className="ml-1 inline-flex items-center gap-1 rounded-md bg-foreground/10 px-2.5 py-1 text-xs font-semibold text-foreground transition-colors hover:bg-foreground/20"
        >
          <RotateCcw className="h-3 w-3" />
          {item.action.label}
        </button>
      )}

      <button
        onClick={dismiss}
        className="ml-1 rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground"
        aria-label="Dismiss"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// ─── Toast Container (render once in App or Layout) ─────────────────────────

export function ToastContainer() {
  const { toasts, removeToast } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-20 right-4 z-50 flex flex-col-reverse gap-2 sm:bottom-20 sm:right-6">
      {toasts.map((t) => (
        <ToastBubble key={t.id} item={t} onDismiss={() => removeToast(t.id)} />
      ))}
    </div>
  );
}
