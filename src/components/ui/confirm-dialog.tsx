import * as React from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** destructive: nút xác nhận màu đỏ (xoá, huỷ...) */
  tone?: "destructive" | "default";
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Hộp xác nhận cho hành động không hoàn tác được (xoá khoản chi, xoá sự kiện...). */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Xác nhận",
  cancelLabel = "Huỷ",
  tone = "destructive",
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const confirmRef = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) onCancel();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    confirmRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, loading, onCancel]);

  if (!open) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      className="fixed inset-0 z-[100] flex items-center justify-center p-5"
    >
      <button
        aria-label="Đóng"
        tabIndex={-1}
        onClick={() => !loading && onCancel()}
        className="animate-fade-in absolute inset-0 cursor-default bg-black/45 backdrop-blur-sm"
      />
      <div className="animate-pop relative w-full max-w-xs overflow-hidden rounded-2xl border border-border/70 bg-card shadow-2xl">
        <div className="flex flex-col items-center gap-2 px-5 pb-4 pt-6 text-center">
          <span
            className={cn(
              "flex size-12 items-center justify-center rounded-full",
              tone === "destructive" ? "bg-destructive/12 text-destructive" : "bg-primary/12 text-primary",
            )}
          >
            <AlertTriangle className="size-6" />
          </span>
          <h2 id="confirm-title" className="text-base font-semibold leading-snug">
            {title}
          </h2>
          {description && (
            <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
          )}
        </div>
        <div className="flex gap-2 border-t border-border/60 p-3">
          <Button variant="secondary" className="flex-1" onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            ref={confirmRef}
            variant={tone === "destructive" ? "destructive" : "default"}
            className="flex-1"
            onClick={onConfirm}
            disabled={loading}
          >
            {loading && <Loader2 className="size-4 animate-spin" />}
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
