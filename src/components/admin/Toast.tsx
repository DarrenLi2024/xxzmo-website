"use client";

import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastType = "success" | "error" | "warning" | "info";

interface ToastItem {
  id: number;
  type: ToastType;
  message: string;
  exiting?: boolean;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  warning: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let nextId = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = useCallback((message: string, type: ToastType = "info") => {
    const id = nextId++;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, exiting: true } : t)));
      setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 300);
    }, 3000);
  }, []);

  const success = useCallback((msg: string) => addToast(msg, "success"), [addToast]);
  const error = useCallback((msg: string) => addToast(msg, "error"), [addToast]);
  const warning = useCallback((msg: string) => addToast(msg, "warning"), [addToast]);

  const iconMap: Record<ToastType, React.ReactNode> = {
    success: <CheckCircle size={16} />,
    error: <AlertCircle size={16} />,
    warning: <AlertTriangle size={16} />,
    info: <Info size={16} />,
  };

  const bgMap: Record<ToastType, string> = {
    success: "border-green/30 bg-green/5",
    error: "border-red/30 bg-red/5",
    warning: "border-amber/30 bg-amber/5",
    info: "border-ink-200 bg-paper-50",
  };

  const textMap: Record<ToastType, string> = {
    success: "text-green",
    error: "text-red",
    warning: "text-amber",
    info: "text-ink-700",
  };

  return (
    <ToastContext.Provider value={{ toast: addToast, success, error, warning }}>
      {children}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              "flex items-center gap-2 px-4 py-3 rounded-lg border shadow-lg text-sm transition-all duration-300",
              bgMap[t.type],
              t.exiting ? "opacity-0 translate-x-4" : "opacity-100 translate-x-0"
            )}
          >
            <span className={textMap[t.type]}>{iconMap[t.type]}</span>
            <span className={cn("flex-1", textMap[t.type])}>{t.message}</span>
            <button
              onClick={() => {
                setToasts((prev) => prev.map((x) => (x.id === t.id ? { ...x, exiting: true } : x)));
                setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== t.id)), 300);
              }}
              className={cn("shrink-0 hover:opacity-70", textMap[t.type])}
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
