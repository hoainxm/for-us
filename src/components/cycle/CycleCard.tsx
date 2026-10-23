import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, Flower2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/AuthProvider";
import { useProfiles } from "@/hooks/useProfile";
import { useCycleStatus, useCycleSubjects } from "@/hooks/useCycle";
import { fmtDay, statusFigure } from "./cycleText";

const HIDE_KEY = "cycle:invite-hidden";

/** SC1 — thẻ chu kỳ ghim đầu tab Sự kiện (cùng khung với EventCard). */
export function CycleCard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: profiles } = useProfiles();
  const { settings, subjectId, isOwner } = useCycleSubjects(user?.id, readPref());
  const status = useCycleStatus(subjectId ?? undefined);
  const [hidden, setHidden] = useState(() => {
    try {
      return localStorage.getItem(HIDE_KEY) === "1";
    } catch {
      return false;
    }
  });

  if (settings.isLoading || (subjectId && status.isLoading)) {
    return <div className="h-20 animate-pulse rounded-xl bg-muted" />;
  }
  if (settings.error || status.error) return null; // không chặn danh sách sự kiện

  // Chưa ai theo dõi -> thẻ mời (ẩn được)
  if (!subjectId) {
    if (hidden) return null;
    return (
      <Card className="flex items-center gap-4 bg-gradient-to-br from-primary/8 to-card p-4">
        <button onClick={() => navigate("/cycle")} className="active-press flex min-w-0 flex-1 items-center gap-4 text-left">
          <IconBox />
          <div className="min-w-0 flex-1">
            <p className="font-semibold">Theo dõi chu kỳ</p>
            <p className="text-xs text-muted-foreground">Biết trước ngày tới kỳ, cả hai cùng chuẩn bị</p>
          </div>
        </button>
        <button
          onClick={() => {
            setHidden(true);
            try {
              localStorage.setItem(HIDE_KEY, "1");
            } catch {
              /* bỏ qua */
            }
          }}
          className="flex min-h-11 shrink-0 items-center px-1 text-xs text-muted-foreground"
        >
          Ẩn
        </button>
      </Card>
    );
  }

  const st = status.data;
  if (!st) return null;
  if (!isOwner && st.status === "not_tracking" && st.periods.length === 0) return null;

  const fig = statusFigure(st);
  const name = profiles?.find((p) => p.id === subjectId)?.display_name || "người ấy";
  const subtitle =
    st.status === "not_tracking"
      ? isOwner
        ? "Đã tắt theo dõi"
        : "Không theo dõi"
      : st.status === "in_period"
        ? "Đang hành kinh"
        : st.next_start
          ? `Dự kiến ${fmtDay(st.next_start)}`
          : "Chưa có dữ liệu";

  return (
    <button onClick={() => navigate("/cycle")} className="active-press block w-full text-left">
      <Card
        className={cn(
          "flex items-center gap-4 p-4",
          st.status === "in_period" ? "bg-gradient-to-br from-primary/15 to-card" : "bg-gradient-to-br from-primary/8 to-card",
          st.status === "not_tracking" && "opacity-70",
        )}
      >
        <IconBox />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{isOwner ? "Chu kỳ" : `Chu kỳ của ${name}`}</p>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
        {st.status !== "not_tracking" && st.status !== "no_data" && (
          <div className="shrink-0 text-right">
            <p
              className={cn(
                "font-bold leading-none tabular-nums",
                fig.compactBig.length > 3 ? "text-lg" : "text-2xl",
                st.status === "overdue" ? "text-muted-foreground" : "text-primary",
              )}
            >
              {fig.compactBig}
            </p>
            <p className="text-[10px] text-muted-foreground">{fig.compactLabel}</p>
          </div>
        )}
        <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
      </Card>
    </button>
  );
}

function IconBox() {
  return (
    <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary">
      <Flower2 className="size-6" />
    </div>
  );
}

function readPref() {
  try {
    return localStorage.getItem("cycle:subject");
  } catch {
    return null;
  }
}
