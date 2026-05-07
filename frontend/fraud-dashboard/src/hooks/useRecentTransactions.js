import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { POLL_INTERVALS } from "@/constants";

export const useRecentTransactions = (limit = 20) => {
  return useQuery({
    queryKey: ["recentTransactions", limit],
    queryFn: () =>
      api.get("/transactions/recent", { params: { limit } }).then((r) => r.data),
    refetchInterval: POLL_INTERVALS.RECENT_FEED,
    staleTime: 0,
  });
};