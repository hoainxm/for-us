import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { notify } from "@/lib/toast";
import { useSaveCycleSettings } from "@/hooks/useCycle";
import { notificationsSupported } from "@/pwa/notifications";
import type { CycleSettings } from "@/types";
import { Stepper } from "./Stepper";

const DEFAULTS = { cycle_length: 28, period_length: 5, lead_days: 2, notify_enabled: true };

/** SC4 — cài đặt. Chủ dữ liệu: 5 trường; người đồng hành: chỉ công tắc nhận nhắc. */
export function CycleSettingsSheet({
  open,
  onClose,
  myId,
  isOwner,
  mine,
  subjectName,
}: {
  open: boolean;
  onClose: () => void;
  myId: string;
  isOwner: boolean;
  mine: CycleSettings | undefined;
  subjectName: string;
}) {
  const save = useSaveCycleSettings();
  const [draft, setDraft] = useState({ ...DEFAULTS, is_tracking: false });
  const [askStop, setAskStop] = useState(false);

  useEffect(() => {
    if (open) setDraft({ ...DEFAULTS, is_tracking: false, ...mine });
  }, [open, mine]);

  const submit = (patch: Partial<typeof draft> = {}) => {
    const next = { ...draft, ...patch };
    const payload = isOwner
      ? { user_id: myId, ...next }
      : // Người đồng hành chỉ lưu công tắc nhận nhắc, không bao giờ bật theo dõi hộ.
        { user_id: myId, notify_enabled: next.notify_enabled, is_tracking: mine?.is_tracking ?? false };
    save.mutate(payload, {
      onSuccess: () => {
        onClose();
        notify.success(next.is_tracking || !isOwner ? "Đã lưu" : "Đã tắt theo dõi", {
          description: isOwner && !next.is_tracking ? "Dữ liệu vẫn được giữ lại" : undefined,
        });
      },
      onError: (e) => notify.error("Lỗi lưu", { description: (e as Error).message }),
    });
  };

  const onSave = () => {
    if (isOwner && mine?.is_tracking && !draft.is_tracking) {
      setAskStop(true);
      return;
    }
    submit();
  };

  return (
    <>
      <Sheet
        open={open}
        onClose={onClose}
        title="Cài đặt chu kỳ"
        busy={save.isPending}
        footer={
          <Button size="lg" className="w-full" onClick={onSave} disabled={save.isPending}>
            {save.isPending && <Loader2 className="animate-spin" />}
            Lưu
          </Button>
        }
      >
        <div className="divide-y divide-border">
          {isOwner && (
            <div className="space-y-1 pb-3">
              <Stepper
                label="Nhắc trước"
                value={draft.lead_days}
                min={1}
                max={7}
                onChange={(v) => setDraft((d) => ({ ...d, lead_days: v }))}
              />
              <Stepper
                label="Độ dài chu kỳ thường"
                value={draft.cycle_length}
                min={21}
                max={45}
                onChange={(v) => setDraft((d) => ({ ...d, cycle_length: v }))}
              />
              <Stepper
                label="Số ngày hành kinh thường"
                value={draft.period_length}
                min={2}
                max={10}
                onChange={(v) => setDraft((d) => ({ ...d, period_length: v }))}
              />
            </div>
          )}

          <label className="flex min-h-14 items-center justify-between gap-3 py-2">
            <span className="text-sm">
              {isOwner ? "Nhận nhắc của tôi" : `Nhắc khi sắp tới kỳ của ${subjectName}`}
            </span>
            <Switch
              checked={draft.notify_enabled}
              onCheckedChange={(v) => setDraft((d) => ({ ...d, notify_enabled: v }))}
            />
          </label>

          {isOwner && (
            <label className="flex min-h-14 items-center justify-between gap-3 py-2">
              <span className="text-sm">Theo dõi chu kỳ</span>
              <Switch
                checked={draft.is_tracking}
                onCheckedChange={(v) => setDraft((d) => ({ ...d, is_tracking: v }))}
              />
            </label>
          )}

          {notificationsSupported() && Notification.permission !== "granted" && (
            <p className="py-3 text-sm text-muted-foreground">
              Máy này chưa bật thông báo.{" "}
              <Link to="/profile" className="font-medium text-primary underline-offset-4 hover:underline">
                Bật thông báo
              </Link>{" "}
              để nhận nhắc.
            </p>
          )}
        </div>
      </Sheet>

      <ConfirmDialog
        open={askStop}
        title="Tắt theo dõi?"
        description="Dữ liệu vẫn được giữ, sẽ không còn nhắc cho cả hai."
        confirmLabel="Tắt theo dõi"
        loading={save.isPending}
        onCancel={() => setAskStop(false)}
        onConfirm={() => {
          setAskStop(false);
          submit();
        }}
      />
    </>
  );
}
