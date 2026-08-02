import { useMemo } from "react";
import { format, getHours, getMinutes, isSameDay, isToday } from "date-fns";
import { vi } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Repeat } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Task } from "@/types";

const HOUR_PX = 60; // cao mỗi giờ
const AXIS_W = 44; // rộng cột trục giờ
const MIN_BLOCK_PX = 26;
const MAX_LANES = 2; // >2 task chồng giờ -> gộp thành 1 khối "N việc"

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

const fmtHM = (min: number) =>
  `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;

type LayoutItem =
  | { kind: "task"; task: Task; lane: number; lanes: number; top: number; height: number }
  | { kind: "more"; count: number; label: string; priority: Task["priority"]; top: number; height: number };

// Bố cục 1 ngày: gom cụm task chồng giờ; cụm ≤2 lane -> xếp cạnh nhau,
// cụm >2 lane -> gộp 1 khối "N việc" (tránh chẻ ô thành sliver không đọc được).
function layoutDay(tasks: Task[], startHour: number): LayoutItem[] {
  const sorted = [...tasks].sort((a, b) => startMin(a) - startMin(b));
  const topOf = (min: number) => ((min - startHour * 60) / 60) * HOUR_PX;
  const heightOf = (dur: number) => Math.max((dur / 60) * HOUR_PX, MIN_BLOCK_PX);
  const items: LayoutItem[] = [];

  let i = 0;
  while (i < sorted.length) {
    const cluster: Task[] = [sorted[i]];
    let maxEnd = startMin(sorted[i]) + (sorted[i].duration_min ?? 30);
    let j = i + 1;
    while (j < sorted.length && startMin(sorted[j]) < maxEnd) {
      cluster.push(sorted[j]);
      maxEnd = Math.max(maxEnd, startMin(sorted[j]) + (sorted[j].duration_min ?? 30));
      j++;
    }
    const laneEnd: number[] = [];
    const laneOf = cluster.map((t) => {
      const s = startMin(t);
      const e = s + (t.duration_min ?? 30);
      let lane = laneEnd.findIndex((end) => end <= s);
      if (lane === -1) {
        lane = laneEnd.length;
        laneEnd.push(e);
      } else {
        laneEnd[lane] = e;
      }
      return lane;
    });
    const lanes = Math.max(1, laneEnd.length);

    if (lanes <= MAX_LANES) {
      cluster.forEach((t, k) => {
        items.push({
          kind: "task",
          task: t,
          lane: laneOf[k],
          lanes,
          top: topOf(startMin(t)),
          height: heightOf(t.duration_min ?? 30),
        });
      });
    } else {
      const minStart = startMin(cluster[0]);
      const priority: Task["priority"] = cluster.some((t) => t.priority === "high")
        ? "high"
        : cluster.some((t) => t.priority === "medium")
          ? "medium"
          : "low";
      items.push({
        kind: "more",
        count: cluster.length,
        label: fmtHM(minStart),
        priority,
        top: topOf(minStart),
        height: heightOf(maxEnd - minStart),
      });
    }
    i = j;
  }
  return items;
}

// Grid lịch dạng cụm N ngày (N do trang cha quyết theo bề ngang màn hình).
// Cột lấp đầy bề ngang -> KHÔNG cuộn ngang; chỉ cuộn dọc theo giờ.
export function WeekGrid({
  days,
  tasks,
  carryover,
  onPrev,
  onNext,
  onToday,
  onOpen,
  onOpenDay,
}: {
  days: Date[];
  tasks: Task[];
  carryover: Task[];
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onOpen: (id: string) => void;
  onOpenDay?: (d: Date) => void;
}) {
  const allDay = tasks.filter((t) => startMin(t) === 0);
  const timed = tasks.filter((t) => startMin(t) !== 0);

  // Khoảng giờ: tối thiểu 6→22, mở rộng nếu có task ngoài khoảng
  const { startHour, endHour } = useMemo(() => {
    let minH = 6;
    let maxH = 22;
    for (const t of timed) {
      const s = startMin(t) / 60;
      const e = s + (t.duration_min ?? 30) / 60;
      if (s < minH) minH = s;
      if (e > maxH) maxH = e;
    }
    return { startHour: Math.max(0, Math.floor(minH)), endHour: Math.min(24, Math.ceil(maxH)) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks]);

  const hours = Array.from({ length: endHour - startHour }, (_, i) => startHour + i);
  const gridH = (endHour - startHour) * HOUR_PX;

  const rangeLabel =
    days.length > 0 ? `${format(days[0], "dd/MM")} – ${format(days[days.length - 1], "dd/MM")}` : "";

  return (
    <div className="space-y-3">
      {/* Nav cụm ngày */}
      <div className="flex items-center justify-between px-1">
        <button onClick={onPrev} aria-label="Trước" className="active-press rounded-lg border border-border p-1.5">
          <ChevronLeft className="size-4" />
        </button>
        <button onClick={onToday} className="active-press text-sm font-semibold tabular-nums">
          {rangeLabel}
        </button>
        <button onClick={onNext} aria-label="Sau" className="active-press rounded-lg border border-border p-1.5">
          <ChevronRight className="size-4" />
        </button>
      </div>

      {/* Trôi từ trước */}
      {carryover.length > 0 && (
        <div className="space-y-1.5">
          <h2 className="px-1 text-xs font-semibold text-muted-foreground">Trôi từ trước ({carryover.length})</h2>
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

      {/* Khung lịch: cột lấp đầy, chỉ cuộn dọc; header ngày dính trên, trục giờ dính trái */}
      <div className="themed-scroll relative max-h-[65vh] overflow-y-auto overscroll-contain rounded-xl border border-border">
        {/* Header dính */}
        <div className="sticky top-0 z-30 border-b border-border bg-background">
          <div className="flex">
            <div className="shrink-0" style={{ width: AXIS_W }} />
            {days.map((d) => (
              <div
                key={d.toISOString()}
                className={cn("min-w-0 flex-1 border-l border-border py-1.5 text-center", isToday(d) && "bg-primary/10")}
              >
                <p className="text-[11px] font-medium capitalize text-muted-foreground">
                  {format(d, "EEEE", { locale: vi })}
                </p>
                <p className={cn("text-sm font-semibold tabular-nums", isToday(d) && "text-primary")}>
                  {format(d, "dd/MM")}
                </p>
              </div>
            ))}
          </div>

          {allDay.length > 0 && (
            <div className="flex border-t border-border">
              <div
                className="flex shrink-0 items-center justify-end pr-1 text-[9px] text-muted-foreground"
                style={{ width: AXIS_W }}
              >
                cả ngày
              </div>
              {days.map((d) => {
                const items = allDay.filter((t) => isSameDay(new Date(t.due_date), d));
                return (
                  <div
                    key={d.toISOString()}
                    className={cn("min-w-0 flex-1 space-y-1 border-l border-border p-1", isToday(d) && "bg-primary/5")}
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

        {/* Lưới giờ */}
        <div className="flex">
          {/* Trục giờ */}
          <div className="sticky left-0 z-20 shrink-0 bg-background" style={{ width: AXIS_W }}>
            {hours.map((h) => (
              <div key={h} className="relative" style={{ height: HOUR_PX }}>
                <span className="absolute right-1 top-0 -translate-y-1/2 text-[10px] text-muted-foreground tabular-nums">
                  {String(h).padStart(2, "0")}:00
                </span>
              </div>
            ))}
          </div>

          {/* Cột ngày (fluid) */}
          {days.map((d) => {
            const dayTasks = timed.filter((t) => isSameDay(new Date(t.due_date), d));
            const items = layoutDay(dayTasks, startHour);
            return (
              <div
                key={d.toISOString()}
                className={cn("relative min-w-0 flex-1 border-l border-border", isToday(d) && "bg-primary/5")}
                style={{ height: gridH }}
              >
                {hours.map((h) => (
                  <div key={h} className="border-t border-border/40" style={{ height: HOUR_PX }} />
                ))}
                {items.map((it, idx) => {
                  if (it.kind === "more") {
                    return (
                      <button
                        key={`more-${idx}`}
                        onClick={() => onOpenDay?.(d)}
                        className={cn(
                          "active-press absolute inset-x-0.5 flex flex-col justify-center overflow-hidden rounded-md border border-l-2 border-dashed border-primary/60 bg-primary/10 px-1.5 py-1 text-left leading-tight",
                          priorityBar[it.priority],
                        )}
                        style={{ top: it.top, height: it.height }}
                      >
                        <span className="text-[11px] font-semibold text-primary">{it.count} việc</span>
                        <span className="text-[9px] text-primary/80 tabular-nums">từ {it.label} · xem</span>
                      </button>
                    );
                  }
                  const t = it.task;
                  const w = 100 / it.lanes;
                  const showTime = it.height >= 34;
                  const titleLines = it.height >= 52 ? "line-clamp-2" : "truncate";
                  return (
                    <button
                      key={t.id}
                      onClick={() => onOpen(t.id)}
                      className={cn(
                        "active-press absolute flex flex-col overflow-hidden rounded-md border border-l-2 border-border bg-card px-1.5 py-1 text-left leading-tight",
                        priorityBar[t.priority],
                        t.is_completed && "opacity-50",
                      )}
                      style={{
                        top: it.top,
                        height: it.height,
                        left: `calc(${it.lane * w}% + 1px)`,
                        width: `calc(${w}% - 2px)`,
                      }}
                    >
                      {showTime && (
                        <span className="flex items-center gap-0.5 text-[9px] text-muted-foreground tabular-nums">
                          {format(new Date(t.due_date), "HH:mm")}
                          {t.recurrence_rule && <Repeat className="size-2.5" />}
                        </span>
                      )}
                      <span className={cn("text-[11px] font-medium", titleLines, t.is_completed && "line-through")}>
                        {t.title}
                      </span>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      <p className="px-1 text-center text-[11px] text-muted-foreground">
        Dùng ‹ › đổi cụm ngày · ô “N việc” = nhiều việc trùng giờ, chạm để mở ngày
      </p>

      {tasks.length === 0 && carryover.length === 0 && (
        <Card className="p-4 text-center text-sm text-muted-foreground">Mấy ngày này chưa có việc nào.</Card>
      )}
    </div>
  );
}
