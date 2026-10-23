import { useState } from "react";
import { ChevronDown, Flower2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DateField } from "@/components/ui/date-field";
import { Label } from "@/components/ui/label";
import { notify } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { cycleErrorMessage, useStartTracking } from "@/hooks/useCycle";
import { Stepper } from "./Stepper";
import { todayISO } from "./cycleText";

/** SC2 biến thể onboarding — NV1: bật theo dõi trong 1 bước. */
export function CycleOnboarding({ myId }: { myId: string }) {
  const start = useStartTracking();
  const [lastStart, setLastStart] = useState("");
  const [custom, setCustom] = useState(false);
  const [cfg, setCfg] = useState({ cycle_length: 28, period_length: 5, lead_days: 2 });
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    if (!lastStart) {
      setError("Chọn ngày bắt đầu kỳ gần nhất");
      return;
    }
    setError(null);
    start.mutate(
      { userId: myId, lastStart, ...cfg },
      {
        onSuccess: () => notify.success(`Sẽ nhắc trước ${cfg.lead_days} ngày 🌸`),
        onError: (e) => setError(cycleErrorMessage(e)),
      },
    );
  };

  return (
    <section className="space-y-6 pt-4">
      <div className="space-y-2 text-center">
        <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-primary/12 text-primary">
          <Flower2 className="size-8" />
        </div>
        <h2 className="text-xl font-bold">Theo dõi chu kỳ</h2>
        <p className="text-sm text-muted-foreground">Biết trước ngày tới kỳ, cả hai cùng chuẩn bị.</p>
      </div>

      <div className="space-y-1.5">
        <Label>Kỳ gần nhất bắt đầu ngày</Label>
        <DateField value={lastStart} onChange={setLastStart} max={todayISO()} />
      </div>

      <div>
        <button
          type="button"
          onClick={() => setCustom((v) => !v)}
          aria-expanded={custom}
          className="flex min-h-11 items-center gap-1 text-sm font-medium text-primary"
        >
          Tuỳ chỉnh
          <ChevronDown className={cn("size-4 transition-transform", custom && "rotate-180")} />
        </button>
        {custom && (
          <div className="space-y-1">
            <Stepper
              label="Độ dài chu kỳ"
              value={cfg.cycle_length}
              min={21}
              max={45}
              onChange={(v) => setCfg((c) => ({ ...c, cycle_length: v }))}
            />
            <Stepper
              label="Số ngày hành kinh"
              value={cfg.period_length}
              min={2}
              max={10}
              onChange={(v) => setCfg((c) => ({ ...c, period_length: v }))}
            />
            <Stepper
              label="Nhắc trước"
              value={cfg.lead_days}
              min={1}
              max={7}
              onChange={(v) => setCfg((c) => ({ ...c, lead_days: v }))}
            />
          </div>
        )}
      </div>

      <div className="space-y-3">
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          Dự đoán chỉ để tham khảo, không phải biện pháp tránh thai. Người ấy sẽ xem được chu kỳ và nhận
          nhắc cùng bạn.
        </p>
        <Button size="lg" className="w-full" onClick={submit} disabled={start.isPending}>
          {start.isPending && <Loader2 className="animate-spin" />}
          Bắt đầu theo dõi
        </Button>
      </div>
    </section>
  );
}
