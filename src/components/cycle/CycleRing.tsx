import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Vòng tiến độ chu kỳ: ngày thứ N / độ dài TB. Chỉ hiển thị, không tương tác. */
export function CycleRing({
  progress,
  tone = "primary",
  children,
}: {
  /** 0..1 */
  progress: number;
  tone?: "primary" | "muted";
  children: ReactNode;
}) {
  const size = 160;
  const stroke = 10;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const p = Math.min(Math.max(progress, 0), 1);

  return (
    <div className="relative mx-auto size-40" role="img" aria-label={`Tiến độ chu kỳ ${Math.round(p * 100)}%`}>
      <svg viewBox={`0 0 ${size} ${size}`} className="size-full -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-muted" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - p)}
          className={cn(
            "transition-[stroke-dashoffset] duration-700 ease-out",
            tone === "primary" ? "stroke-primary" : "stroke-muted-foreground/50",
          )}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
        {children}
      </div>
    </div>
  );
}
