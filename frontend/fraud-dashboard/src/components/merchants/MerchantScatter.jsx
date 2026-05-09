import ChartCard from "@/components/charts/ChartCard";
import BaseScatterChart from "@/components/charts/BaseScatterChart";

export default function MerchantScatter({ data, isLoading }) {
  if (!data) return null;

  // shape data for scatter — x = risk_rating, y = actual fraud_rate
  const scatterData = data.map((m) => ({
    x: parseFloat((m.risk_rating ?? 0) * 100),
    y: parseFloat(m.fraud_rate_percent ?? 0),
    name: m.merchant_name,
    fraud_count: m.fraud_count,
    category: m.category,
  }));

  // average risk rating — shown as reference line
  const avgRiskRating =
    scatterData.reduce((sum, d) => sum + d.x, 0) / (scatterData.length || 1);

  return (
    <ChartCard
      title="Risk Rating vs Actual Fraud Rate"
      subtitle="Does the merchant risk rating actually predict fraud? Points above the diagonal = under-rated risk"
      isLoading={isLoading}
    >
      <BaseScatterChart
        data={scatterData}
        xDataKey="x"
        yDataKey="y"
        xLabel="Risk Rating (%)"
        yLabel="Fraud Rate (%)"
        color="#6366f1"
        xTickFormatter={(v) => `${v}%`}
        yTickFormatter={(v) => `${v}%`}
        referenceLineX={avgRiskRating}
        height={300}
      />
      <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
        <div className="flex items-center gap-1.5">
          <span className="w-3 border-t border-dashed border-gray-600" />
          <span>Avg risk rating ({avgRiskRating.toFixed(1)}%)</span>
        </div>
        <span>
          Points far above the line = merchants whose risk is under-estimated
        </span>
      </div>
    </ChartCard>
  );
}