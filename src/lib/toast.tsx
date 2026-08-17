// Toast dùng chung — thay cho toast.* thô của sonner để mọi thông báo cùng một ngôn ngữ hình ảnh.
import { toast as sonner } from "sonner";
import { AlertTriangle, CheckCircle2, Info, Loader2, X, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type Variant = "success" | "error" | "warning" | "info" | "loading";

interface NotifyOptions {
  description?: string;
  duration?: number;
  action?: { label: string; onClick: () => void };
  /** Gọi khi người dùng tự đóng toast (nút X). */
  onDismiss?: () => void;
  id?: string | number;
}

const VARIANTS: Record<
  Variant,
  { icon: typeof CheckCircle2; ring: string; bar: string; haptic: number | number[] | null }
> = {
  success: {
    icon: CheckCircle2,
    ring: "bg-success/15 text-success",
    bar: "bg-success",
    haptic: 12,
  },
  error: {
    icon: XCircle,
    ring: "bg-destructive/15 text-destructive",
    bar: "bg-destructive",
    haptic: [16, 60, 16],
  },
  warning: {
    icon: AlertTriangle,
    ring: "bg-warning/20 text-warning",
    bar: "bg-warning",
    haptic: 10,
  },
  info: { icon: Info, ring: "bg-primary/15 text-primary", bar: "bg-primary", haptic: null },
  loading: { icon: Loader2, ring: "bg-muted text-muted-foreground", bar: "bg-primary", haptic: null },
};

const buzz = (pattern: number | number[] | null) => {
  if (!pattern) return;
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch {
      /* thiết bị không hỗ trợ — bỏ qua */
    }
  }
};

function ToastCard({
  variant,
  title,
  description,
  action,
  duration,
  onDismiss,
}: {
  variant: Variant;
  title: string;
  description?: string;
  action?: NotifyOptions["action"];
  duration: number;
  onDismiss: () => void;
}) {
  const v = VARIANTS[variant];
  const Icon = v.icon;
  return (
    <div
      role="status"
      aria-live={variant === "error" ? "assertive" : "polite"}
      className="animate-toast-in pointer-events-auto relative w-full overflow-hidden rounded-2xl border border-border/70 bg-card/85 shadow-lg shadow-black/10 backdrop-blur-xl"
    >
      <div className="flex items-start gap-3 p-3.5 pr-10">
        <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-full", v.ring)}>
          <Icon className={cn("size-5", variant === "loading" && "animate-spin")} />
        </span>
        <div className="min-w-0 flex-1 pt-0.5">
          <p className="text-sm font-semibold leading-snug text-foreground">{title}</p>
          {description && (
            <p className="mt-0.5 break-words text-xs leading-relaxed text-muted-foreground">
              {description}
            </p>
          )}
          {action && (
            <button
              onClick={() => {
                action.onClick();
                onDismiss();
              }}
              className="active-press mt-2 rounded-lg bg-secondary px-3 py-1.5 text-xs font-semibold text-secondary-foreground"
            >
              {action.label}
            </button>
          )}
        </div>
      </div>

      <button
        onClick={onDismiss}
        aria-label="Đóng thông báo"
        className="active-press absolute right-2 top-2 flex size-7 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary"
      >
        <X className="size-4" />
      </button>

      {variant !== "loading" && Number.isFinite(duration) && (
        <span
          className={cn("absolute inset-x-0 bottom-0 h-0.5 origin-left opacity-70", v.bar)}
          style={{ animation: `toast-progress ${duration}ms linear forwards` }}
        />
      )}
    </div>
  );
}

const show = (variant: Variant, title: string, opts: NotifyOptions = {}) => {
  const duration = opts.duration ?? (variant === "error" ? 5000 : variant === "loading" ? Infinity : 3200);
  buzz(VARIANTS[variant].haptic);
  return sonner.custom(
    (id) => (
      <ToastCard
        variant={variant}
        title={title}
        description={opts.description}
        action={opts.action}
        duration={duration}
        onDismiss={() => {
          sonner.dismiss(id);
          opts.onDismiss?.();
        }}
      />
    ),
    { duration, id: opts.id },
  );
};

export const notify = {
  success: (title: string, opts?: NotifyOptions) => show("success", title, opts),
  error: (title: string, opts?: NotifyOptions) => show("error", title, opts),
  warning: (title: string, opts?: NotifyOptions) => show("warning", title, opts),
  info: (title: string, opts?: NotifyOptions) => show("info", title, opts),
  loading: (title: string, opts?: NotifyOptions) => show("loading", title, opts),
  dismiss: (id?: string | number) => sonner.dismiss(id),
};
