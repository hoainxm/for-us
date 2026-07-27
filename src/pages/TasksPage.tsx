import { useNavigate } from "react-router-dom";
import { isBefore, startOfDay } from "date-fns";
import { Repeat, Flame, RotateCcw, ChevronRight, Check } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { SwipeableRow } from "@/components/tasks/SwipeableRow";
import {
  useCompleteTask,
  useDoneTasks,
  useTodoTasks,
  useUncompleteTask,
} from "@/hooks/useTasks";
import { useProfiles } from "@/hooks/useProfile";
import type { Priority, Task } from "@/types";

const priorityLabel: Record<Priority, string> = { high: "Cao", medium: "Vừa", low: "Thấp" };
const recurrenceLabel: Record<string, string> = {
  daily: "Hằng ngày",
  weekly: "Hằng tuần",
  monthly: "Hằng tháng",
};

export default function TasksPage() {
  const navigate = useNavigate();
  const todo = useTodoTasks();
  const done = useDoneTasks();
  const { data: profiles } = useProfiles();
  const complete = useCompleteTask();
  const uncomplete = useUncompleteTask();

  const nameOf = (id: string) => profiles?.find((p) => p.id === id);

  const onComplete = (task: Task) =>
    complete.mutate(task, {
      onSuccess: ({ spawned }) =>
        toast.success("Đã xong! 🎉", {
          description: spawned ? "Đã tạo lượt lặp lại tiếp theo" : undefined,
        }),
      onError: (e) => toast.error("Lỗi", { description: (e as Error).message }),
    });

  return (
    <div>
      <PageHeader
        title="Công việc"
        subtitle={
          todo.isLoading
            ? "Đang tải..."
            : `${todo.data?.length ?? 0} việc cần làm hôm nay`
        }
      />

      <div className="space-y-6 p-4">
        {/* TODO */}
        <section className="space-y-3">
          {todo.isLoading && <SkeletonList />}
          {todo.isError && (
            <ErrorBox message={(todo.error as Error).message} onRetry={() => todo.refetch()} />
          )}
          {todo.data && todo.data.length === 0 && <EmptyState />}

          <div className="stagger space-y-3">
            {todo.data?.map((t) => (
              <SwipeableRow
                key={t.id}
                onComplete={() => onComplete(t)}
                onTap={() => navigate(`/tasks/${t.id}`)}
              >
                <TaskCard task={t} assignee={nameOf(t.assigned_to)} />
              </SwipeableRow>
            ))}
          </div>

          <p className="px-1 text-center text-xs text-muted-foreground">
            Quẹt phải để hoàn thành · chạm để xem chi tiết
          </p>
        </section>

        {/* DONE */}
        {done.data && done.data.length > 0 && (
          <section className="space-y-3">
            <h2 className="px-1 text-sm font-semibold text-muted-foreground">
              Đã xong ({done.data.length})
            </h2>
            {done.data.map((t) => (
              <Card key={t.id} className="flex items-center gap-3 p-3 opacity-60">
                <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-success text-white">
                  <Check className="size-4" strokeWidth={3} />
                </div>
                <button
                  onClick={() => navigate(`/tasks/${t.id}`)}
                  className="min-w-0 flex-1 text-left"
                >
                  <p className="truncate font-medium line-through">{t.title}</p>
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

function TaskCard({ task, assignee }: { task: Task; assignee?: { display_name: string; avatar_url: string | null } }) {
  const overdue = isBefore(startOfDay(new Date(task.due_date)), startOfDay(new Date()));

  return (
    <Card className="flex items-center gap-3 p-3">
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{task.title}</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <Badge variant={task.priority}>
            {task.priority === "high" && <Flame className="size-3" />}
            {priorityLabel[task.priority]}
          </Badge>
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

function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-2 py-16 text-center">
      <div className="flex size-16 items-center justify-center rounded-full bg-success/12">
        <Check className="size-8 text-success" />
      </div>
      <p className="font-medium">Hết việc rồi 🎉</p>
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
