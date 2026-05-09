import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { POLL_INTERVALS } from "@/constants";

export const useCountryData = () =>
  useQuery({
    queryKey: ["geography", "byCountry"],
    queryFn: () =>
      api.get("/dashboard/geography/by-country").then((r) => r.data),
    staleTime: POLL_INTERVALS.STATIC,
    refetchInterval: POLL_INTERVALS.STATIC,
  });

export const useLocationData = (limit = 20) =>
  useQuery({
    queryKey: ["geography", "byLocation", limit],
    queryFn: () =>
      api.get("/dashboard/geography/by-location", {
        params: { limit, min_transactions: 5 },
      }).then((r) => r.data),
    staleTime: POLL_INTERVALS.STATIC,
    refetchInterval: POLL_INTERVALS.STATIC,
  });