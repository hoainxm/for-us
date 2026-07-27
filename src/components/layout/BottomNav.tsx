import { NavLink, useNavigate } from "react-router-dom";
import { CalendarHeart, CheckSquare, NotebookPen, Plus, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { to: "/tasks", label: "Việc", icon: CheckSquare },
  { to: "/notes", label: "Nhật ký", icon: NotebookPen },
  { to: "/events", label: "Sự kiện", icon: CalendarHeart },
  { to: "/expenses", label: "Chi tiêu", icon: Wallet },
] as const;

export function BottomNav() {
  const navigate = useNavigate();

  return (
    <nav
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="pointer-events-auto relative mx-3 mb-3 flex w-full max-w-md items-center justify-around rounded-2xl border border-border bg-card/85 px-2 py-2 shadow-lg backdrop-blur-lg">
        {/* 2 tab trái */}
        {tabs.slice(0, 2).map((t) => (
          <TabItem key={t.to} {...t} />
        ))}

        {/* Nút (+) Create nổi giữa */}
        <button
          onClick={() => navigate("/create")}
          aria-label="Tạo mới"
          className="active-press -mt-8 flex size-14 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 ring-4 ring-background"
        >
          <Plus className="size-7" strokeWidth={2.5} />
        </button>

        {/* 2 tab phải */}
        {tabs.slice(2).map((t) => (
          <TabItem key={t.to} {...t} />
        ))}
      </div>
    </nav>
  );
}

function TabItem({
  to,
  label,
  icon: Icon,
}: {
  to: string;
  label: string;
  icon: typeof CheckSquare;
}) {
  return (
    <NavLink
      to={to}
      className="active-press flex w-16 flex-col items-center gap-0.5 py-1"
    >
      {({ isActive }) => (
        <>
          <Icon
            className={cn(
              "size-6 transition-colors",
              isActive ? "text-primary" : "text-muted-foreground",
            )}
            strokeWidth={isActive ? 2.4 : 2}
          />
          <span
            className={cn(
              "text-[10px] font-medium transition-colors",
              isActive ? "text-primary" : "text-muted-foreground",
            )}
          >
            {label}
          </span>
        </>
      )}
    </NavLink>
  );
}
