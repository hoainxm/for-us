import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { addMinutes, format, isBefore, isToday, startOfDay, endOfDay } from "date-fns";
import { vi } from "date-fns/locale";
import {
  Repeat,
  RotateCcw,
  ChevronRight,
  Check,
  MessageCircle,
  Bell,
  List,
  CalendarClock,
  CalendarDays,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { SwipeableRow } from "@/components/tasks/SwipeableRow";
import { DateStrip } from "@/components/tasks/DateStrip";
import { WeekGrid, addWeeks } from "@/components/tasks/WeekGrid";
import { startOfWeek } from "date-fns";
import { cn } from "@/lib/utils";
import { useCompleteTask, useDayTasks, useUncompleteTask, useWeekTasks } from "@/hooks/useTasks";
import { useProfiles } from "@/hooks/useProfile";
import type { Task } from "@/types";

const recurrenceLabel: Record<string, string> = {
  daily: "Hằng ngày",
  weekly: "Hằng tuần",
  monthly: "Hằng tháng",
};

type View = "list" | "timeline" | "week";

export default function TasksPage() {
  const navigate = useNavigate();
  const [day, setDay] = useState<Date>(() => startOfDay(new Date()));
  const [weekAnchor, setWeekAnchor] = useState<Date>(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [view, setView] = useState<View>("list");
  const q = useDayTasks(day);
  const wq = useWeekTasks(weekAnchor);
  const { data: profiles } = useProfiles();
  const complete = useCompleteTask();
  const uncomplete = useUncompleteTask();

  const nameOf = (id: string) => profiles?.find((p) => p.id === id);
  const dayLabel = isToday(day) ? "Hôm nay" : format(day, "EEEE, dd/MM", { locale: vi });

  const onComplete = (task: Task) =>
    complete.mutate(task, {
      onSuccess: ({ spawned }) =>
        toast.success("Đã xong! 🎉", {
          description: spawned ? "Đã tạo lượt lặp lại tiếp theo" : undefined,
        }),
      onError: (e) => toast.error("Lỗi", { description: (e as Error).message }),
    });

  const todo = q.data?.todo ?? [];
  const done = q.data?.done ?? [];

  // Chia việc theo mốc ngày đang xem
  const dayStart = startOfDay(day);
  const dayEnd = endOfDay(day);
  const onDay = todo
    .filter((t) => {
      const d = new Date(t.due_date);
      return d >= dayStart && d <= dayEnd;
    })
    .sort((a, b) => a.due_date.localeCompare(b.due_date));
  const earlier = todo.filter((t) => new Date(t.due_date) < dayStart);

  return (
    <div>
      <PageHeader title="Công việc" subtitle={view === "week" ? "Tuần" : dayLabel} />
      {view !== "week" && <DateStrip value={day} onChange={(d) => setDay(startOfDay(d))} />}

      {/* Toggle List / Lịch / Tuần */}
      <div className="flex gap-2 px-4 pb-1 pt-2">
        <ViewToggle active={view === "list"} onClick={() => setView("list")} icon={List} label="Danh sách" />
        <ViewToggle active={view === "timeline"} onClick={() => setView("timeline")} icon={CalendarClock} label="Lịch" />
        <ViewToggle active={view === "week"} onClick={() => setView("week")} icon={CalendarDays} label="Tuần" />
      </div>

      {/* ===== WEEK (thời khóa biểu) ===== */}
      {view === "week" && (
        <div className="p-4 pt-2">
          {wq.isLoading && <SkeletonList />}
          {wq.isError && <ErrorBox message={(wq.error as Error).message} onRetry={() => wq.refetch()} />}
          {wq.data && (
            <WeekGrid
              weekStart={weekAnchor}
              week={wq.data.week}
              carryover={wq.data.carryover}
              onPrev={() => setWeekAnchor((w) => addWeeks(w, -1))}
              onNext={() => setWeekAnchor((w) => addWeeks(w, 1))}
              onToday={() => setWeekAnchor(startOfWeek(new Date(), { weekStartsOn: 1 }))}
              onOpen={(id) => navigate(`/tasks/${id}`)}
            />
          )}
        </div>
      )}

      <div className={cn("space-y-6 p-4 pt-2", view === "week" && "hidden")}>
        {q.isLoading && <SkeletonList />}
        {q.isError && <ErrorBox message={(q.error as Error).message} onRetry={() => q.refetch()} />}
        {q.data && todo.length === 0 && <EmptyTodo isToday={isToday(day)} />}

        {/* ===== LIST ===== */}
        {view === "list" && todo.length > 0 && (
          <section className="space-y-3">
            <div className="stagger space-y-3">
              {todo.map((t) => (
                <SwipeableRow key={t.id} onComplete={() => onComplete(t)} onTap={() => navigate(`/tasks/${t.id}`)}>
                  <TaskCard task={t} assignee={nameOf(t.assigned_to)} />
                </SwipeableRow>
              ))}
            </div>
            <p className="px-1 text-center text-xs text-muted-foreground">
              Quẹt trái để hoàn thành · chạm để xem chi tiết
            </p>
          </section>
        )}

        {/* ===== TIMELINE ===== */}
        {view === "timeline" && todo.length > 0 && (
          <section className="space-y-4">
            {earlier.length > 0 && (
              <div className="space-y-2">
                <h2 className="px-1 text-sm font-semibold text-muted-foreground">Trôi từ trước</h2>
                {earlier.map((t) => (
                  <TaskCard
                    key={t.id}
                    task={t}
                    assignee={nameOf(t.assigned_to)}
                    onClick={() => navigate(`/tasks/${t.id}`)}
                  />
                ))}
              </div>
            )}
            <div className="stagger">
              {onDay.map((t, i) => (
                <TimelineItem
                  key={t.id}
                  task={t}
                  assignee={nameOf(t.assigned_to)}
                  last={i === onDay.length - 1}
                  onOpen={() => navigate(`/tasks/${t.id}`)}
                  onComplete={() => onComplete(t)}
                />
              ))}
            </div>
          </section>
        )}

        {/* ===== DONE ===== */}
        {done.length > 0 && (
          <section className="space-y-3">
            <h2 className="px-1 text-sm font-semibold text-muted-foreground">
              Đã xong {isToday(day) ? "hôm nay" : "ngày này"} ({done.length})
            </h2>
            {done.map((t) => (
              <Card key={t.id} className="flex items-center gap-3 p-3 opacity-60">
                <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-success text-white">
                  <Check className="size-4" strokeWidth={3} />
                </div>
                <button onClick={() => navigate(`/tasks/${t.id}`)} className="min-w-0 flex-1 text-left">
                  <p className="truncate font-medium line-through">{t.title}</p>
                  {t.completed_at && (
                    <p className="text-[11px] text-muted-foreground">
                      Xong lúc {format(new Date(t.completed_at), "HH:mm")}
                    </p>
                  )}
                </button>
                <button onClick={() => uncomplete.mutate(t.id)} aria-label="Hoàn tác" className="active-press text-muted-foreground">
                  <RotateCcw className="size-4" />
                </button>
              </Card>
            ))}
          </section>
        )}
      </div>
    </div>
  );
}

function ViewToggle({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof List;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "active-press flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors",
        active ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground",
      )}
    >
      <Icon className="size-4" />
      {label}
    </button>
  );
}

