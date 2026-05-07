import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { POLL_INTERVALS } from "@/constants";

export const useAlerts = () => {
  return useQuery({
    queryKey: ["alertsCount"],
    queryFn: () => api.get("/alerts/count").then((r) => r.data),
    refetchInterval: POLL_INTERVALS.ALERT_COUNT,
    staleTime: POLL_INTERVALS.ALERT_COUNT,
  });
};

export const useCriticalAlerts = (limit = 50) => {
  return useQuery({
    queryKey: ["criticalAlerts", limit],
    queryFn: () =>
      api.get("/alerts/critical", { params: { limit } }).then((r) => r.data),
    refetchInterval: POLL_INTERVALS.ALERT_COUNT,
    staleTime: POLL_INTERVALS.ALERT_COUNT,
  });
};