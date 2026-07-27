import { QueryClient } from "@tanstack/react-query";

// Cache dùng chung giữa các Tab (LUẬT 3): tránh refetch khi chuyển màn.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
