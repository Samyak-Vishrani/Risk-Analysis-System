import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { POLL_INTERVALS } from "@/constants";

export const useTopFraudMerchants = (limit = 10) =>
  useQuery({
    queryKey: ["merchants", "topFraud", limit],
    queryFn: () =>
      api.get("/dashboard/merchants/top-fraud", { params: { limit } }).then((r) => r.data),
    staleTime: POLL_INTERVALS.STATIC,
    refetchInterval: POLL_INTERVALS.STATIC,
  });

export const useMerchantsByCategory = () =>
  useQuery({
    queryKey: ["merchants", "byCategory"],
    queryFn: () =>
      api.get("/dashboard/merchants/by-category").then((r) => r.data),
    staleTime: POLL_INTERVALS.STATIC,
    refetchInterval: POLL_INTERVALS.STATIC,
  });