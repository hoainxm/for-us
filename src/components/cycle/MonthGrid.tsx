import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  getDay,
  startOfMonth,
} from "date-fns";
import { vi } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { PeriodRecord } from "@/types";

const WEEKDAYS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

export interface MonthGridProps {
  month: Date;
  onMonthChange: (m: Date) => void;
  periods: PeriodRecord[];
  /** Dải ngày hành kinh dự đoán (yyyy-MM-dd), null khi không dự đoán. */
  predicted: { from: string; to: string } | null;
  today: string;
  /** Chỉ chủ dữ liệu: chạm ngày đã qua để ghi/sửa. */
  onDayClick?: (day: string, period: PeriodRecord | null) => void;
}

/** Lịch tháng chỉ để hiển thị kỳ đã ghi + dự đoán (so sánh chuỗi yyyy-MM-dd, không lệch múi giờ). */
export function MonthGrid({ month, onMonthChange, periods, predicted, today, onDayClick }: MonthGridProps) {
  const days = eachDayOfInterval({ start: startOfMonth(month), end: endOfMonth(month) });
  const lead = (getDay(days[0]) + 6) % 7; // thứ 2 đầu tuần

  const periodOf = (d: string) => periods.find((p) => p.start_date <= d && d <= p.effective_end) ?? null;
  const isPredicted = (d: string) => !!predicted && predicted.from <= d && d <= predicted.to;

  const title = format(month, "'Tháng' M, yyyy", { locale: vi });

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <p className="font-semibold">{title}</p>
        <div className="flex">
          <Button variant="ghost" size="icon" aria-label="Tháng trước" onClick={() => onMonthChange(addMonths(month, -1))}>
            <ChevronLeft className="!size-5" />
          </Button>
          <Button variant="ghost" size="icon" aria-label="Tháng sau" onClick={() => onMonthChange(addMonths(month, 1))}>
            <ChevronRight className="!size-5" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 text-center text-xs text-muted-foreground">
        {WEEKDAYS.map((w) => (
          <span key={w} className="py-1">
            {w}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-7 place-items-center gap-y-1">
        {Array.from({ length: lead }).map((_, i) => (
          <span key={`pad-${i}`} />
        ))}
        {days.map((date) => {
          const d = format(date, "yyyy-MM-dd");
          const period = periodOf(d);
          const logged = !!period;
          const estimated = logged && period.is_estimated && d !== period.start_date;
          const predictedDay = !logged && isPredicted(d);
          const future = d > today;
          const clickable = !!onDayClick && !future;

          return (
            <button
              key={d}
              type="button"
              disabled={!clickable}
              onClick={() => onDayClick?.(d, period)}
              aria-label={`${format(date, "d/M")}${logged ? ", đã ghi" : predictedDay ? ", dự đoán" : ""}${d === today ? ", hôm nay" : ""}`}
              className={cn(
                "flex size-11 items-center justify-center rounded-full text-sm tabular-nums transition-colors disabled:cursor-default",
                clickable && "active-press",
                logged && !estimated && "bg-primary font-semibold text-primary-foreground",
                estimated && "bg-primary/40 font-semibold text-foreground",
                predictedDay && "border-2 border-dashed border-primary text-primary",
                !logged && !predictedDay && future && "text-muted-foreground",
                d === today && "ring-2 ring-foreground/70 ring-offset-2 ring-offset-card",
              )}
            >
              {format(date, "d")}
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <Legend className="bg-primary" label="Đã ghi" />
        <Legend className="bg-primary/40" label="Ước tính" />
        <Legend className="border-2 border-dashed border-primary" label="Dự đoán" />
      </div>
    </div>
  );
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={cn("size-3 rounded-full", className)} />
      {label}
    </span>
  );
}
