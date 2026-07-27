import type { ReactNode } from "react";
import { ProfileAvatarButton } from "./ProfileAvatarButton";

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
    <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-border/60 bg-background/80 px-4 pb-3 pt-4 backdrop-blur-lg">
      <div className="min-w-0">
        <h1 className="truncate text-2xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {action ?? (avatar ? <ProfileAvatarButton /> : null)}
    </header>
  );
}
