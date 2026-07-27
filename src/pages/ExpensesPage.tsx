import { useMemo } from "react";
import { format, isSameMonth } from "date-fns";
import { vi } from "date-fns/locale";
import { Trash2, Wallet } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { useExpenses, useDeleteExpense } from "@/hooks/useExpenses";
import { useProfiles } from "@/hooks/useProfile";
import { EXPENSE_CATEGORY_EMOJI } from "@/lib/constants";
import type { Expense } from "@/types";

const formatVnd = (n: number) => new Intl.NumberFormat("vi-VN").format(n) + "₫";

export default function ExpensesPage() {
  const { data, isLoading, isError, error, refetch } = useExpenses();
  const { data: profiles } = useProfiles();
  const del = useDeleteExpense();
  const nameOf = (id: string | null) => (id ? profiles?.find((p) => p.id === id) : undefined);

  const now = new Date();
  const monthTotal = useMemo(
    () =>
      (data ?? [])
        .filter((e) => isSameMonth(new Date(e.spent_date), now))
        .reduce((s, e) => s + Number(e.amount), 0),
    [data], // eslint-disable-line react-hooks/exhaustive-deps
  );

  // Group theo ngày
  const groups = useMemo(() => {
    const map = new Map<string, Expense[]>();
    for (const e of data ?? []) {
      const arr = map.get(e.spent_date) ?? [];
      arr.push(e);
      map.set(e.spent_date, arr);
    }
    return [...map.entries()];
  }, [data]);

  return (
    <div>
      <PageHeader title="Chi tiêu" subtitle="Ghi lại chi tiêu chung" />

      <div className="space-y-5 p-4">
        {/* Tổng tháng */}
        <Card className="flex items-center gap-4 bg-gradient-to-br from-primary/10 to-card p-5">
          <div className="flex size-12 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <Wallet className="size-6" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">
              Tháng {format(now, "MM/yyyy")}
            </p>
            <p className="text-2xl font-bold tabular-nums">{formatVnd(monthTotal)}</p>
          </div>
        </Card>

        {isLoading && (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        )}
        {isError && (
          <Card className="space-y-2 p-4 text-center">
            <p className="text-sm text-destructive">Lỗi: {(error as Error).message}</p>
            <button onClick={() => refetch()} className="text-sm font-medium text-primary underline">
              Thử lại
            </button>
          </Card>
        )}
        {data && data.length === 0 && (
          <div className="py-16 text-center text-sm text-muted-foreground">
            Chưa có khoản chi nào. Bấm (+) để thêm 💸
          </div>
        )}

        {groups.map(([date, items]) => {
          const dayTotal = items.reduce((s, e) => s + Number(e.amount), 0);
          return (
            <section key={date} className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <h2 className="text-sm font-semibold text-muted-foreground">
                  {format(new Date(date), "EEEE, dd/MM", { locale: vi })}
                </h2>
                <span className="text-xs font-medium text-muted-foreground tabular-nums">
                  {formatVnd(dayTotal)}
                </span>
              </div>
              <Card className="divide-y divide-border/60 p-0">
                {items.map((e) => {
                  const payer = nameOf(e.paid_by);
                  return (
                    <div key={e.id} className="flex items-center gap-3 p-3">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary text-lg">
                        {EXPENSE_CATEGORY_EMOJI[e.category] ?? "✨"}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{e.category}</p>
                        {e.note && (
                          <p className="truncate text-xs text-muted-foreground">{e.note}</p>
                        )}
                      </div>
                      {payer && (
                        <Avatar
                          name={payer.display_name}
                          src={payer.avatar_url}
                          className="size-6"
                        />
                      )}
                      <span className="shrink-0 font-semibold tabular-nums">
                        {formatVnd(Number(e.amount))}
                      </span>
                      <button
                        onClick={() =>
                          del.mutate(e.id, {
                            onError: (err) =>
                              toast.error("Xoá lỗi", { description: (err as Error).message }),
                          })
                        }
                        aria-label="Xoá"
                        className="active-press text-muted-foreground"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  );
                })}
              </Card>
            </section>
          );
        })}
      </div>
    </div>
  );
}
