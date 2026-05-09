import { formatPercent, formatNumber, getRiskColor } from "@/lib/utils";
import ChartCard from "@/components/charts/ChartCard";
import BaseBarChart from "@/components/charts/BaseBarChart";

const BRACKET_LABELS = {
  "same-day": "Same Day",
  "1-7 days": "1-7 Days",
  "7-30 days": "7-30 Days",
  "older than 30 days": "30+ Days",
};

export default function DeviceAgeChart({ data, isLoading }) {
  if (!data) return null;

  const chartData = data.map((row) => ({
    name: BRACKET_LABELS[row.device_age_bracket] ?? row.device_age_bracket,
    fraud_rate: parseFloat(row.fraud_rate_percent ?? 0),
    fraud_count: row.fraud_count,
    total_transactions: row.total_transactions,
    device_count: row.device_count,
  }));

  return (
    <ChartCard
      title="Fraud Rate by Device Age"
      subtitle="Newer devices have significantly higher fraud rates"
      isLoading={isLoading}
    >
      <BaseBarChart
        data={chartData}
        xDataKey="name"
        bars={[{ dataKey: "fraud_rate", name: "Fraud Rate %", color: "#6366f1" }]}
        formatter={(val) => `${val}%`}
        yTickFormatter={(v) => `${v}%`}
        colorByValue={(val) =>
          getRiskColor(
            val > 30 ? "CRITICAL" :
            val > 20 ? "HIGH" :
            val > 10 ? "MEDIUM" : "LOW"
          )
        }
        height={260}
      />

      {/* detail rows below chart */}
      <div className="mt-4 space-y-2">
        {data.map((row) => (
          <div
            key={row.device_age_bracket}
            className="flex items-center justify-between text-xs"
          >
            <span className="text-gray-400 w-28 shrink-0">
              {BRACKET_LABELS[row.device_age_bracket] ?? row.device_age_bracket}
            </span>
            <div className="flex-1 mx-3 h-1.5 bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${Math.min(row.fraud_rate_percent, 100)}%`,
                  background: getRiskColor(
                    row.fraud_rate_percent > 30 ? "CRITICAL" :
                    row.fraud_rate_percent > 20 ? "HIGH" :
                    row.fraud_rate_percent > 10 ? "MEDIUM" : "LOW"
                  ),
                }}
              />
            </div>
            <span className="text-gray-300 w-10 text-right">
              {formatPercent(row.fraud_rate_percent)}
            </span>
            <span className="text-gray-500 w-24 text-right">
              {formatNumber(row.fraud_count)} fraud
            </span>
            <span className="text-gray-600 w-24 text-right">
              {formatNumber(row.device_count)} devices
            </span>
          </div>
        ))}
      </div>
    </ChartCard>
  );
}