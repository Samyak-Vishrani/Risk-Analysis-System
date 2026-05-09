import { formatPercent, formatNumber, getRiskColor } from "@/lib/utils";
import ChartCard from "@/components/charts/ChartCard";
import BaseBarChart from "@/components/charts/BaseBarChart";

export default function CategoryBarChart({ data, isLoading }) {
  if (!data) return null;

  const chartData = [...data]
    .sort((a, b) => b.fraud_rate_percent - a.fraud_rate_percent)
    .map((row) => ({
      name: row.category,
      fraud_rate: parseFloat(row.fraud_rate_percent ?? 0),
      fraud_count: row.fraud_count,
      merchant_count: row.merchant_count,
    }));

  return (
    <ChartCard
      title="Fraud Rate by Merchant Category"
      subtitle="Which merchant categories have the highest fraud rate"
      isLoading={isLoading}
    >
      <BaseBarChart
        data={chartData}
        xDataKey="name"
        bars={[{ dataKey: "fraud_rate", name: "Fraud Rate %", color: "#6366f1" }]}
        formatter={(val) => `${val}%`}
        yTickFormatter={(v) => `${v}%`}
        xTickFormatter={(v) => v?.length > 10 ? `${v.slice(0, 10)}...` : v}
        colorByValue={(val) => getRiskColor(
          val > 30 ? "CRITICAL" :
          val > 20 ? "HIGH" :
          val > 10 ? "MEDIUM" : "LOW"
        )}
        height={300}
      />
    </ChartCard>
  );
}