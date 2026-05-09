import { RISK_COLORS } from "@/constants";
import { Smartphone, AlertTriangle } from "lucide-react";

export default function NewDeviceInsightCard({ data, isLoading }) {
  if (isLoading) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 animate-pulse">
        <div className="h-4 bg-gray-800 rounded w-40 mb-4" />
        <div className="h-12 bg-gray-800 rounded w-24 mb-3" />
        <div className="h-3 bg-gray-800 rounded w-full" />
      </div>
    );
  }

  if (!data) return null;

  const pct = data.same_day_critical_percent ?? 0;
  const sameDayRow = data.data?.find(
    (r) => r.device_age_bracket === "same-day"
  );

  const severity =
    pct > 50 ? "CRITICAL" :
    pct > 30 ? "HIGH" :
    pct > 15 ? "MEDIUM" : "LOW";

  const color = RISK_COLORS[severity];

  return (
    <div
      className="bg-gray-900 border rounded-xl p-5"
      style={{ borderColor: `${color}40` }}
    >
      <div className="flex items-center gap-2 mb-4">
        <div
          className="p-2 rounded-lg"
          style={{ background: `${color}15` }}
        >
          <Smartphone size={16} style={{ color }} />
        </div>
        <p className="text-white text-sm font-medium">New Device Signal</p>
      </div>

      {/* headline number */}
      <p
        className="text-4xl font-bold mb-1"
        style={{ color }}
      >
        {pct.toFixed(1)}%
      </p>
      <p className="text-gray-400 text-sm mb-4">
        of all CRITICAL transactions came from devices registered today
      </p>

      {/* context bar */}
      <div className="h-2 bg-gray-800 rounded-full overflow-hidden mb-4">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${Math.min(pct, 100)}%`, background: color }}
        />
      </div>

      {/* supporting stats from same-day row */}
      {sameDayRow && (
        <div className="grid grid-cols-3 gap-3">
          {[
            {
              label: "Same-day Devices",
              value: sameDayRow.device_count?.toLocaleString() ?? "-",
            },
            {
              label: "Fraud Txns",
              value: sameDayRow.fraud_count?.toLocaleString() ?? "-",
            },
            {
              label: "Fraud Rate",
              value: `${sameDayRow.fraud_rate_percent ?? 0}%`,
            },
          ].map((s) => (
            <div
              key={s.label}
              className="bg-gray-800 rounded-lg p-2.5 text-center"
            >
              <p className="text-white text-sm font-semibold">{s.value}</p>
              <p className="text-gray-500 text-xs mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* warning if signal is very strong */}
      {pct > 40 && (
        <div className="flex items-start gap-2 mt-4 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2.5">
          <AlertTriangle size={13} className="text-red-400 mt-0.5 shrink-0" />
          <p className="text-red-400 text-xs">
            New device registrations are a dominant fraud signal. Consider
            adding step-up verification for transactions on devices registered
            within 24 hours.
          </p>
        </div>
      )}
    </div>
  );
}