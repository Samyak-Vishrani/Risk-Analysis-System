import { formatPercent, formatNumber, getRiskColor } from "@/lib/utils";
import ChartCard from "@/components/charts/ChartCard";
import BaseBarChart from "@/components/charts/BaseBarChart";

export default function AgeBracketChart({ data, isLoading }) {
  if (!data) return null;

  const chartData = data.map((row) => ({
    name: row.age_bracket,
    fraud_rate: parseFloat(row.fraud_rate_percent ?? 0),
    fraud_count: row.fraud_count,
    customer_count: row.customer_count,
    avg_income: parseFloat(row.avg_income ?? 0),
  }));

  return (
    <ChartCard
      title="Fraud Rate by Age Bracket"
      subtitle="Which age groups have the highest fraud rate"
      isLoading={isLoading}
    >
      <BaseBarChart
        data={chartData}
        xDataKey="name"
        bars={[
          { dataKey: "fraud_rate", name: "Fraud Rate %", color: "#6366f1" },
        ]}
        formatter={(val, key) =>
          key === "fraud_rate" ? `${val}%` : formatNumber(val)
        }
        yTickFormatter={(v) => `${v}%`}
        colorByValue={(val) =>
          getRiskColor(
            val > 30 ? "CRITICAL" :
            val > 20 ? "HIGH" :
            val > 10 ? "MEDIUM" : "LOW"
          )
        }
        height={280}
      />

      {/* bracket detail table below chart */}
      <div className="mt-4 space-y-1.5">
        {chartData.map((row) => (
          <div
            key={row.name}
            className="flex items-center justify-between text-xs"
          >
            <span className="text-gray-400 w-16">{row.name}</span>
            <div className="flex-1 mx-3 h-1.5 bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.min(row.fraud_rate, 100)}%`,
                  background: getRiskColor(
                    row.fraud_rate > 30 ? "CRITICAL" :
                    row.fraud_rate > 20 ? "HIGH" :
                    row.fraud_rate > 10 ? "MEDIUM" : "LOW"
                  ),
                }}
              />
            </div>
            <span className="text-gray-300 w-10 text-right">
              {formatPercent(row.fraud_rate)}
            </span>
            <span className="text-gray-500 w-20 text-right">
              {formatNumber(row.customer_count)} customers
            </span>
          </div>
        ))}
      </div>
    </ChartCard>
  );
}