import { useRef } from "react";
import { addDays, format, isSameDay, isToday } from "date-fns";
import { vi } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function DateStrip({
  value,
  onChange,
}: {
  value: Date;
  onChange: (d: Date) => void;
}) {
  const startX = useRef(0);
  const active = useRef(false);

  const days = [-2, -1, 0, 1, 2].map((o) => addDays(value, o));

  const onPointerDown = (e: React.PointerEvent) => {
    active.current = true;
    startX.current = e.clientX;
  };
  const onPointerUp = (e: React.PointerEvent) => {
    if (!active.current) return;
    active.current = false;
    const dx = e.clientX - startX.current;
    if (Math.abs(dx) > 40) onChange(addDays(value, dx < 0 ? 1 : -1));
  };

  return (
    <div className="flex items-center gap-1 px-3 py-2">
      <button
        onClick={() => onChange(addDays(value, -1))}
        className="active-press flex size-9 items-center justify-center rounded-lg text-muted-foreground"
        aria-label="Ngày trước"
      >
        <ChevronLeft className="size-5" />
      </button>

      <div
        className="flex flex-1 justify-between touch-pan-y select-none"
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
      >
        {days.map((d) => {
          const selected = isSameDay(d, value);
          const today = isToday(d);
          return (
            <button
              key={d.toISOString()}
              onClick={() => onChange(d)}
              className={cn(
                "active-press flex w-11 flex-col items-center gap-0.5 rounded-xl py-1.5 transition-colors",
                selected ? "bg-primary text-primary-foreground" : "text-foreground",
              )}
            >
              <span className={cn("text-[10px]", selected ? "opacity-90" : "text-muted-foreground")}>
                {format(d, "EEEEEE", { locale: vi })}
              </span>
              <span className="text-base font-bold tabular-nums">{format(d, "d")}</span>
              <span
                className={cn(
                  "size-1 rounded-full",
                  today ? (selected ? "bg-primary-foreground" : "bg-primary") : "bg-transparent",
                )}
              />
            </button>
          );
        })}
      </div>

      <button
        onClick={() => onChange(addDays(value, 1))}
        className="active-press flex size-9 items-center justify-center rounded-lg text-muted-foreground"
        aria-label="Ngày sau"
      >
        <ChevronRight className="size-5" />
      </button>
    </div>
  );
}
