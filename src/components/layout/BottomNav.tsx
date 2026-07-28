import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { CalendarHeart, CheckSquare, NotebookPen, Plus, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { to: "/tasks", label: "Việc", icon: CheckSquare },
  { to: "/notes", label: "Nhật ký", icon: NotebookPen },
  { to: "/events", label: "Sự kiện", icon: CalendarHeart },
  { to: "/expenses", label: "Chi tiêu", icon: Wallet },
] as const;

// Tab hiện tại -> mode mặc định của màn Tạo mới.
const pathToType: Record<string, string> = {
  "/tasks": "task",
  "/notes": "note",
  "/events": "event",
  "/expenses": "expense",
};

export function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const type = pathToType[location.pathname] ?? "task";

  return (
    <nav className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center">
      <div
        className="pointer-events-auto relative flex w-full max-w-md items-center justify-around border-t border-border bg-card px-2 pt-2 shadow-[0_-4px_16px_rgba(0,0,0,0.06)]"
        style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
      >
        {/* 2 tab trái */}
        {tabs.slice(0, 2).map((t) => (
          <TabItem key={t.to} {...t} />
        ))}

        {/* Nút (+) Create nổi giữa — mở đúng loại theo tab */}
        <button
          onClick={() => navigate(`/create?type=${type}`)}
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
