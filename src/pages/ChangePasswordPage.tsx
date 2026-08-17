import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { notify } from "@/lib/toast";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useChangePassword } from "@/hooks/useProfile";

export default function ChangePasswordPage() {
  const navigate = useNavigate();
  const change = useChangePassword();
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");

  const submit = () => {
    if (pw.length < 6) return notify.error("Mật khẩu tối thiểu 6 ký tự");
    if (pw !== confirm) return notify.error("Mật khẩu nhập lại không khớp");
    change.mutate(pw, {
      onSuccess: () => {
        notify.success("Đã đổi mật khẩu");
        navigate(-1);
      },
      onError: (e) => notify.error("Lỗi đổi mật khẩu", { description: (e as Error).message }),
    });
  };

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-background">
      <header
        className="flex items-center gap-3 border-b border-border/60 bg-background px-4 py-3"
        style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
      >
        <button onClick={() => navigate(-1)} aria-label="Quay lại" className="active-press">
          <ArrowLeft className="size-6" />
        </button>
        <h1 className="font-semibold">Đổi mật khẩu</h1>
      </header>

      <div className="p-4">
        <Card className="space-y-4 p-4">
          <div>
            <Label htmlFor="pw">Mật khẩu mới</Label>
            <Input
              id="pw"
              type="password"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              placeholder="••••••••"
              autoComplete="new-password"
            />
          </div>
          <div>
            <Label htmlFor="confirm">Nhập lại mật khẩu</Label>
            <Input
              id="confirm"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="••••••••"
              autoComplete="new-password"
              onKeyDown={(e) => e.key === "Enter" && submit()}
            />
          </div>
          <Button className="w-full" onClick={submit} disabled={change.isPending}>
            {change.isPending && <Loader2 className="size-4 animate-spin" />}
            Cập nhật
          </Button>
        </Card>
      </div>
    </div>
  );
}
