import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { format, isBefore, isToday, startOfDay } from "date-fns";
import { vi } from "date-fns/locale";
import { Repeat, RotateCcw, ChevronRight, Check } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { SwipeableRow } from "@/components/tasks/SwipeableRow";
import { DateStrip } from "@/components/tasks/DateStrip";
import {
  useCompleteTask,
  useDayTasks,
  useUncompleteTask,
} from "@/hooks/useTasks";
import { useProfiles } from "@/hooks/useProfile";
import type { Task } from "@/types";

const recurrenceLabel: Record<string, string> = {
  daily: "Hằng ngày",
  weekly: "Hằng tuần",
  monthly: "Hằng tháng",
};

export default function TasksPage() {
  const navigate = useNavigate();
  const [day, setDay] = useState<Date>(() => startOfDay(new Date()));
  const q = useDayTasks(day);
  const { data: profiles } = useProfiles();
  const complete = useCompleteTask();
  const uncomplete = useUncompleteTask();

  const nameOf = (id: string) => profiles?.find((p) => p.id === id);
  const dayLabel = isToday(day)
    ? "Hôm nay"
    : format(day, "EEEE, dd/MM", { locale: vi });

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

  return (
    <div>
      <PageHeader title="Công việc" subtitle={dayLabel} />
      <DateStrip value={day} onChange={(d) => setDay(startOfDay(d))} />

      <div className="space-y-6 p-4 pt-1">
        {/* TODO */}
        <section className="space-y-3">
          {q.isLoading && <SkeletonList />}
          {q.isError && (
            <ErrorBox message={(q.error as Error).message} onRetry={() => q.refetch()} />
          )}
          {q.data && todo.length === 0 && <EmptyTodo isToday={isToday(day)} />}

          <div className="stagger space-y-3">
            {todo.map((t) => (
              <SwipeableRow
                key={t.id}
                onComplete={() => onComplete(t)}
                onTap={() => navigate(`/tasks/${t.id}`)}
              >
                <TaskCard task={t} assignee={nameOf(t.assigned_to)} />
              </SwipeableRow>
            ))}
          </div>

          {todo.length > 0 && (
            <p className="px-1 text-center text-xs text-muted-foreground">
              Quẹt phải để hoàn thành · chạm để xem chi tiết
            </p>
          )}
        </section>

        {/* DONE trong ngày */}
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
                <button
                  onClick={() => navigate(`/tasks/${t.id}`)}
                  className="min-w-0 flex-1 text-left"
                >
                  <p className="truncate font-medium line-through">{t.title}</p>
                  {t.completed_at && (
                    <p className="text-[11px] text-muted-foreground">
                      Xong lúc {format(new Date(t.completed_at), "HH:mm")}
                    </p>
                  )}
                </button>
                <button
                  onClick={() => uncomplete.mutate(t.id)}
                  aria-label="Hoàn tác"
                  className="active-press text-muted-foreground"
                >
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

function TaskCard({
  task,
  assignee,
}: {
  task: Task;
  assignee?: { display_name: string; avatar_url: string | null };
}) {
  const overdue = isBefore(startOfDay(new Date(task.due_date)), startOfDay(new Date()));

  return (
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
          {overdue && <Badge variant="high">Trôi từ hôm trước</Badge>}
        </div>
      </div>
      <Avatar name={assignee?.display_name} src={assignee?.avatar_url} className="size-8" />
      <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
    </Card>
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
