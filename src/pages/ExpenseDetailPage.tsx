import { useNavigate, useParams } from "react-router-dom";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { ArrowLeft, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useExpense, useDeleteExpense } from "@/hooks/useExpenses";
import { useProfiles } from "@/hooks/useProfile";
import { EXPENSE_CATEGORY_EMOJI } from "@/lib/constants";

const formatVnd = (n: number) => new Intl.NumberFormat("vi-VN").format(n) + "₫";

export default function ExpenseDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: e, isLoading } = useExpense(id);
  const { data: profiles } = useProfiles();
  const del = useDeleteExpense();
  const payer = e?.paid_by ? profiles?.find((p) => p.id === e.paid_by) : undefined;
  const isIncome = e?.kind === "income";

  const remove = () => {
    if (!id) return;
    del.mutate(id, {
      onSuccess: () => {
        toast.success("Đã xoá");
        navigate("/expenses");
      },
      onError: (err) => toast.error("Xoá lỗi", { description: (err as Error).message }),
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
                {isIncome ? "💰" : EXPENSE_CATEGORY_EMOJI[e.category] ?? "✨"}
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
              {payer && (
                <div className="flex items-center justify-between p-4">
                  <span className="text-sm text-muted-foreground">Người trả</span>
                  <span className="flex items-center gap-2 text-sm font-medium">
                    <Avatar name={payer.display_name} src={payer.avatar_url} className="size-6" />
                    {payer.display_name}
                  </span>
                </div>
              )}
              {e.note && (
                <div className="space-y-1 p-4">
                  <span className="text-sm text-muted-foreground">Ghi chú</span>
                  <p className="whitespace-pre-wrap break-words">{e.note}</p>
                </div>
              )}
            </Card>

            <Button variant="outline" className="w-full text-destructive" onClick={remove} disabled={del.isPending}>
              {del.isPending ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
              Xoá khoản này
            </Button>
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
