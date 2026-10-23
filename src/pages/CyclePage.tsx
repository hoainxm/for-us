import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { parseISO, startOfMonth } from "date-fns";
import { ArrowLeft, Flower2, Loader2, RotateCw, Settings } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { notify } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/AuthProvider";
import { useProfiles } from "@/hooks/useProfile";
import { useRealtimeInvalidate } from "@/hooks/useRealtime";
import {
  useCycleStatus,
  useCycleSubjects,
  useDeletePeriod,
  useSaveCycleSettings,
} from "@/hooks/useCycle";
import { CycleRing } from "@/components/cycle/CycleRing";
import { MonthGrid } from "@/components/cycle/MonthGrid";
import { PeriodSheet, type PeriodSheetMode } from "@/components/cycle/PeriodSheet";
import { CycleSettingsSheet } from "@/components/cycle/CycleSettingsSheet";
import { CycleOnboarding } from "@/components/cycle/CycleOnboarding";
import { fmtDay, statusFigure } from "@/components/cycle/cycleText";
import type { CycleStatus, PeriodRecord } from "@/types";

const PREF_KEY = "cycle:subject";
const readPref = () => {
  try {
    return localStorage.getItem(PREF_KEY);
  } catch {
    return null;
  }
};

export default function CyclePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const myId = user?.id;
  const { data: profiles } = useProfiles();

  const [preferred, setPreferred] = useState<string | null>(readPref);
  const { settings, mine, partner, both, subjectId, isOwner } = useCycleSubjects(myId, preferred);
  const status = useCycleStatus(subjectId ?? undefined);

  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [sheet, setSheet] = useState<PeriodSheetMode | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [toDelete, setToDelete] = useState<PeriodRecord | null>(null);
  const del = useDeletePeriod();
  const saveSettings = useSaveCycleSettings();

  // Người đồng hành thấy ngay khi người theo dõi ghi kỳ.
  useRealtimeInvalidate("cycle", [
    { table: "period_logs", queryKey: ["cycle"] },
    { table: "cycle_settings", queryKey: ["cycle"] },
  ]);

  const pick = (id: string) => {
    setPreferred(id);
    try {
      localStorage.setItem(PREF_KEY, id);
    } catch {
      /* bỏ qua */
    }
  };

  const nameOf = (id?: string | null) =>
    profiles?.find((p) => p.id === id)?.display_name || "người ấy";
  const subjectName = nameOf(subjectId);
  const title = !subjectId || isOwner ? "Chu kỳ" : `Chu kỳ của ${subjectName}`;

  const loading = settings.isLoading || (!!subjectId && status.isLoading);
  const error = settings.error || status.error;
  const st = status.data;

  // Đổi người xem -> về tháng hiện tại.
  useEffect(() => setMonth(startOfMonth(new Date())), [subjectId]);

  const confirmDelete = () => {
    if (!toDelete) return;
    del.mutate(toDelete.id, {
      onSuccess: () => {
        setToDelete(null);
        notify.success("Đã xoá kỳ");
      },
      onError: (e) => notify.error("Lỗi xoá", { description: (e as Error).message }),
    });
  };

  const openPeriod = st?.periods.find((p) => p.is_open && !p.is_estimated) ?? null;

  return (
    <div className="mx-auto h-dvh w-full max-w-md overflow-y-auto bg-background">
      <header
        className="sticky top-0 z-20 flex items-center gap-2 border-b border-border/60 bg-background/95 px-2 pb-2 backdrop-blur-lg"
        style={{ paddingTop: "max(0.5rem, env(safe-area-inset-top))" }}
      >
        <Button variant="ghost" size="icon" aria-label="Quay lại" onClick={() => navigate(-1)}>
          <ArrowLeft className="!size-6" />
        </Button>
        <h1 className="flex-1 truncate font-semibold">{title}</h1>
        {subjectId && (
          <Button variant="ghost" size="icon" aria-label="Cài đặt chu kỳ" onClick={() => setSettingsOpen(true)}>
            <Settings className="!size-5" />
          </Button>
        )}
      </header>

      <div className="space-y-6 p-4" style={{ paddingBottom: "max(2rem, env(safe-area-inset-bottom))" }}>
        {both && myId && partner && (
          <div className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1" role="tablist">
            {[myId, partner.user_id].map((id) => (
              <button
                key={id}
                role="tab"
                aria-selected={subjectId === id}
                onClick={() => pick(id)}
                className={cn(
                  "h-11 truncate rounded-lg px-2 text-sm font-medium transition-colors",
                  subjectId === id ? "bg-card shadow-sm" : "text-muted-foreground",
                )}
              >
                {id === myId ? "Của tôi" : `Của ${nameOf(id)}`}
              </button>
            ))}
          </div>
        )}

        {loading && <CycleSkeleton />}

        {!loading && error && (
          <Card className="flex flex-col items-center gap-3 p-6 text-center">
            <p className="text-sm text-muted-foreground">Không tải được chu kỳ</p>
            <Button
              variant="outline"
              onClick={() => {
                settings.refetch();
                status.refetch();
              }}
            >
              <RotateCw />
              Thử lại
            </Button>
          </Card>
        )}

        {!loading && !error && !subjectId && myId && <CycleOnboarding myId={myId} />}

        {!loading && !error && st && (
          <>
            <Hero
              st={st}
              isOwner={isOwner}
              hasOpen={!!openPeriod}
              resuming={saveSettings.isPending}
              onResume={() =>
                myId &&
                saveSettings.mutate(
                  { user_id: myId, is_tracking: true },
                  { onSuccess: () => notify.success("Đã bật lại theo dõi 🌸") },
                )
              }
              onPrimary={() =>
                setSheet(openPeriod ? { kind: "end", period: openPeriod } : { kind: "start" })
              }
            />

            <Card className="p-4">
              <MonthGrid
                month={month}
                onMonthChange={setMonth}
                periods={st.periods}
                predicted={
                  st.is_tracking && st.next_start && st.predicted_end
                    ? { from: st.next_start, to: st.predicted_end }
                    : null
                }
                today={st.today}
                onDayClick={
                  isOwner
                    ? (day, period) =>
                        setSheet(period ? { kind: "edit", period } : { kind: "start", date: day })
                    : undefined
                }
              />
            </Card>

            {st.periods.length > 0 && <Stats st={st} />}

            {st.periods.length > 0 && (
              <History periods={st.periods} onOpen={isOwner ? (p) => setSheet({ kind: "edit", period: p }) : undefined} />
            )}

            <p className="text-center text-xs text-muted-foreground">
              Dự đoán chỉ để tham khảo, không phải biện pháp tránh thai.
            </p>
          </>
        )}
      </div>

      <PeriodSheet
        mode={sheet}
        onClose={() => setSheet(null)}
        onRequestDelete={(p) => {
          setSheet(null);
          setToDelete(p);
        }}
      />

      {myId && (
        <CycleSettingsSheet
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          myId={myId}
          isOwner={isOwner}
          mine={mine}
          subjectName={subjectName}
        />
      )}

      <ConfirmDialog
        open={!!toDelete}
        title={toDelete ? `Xoá kỳ ${fmtDay(toDelete.start_date)} – ${fmtDay(toDelete.effective_end)}?` : ""}
        description="Dự đoán sẽ được tính lại từ các kỳ còn lại."
        confirmLabel="Xoá"
        loading={del.isPending}
        onCancel={() => setToDelete(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}

function Hero({
  st,
  isOwner,
  hasOpen,
  resuming,
  onResume,
  onPrimary,
}: {
  st: CycleStatus;
  isOwner: boolean;
  hasOpen: boolean;
  resuming: boolean;
  onResume: () => void;
  onPrimary: () => void;
}) {
  const fig = statusFigure(st);
  const progress =
    st.status === "in_period" || st.status === "overdue" || st.status === "due_today"
      ? 1
      : st.cycle_day
        ? st.cycle_day / st.avg_cycle
        : 0;

  return (
    <section className="space-y-4">
      <CycleRing progress={st.status === "not_tracking" ? 0 : progress} tone={st.status === "overdue" ? "muted" : "primary"}>
        <span
          className={cn(
            "font-bold leading-none tabular-nums",
            fig.big.length > 4 ? "text-3xl" : "text-[40px]",
            st.status === "overdue" ? "text-muted-foreground" : "text-foreground",
          )}
        >
          {fig.big}
        </span>
        <span className="mt-1 text-xs text-muted-foreground">{fig.label}</span>
      </CycleRing>

      {st.is_tracking && st.next_start && st.status !== "in_period" && (
        <p className="text-center text-sm text-muted-foreground">
          Kỳ tới dự kiến <span className="font-semibold text-foreground">{fmtDay(st.next_start)}</span> · nhắc
          trước {st.settings.lead_days} ngày
        </p>
      )}
      {st.status === "in_period" && st.next_start && (
        <p className="text-center text-sm text-muted-foreground">
          Kỳ sau dự kiến <span className="font-semibold text-foreground">{fmtDay(st.next_start)}</span>
        </p>
      )}
      {st.status === "overdue" && isOwner && (
        <p className="text-center text-sm text-muted-foreground">
          Nếu kỳ đã bắt đầu, ghi lại để dự đoán chính xác hơn
        </p>
      )}

      {isOwner && st.status === "not_tracking" && (
        <Button size="lg" className="w-full" onClick={onResume} disabled={resuming}>
          {resuming && <Loader2 className="animate-spin" />}
          Bật lại theo dõi
        </Button>
      )}
      {isOwner && st.status !== "not_tracking" && (
        <Button size="lg" className="w-full" onClick={onPrimary}>
          {hasOpen ? "Ghi kết thúc kỳ" : "Ghi bắt đầu kỳ"}
        </Button>
      )}
    </section>
  );
}

function Stats({ st }: { st: CycleStatus }) {
  return (
    <Card className="p-4">
      <div className="grid grid-cols-3 divide-x divide-border text-center">
        <Stat value={`${st.avg_cycle}`} label="Chu kỳ TB (ngày)" />
        <Stat value={`${st.avg_period}`} label="Hành kinh TB (ngày)" />
        <Stat value={`${st.cycles_used}`} label="Chu kỳ đã tính" />
      </div>
      {(st.irregular || st.cycles_excluded > 0) && (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3 text-xs text-muted-foreground">
          {st.irregular && <Badge variant="secondary">Chưa đều</Badge>}
          {st.cycles_excluded > 0 && <span>{st.cycles_excluded} chu kỳ không tính (quá dài hoặc quá ngắn)</span>}
        </div>
      )}
    </Card>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="px-1">
      <p className="text-2xl font-bold tabular-nums">{value}</p>
      <p className="text-[11px] leading-tight text-muted-foreground">{label}</p>
    </div>
  );
}

function History({ periods, onOpen }: { periods: PeriodRecord[]; onOpen?: (p: PeriodRecord) => void }) {
  const [all, setAll] = useState(false);
  const shown = all ? periods : periods.slice(0, 6);
  return (
    <section>
      <h2 className="mb-2 text-sm font-semibold text-muted-foreground">Các kỳ gần đây</h2>
      <Card className="divide-y divide-border">
        {shown.map((p) => {
          const len =
            (parseISO(p.effective_end).getTime() - parseISO(p.start_date).getTime()) / 86_400_000 + 1;
          const Row = onOpen ? "button" : "div";
          return (
            <Row
              key={p.id}
              {...(onOpen ? { type: "button" as const, onClick: () => onOpen(p) } : {})}
              className={cn(
                "flex min-h-12 w-full items-center gap-3 px-4 py-2 text-left text-sm",
                onOpen && "active-press",
              )}
            >
              <Flower2 className="size-4 shrink-0 text-primary" />
              <span className="flex-1 tabular-nums">
                {fmtDay(p.start_date)} – {p.is_open && !p.is_estimated ? "nay" : fmtDay(p.effective_end)}
              </span>
              <span className="text-muted-foreground tabular-nums">{Math.round(len)} ngày</span>
              {p.is_estimated && <Badge variant="outline">Ước tính</Badge>}
            </Row>
          );
        })}
      </Card>
      {periods.length > 6 && (
        <button
          type="button"
          onClick={() => setAll((v) => !v)}
          className="mt-1 min-h-11 text-sm font-medium text-primary"
        >
          {all ? "Thu gọn" : "Xem tất cả"}
        </button>
      )}
    </section>
  );
}

function CycleSkeleton() {
  return (
    <div className="space-y-6">
      <div className="mx-auto size-40 animate-pulse rounded-full bg-muted" />
      <div className="h-12 animate-pulse rounded-xl bg-muted" />
      <div className="grid grid-cols-7 gap-2 rounded-xl border border-border p-4">
        {Array.from({ length: 35 }).map((_, i) => (
          <div key={i} className="mx-auto size-9 animate-pulse rounded-full bg-muted" />
        ))}
      </div>
    </div>
  );
}
