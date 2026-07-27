import { useRef, useState } from "react";
import { toast } from "sonner";
import {
  Bell,
  Camera,
  Check,
  ChevronRight,
  Download,
  Heart,
  Loader2,
  LogOut,
  Moon,
  Palette,
  Pencil,
  Send,
  Share,
  ShieldCheck,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/providers/AuthProvider";
import {
  useMyProfile,
  useProfiles,
  useUpdateDisplayName,
  useUploadAvatar,
} from "@/hooks/useProfile";
import { useInstallPrompt } from "@/pwa/useInstallPrompt";
import { usePush } from "@/hooks/usePush";

export default function ProfilePage() {
  const { user, signOut } = useAuth();
  const { data: me, isLoading } = useMyProfile(user?.id);
  const { data: profiles } = useProfiles();
  const partner = profiles?.find((p) => p.id !== user?.id);

  const updateName = useUpdateDisplayName(user?.id);
  const uploadAvatar = useUploadAvatar(user?.id);
  const fileRef = useRef<HTMLInputElement>(null);
  const install = useInstallPrompt();
  const push = usePush();

  const [editing, setEditing] = useState(false);
  const [nameDraft, setNameDraft] = useState("");

  const startEdit = () => {
    setNameDraft(me?.display_name ?? "");
    setEditing(true);
  };

  const saveName = () => {
    const v = nameDraft.trim();
    if (!v) {
      toast.error("Tên không được để trống");
      return;
    }
    updateName.mutate(v, {
      onSuccess: () => {
        toast.success("Đã cập nhật tên");
        setEditing(false);
      },
      onError: (e) => toast.error("Lỗi cập nhật", { description: (e as Error).message }),
    });
  };

  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Ảnh tối đa 5MB");
      return;
    }
    uploadAvatar.mutate(file, {
      onSuccess: () => toast.success("Đã đổi ảnh đại diện"),
      onError: (err) => toast.error("Upload lỗi", { description: (err as Error).message }),
    });
    e.target.value = "";
  };

  const enableNotifications = async () => {
    try {
      const r = await push.enable();
      if (r === "unsupported") toast.error("Trình duyệt không hỗ trợ thông báo");
      else if (r === "denied") toast.error("Bạn đã từ chối quyền thông báo");
      else if (r === "push-unavailable")
        toast.error("Push service không khả dụng", {
          description: "Không dùng cửa sổ ẩn danh. Brave: bật Google push. Hoặc thử Chrome/Edge.",
          duration: 8000,
        });
      else if (r === "no-vapid")
        toast.warning("Đã bật cục bộ", { description: "Chưa cấu hình VITE_VAPID_PUBLIC_KEY" });
      else toast.success("Đã bật thông báo đẩy 🔔");
    } catch (e) {
      toast.error("Lỗi bật thông báo", { description: (e as Error).message });
    }
  };

  const testPush = async () => {
    try {
      const sent = await push.test();
      if (sent > 0) toast.success(`Đã gửi push (${sent} thiết bị)`);
      else
        toast.warning("Chưa có subscription", {
          description: "Bấm Thông báo để bật + cấp quyền trước.",
        });
    } catch (e) {
      toast.error("Gửi thử lỗi", { description: (e as Error).message });
    }
  };

  const onInstall = async () => {
    const outcome = await install.promptInstall();
    if (outcome === "accepted") toast.success("Đang cài đặt ứng dụng...");
  };

  const rows: {
    icon: typeof Bell;
    label: string;
    hint?: string;
    onClick?: () => void;
  }[] = [
    { icon: Bell, label: "Thông báo", hint: "Bật", onClick: enableNotifications },
    { icon: Send, label: "Gửi thử thông báo", onClick: testPush },
    { icon: Palette, label: "Giao diện", hint: "Hồng" },
    { icon: Moon, label: "Chế độ tối", hint: "Tự động" },
    { icon: ShieldCheck, label: "Bảo mật & riêng tư" },
  ];

  return (
    <div>
      <PageHeader title="Cá nhân" />

      <div className="space-y-5 p-4">
        {/* Cặp đôi card */}
        <Card className="flex flex-col items-center gap-3 bg-gradient-to-br from-accent to-card p-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => fileRef.current?.click()}
              className="active-press relative"
              aria-label="Đổi ảnh đại diện"
            >
              {isLoading ? (
                <div className="size-16 animate-pulse rounded-full bg-muted" />
              ) : (
                <Avatar
                  name={me?.display_name}
                  src={me?.avatar_url}
                  className="size-16 text-lg ring-4 ring-card"
                />
              )}
              <span className="absolute -bottom-0.5 -right-0.5 flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground ring-2 ring-card">
                {uploadAvatar.isPending ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Camera className="size-3.5" />
                )}
              </span>
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              hidden
              onChange={onPickFile}
            />

            <Heart className="size-6 fill-primary text-primary" />
            <Avatar
              name={partner?.display_name}
              src={partner?.avatar_url}
              className="size-16 text-lg ring-4 ring-card"
            />
          </div>

          {/* Tên + edit inline */}
          {editing ? (
            <div className="flex w-full max-w-[16rem] items-center gap-2">
              <Input
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                className="h-10 text-center"
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && saveName()}
              />
              <Button size="icon" className="size-10 shrink-0" onClick={saveName} disabled={updateName.isPending}>
                {updateName.isPending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
              </Button>
            </div>
          ) : (
            <button onClick={startEdit} className="active-press flex items-center gap-1.5 text-center">
              <span className="text-lg font-bold">
                {isLoading ? "…" : me?.display_name || "Chưa đặt tên"}
                {partner ? ` & ${partner.display_name}` : ""}
              </span>
              <Pencil className="size-3.5 text-muted-foreground" />
            </button>
          )}
          <p className="text-sm text-muted-foreground">{user?.email}</p>
        </Card>

        {/* Cài đặt PWA */}
        {!install.installed && (install.canInstall || install.isIOS) && (
          <Card className="flex items-center gap-3 border-primary/30 bg-primary/5 p-4">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary">
              <Download className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold">Cài lên màn hình chính</p>
              {install.isIOS ? (
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  Bấm <Share className="inline size-3.5" /> rồi "Thêm vào MH chính"
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">Dùng như app native, mở nhanh hơn</p>
              )}
            </div>
            {install.canInstall && (
              <Button size="sm" onClick={onInstall}>
                Cài đặt
              </Button>
            )}
          </Card>
        )}

        {/* Settings list */}
        <Card className="divide-y divide-border/60 p-0">
          {rows.map((r) => (
            <button
              key={r.label}
              onClick={r.onClick}
              className="active-press flex w-full items-center gap-3 px-4 py-3.5 text-left"
            >
              <div className="flex size-9 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
                <r.icon className="size-5" />
              </div>
              <span className="flex-1 font-medium">{r.label}</span>
              {r.hint && <span className="text-sm text-muted-foreground">{r.hint}</span>}
              <ChevronRight className="size-4 text-muted-foreground" />
            </button>
          ))}
        </Card>

        <Button
          variant="outline"
          className="w-full text-destructive"
          onClick={() => {
            signOut();
            toast("Đã đăng xuất");
          }}
        >
          <LogOut className="size-4" />
          Đăng xuất
        </Button>

        <p className="text-center text-xs text-muted-foreground">For Us · v1.0.0</p>
      </div>
    </div>
  );
}
