import * as React from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

export interface SheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  /** Vùng cố định cuối sheet (thường là nút Lưu). */
  footer?: React.ReactNode;
  /** Đang lưu -> không cho đóng bằng nền/Esc/kéo. */
  busy?: boolean;
}

/** Bottom sheet (dáng shadcn Sheet side="bottom") cho form ngắn — giữ ngữ cảnh trang phía sau. */
export function Sheet({ open, onClose, title, description, children, footer, busy = false }: SheetProps) {
  const [dragY, setDragY] = React.useState(0);
  const startY = React.useRef<number | null>(null);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, busy, onClose]);

  React.useEffect(() => {
    if (!open) setDragY(0);
  }, [open]);

  if (!open) return null;

  // Kéo thanh nắm xuống > 80px để đóng.
  const onPointerDown = (e: React.PointerEvent) => {
    if (busy) return;
    startY.current = e.clientY;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (startY.current === null) return;
    setDragY(Math.max(0, e.clientY - startY.current));
  };
  const onPointerUp = () => {
    if (startY.current === null) return;
    startY.current = null;
    if (dragY > 80) onClose();
    else setDragY(0);
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="sheet-title"
      className="fixed inset-0 z-[90] flex items-end justify-center"
    >
      <button
        aria-label="Đóng"
        tabIndex={-1}
        onClick={() => !busy && onClose()}
        className="animate-fade-in absolute inset-0 bg-black/40 backdrop-blur-[2px]"
      />
      <div
        className="animate-sheet-in relative flex max-h-[85dvh] w-full max-w-md flex-col rounded-t-xl border border-b-0 border-border bg-card shadow-2xl"
        style={{
          transform: dragY ? `translateY(${dragY}px)` : undefined,
          transition: startY.current === null ? "transform 0.2s ease" : undefined,
        }}
      >
        <div
          className="flex cursor-grab touch-none justify-center pb-2 pt-3"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <span className="h-1 w-10 rounded-full bg-muted-foreground/30" />
        </div>
        <div className="px-4 pb-3">
          <h2 id="sheet-title" className="text-lg font-semibold">
            {title}
          </h2>
          {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
        </div>
        <div className="no-scrollbar flex-1 overflow-y-auto px-4">{children}</div>
        {footer && (
          <div
            className={cn("px-4 pt-4")}
            style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
