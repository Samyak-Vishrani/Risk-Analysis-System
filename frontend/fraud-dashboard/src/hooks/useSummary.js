import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { POLL_INTERVALS } from "@/constants";

export const useSummary = () => {
  const summary = useQuery({
    queryKey: ["summary"],
    queryFn: () => api.get("/dashboard/summary").then((r) => r.data),
    refetchInterval: POLL_INTERVALS.SUMMARY,
  });

  const actions = useQuery({
    queryKey: ["summaryActions"],
    queryFn: () => api.get("/dashboard/summary/actions").then((r) => r.data),
    refetchInterval: POLL_INTERVALS.SUMMARY,
  });

  const riskLevels = useQuery({
    queryKey: ["summaryRiskLevels"],
    queryFn: () => api.get("/dashboard/summary/risk-levels").then((r) => r.data),
    refetchInterval: POLL_INTERVALS.SUMMARY,
  });

  return {
    summary: summary.data?.data,
    actions: actions.data?.data,
    riskLevels: riskLevels.data?.data,
    isLoading: summary.isLoading || actions.isLoading || riskLevels.isLoading,
    error: summary.error || actions.error || riskLevels.error,
  };
};