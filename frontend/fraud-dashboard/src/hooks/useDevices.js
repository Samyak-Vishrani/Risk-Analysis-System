import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { POLL_INTERVALS } from "@/constants";

export const useDevicesByAge = () =>
  useQuery({
    queryKey: ["devices", "byAge"],
    queryFn: () =>
      api.get("/dashboard/devices/by-age").then((r) => r.data),
    staleTime: POLL_INTERVALS.STATIC,
    refetchInterval: POLL_INTERVALS.STATIC,
  });

export const useTopRiskDevices = (limit = 10, deviceType = "") =>
  useQuery({
    queryKey: ["devices", "topRisk", limit, deviceType],
    queryFn: () =>
      api.get("/dashboard/devices/top-risk", {
        params: { limit, device_type: deviceType || undefined },
      }).then((r) => r.data),
    staleTime: POLL_INTERVALS.STATIC,
    refetchInterval: POLL_INTERVALS.STATIC,
  });