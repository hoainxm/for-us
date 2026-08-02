import { useMemo } from "react";
import {
  addWeeks,
  eachDayOfInterval,
  endOfWeek,
  format,
  getHours,
  getMinutes,
  isSameDay,
  isToday,
  startOfWeek,
} from "date-fns";
import { vi } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Repeat } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Task } from "@/types";

const HOUR_PX = 56; // cao mỗi giờ
const COL_W = 88; // rộng mỗi cột ngày
const AXIS_W = 44; // rộng cột trục giờ
const MIN_BLOCK_PX = 22;

const priorityBar: Record<string, string> = {
  high: "border-l-rose-500",
  medium: "border-l-amber-500",
  low: "border-l-sky-500",
};

// Giờ bắt đầu (phút trong ngày) của task
function startMin(t: Task) {
  const d = new Date(t.due_date);
  return getHours(d) * 60 + getMinutes(d);
}

// Xếp lane cho task trùng giờ trong cùng 1 ngày (greedy)
function packLanes(tasks: Task[]) {
  const sorted = [...tasks].sort((a, b) => startMin(a) - startMin(b));
  const laneEnd: number[] = []; // phút kết thúc của lane cuối
  const placed = sorted.map((t) => {
    const s = startMin(t);
    const e = s + (t.duration_min ?? 30);
    let lane = laneEnd.findIndex((end) => end <= s);
    if (lane === -1) {
      lane = laneEnd.length;
      laneEnd.push(e);
    } else {
      laneEnd[lane] = e;
    }
    return { task: t, lane, end: e };
  });
  return { placed, lanes: Math.max(1, laneEnd.length) };
}

