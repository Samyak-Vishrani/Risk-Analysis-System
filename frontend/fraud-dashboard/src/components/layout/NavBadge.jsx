import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { POLL_INTERVALS } from "@/constants";

// fetches alert count and shows a red badge number
// only renders when count > 0

export default function NavBadge({ label }) {
  const { data } = useQuery({
    queryKey: ["alertsCount"],
    queryFn: () => api.get("/alerts/count").then((r) => r.data),
    refetchInterval: POLL_INTERVALS.ALERT_COUNT,
    staleTime: POLL_INTERVALS.ALERT_COUNT,
  });

  const count =
    label === "Alerts"
      ? data?.data?.critical_count
      : label === "Reviews"
      ? data?.data?.total_unreviewed
      : 0;

  if (!count || count === 0) return null;

  return (
    <span className="bg-red-500 text-white text-xs font-semibold px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-none">
      {count > 99 ? "99+" : count}
    </span>
  );
}