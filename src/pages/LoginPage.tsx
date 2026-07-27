import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Heart, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const schema = z.object({
  email: z.string().email("Email không hợp lệ"),
  password: z.string().min(6, "Mật khẩu tối thiểu 6 ký tự"),
});
type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  const [submitting, setSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    setSubmitting(true);
    try {
      const { error } = await supabase.auth.signInWithPassword(values);
      if (error) {
        toast.error("Đăng nhập thất bại", { description: error.message });
        return;
      }
      toast.success("Chào mừng trở lại 💕");
      // AuthProvider onAuthStateChange sẽ tự chuyển màn.
    } catch {
      toast.error("Lỗi mạng, thử lại nha");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto flex h-dvh w-full max-w-md flex-col justify-center bg-background px-6">
      <div className="animate-page flex flex-col items-center gap-2 pb-8">
        <div className="flex size-16 items-center justify-center rounded-2xl bg-primary/12">
          <Heart className="size-8 fill-primary text-primary" />
        </div>
        <h1 className="text-2xl font-bold">Couple App</h1>
        <p className="text-sm text-muted-foreground">Đăng nhập để bắt đầu</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="animate-page space-y-4">
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="ban@email.com"
            {...register("email")}
          />
          {errors.email && (
            <p className="mt-1 text-xs text-destructive">{errors.email.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="password">Mật khẩu</Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            {...register("password")}
          />
          {errors.password && (
            <p className="mt-1 text-xs text-destructive">{errors.password.message}</p>
          )}
        </div>

        <Button type="submit" size="lg" className="w-full" disabled={submitting}>
          {submitting && <Loader2 className="size-4 animate-spin" />}
          {submitting ? "Đang đăng nhập..." : "Đăng nhập"}
        </Button>
      </form>

      <p className="animate-page pt-6 text-center text-xs text-muted-foreground">
        Tài khoản do Admin cấp sẵn cho 2 người.
      </p>
    </div>
  );
}
