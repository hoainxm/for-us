import { useRef, useState, type ReactNode } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const THRESHOLD = 96; // px kéo phải để kích hoạt Done

// Quẹt phải để Done. Kéo < 6px coi như tap -> onTap.
export function SwipeableRow({
  children,
  onComplete,
  onTap,
  disabled,
}: {
  children: ReactNode;
  onComplete: () => void;
  onTap?: () => void;
  disabled?: boolean;
}) {
  const [dx, setDx] = useState(0);
  const [animating, setAnimating] = useState(false);
  const startX = useRef(0);
  const startY = useRef(0);
  const dragging = useRef(false);
  const horizontal = useRef(false);

  const onPointerDown = (e: React.PointerEvent) => {
    if (disabled) return;
    dragging.current = true;
    horizontal.current = false;
    startX.current = e.clientX;
    startY.current = e.clientY;
    setAnimating(false);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    const diffX = e.clientX - startX.current;
    const diffY = e.clientY - startY.current;

    // Xác định hướng lần đầu: nếu dọc nhiều hơn -> nhường cuộn.
    if (!horizontal.current) {
      if (Math.abs(diffY) > Math.abs(diffX) && Math.abs(diffY) > 8) {
        dragging.current = false;
        return;
      }
      if (Math.abs(diffX) > 8) {
        horizontal.current = true;
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      }
    }
    if (horizontal.current) {
      setDx(Math.max(0, diffX)); // chỉ cho quẹt phải
    }
  };

  const onPointerUp = () => {
    if (!dragging.current && !horizontal.current) return;
    dragging.current = false;

    if (!horizontal.current) {
      onTap?.(); // không kéo -> tap
      return;
    }
    setAnimating(true);
    if (dx >= THRESHOLD) {
      setDx(600); // trượt ra khỏi màn
      window.setTimeout(onComplete, 180);
    } else {
      setDx(0);
    }
    horizontal.current = false;
  };

  const progress = Math.min(dx / THRESHOLD, 1);

  return (
    <div className="relative overflow-hidden rounded-xl">
      {/* Lớp nền Done */}
      <div
        className="absolute inset-0 flex items-center rounded-xl bg-success pl-5"
        style={{ opacity: progress }}
      >
        <Check
          className="size-6 text-white transition-transform"
          style={{ transform: `scale(${0.6 + progress * 0.6})` }}
          strokeWidth={3}
        />
      </div>

      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className={cn("relative touch-pan-y", animating && "transition-transform duration-200 ease-out")}
        style={{ transform: `translateX(${dx}px)` }}
      >
        {children}
      </div>
    </div>
  );
}
