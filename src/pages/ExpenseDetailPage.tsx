import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { ArrowLeft, Loader2, Trash2 } from "lucide-react";
import { notify } from "@/lib/toast";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useExpense, useDeleteExpense } from "@/hooks/useExpenses";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { emojiOf } from "@/lib/constants";

const formatVnd = (n: number) => new Intl.NumberFormat("vi-VN").format(n) + "₫";

export default function ExpenseDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: e, isLoading } = useExpense(id);
  const del = useDeleteExpense();
  const isIncome = e?.kind === "income";

  const [askDelete, setAskDelete] = useState(false);

  const remove = () => {
    if (!id) return;
    del.mutate(id, {
      onSuccess: () => {
        setAskDelete(false);
        notify.success(isIncome ? "Đã xoá khoản thu" : "Đã xoá khoản chi");
        navigate("/expenses");
      },
      onError: (err) => {
        setAskDelete(false);
        notify.error("Xoá lỗi", { description: (err as Error).message });
      },
    });
  };

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-background">
      <header
        className="flex items-center gap-3 border-b border-border/60 bg-background px-4 py-3"
        style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
      >
        <button onClick={() => navigate(-1)} aria-label="Quay lại" className="active-press">
          <ArrowLeft className="size-6" />
        </button>
        <h1 className="font-semibold">Chi tiết khoản</h1>
      </header>

      <div className="space-y-5 p-4">
        {isLoading && <div className="h-40 animate-pulse rounded-xl bg-muted" />}
        {e && (
          <>
            <Card className="flex flex-col items-center gap-2 p-6 text-center">
              <div className="flex size-14 items-center justify-center rounded-full bg-secondary text-2xl">
                {emojiOf(e.category, e.kind)}
              </div>
              <Badge variant={isIncome ? "low" : "high"}>{isIncome ? "Khoản thu" : "Khoản chi"}</Badge>
              <p
                className={cn(
                  "text-3xl font-bold tabular-nums",
                  isIncome ? "text-success" : "text-foreground",
                )}
              >
                {isIncome ? "+" : "−"}
                {formatVnd(Number(e.amount))}
              </p>
            </Card>

            <Card className="divide-y divide-border/60 p-0">
              <Row label="Danh mục" value={e.category} />
              <Row
                label="Ngày"
                value={format(new Date(e.spent_date), "EEEE, dd/MM/yyyy", { locale: vi })}
              />
              {e.note && (
                <div className="space-y-1 p-4">
                  <span className="text-sm text-muted-foreground">Ghi chú</span>
                  <p className="whitespace-pre-wrap break-words">{e.note}</p>
                </div>
              )}
            </Card>

            <Button
              variant="outline"
              className="w-full text-destructive"
              onClick={() => setAskDelete(true)}
              disabled={del.isPending}
            >
              {del.isPending ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
              Xoá khoản này
            </Button>

            <ConfirmDialog
              open={askDelete}
              title={isIncome ? "Xoá khoản thu này?" : "Xoá khoản chi này?"}
              description={`${e.category} · ${formatVnd(Number(e.amount))}. Xoá rồi không khôi phục lại được.`}
              confirmLabel="Xoá"
              loading={del.isPending}
              onConfirm={remove}
              onCancel={() => setAskDelete(false)}
            />
          </>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between p-4">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}
