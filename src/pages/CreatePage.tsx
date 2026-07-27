import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  CheckSquare,
  NotebookPen,
  CalendarHeart,
  Wallet,
  X,
  ImagePlus,
  Loader2,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/AuthProvider";
import { useProfiles } from "@/hooks/useProfile";
import { useCreateTask } from "@/hooks/useTasks";
import { useAlbums, useCreateAlbum, useCreateNote } from "@/hooks/useNotes";
import { useCreateEvent } from "@/hooks/useEvents";
import { useCreateExpense } from "@/hooks/useExpenses";
import { usePush } from "@/hooks/usePush";
import {
  EVENT_CATEGORIES,
  EXPENSE_CATEGORIES,
  NOTE_IMAGE_LIMIT,
  TASK_TAGS,
} from "@/lib/constants";
import type { EventType, RecurrenceRule } from "@/types";

type Mode = "task" | "note" | "event" | "expense";

const modes = [
  { key: "task", label: "Việc", icon: CheckSquare },
  { key: "note", label: "Nhật ký", icon: NotebookPen },
  { key: "event", label: "Sự kiện", icon: CalendarHeart },
  { key: "expense", label: "Chi tiêu", icon: Wallet },
] as const;

const recurrences: { key: RecurrenceRule | "none"; label: string }[] = [
  { key: "none", label: "Không" },
  { key: "daily", label: "Ngày" },
  { key: "weekly", label: "Tuần" },
  { key: "monthly", label: "Tháng" },
];

