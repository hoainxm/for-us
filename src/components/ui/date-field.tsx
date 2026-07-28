import { format, parseISO } from "date-fns";
import { Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

// Hiển thị ngày dd/MM/yyyy (ép format), native picker ẩn overlay để bấm chọn.
// value: "yyyy-MM-dd" (date) hoặc "yyyy-MM-ddTHH:mm" (khi withTime).
export function DateField({
  value,
  onChange,
  withTime = false,
  placeholder = "Chọn ngày",
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  withTime?: boolean;
  placeholder?: string;
  className?: string;
}) {
  let display = placeholder;
  if (value) {
    try {
      display = format(parseISO(value), withTime ? "dd/MM/yyyy HH:mm" : "dd/MM/yyyy");
    } catch {
      display = value;
    }
  }

  return (
    <div className={cn("relative", className)}>
      <div className="pointer-events-none flex h-11 items-center gap-2 rounded-lg border border-input bg-card px-3 text-sm">
        <Calendar className="size-4 text-muted-foreground" />
        <span className={value ? "" : "text-muted-foreground"}>{display}</span>
      </div>
      <input
        type={withTime ? "datetime-local" : "date"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="absolute inset-0 size-full cursor-pointer opacity-0"
        aria-label={placeholder}
      />
    </div>
  );
}
