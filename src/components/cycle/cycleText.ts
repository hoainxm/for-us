import { format, parseISO } from "date-fns";
import type { CycleStatus } from "@/types";

/** dd/MM, thêm năm khi khác năm nay. */
export function fmtDay(iso: string | null | undefined, today = new Date()): string {
  if (!iso) return "—";
  const d = parseISO(iso);
  return format(d, d.getFullYear() === today.getFullYear() ? "dd/MM" : "dd/MM/yyyy");
}

export const todayISO = () => format(new Date(), "yyyy-MM-dd");

/** Số lớn + nhãn cho hero (trang) và thẻ (tab Sự kiện) — 1 nguồn chữ cho cả 2 nơi. */
export function statusFigure(st: CycleStatus): { big: string; label: string; compactBig: string; compactLabel: string } {
  switch (st.status) {
    case "in_period":
      return {
        big: `Ngày ${st.period_day}`,
        label: "đang hành kinh",
        compactBig: String(st.period_day),
        compactLabel: "ngày thứ",
      };
    case "upcoming":
      return {
        big: String(st.days_until),
        label: "ngày nữa tới kỳ",
        compactBig: String(st.days_until),
        compactLabel: "ngày nữa",
      };
    case "due_today":
      return { big: "Hôm nay", label: "ngày dự kiến tới kỳ", compactBig: "Hôm nay", compactLabel: "dự kiến" };
    case "overdue":
      return {
        big: `+${st.days_overdue}`,
        label: "ngày quá dự kiến",
        compactBig: String(st.days_overdue),
        compactLabel: "ngày quá dự kiến",
      };
    case "no_data":
      return { big: "—", label: "chưa có dữ liệu", compactBig: "—", compactLabel: "chưa có dữ liệu" };
    default:
      return { big: "—", label: "đã tắt theo dõi", compactBig: "—", compactLabel: "đã tắt" };
  }
}
