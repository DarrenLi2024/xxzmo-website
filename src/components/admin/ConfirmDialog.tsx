"use client";

import { createContext, useContext, useState, useCallback } from "react";
import { AlertTriangle, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning" | "default";
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
}

interface ConfirmContextValue {
  confirm: (options: ConfirmOptions) => void;
}

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

export function ConfirmDialogProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);

  const confirm = useCallback((options: ConfirmOptions) => {
    setOpts(options);
    setOpen(true);
  }, []);

  async function handleConfirm() {
    if (!opts) return;
    setLoading(true);
    try {
      await opts.onConfirm();
    } finally {
      setLoading(false);
      setOpen(false);
    }
  }

  function handleCancel() {
    setOpen(false);
    opts?.onCancel?.();
  }

  const variantStyles: Record<string, { button: string; icon: string; ring: string }> = {
    danger: { button: "bg-red text-white hover:bg-red/90", icon: "text-red", ring: "ring-red/20" },
    warning: { button: "bg-amber text-white hover:bg-amber/90", icon: "text-amber", ring: "ring-amber/20" },
    default: { button: "bg-accent text-white hover:bg-accent-dim", icon: "text-accent", ring: "ring-accent/20" },
  };

  const style = variantStyles[opts?.variant || "default"];

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {open && opts && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-ink-900/30 backdrop-blur-sm">
          <div className={cn("relative bg-white rounded-xl shadow-xl p-6 max-w-sm w-full mx-4 ring-1", style.ring)}>
            <button onClick={handleCancel} className="absolute top-4 right-4 text-ink-300 hover:text-ink-700">
              <X size={16} />
            </button>
            <div className="flex items-start gap-3 mb-4">
              <div className={cn("p-2 rounded-full bg-paper-100", style.icon)}>
                <AlertTriangle size={20} />
              </div>
              <div>
                <h3 className="text-base font-medium text-ink-900">{opts.title}</h3>
                {opts.description && <p className="text-sm text-ink-500 mt-1">{opts.description}</p>}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={handleCancel} className="px-4 py-2 text-sm border border-paper-300 text-ink-600 rounded-md hover:bg-paper-100 transition-colors">
                {opts.cancelLabel || "取消"}
              </button>
              <button onClick={handleConfirm} disabled={loading} className={cn("px-4 py-2 text-sm rounded-md transition-colors disabled:opacity-50", style.button)}>
                {loading ? "处理中..." : (opts.confirmLabel || "确认")}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmContextValue {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used within ConfirmDialogProvider");
  return ctx;
}
