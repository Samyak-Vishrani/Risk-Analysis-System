import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { POLL_INTERVALS } from "@/constants";

export const useTopRiskCustomers = (limit = 10) =>
  useQuery({
    queryKey: ["customers", "topRisk", limit],
    queryFn: () =>
      api.get("/dashboard/customers/top-risk", { params: { limit } }).then((r) => r.data),
    staleTime: POLL_INTERVALS.STATIC,
    refetchInterval: POLL_INTERVALS.STATIC,
  });

export const useCustomersByAgeBracket = () =>
  useQuery({
    queryKey: ["customers", "byAgeBracket"],
    queryFn: () =>
      api.get("/dashboard/customers/by-age-bracket").then((r) => r.data),
    staleTime: POLL_INTERVALS.STATIC,
    refetchInterval: POLL_INTERVALS.STATIC,
  });