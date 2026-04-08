import { trpc } from "@/lib/trpc";

export function useAuth() {
  const { data: user, isLoading: loading, error } = trpc.auth.me.useQuery(undefined, {
    retry: false,
    staleTime: 30_000,
  });
  const utils = trpc.useUtils();
  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      utils.auth.me.invalidate();
      window.location.href = "/login";
    },
  });

  return {
    user: user ?? null,
    loading,
    error,
    isAuthenticated: !!user,
    logout: () => logoutMutation.mutate(),
  };
}
