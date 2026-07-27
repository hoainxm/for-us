import { differenceInCalendarDays, format } from "date-fns";
import { vi } from "date-fns/locale";
import { CalendarHeart, Cake, Gift, MapPin, Heart } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useEvents } from "@/hooks/useEvents";
import type { CoupleEvent } from "@/types";

const iconFor = (title: string) => {
  const t = title.toLowerCase();
  if (t.includes("sinh nhật")) return Cake;
  if (t.includes("đi") || t.includes("chuyến")) return MapPin;
  if (t.includes("yêu") || t.includes("kỷ niệm")) return Heart;
  return Gift;
};

export default function EventsPage() {
  const { data, isLoading } = useEvents();
  const today = new Date();

  const enriched = (data ?? [])
    .map((e) => ({ ...e, diff: differenceInCalendarDays(new Date(e.event_date), today) }))
    .sort((a, b) => Math.abs(a.diff) - Math.abs(b.diff));

  return (
    <div>
      <PageHeader title="Sự kiện" subtitle="Đếm từng ngày bên nhau" />
      <div className="space-y-3 p-4">
        {isLoading && (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-20 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        )}
        {data && data.length === 0 && (
          <div className="py-16 text-center text-sm text-muted-foreground">
            Chưa có sự kiện. Bấm (+) thêm ngày kỷ niệm 💗
          </div>
        )}
        <div className="stagger space-y-3">
          {enriched.map((e) => (
            <EventCard key={e.id} event={e} />
          ))}
        </div>
      </div>
    </div>
  );
}

function EventCard({ event }: { event: CoupleEvent & { diff: number } }) {
  const Icon = iconFor(event.title);
  const isAnniversary = event.type === "anniversary";
  const days = Math.abs(event.diff);
  const label = isAnniversary
    ? event.diff <= 0
      ? "ngày đã qua"
      : "ngày nữa tới mốc"
    : event.diff >= 0
      ? "ngày nữa"
      : "ngày trước";

  return (
    <Card
      className={cn(
        "flex items-center gap-4 p-4",
        isAnniversary
          ? "bg-gradient-to-br from-accent to-card"
          : "bg-gradient-to-br from-primary/8 to-card",
      )}
    >
      <div
        className={cn(
          "flex size-12 shrink-0 items-center justify-center rounded-xl",
          isAnniversary
            ? "bg-accent-foreground/10 text-accent-foreground"
            : "bg-primary/12 text-primary",
        )}
      >
        <Icon className="size-6" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">{event.title}</p>
        <p className="flex items-center gap-1 text-xs text-muted-foreground">
          <CalendarHeart className="size-3.5" />
          {format(new Date(event.event_date), "dd MMMM yyyy", { locale: vi })}
        </p>
      </div>

      <div className="shrink-0 text-right">
        <p
          className={cn(
            "text-2xl font-bold leading-none tabular-nums",
            isAnniversary ? "text-accent-foreground" : "text-primary",
          )}
        >
          {days}
        </p>
        <p className="text-[10px] text-muted-foreground">{label}</p>
      </div>
    </Card>
  );
}
