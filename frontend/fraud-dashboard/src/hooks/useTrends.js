import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { POLL_INTERVALS } from "@/constants";

export const useFraudRateTrend = (days = 90) =>
  useQuery({
    queryKey: ["trends", "fraudRate", days],
    queryFn: () =>
      api.get("/dashboard/trends/fraud-rate", { params: { days } }).then((r) => r.data),
    refetchInterval: POLL_INTERVALS.TRENDS,
    staleTime: POLL_INTERVALS.TRENDS,
  });

export const useActionsTrend = (days = 90) =>
  useQuery({
    queryKey: ["trends", "actions", days],
    queryFn: () =>
      api.get("/dashboard/trends/actions", { params: { days } }).then((r) => r.data),
    refetchInterval: POLL_INTERVALS.TRENDS,
    staleTime: POLL_INTERVALS.TRENDS,
  });

export const useAmountAtRiskTrend = (days = 90) =>
  useQuery({
    queryKey: ["trends", "amountAtRisk", days],
    queryFn: () =>
      api.get("/dashboard/trends/amount-at-risk", { params: { days } }).then((r) => r.data),
    refetchInterval: POLL_INTERVALS.TRENDS,
    staleTime: POLL_INTERVALS.TRENDS,
  });

export const useModelMetrics = () =>
  useQuery({
    queryKey: ["modelMetrics"],
    queryFn: () => api.get("/model/metrics").then((r) => r.data),
    staleTime: POLL_INTERVALS.STATIC,
  });