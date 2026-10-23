import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Chọn số trong khoảng nhỏ bằng −/+ (tránh bàn phím số trên mobile). */
export function Stepper({
  label,
  value,
  min,
  max,
  suffix = "ngày",
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  suffix?: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <span className="text-sm">{label}</span>
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label={`Giảm ${label.toLowerCase()}`}
          disabled={value <= min}
          onClick={() => onChange(value - 1)}
        >
          <Minus />
        </Button>
        <span className="w-16 text-center text-sm font-semibold tabular-nums">
          {value} {suffix}
        </span>
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label={`Tăng ${label.toLowerCase()}`}
          disabled={value >= max}
          onClick={() => onChange(value + 1)}
        >
          <Plus />
        </Button>
      </div>
    </div>
  );
}
