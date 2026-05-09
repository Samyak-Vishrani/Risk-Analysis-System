import ChartCard from "@/components/charts/ChartCard";
import BaseScatterChart from "@/components/charts/BaseScatterChart";
import { formatUSD } from "@/lib/utils";

export default function IncomeScatter({ data, isLoading }) {
  if (!data) return null;

  // shape for scatter — x = income, y = avg fraud probability
  const scatterData = data.map((c) => ({
    x: parseFloat(c.income ?? 0),
    y: parseFloat((c.avg_fraud_probability ?? 0) * 100),
    name: c.name,
    high_risk_count: c.high_risk_count,
    fraud_count: c.fraud_count,
  }));

  const avgIncome =
    scatterData.reduce((s, d) => s + d.x, 0) / (scatterData.length || 1);

  const avgProb =
    scatterData.reduce((s, d) => s + d.y, 0) / (scatterData.length || 1);

  return (
    <ChartCard
      title="Customer Income vs Fraud Probability"
      subtitle="Does lower income correlate with higher fraud probability?"
      isLoading={isLoading}
    >
      <BaseScatterChart
        data={scatterData}
        xDataKey="x"
        yDataKey="y"
        xLabel="Annual Income (USD)"
        yLabel="Avg Fraud Probability (%)"
        color="#6366f1"
        xTickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
        yTickFormatter={(v) => `${v}%`}
        referenceLineX={avgIncome}
        referenceLineY={avgProb}
        height={280}
      />
      <div className="flex items-center gap-6 mt-3 text-xs text-gray-500">
        <div className="flex items-center gap-1.5">
          <span className="w-3 border-t border-dashed border-gray-600" />
          <span>Avg income ({formatUSD(avgIncome)})</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 border-t border-dashed border-gray-600" />
          <span>Avg probability ({avgProb.toFixed(1)}%)</span>
        </div>
      </div>
    </ChartCard>
  );
}