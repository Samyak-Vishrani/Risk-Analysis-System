import { useState } from "react";
import { format } from "date-fns";
import {
  useFraudRateTrend,
  useActionsTrend,
  useAmountAtRiskTrend,
  useModelMetrics,
} from "@/hooks/useTrends";
import BaseLineChart from "@/components/charts/BaseLineChart";
import ChartCard from "@/components/charts/ChartCard";
import RangeSelector from "@/components/charts/RangeSelector";
import { formatUSD, formatPercent, formatCompact } from "@/lib/utils";

// build reference lines from model training runs
// each promoted run gets a vertical line on the chart
const buildReferenceLines = (metricsData) => {
  if (!metricsData?.data) return [];
  return metricsData.data
    .filter((run) => run.promoted)
    .map((run) => ({
      x: run.run_at ? format(new Date(run.run_at), "yyyy-MM-dd") : null,
      label: `v${run.roc_auc}`,
    }))
    .filter((r) => r.x !== null);
};

export default function Trends() {
  const [days, setDays] = useState(90);

  const { data: fraudRateData, isLoading: fraudLoading } = useFraudRateTrend(days);
  const { data: actionsData, isLoading: actionsLoading } = useActionsTrend(days);
  const { data: amountData, isLoading: amountLoading } = useAmountAtRiskTrend(days);
  const { data: metricsData } = useModelMetrics();

  const fraudRateRows = fraudRateData?.data ?? [];
  const actionsRows = actionsData?.data ?? [];
  const amountRows = amountData?.data ?? [];
  const referenceLines = buildReferenceLines(metricsData);

  // merge fraud rate + high/critical counts into one dataset for the combined chart
  const combinedRows = fraudRateRows.map((row) => {
    const actionRow = actionsRows.find((a) => a.date === row.date);
    return {
      ...row,
      high_critical_count: (actionRow?.review_count ?? 0) + (actionRow?.block_count ?? 0),
    };
  });

  const rangeControl = (
    <RangeSelector value={days} onChange={setDays} />
  );

  return (
    <div className="space-y-4">

      {/* page header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-white text-xl font-semibold">Fraud Trends</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Daily fraud patterns over time
          </p>
        </div>
        <RangeSelector value={days} onChange={setDays} />
      </div>

      {/* chart 1 — fraud rate % per day */}
      <ChartCard
        title="Fraud Rate % Per Day"
        subtitle="Percentage of transactions flagged as fraud each day"
        isLoading={fraudLoading}
      >
        <BaseLineChart
          data={fraudRateRows}
          lines={[
            { dataKey: "fraud_rate_percent", name: "Fraud Rate %", color: "#ef4444" },
          ]}
          referenceLines={referenceLines}
          formatter={(val) => `${val}%`}
          yTickFormatter={(v) => `${v}%`}
        />
        <ModelVersionLegend referenceLines={referenceLines} />
      </ChartCard>

      {/* chart 2 — high + critical count per day overlaid with fraud rate */}
      <ChartCard
        title="High Risk Transactions Per Day"
        subtitle="Number of HIGH and CRITICAL transactions daily"
        isLoading={fraudLoading || actionsLoading}
      >
        <BaseLineChart
          data={combinedRows}
          lines={[
            { dataKey: "fraud_count", name: "Fraud Count", color: "#ef4444" },
            { dataKey: "high_critical_count", name: "High + Critical", color: "#f97316" },
          ]}
          referenceLines={referenceLines}
          formatter={(val, key) =>
            key === "fraud_rate_percent" ? `${val}%` : formatCompact(val)
          }
          yTickFormatter={(v) => formatCompact(v)}
        />
        <ModelVersionLegend referenceLines={referenceLines} />
      </ChartCard>

      {/* chart 3 — amount at risk per day */}
      <ChartCard
        title="Amount at Risk Per Day (USD)"
        subtitle="Total USD value of fraud transactions each day"
        isLoading={amountLoading}
      >
        <BaseLineChart
          data={amountRows}
          lines={[
            { dataKey: "amount_at_risk_usd", name: "Amount at Risk", color: "#f97316" },
            { dataKey: "total_volume_usd", name: "Total Volume", color: "#374151" },
          ]}
          referenceLines={referenceLines}
          formatter={(val) => formatUSD(val)}
          yTickFormatter={(v) => `$${formatCompact(v)}`}
        />
        <ModelVersionLegend referenceLines={referenceLines} />
      </ChartCard>

      {/* chart 4 — fraud rate with model version changes overlaid */}
      <ChartCard
        title="Fraud Rate vs Model Retraining"
        subtitle="See how model retraining events affect fraud detection rate"
        isLoading={fraudLoading}
      >
        {referenceLines.length === 0 ? (
          <div className="h-64 flex items-center justify-center">
            <p className="text-gray-500 text-sm">
              No model retraining events found in metrics_history.json
            </p>
          </div>
        ) : (
          <>
            <BaseLineChart
              data={fraudRateRows}
              lines={[
                { dataKey: "fraud_rate_percent", name: "Fraud Rate %", color: "#6366f1" },
              ]}
              referenceLines={referenceLines}
              formatter={(val) => `${val}%`}
              yTickFormatter={(v) => `${v}%`}
            />
            <ModelVersionLegend referenceLines={referenceLines} />
          </>
        )}
      </ChartCard>

      {/* summary stats row */}
      <TrendSummary
        fraudData={fraudRateData}
        amountData={amountData}
        days={days}
      />

    </div>
  );
}

// small legend explaining the vertical reference lines
function ModelVersionLegend({ referenceLines }) {
  if (!referenceLines || referenceLines.length === 0) return null;
  return (
    <div className="flex items-center gap-1.5 mt-3">
      <span className="w-4 border-t border-dashed border-indigo-500" />
      <span className="text-gray-500 text-xs">
        Vertical lines = model retraining events ({referenceLines.length} total)
      </span>
    </div>
  );
}

// summary stats at the bottom of the page
function TrendSummary({ fraudData, amountData, days }) {
  if (!fraudData?.data || !amountData?.data) return null;

  const fraudRows = fraudData.data;
  const amountRows = amountData.data;

  if (fraudRows.length === 0) return null;

  const avgFraudRate =
    fraudRows.reduce((sum, r) => sum + parseFloat(r.fraud_rate_percent ?? 0), 0) /
    fraudRows.length;

  const totalAtRisk = amountRows.reduce(
    (sum, r) => sum + parseFloat(r.amount_at_risk_usd ?? 0),
    0
  );

  const peakFraudRate = Math.max(
    ...fraudRows.map((r) => parseFloat(r.fraud_rate_percent ?? 0))
  );

  const peakRow = fraudRows.find(
    (r) => parseFloat(r.fraud_rate_percent) === peakFraudRate
  );

  const stats = [
    {
      label: `Avg Fraud Rate (${days}d)`,
      value: formatPercent(avgFraudRate),
      color: "text-yellow-400",
    },
    {
      label: `Total Amount at Risk (${days}d)`,
      value: formatUSD(totalAtRisk),
      color: "text-orange-400",
    },
    {
      label: "Peak Fraud Rate",
      value: formatPercent(peakFraudRate),
      color: "text-red-400",
    },
    {
      label: "Peak Date",
      value: peakRow
        ? format(new Date(peakRow.date), "MMM dd, yyyy")
        : "-",
      color: "text-gray-300",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {stats.map((s) => (
        <div
          key={s.label}
          className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center"
        >
          <p className={`text-lg font-semibold ${s.color}`}>{s.value}</p>
          <p className="text-gray-500 text-xs mt-1">{s.label}</p>
        </div>
      ))}
    </div>
  );
}