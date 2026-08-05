"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { CheckCircle2, AlertCircle, XCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastKind = "success" | "error" | "info";
interface Toast {
  id: string;
  kind: ToastKind;
  message: string;
}

interface ToastContextValue {
  toast: (kind: ToastKind, message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function Toaster({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((kind: ToastKind, message: string) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((cur) => [...cur, { id, kind, message }]);
    setTimeout(() => {
      setToasts((cur) => cur.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const dismiss = (id: string) =>
    setToasts((cur) => cur.filter((t) => t.id !== id));

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => {
          const Icon =
            t.kind === "success"
              ? CheckCircle2
              : t.kind === "error"
                ? XCircle
                : AlertCircle;
          return (
            <div
              key={t.id}
              className={cn(
                "pointer-events-auto flex items-start gap-3 min-w-[280px] max-w-sm rounded-lg border bg-card p-4 shadow-lg animate-fade-in",
                t.kind === "success" && "border-success/40",
                t.kind === "error" && "border-destructive/40",
                t.kind === "info" && "border-primary/40",
              )}
            >
              <Icon
                className={cn(
                  "h-5 w-5 mt-0.5 flex-shrink-0",
                  t.kind === "success" && "text-success",
                  t.kind === "error" && "text-destructive",
                  t.kind === "info" && "text-primary",
                )}
              />
              <p className="text-sm flex-1">{t.message}</p>
              <button
                onClick={() => dismiss(t.id)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within Toaster");
  return ctx;
}
