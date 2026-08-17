import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format, isSameMonth } from "date-fns";
import { vi } from "date-fns/locale";
import { ArrowDownLeft, ArrowUpRight, ChevronRight, Wallet } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useExpenses } from "@/hooks/useExpenses";
import { useProfiles } from "@/hooks/useProfile";
import { emojiOf } from "@/lib/constants";
import type { Expense, ExpenseKind } from "@/types";

const formatVnd = (n: number) => new Intl.NumberFormat("vi-VN").format(n) + "₫";

type KindFilter = "all" | ExpenseKind;

export default function ExpensesPage() {
  const navigate = useNavigate();
  const { data, isLoading, isError, error, refetch } = useExpenses();
  const { data: profiles } = useProfiles();
  const nameOf = (id: string | null) => (id ? profiles?.find((p) => p.id === id) : undefined);

  const [personFilter, setPersonFilter] = useState<string | null>(null);
  const [kindFilter, setKindFilter] = useState<KindFilter>("all");
  const now = new Date();

  const filtered = useMemo(
    () =>
      (data ?? []).filter(
        (e) =>
          (!personFilter || e.paid_by === personFilter) &&
          (kindFilter === "all" || e.kind === kindFilter),
      ),
    [data, personFilter, kindFilter],
  );

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

  // Chi theo danh mục trong tháng — thấy ngay tiền đi đâu nhiều nhất.
  const byCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of filtered) {
      if (e.kind === "income") continue;
      if (!isSameMonth(new Date(e.spent_date), now)) continue;
      map.set(e.category, (map.get(e.category) ?? 0) + Number(e.amount));
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered]);

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
          Mọi người
        </FilterChip>
        {profiles?.map((p) => (
          <FilterChip key={p.id} active={personFilter === p.id} onClick={() => setPersonFilter(p.id)}>
            {p.display_name}
          </FilterChip>
        ))}
      </div>

      {/* Lọc thu/chi */}
      <div className="flex gap-2 px-4 pb-1">
        <FilterChip active={kindFilter === "all"} onClick={() => setKindFilter("all")}>
          Tất cả
        </FilterChip>
        <FilterChip active={kindFilter === "income"} onClick={() => setKindFilter("income")}>
          Thu
        </FilterChip>
        <FilterChip active={kindFilter === "expense"} onClick={() => setKindFilter("expense")}>
          Chi
        </FilterChip>
      </div>

      <div className="space-y-5 p-4 pt-2">
        {/* Summary tháng */}
        <Card className="space-y-3 bg-gradient-to-br from-primary/10 to-card p-5">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Wallet className="size-4" /> Tháng {format(now, "MM/yyyy")}
          </div>
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

        {byCategory.length > 0 && (
          <Card className="space-y-3 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Chi theo danh mục
            </p>
            <div className="space-y-2.5">
              {byCategory.map(([cat, amt]) => (
                <div key={cat} className="space-y-1">
                  <div className="flex items-center gap-2 text-sm">
                    <span>{emojiOf(cat)}</span>
                    <span className="min-w-0 flex-1 truncate">{cat}</span>
                    <span className="shrink-0 font-medium tabular-nums">{formatVnd(amt)}</span>
                    <span className="w-9 shrink-0 text-right text-xs text-muted-foreground tabular-nums">
                      {expense > 0 ? Math.round((amt / expense) * 100) : 0}%
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full bg-primary/70"
                      style={{ width: `${expense > 0 ? (amt / expense) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

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
                    <button
                      key={e.id}
                      onClick={() => navigate(`/expenses/${e.id}`)}
                      className="active-press flex w-full items-center gap-3 p-3 text-left"
                    >
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary text-lg">
                        {emojiOf(e.category, e.kind)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">{e.category}</p>
                        {e.note && (
                          <p className="whitespace-pre-wrap break-words text-sm text-muted-foreground">
                            {e.note}
                          </p>
                        )}
                        {payer && (
                          <span className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
                            <Avatar name={payer.display_name} src={payer.avatar_url} className="size-4" />
                            {payer.display_name}
                          </span>
                        )}
                      </div>
                      <span
                        className={cn(
                          "shrink-0 font-semibold tabular-nums",
                          isIncome ? "text-success" : "text-foreground",
                        )}
                      >
                        {isIncome ? "+" : "−"}
                        {formatVnd(Number(e.amount))}
                      </span>
                      <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                    </button>
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
