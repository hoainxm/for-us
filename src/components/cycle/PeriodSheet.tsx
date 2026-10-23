import { useEffect, useState } from "react";
import { differenceInCalendarDays, format, parseISO, subDays } from "date-fns";
import { Loader2 } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { DateField } from "@/components/ui/date-field";
import { Label } from "@/components/ui/label";
import { notify } from "@/lib/toast";
import { cn } from "@/lib/utils";
import {
  cycleErrorMessage,
  useDeletePeriod,
  useLogPeriodStart,
  useUpdatePeriod,
} from "@/hooks/useCycle";
import type { PeriodRecord } from "@/types";
import { fmtDay, todayISO } from "./cycleText";

export type PeriodSheetMode =
  | { kind: "start"; date?: string }
  | { kind: "end"; period: PeriodRecord }
  | { kind: "edit"; period: PeriodRecord };

/** SC3 — ghi bắt đầu / ghi kết thúc / sửa kỳ. */
export function PeriodSheet({
  mode,
  onClose,
  onRequestDelete,
}: {
  mode: PeriodSheetMode | null;
  onClose: () => void;
  onRequestDelete: (p: PeriodRecord) => void;
}) {
  const today = todayISO();
  const yesterday = format(subDays(new Date(), 1), "yyyy-MM-dd");

  const logStart = useLogPeriodStart();
  const update = useUpdatePeriod();
  const del = useDeletePeriod();

  const [date, setDate] = useState(today);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!mode) return;
    setError(null);
    if (mode.kind === "start") setDate(mode.date ?? today);
    if (mode.kind === "end") setDate(today);
    if (mode.kind === "edit") {
      setStart(mode.period.start_date);
      setEnd(mode.period.end_date ?? "");
    }
  }, [mode, today]);

  const busy = logStart.isPending || update.isPending;

  const save = async () => {
    if (!mode) return;
    setError(null);
    try {
      if (mode.kind === "start") {
        const res = await logStart.mutateAsync(date);
        onClose();
        notify.success("Đã ghi bắt đầu kỳ", {
          description: res.auto_closed_end
            ? `Kỳ trước được ghi kết thúc ${fmtDay(res.auto_closed_end)} (ước tính)`
            : undefined,
          action: {
            label: "Hoàn tác",
            onClick: () => del.mutate(res.id),
          },
        });
      } else if (mode.kind === "end") {
        await update.mutateAsync({ id: mode.period.id, end_date: date });
        onClose();
        const len = differenceInCalendarDays(parseISO(date), parseISO(mode.period.start_date)) + 1;
        notify.success(`Đã ghi kết thúc · ${len} ngày`);
      } else {
        if (!start) {
          setError("Cần có ngày bắt đầu");
          return;
        }
        await update.mutateAsync({ id: mode.period.id, start_date: start, end_date: end || null });
        onClose();
        notify.success("Đã cập nhật");
      }
    } catch (e) {
      setError(cycleErrorMessage(e));
    }
  };

  const title =
    mode?.kind === "start" ? "Ghi bắt đầu kỳ" : mode?.kind === "end" ? "Ghi kết thúc kỳ" : "Sửa kỳ";

  const endPreview =
    mode?.kind === "end" && date >= mode.period.start_date
      ? `Bắt đầu ${fmtDay(mode.period.start_date)} · sẽ là ${
          differenceInCalendarDays(parseISO(date), parseISO(mode.period.start_date)) + 1
        } ngày`
      : undefined;

  return (
    <Sheet
      open={!!mode}
      onClose={onClose}
      title={title}
      description={endPreview}
      busy={busy}
      footer={
        <Button size="lg" className="w-full" onClick={save} disabled={busy}>
          {busy && <Loader2 className="animate-spin" />}
          Lưu
        </Button>
      }
    >
      {mode && mode.kind !== "edit" && (
        <div className="space-y-3">
          <div className="flex gap-2">
            <Chip active={date === today} onClick={() => setDate(today)}>
              Hôm nay
            </Chip>
            <Chip active={date === yesterday} onClick={() => setDate(yesterday)}>
              Hôm qua
            </Chip>
          </div>
          <DateField
            value={date}
            onChange={(v) => v && setDate(v)}
            max={today}
            min={mode.kind === "end" ? mode.period.start_date : undefined}
            placeholder="Ngày khác"
          />
        </div>
      )}

      {mode?.kind === "edit" && (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Bắt đầu</Label>
            <DateField value={start} onChange={setStart} max={today} />
          </div>
          <div className="space-y-1.5">
            <Label>Kết thúc</Label>
            <DateField value={end} onChange={setEnd} min={start} max={today} placeholder="Chưa kết thúc" />
            {end && (
              <button
                type="button"
                onClick={() => setEnd("")}
                className="text-xs text-muted-foreground underline-offset-4 hover:underline"
              >
                Bỏ ngày kết thúc
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => onRequestDelete(mode.period)}
            className="flex min-h-11 items-center text-sm font-medium text-destructive"
          >
            Xoá kỳ
          </button>
        </div>
      )}

      {error && (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {error}
        </p>
      )}
    </Sheet>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "active-press h-11 flex-1 rounded-lg border text-sm font-medium transition-colors",
        active ? "border-primary bg-primary/10 text-primary" : "border-input bg-card",
      )}
    >
      {children}
    </button>
  );
}
