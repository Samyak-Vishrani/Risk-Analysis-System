import { formatNumber, formatUSD, getRiskColor } from "@/lib/utils";
import ChartCard from "@/components/charts/ChartCard";
import BaseBarChart from "@/components/charts/BaseBarChart";

export default function LocationBarChart({ data, isLoading }) {
  if (!data) return null;

  const top10 = [...data]
    .sort((a, b) => b.fraud_count - a.fraud_count)
    .slice(0, 10)
    .map((row) => ({
      name: row.location,
      fraud_count: row.fraud_count,
      total_transactions: row.total_transactions,
      fraud_rate: parseFloat(row.fraud_rate_percent ?? 0),
    }));

  return (
    <ChartCard
      title="Top 10 Locations by Fraud Count"
      subtitle="Cities with the most fraud transactions"
      isLoading={isLoading}
    >
      <BaseBarChart
        data={top10}
        xDataKey="name"
        bars={[{ dataKey: "fraud_count", name: "Fraud Count", color: "#f97316" }]}
        formatter={(val) => formatNumber(val)}
        yTickFormatter={(v) => formatNumber(v)}
        xTickFormatter={(v) => v?.length > 10 ? `${v.slice(0, 10)}...` : v}
        colorByValue={(val) => {
          const max = Math.max(...top10.map((r) => r.fraud_count));
          const pct = (val / max) * 100;
          return getRiskColor(
            pct > 75 ? "CRITICAL" :
            pct > 50 ? "HIGH" :
            pct > 25 ? "MEDIUM" : "LOW"
          );
        }}
        height={280}
      />
    </ChartCard>
  );
}