import * as React from "react";
import { cn } from "@/lib/utils";

interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string | null;
  name?: string;
}

function initials(name?: string) {
  if (!name) return "?";
  return name
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  ({ className, src, name, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent text-sm font-semibold text-accent-foreground",
        className,
      )}
      {...props}
    >
      {src ? (
        <img src={src} alt={name ?? "avatar"} className="size-full object-cover" />
      ) : (
        <span>{initials(name)}</span>
      )}
    </div>
  ),
);
Avatar.displayName = "Avatar";

export { Avatar };
