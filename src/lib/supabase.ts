import { createClient } from "@supabase/supabase-js";

// .trim() phòng key/url dính newline/space khi dán vào env (gây "fetch Invalid value").
const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim();
const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim();

if (!url || !anonKey) {
  throw new Error(
    "[For Us] Thiếu biến môi trường Supabase. Tạo file .env (copy từ .env.example) và điền VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY.",
  );
}

export const supabase = createClient(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
