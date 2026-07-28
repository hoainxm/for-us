import type { ReactNode } from "react";
import { ProfileAvatarButton } from "./ProfileAvatarButton";
import { NotificationBell } from "./NotificationBell";

export function PageHeader({
  title,
  subtitle,
  action,
  avatar = true,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  avatar?: boolean;
}) {
  return (
    <header
      className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-border/60 bg-background/95 px-4 pb-3 backdrop-blur-lg"
      style={{ paddingTop: "max(1rem, env(safe-area-inset-top))" }}
    >
      <div className="min-w-0">
        <h1 className="truncate text-2xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {action ??
        (avatar ? (
          <div className="flex items-center gap-1">
            <NotificationBell />
            <ProfileAvatarButton />
          </div>
        ) : null)}
    </header>
  );
}
