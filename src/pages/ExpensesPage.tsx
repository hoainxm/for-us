import { useMemo, useState } from "react";
import { format, isSameMonth } from "date-fns";
import { vi } from "date-fns/locale";
import { ArrowDownLeft, ArrowUpRight, Trash2, Wallet } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
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

  const [personFilter, setPersonFilter] = useState<string | null>(null); // null = tất cả
  const now = new Date();

  const filtered = useMemo(
    () => (data ?? []).filter((e) => !personFilter || e.paid_by === personFilter),
    [data, personFilter],
  );

  // Tổng thu/chi tháng này (theo filter)
  const { income, expense } = useMemo(() => {
    let income = 0;
    let expense = 0;
    for (const e of filtered) {
      if (!isSameMonth(new Date(e.spent_date), now)) continue;
      if (e.kind === "income") income += Number(e.amount);
      else expense += Number(e.amount);
    }
    return { income, expense };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered]);
  const balance = income - expense;

  const groups = useMemo(() => {
    const map = new Map<string, Expense[]>();
    for (const e of filtered) {
      const arr = map.get(e.spent_date) ?? [];
      arr.push(e);
      map.set(e.spent_date, arr);
    }
    return [...map.entries()];
  }, [filtered]);

  return (
    <div>
      <PageHeader title="Chi tiêu" subtitle="Quản lý thu chi chung" />

      {/* Lọc theo người */}
      <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 pb-1 pt-2">
        <FilterChip active={personFilter === null} onClick={() => setPersonFilter(null)}>
          Tất cả
        </FilterChip>
        {profiles?.map((p) => (
          <FilterChip key={p.id} active={personFilter === p.id} onClick={() => setPersonFilter(p.id)}>
            {p.display_name}
          </FilterChip>
        ))}
      </div>

      <div className="space-y-5 p-4 pt-2">
        {/* Summary tháng */}
        <Card className="space-y-3 bg-gradient-to-br from-primary/10 to-card p-5">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Wallet className="size-4" /> Tháng {format(now, "MM/yyyy")}
          </div>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Số dư</p>
              <p
                className={cn(
                  "text-2xl font-bold tabular-nums",
                  balance >= 0 ? "text-success" : "text-destructive",
                )}
              >
                {balance >= 0 ? "" : "−"}
                {formatVnd(Math.abs(balance))}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <div className="flex flex-1 items-center gap-2 rounded-lg bg-success/10 px-3 py-2">
              <ArrowDownLeft className="size-4 text-success" />
              <div>
                <p className="text-[10px] text-muted-foreground">Thu</p>
                <p className="text-sm font-semibold tabular-nums text-success">{formatVnd(income)}</p>
              </div>
            </div>
            <div className="flex flex-1 items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2">
              <ArrowUpRight className="size-4 text-destructive" />
              <div>
                <p className="text-[10px] text-muted-foreground">Chi</p>
                <p className="text-sm font-semibold tabular-nums text-destructive">{formatVnd(expense)}</p>
              </div>
            </div>
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
        {data && filtered.length === 0 && (
          <div className="py-16 text-center text-sm text-muted-foreground">
            Chưa có khoản nào. Bấm (+) để thêm 💸
          </div>
        )}

        {groups.map(([date, items]) => {
          const net = items.reduce(
            (s, e) => s + (e.kind === "income" ? Number(e.amount) : -Number(e.amount)),
            0,
          );
          return (
            <section key={date} className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <h2 className="text-sm font-semibold text-muted-foreground">
                  {format(new Date(date), "EEEE, dd/MM/yyyy", { locale: vi })}
                </h2>
                <span
                  className={cn(
                    "text-xs font-medium tabular-nums",
                    net >= 0 ? "text-success" : "text-destructive",
                  )}
                >
                  {net >= 0 ? "+" : "−"}
                  {formatVnd(Math.abs(net))}
                </span>
              </div>
              <Card className="divide-y divide-border/60 p-0">
                {items.map((e) => {
                  const payer = nameOf(e.paid_by);
                  const isIncome = e.kind === "income";
                  return (
                    <div key={e.id} className="flex items-center gap-3 p-3">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary text-lg">
                        {isIncome ? "💰" : EXPENSE_CATEGORY_EMOJI[e.category] ?? "✨"}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{e.category}</p>
                        {e.note && <p className="truncate text-xs text-muted-foreground">{e.note}</p>}
                      </div>
                      {payer && (
                        <Avatar name={payer.display_name} src={payer.avatar_url} className="size-6" />
                      )}
                      <span
                        className={cn(
                          "shrink-0 font-semibold tabular-nums",
                          isIncome ? "text-success" : "text-foreground",
                        )}
                      >
                        {isIncome ? "+" : "−"}
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

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button onClick={onClick} className="shrink-0">
      <Badge variant={active ? "default" : "secondary"} className="whitespace-nowrap px-3 py-1">
        {children}
      </Badge>
    </button>
  );
}