function TaskCard({
  task,
  assignee,
  onClick,
}: {
  task: Task;
  assignee?: { display_name: string; avatar_url: string | null };
  onClick?: () => void;
}) {
  const overdue = isBefore(startOfDay(new Date(task.due_date)), startOfDay(new Date()));
  const inner = (
    <Card className="flex items-center gap-3 p-3">
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{task.title}</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          {task.tags.map((tag) => (
            <Badge key={tag} variant="secondary">
              {tag}
            </Badge>
          ))}
          {task.recurrence_rule && (
            <Badge variant="outline">
              <Repeat className="size-3" />
              {recurrenceLabel[task.recurrence_rule]}
            </Badge>
          )}
          {task.remind_before_min != null && (
            <Badge variant="outline">
              <Bell className="size-3" />
            </Badge>
          )}
          {overdue && <Badge variant="high">Trôi từ hôm trước</Badge>}
          {!!task.comment_count && (
            <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
              <MessageCircle className="size-3.5" />
              {task.comment_count}
            </span>
          )}
        </div>
      </div>
      <Avatar name={assignee?.display_name} src={assignee?.avatar_url} className="size-8" />
      <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
    </Card>
  );
  return onClick ? (
    <button onClick={onClick} className="active-press block w-full text-left">
      {inner}
    </button>
  ) : (
    inner
  );
}