function defaultDue() {
  const d = new Date();
  d.setHours(21, 0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function todayDate() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function CreatePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: profiles } = useProfiles();
  const albums = useAlbums();
  const createTask = useCreateTask();
  const createNote = useCreateNote();
  const createAlbum = useCreateAlbum();
  const createEvent = useCreateEvent();
  const createExpense = useCreateExpense();
  const push = usePush();

  const [mode, setMode] = useState<Mode>("task");
  const [text, setText] = useState("");

  // task
  const [assignee, setAssignee] = useState<string | null>(null);
  const [due, setDue] = useState(defaultDue);
  const [recurrence, setRecurrence] = useState<RecurrenceRule | "none">("none");
  const [tags, setTags] = useState<string[]>([]);

  // note
  const [files, setFiles] = useState<File[]>([]);
  const [albumId, setAlbumId] = useState<string | null>(null);
  const [newAlbum, setNewAlbum] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  // event
  const [eventDate, setEventDate] = useState(todayDate);
  const [eventType, setEventType] = useState<EventType>("countdown");
  const [eventCategory, setEventCategory] = useState<string>(EVENT_CATEGORIES[0]);

  // expense
  const [amount, setAmount] = useState("");
  const [expenseCategory, setExpenseCategory] = useState<string>(EXPENSE_CATEGORIES[0]);
  const [paidBy, setPaidBy] = useState<string | null>(null);
  const [spentDate, setSpentDate] = useState(todayDate);

  const effectiveAssignee = assignee ?? user?.id ?? "";
  const effectivePayer = paidBy ?? user?.id ?? null;
  const busy =
    createTask.isPending ||
    createNote.isPending ||
    createEvent.isPending ||
    createExpense.isPending;

  const toggleTag = (tag: string) =>
    setTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));

  const onPickFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files ?? []);
    if (picked.some((f) => f.size > 5 * 1024 * 1024)) {
      toast.error("Mỗi ảnh tối đa 5MB");
      return;
    }
    setFiles((prev) => [...prev, ...picked].slice(0, NOTE_IMAGE_LIMIT));
    e.target.value = "";
  };

  const addAlbum = () => {
    const name = newAlbum.trim();
    if (!name) return;
    createAlbum.mutate(name, {
      onSuccess: (album) => {
        setAlbumId(album.id);
        setNewAlbum("");
        toast.success("Đã tạo album");
      },
      onError: (e) => toast.error("Lỗi tạo album", { description: (e as Error).message }),
    });
  };

  const submit = () => {
    if (!user) return;

    if (mode === "task") {
      if (!text.trim()) return toast.error("Nhập tên việc đã nha");
      createTask.mutate(
        {
          title: text.trim(),
          tags,
          recurrence_rule: recurrence === "none" ? null : recurrence,
          assigned_to: effectiveAssignee,
          due_date: new Date(due).toISOString(),
        },
        {
          onSuccess: () => {
            toast.success("Đã tạo việc ✅");
            push.notify(effectiveAssignee, { title: "Việc mới 📋", body: text.trim(), url: "/tasks" });
            navigate("/tasks");
          },
          onError: (e) => toast.error("Lỗi", { description: (e as Error).message }),
        },
      );
      return;
    }

    if (mode === "note") {
      if (!text.trim() && files.length === 0) return toast.error("Viết gì đó hoặc thêm ảnh nha");
      createNote.mutate(
        { content: text.trim(), albumId, files, authorId: user.id },
        {
          onSuccess: () => {
            toast.success("Đã đăng nhật ký 💕");
            push.notify(push.partnerId, {
              title: "Nhật ký mới 💕",
              body: text.trim() || "Vừa đăng ảnh mới",
              url: "/notes",
            });
            navigate("/notes");
          },
          onError: (e) => toast.error("Lỗi đăng", { description: (e as Error).message }),
        },
      );
      return;
    }

    if (mode === "event") {
      if (!text.trim()) return toast.error("Nhập tên sự kiện");
      createEvent.mutate(
        { title: text.trim(), event_date: eventDate, type: eventType, category: eventCategory },
        {
          onSuccess: () => {
            toast.success("Đã thêm sự kiện 💗");
            navigate("/events");
          },
          onError: (e) => toast.error("Lỗi", { description: (e as Error).message }),
        },
      );
      return;
    }

    // expense
    const value = Number(amount.replace(/[^\d]/g, ""));
    if (!value) return toast.error("Nhập số tiền");
    createExpense.mutate(
      {
        amount: value,
        category: expenseCategory,
        note: text.trim() || null,
        paid_by: effectivePayer,
        spent_date: spentDate,
      },
      {
        onSuccess: () => {
          toast.success("Đã ghi chi tiêu 💸");
          navigate("/expenses");
        },
        onError: (e) => toast.error("Lỗi", { description: (e as Error).message }),
      },
    );
  };

  const showTitleBox = mode !== "expense";

  return (
    <div className="flex min-h-full flex-col">
      <header
        className="sticky top-0 z-20 flex items-center justify-between border-b border-border/60 bg-background/80 px-4 py-3 backdrop-blur-lg"
        style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
      >
        <button onClick={() => navigate(-1)} aria-label="Đóng" className="active-press">
          <X className="size-6" />
        </button>
        <h1 className="font-semibold">Tạo mới</h1>
        <Button size="sm" onClick={submit} disabled={busy}>
          {busy && <Loader2 className="size-4 animate-spin" />}
          Lưu
        </Button>
      </header>

      <div className="space-y-5 p-4">
        {/* Mode switcher */}
        <div className="grid grid-cols-4 gap-2">
          {modes.map((m) => (
            <button
              key={m.key}
              onClick={() => setMode(m.key)}
              className={cn(
                "active-press flex flex-col items-center gap-1.5 rounded-xl border-2 py-3 transition-colors",
                mode === m.key
                  ? "border-primary bg-primary/8 text-primary"
                  : "border-border text-muted-foreground",
              )}
            >
              <m.icon className="size-5" />
              <span className="text-[11px] font-medium">{m.label}</span>
            </button>
          ))}
        </div>

        {showTitleBox && (
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={mode === "note" ? 5 : 2}
            placeholder={
              mode === "task"
                ? "Việc cần làm là gì?"
                : mode === "note"
                  ? "Hôm nay có gì muốn ghi lại..."
                  : "Tên sự kiện (VD: Kỷ niệm 2 năm)"
            }
            className="w-full resize-none rounded-xl border border-input bg-card p-4 text-base outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
          />
        )}

        {/* ===== TASK ===== */}
        {mode === "task" && (
          <Card className="space-y-4 p-4">
            <Field label="Giao cho">
              <div className="flex gap-2">
                {profiles?.map((p) => (
                  <Chip key={p.id} active={effectiveAssignee === p.id} onClick={() => setAssignee(p.id)}>
                    {p.display_name}
                  </Chip>
                ))}
              </div>
            </Field>
            <Field label="Hạn chót">
              <input
                type="datetime-local"
                value={due}
                onChange={(e) => setDue(e.target.value)}
                className="h-11 w-full rounded-lg border border-input bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </Field>
            <Field label="Lặp lại">
              <div className="flex gap-2">
                {recurrences.map((r) => (
                  <Chip key={r.key} active={recurrence === r.key} onClick={() => setRecurrence(r.key)}>
                    {r.label}
                  </Chip>
                ))}
              </div>
            </Field>
            <Field label="Nhãn">
              <div className="flex flex-wrap gap-2">
                {TASK_TAGS.map((t) => (
                  <Chip key={t} active={tags.includes(t)} onClick={() => toggleTag(t)}>
                    {t}
                  </Chip>
                ))}
              </div>
            </Field>
          </Card>
        )}

        {/* ===== NOTE ===== */}
        {mode === "note" && (
          <Card className="space-y-4 p-4">
            <Field label={`Ảnh (tối đa ${NOTE_IMAGE_LIMIT})`}>
              <div className="grid grid-cols-4 gap-2">
                {files.map((f, i) => (
                  <div key={i} className="relative aspect-square">
                    <img src={URL.createObjectURL(f)} alt="preview" className="size-full rounded-lg object-cover" />
                    <button
                      onClick={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))}
                      className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground"
                      aria-label="Xoá ảnh"
                    >
                      <X className="size-3" />
                    </button>
                  </div>
                ))}
                {files.length < NOTE_IMAGE_LIMIT && (
                  <button
                    onClick={() => fileRef.current?.click()}
                    className="active-press flex aspect-square items-center justify-center rounded-lg border-2 border-dashed border-border text-muted-foreground"
                  >
                    <ImagePlus className="size-6" />
                  </button>
                )}
              </div>
              <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={onPickFiles} />
            </Field>

            <Field label="Album">
              <div className="flex flex-wrap gap-2">
                <Chip active={albumId === null} onClick={() => setAlbumId(null)}>
                  Không
                </Chip>
                {albums.data?.map((a) => (
                  <Chip key={a.id} active={albumId === a.id} onClick={() => setAlbumId(a.id)}>
                    {a.name}
                  </Chip>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={newAlbum}
                  onChange={(e) => setNewAlbum(e.target.value)}
                  placeholder="Tạo album mới..."
                  className="h-10 text-sm"
                  onKeyDown={(e) => e.key === "Enter" && addAlbum()}
                />
                <Button
                  size="icon"
                  variant="outline"
                  className="size-10 shrink-0"
                  onClick={addAlbum}
                  disabled={createAlbum.isPending || !newAlbum.trim()}
                  aria-label="Thêm album"
                >
                  {createAlbum.isPending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
                </Button>
              </div>
            </Field>
          </Card>
        )}

        {/* ===== EVENT ===== */}
        {mode === "event" && (
          <Card className="space-y-4 p-4">
            <Field label="Ngày">
              <input
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className="h-11 w-full rounded-lg border border-input bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </Field>
            <Field label="Kiểu">
              <div className="flex gap-2">
                <Chip active={eventType === "countdown"} onClick={() => setEventType("countdown")}>
                  Đếm ngược
                </Chip>
                <Chip active={eventType === "anniversary"} onClick={() => setEventType("anniversary")}>
                  Đếm tiến (kỷ niệm)
                </Chip>
              </div>
            </Field>
            <Field label="Danh mục">
              <div className="flex flex-wrap gap-2">
                {EVENT_CATEGORIES.map((c) => (
                  <Chip key={c} active={eventCategory === c} onClick={() => setEventCategory(c)}>
                    {c}
                  </Chip>
                ))}
              </div>
            </Field>
          </Card>
        )}

        {/* ===== EXPENSE ===== */}
        {mode === "expense" && (
          <Card className="space-y-4 p-4">
            <Field label="Số tiền (đ)">
              <Input
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ""))}
                inputMode="numeric"
                placeholder="0"
                className="h-12 text-lg font-semibold"
              />
            </Field>
            <Field label="Danh mục">
              <div className="flex flex-wrap gap-2">
                {EXPENSE_CATEGORIES.map((c) => (
                  <Chip key={c} active={expenseCategory === c} onClick={() => setExpenseCategory(c)}>
                    {c}
                  </Chip>
                ))}
              </div>
            </Field>
            <Field label="Người trả">
              <div className="flex gap-2">
                {profiles?.map((p) => (
                  <Chip key={p.id} active={effectivePayer === p.id} onClick={() => setPaidBy(p.id)}>
                    {p.display_name}
                  </Chip>
                ))}
              </div>
            </Field>
            <Field label="Ngày">
              <input
                type="date"
                value={spentDate}
                onChange={(e) => setSpentDate(e.target.value)}
                className="h-11 w-full rounded-lg border border-input bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </Field>
            <Field label="Ghi chú">
              <Input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="VD: cà phê cuối tuần"
                className="h-11 text-sm"
              />
            </Field>
          </Card>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "active-press rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors",
        active ? "border-primary bg-primary/10 text-primary" : "border-border text-foreground",
      )}
    >
      {children}
    </button>
  );
}