export function WeekGrid({
  weekStart,
  week,
  carryover,
  onPrev,
  onNext,
  onToday,
  onOpen,
}: {
  weekStart: Date;
  week: Task[];
  carryover: Task[];
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onOpen: (id: string) => void;
}) {
  const start = startOfWeek(weekStart, { weekStartsOn: 1 });
  const end = endOfWeek(weekStart, { weekStartsOn: 1 });
  const days = useMemo(() => eachDayOfInterval({ start, end }), [start, end]);

  // Tách task cả-ngày (giờ 00:00) và task có giờ
  const allDay = week.filter((t) => startMin(t) === 0);
  const timed = week.filter((t) => startMin(t) !== 0);

  // Khoảng giờ hiển thị: tối thiểu 6→22, mở rộng nếu có task ngoài khoảng
  const { startHour, endHour } = useMemo(() => {
    let minH = 6;
    let maxH = 22;
    for (const t of timed) {
      const s = startMin(t) / 60;
      const e = s + (t.duration_min ?? 30) / 60;
      if (s < minH) minH = s;
      if (e > maxH) maxH = e;
    }
    return {
      startHour: Math.max(0, Math.floor(minH)),
      endHour: Math.min(24, Math.ceil(maxH)),
    };
  }, [timed]);

  const hours = Array.from({ length: endHour - startHour }, (_, i) => startHour + i);
  const gridH = (endHour - startHour) * HOUR_PX;
  const totalW = AXIS_W + days.length * COL_W;

  const rangeLabel = `${format(start, "dd/MM")} – ${format(end, "dd/MM")}`;

  return (
    <div className="space-y-3">
      {/* Nav tuần */}
      <div className="flex items-center justify-between px-1">
        <button onClick={onPrev} aria-label="Tuần trước" className="active-press rounded-lg border border-border p-1.5">
          <ChevronLeft className="size-4" />
        </button>
        <button onClick={onToday} className="active-press text-sm font-semibold tabular-nums">
          {rangeLabel}
        </button>
        <button onClick={onNext} aria-label="Tuần sau" className="active-press rounded-lg border border-border p-1.5">
          <ChevronRight className="size-4" />
        </button>
      </div>

      {/* Trôi từ trước */}
      {carryover.length > 0 && (
        <div className="space-y-1.5">
          <h2 className="px-1 text-xs font-semibold text-muted-foreground">
            Trôi từ trước ({carryover.length})
          </h2>
          <div className="flex flex-wrap gap-1.5 px-1">
            {carryover.map((t) => (
              <button key={t.id} onClick={() => onOpen(t.id)} className="active-press">
                <Badge variant="high" className="max-w-[200px]">
                  <span className="truncate">{t.title}</span>
                </Badge>
              </button>
            ))}
          </div>
        </div>
      )}

      {/*
        Timetable: khung cuộn 2 chiều GỌN TRONG BOX (max-h) — không tràn ra trang,
        không đẩy bottom nav. Header ngày dính trên, trục giờ dính trái khi cuộn.
      */}
      <div className="relative max-h-[65vh] overflow-auto overscroll-contain rounded-xl border border-border">
        <div style={{ width: totalW }}>
          {/* ===== Header dính (ngày + cả ngày) ===== */}
          <div className="sticky top-0 z-30 border-b border-border bg-background">
            {/* Hàng ngày */}
            <div className="flex">
              <div className="sticky left-0 z-10 shrink-0 bg-background" style={{ width: AXIS_W }} />
              {days.map((d) => (
                <div
                  key={d.toISOString()}
                  className={cn(
                    "shrink-0 border-l border-border py-1.5 text-center",
                    isToday(d) && "bg-primary/10",
                  )}
                  style={{ width: COL_W }}
                >
                  <p className="text-[11px] font-medium capitalize text-muted-foreground">
                    {format(d, "EEEEEE", { locale: vi })}
                  </p>
                  <p className={cn("text-sm font-semibold tabular-nums", isToday(d) && "text-primary")}>
                    {format(d, "dd")}
                  </p>
                </div>
              ))}
            </div>

            {/* Hàng cả ngày */}
            {allDay.length > 0 && (
              <div className="flex border-t border-border">
                <div
                  className="sticky left-0 z-10 flex shrink-0 items-center justify-end bg-background pr-1 text-[9px] text-muted-foreground"
                  style={{ width: AXIS_W }}
                >
                  cả ngày
                </div>
                {days.map((d) => {
                  const items = allDay.filter((t) => isSameDay(new Date(t.due_date), d));
                  return (
                    <div
                      key={d.toISOString()}
                      className={cn("shrink-0 space-y-1 border-l border-border p-1", isToday(d) && "bg-primary/5")}
                      style={{ width: COL_W }}
                    >
                      {items.map((t) => (
                        <button
                          key={t.id}
                          onClick={() => onOpen(t.id)}
                          className={cn(
                            "active-press block w-full truncate rounded border border-l-2 border-border bg-card px-1 py-0.5 text-left text-[10px]",
                            priorityBar[t.priority],
                            t.is_completed && "opacity-50 line-through",
                          )}
                        >
                          {t.title}
                        </button>
                      ))}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ===== Lưới giờ ===== */}
          <div className="flex">
            {/* Trục giờ (dính trái) */}
            <div className="sticky left-0 z-20 shrink-0 bg-background" style={{ width: AXIS_W }}>
              {hours.map((h) => (
                <div key={h} className="relative" style={{ height: HOUR_PX }}>
                  <span className="absolute right-1 top-0 -translate-y-1/2 text-[10px] text-muted-foreground tabular-nums">
                    {String(h).padStart(2, "0")}:00
                  </span>
                </div>
              ))}
            </div>

            {/* Cột ngày */}
            {days.map((d) => {
              const dayTasks = timed.filter((t) => isSameDay(new Date(t.due_date), d));
              const { placed, lanes } = packLanes(dayTasks);
              return (
                <div
                  key={d.toISOString()}
                  className={cn("relative shrink-0 border-l border-border", isToday(d) && "bg-primary/5")}
                  style={{ width: COL_W, height: gridH }}
                >
                  {/* Đường kẻ giờ */}
                  {hours.map((h) => (
                    <div key={h} className="border-t border-border/40" style={{ height: HOUR_PX }} />
                  ))}
                  {/* Block task */}
                  {placed.map(({ task: t, lane }) => {
                    const s = startMin(t);
                    const top = ((s - startHour * 60) / 60) * HOUR_PX;
                    const height = Math.max(((t.duration_min ?? 30) / 60) * HOUR_PX, MIN_BLOCK_PX);
                    const w = 100 / lanes;
                    return (
                      <button
                        key={t.id}
                        onClick={() => onOpen(t.id)}
                        className={cn(
                          "active-press absolute overflow-hidden rounded-md border border-l-2 border-border bg-card px-1 py-0.5 text-left",
                          priorityBar[t.priority],
                          t.is_completed && "opacity-50",
                        )}
                        style={{
                          top,
                          height,
                          left: `calc(${lane * w}% + 1px)`,
                          width: `calc(${w}% - 2px)`,
                        }}
                      >
                        <p className="text-[9px] leading-tight text-muted-foreground tabular-nums">
                          {format(new Date(t.due_date), "HH:mm")}
                        </p>
                        <p className={cn("truncate text-[10px] font-medium leading-tight", t.is_completed && "line-through")}>
                          {t.title}
                        </p>
                        {t.recurrence_rule && height > 40 && (
                          <Repeat className="size-2.5 text-muted-foreground" />
                        )}
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <p className="px-1 text-center text-[11px] text-muted-foreground">
        Cuộn ngang/dọc trong khung để xem cả tuần · chạm ô để mở
      </p>

      {week.length === 0 && carryover.length === 0 && (
        <Card className="p-4 text-center text-sm text-muted-foreground">Tuần này chưa có việc nào.</Card>
      )}
    </div>
  );
}

// tiện ích cho TasksPage
export { addWeeks };