function TimelineItem({
  task,
  assignee,
  last,
  onOpen,
  onComplete,
}: {
  task: Task;
  assignee?: { display_name: string; avatar_url: string | null };
  last: boolean;
  onOpen: () => void;
  onComplete: () => void;
}) {
  const start = new Date(task.due_date);
  const end = task.duration_min ? addMinutes(start, task.duration_min) : null;

  return (
    <div className="flex gap-3">
      {/* Cột giờ */}
      <div className="w-12 shrink-0 pt-3 text-right">
        <p className="text-sm font-semibold tabular-nums">{format(start, "HH:mm")}</p>
        {end && <p className="text-[10px] text-muted-foreground tabular-nums">{format(end, "HH:mm")}</p>}
      </div>

      {/* Đường + chấm */}
      <div className="flex flex-col items-center pt-3.5">
        <button
          onClick={onComplete}
          aria-label="Hoàn thành"
          className="active-press z-10 flex size-5 items-center justify-center rounded-full border-2 border-primary bg-background text-transparent hover:text-primary"
        >
          <Check className="size-3" strokeWidth={3} />
        </button>
        {!last && <div className="w-0.5 flex-1 bg-border" />}
      </div>

      {/* Nội dung */}
      <button onClick={onOpen} className="active-press mb-3 flex-1 text-left">
        <Card className="p-3">
          <p className="font-medium">{task.title}</p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {task.duration_min && <Badge variant="secondary">{task.duration_min}′</Badge>}
            {task.tags.map((tag) => (
              <Badge key={tag} variant="secondary">
                {tag}
              </Badge>
            ))}
            {task.recurrence_rule && (
              <Badge variant="outline">
                <Repeat className="size-3" />
                {recurrenceLabel[task.recurrence_rule]}
              </Badge>
            )}
            {task.remind_before_min != null && (
              <Badge variant="outline">
                <Bell className="size-3" />
              </Badge>
            )}
            <Avatar name={assignee?.display_name} src={assignee?.avatar_url} className="ml-auto size-6" />
          </div>
        </Card>
      </button>
    </div>
  );
}

function SkeletonList() {
  return (
    <div className="space-y-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-[68px] animate-pulse rounded-xl bg-muted" />
      ))}
    </div>
  );
}

function EmptyTodo({ isToday }: { isToday: boolean }) {
  return (
    <div className="flex flex-col items-center gap-2 py-14 text-center">
      <div className="flex size-16 items-center justify-center rounded-full bg-success/12">
        <Check className="size-8 text-success" />
      </div>
      <p className="font-medium">{isToday ? "Hết việc rồi 🎉" : "Không có việc tồn"}</p>
      <p className="text-sm text-muted-foreground">Cả hai nghỉ ngơi thôi.</p>
    </div>
  );
}

function ErrorBox({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <Card className="space-y-2 p-4 text-center">
      <p className="text-sm text-destructive">Lỗi tải việc: {message}</p>
      <button onClick={onRetry} className="text-sm font-medium text-primary underline">
        Thử lại
      </button>
    </Card>
  );
}
