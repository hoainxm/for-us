import { useRef, type ReactNode } from "react";
import { Check } from "lucide-react";

const THRESHOLD = 90; // px kéo TRÁI để Done
const DEADZONE = 6; // px trước khi quyết định hướng

// Quẹt TRÁI để Done. Transform bằng ref (không re-render mỗi move) -> bám ngón tay 1:1.
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
  const cardRef = useRef<HTMLDivElement>(null);
  const bgRef = useRef<HTMLDivElement>(null);

  const dragging = useRef(false);
  const dir = useRef<null | "h" | "v">(null);
  const startX = useRef(0);
  const startY = useRef(0);
  const offset = useRef(0);

  const paint = (dx: number) => {
    offset.current = dx;
    if (cardRef.current) cardRef.current.style.transform = `translateX(${dx}px)`;
    if (bgRef.current) bgRef.current.style.opacity = String(Math.min(-dx / THRESHOLD, 1));
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (disabled) return;
    dragging.current = true;
    dir.current = null;
    startX.current = e.clientX;
    startY.current = e.clientY;
    if (cardRef.current) cardRef.current.style.transition = "none";
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    const dx = e.clientX - startX.current;
    const dy = e.clientY - startY.current;

    if (dir.current === null) {
      if (Math.abs(dx) < DEADZONE && Math.abs(dy) < DEADZONE) return;
      if (Math.abs(dx) > Math.abs(dy)) {
        dir.current = "h";
        e.currentTarget.setPointerCapture(e.pointerId);
        startX.current = e.clientX; // reset gốc -> không nhảy khi bắt đầu
      } else {
        dir.current = "v"; // để trình duyệt cuộn dọc
        dragging.current = false;
        return;
      }
    }
    if (dir.current === "h") {
      paint(Math.min(0, e.clientX - startX.current)); // chỉ quẹt trái
    }
  };

  const onPointerUp = () => {
    const wasDragging = dragging.current;
    dragging.current = false;

    if (dir.current === "h") {
      if (cardRef.current) cardRef.current.style.transition = "transform 0.2s ease-out";
      if (-offset.current >= THRESHOLD) {
        paint(-(cardRef.current?.offsetWidth ?? 400) - 40); // trượt hết ra trái
        window.setTimeout(onComplete, 180);
      } else {
        paint(0); // snap về
      }
      return;
    }
    // Không kéo ngang: coi là tap (bỏ qua nếu là cuộn dọc "v")
    if (wasDragging && dir.current === null) onTap?.();
  };

  return (
    <div className="relative overflow-hidden rounded-xl">
      <div
        ref={bgRef}
        className="absolute inset-0 flex items-center justify-end rounded-xl bg-success pr-5"
        style={{ opacity: 0 }}
      >
        <Check className="size-6 text-white" strokeWidth={3} />
      </div>

      <div
        ref={cardRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className="relative touch-pan-y"
      >
        {children}
      </div>
    </div>
  );
}
