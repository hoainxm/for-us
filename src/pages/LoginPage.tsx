import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { notify } from "@/lib/toast";
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
        notify.error("Đăng nhập thất bại", { description: error.message });
        return;
      }
      notify.success("Chào mừng trở lại 💕");
      // AuthProvider onAuthStateChange sẽ tự chuyển màn.
    } catch {
      notify.error("Lỗi mạng, thử lại nha");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative mx-auto flex h-dvh w-full max-w-md flex-col justify-center overflow-hidden px-6">
      {/* Nền gradient hồng dịu, đỡ chói */}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-primary/25 via-background to-background dark:from-primary/20" />
      <div
        className="pointer-events-none absolute -top-24 left-1/2 -z-10 size-72 -translate-x-1/2 rounded-full bg-primary/25 blur-3xl"
        aria-hidden
      />

      <div className="animate-page flex flex-col items-center gap-3 pb-10">
        <div className="flex size-20 items-center justify-center rounded-3xl bg-primary text-primary-foreground shadow-lg shadow-primary/30">
          <Heart className="size-10 fill-current" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight">For Us</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="animate-page space-y-4">
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            inputMode="email"
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            placeholder="email@email.com"
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
    </div>
  );
}
