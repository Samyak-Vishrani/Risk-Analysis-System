import { formatNumber, formatPercent, formatUSD, getRiskColor } from "@/lib/utils";
import ChartCard from "@/components/charts/ChartCard";
import BaseBarChart from "@/components/charts/BaseBarChart";
import { useState } from "react";

const MODES = [
  { key: "fraud_count", label: "Fraud Count" },
  { key: "fraud_rate_percent", label: "Fraud Rate %" },
  { key: "amount_at_risk_usd", label: "Amount at Risk" },
];

export default function CountryBarChart({ data, isLoading }) {
  const [mode, setMode] = useState("fraud_count");

  if (!data) return null;

  const top10 = [...data]
    .sort((a, b) => b[mode] - a[mode])
    .slice(0, 10)
    .map((row) => ({
      name: row.country,
      value: parseFloat(row[mode] ?? 0),
      fraud_count: row.fraud_count,
      fraud_rate: row.fraud_rate_percent,
      amount_at_risk: row.amount_at_risk_usd,
    }));

  const formatter = (val) => {
    if (mode === "fraud_rate_percent") return `${val}%`;
    if (mode === "amount_at_risk_usd") return formatUSD(val);
    return formatNumber(val);
  };

  const yFormatter = (v) => {
    if (mode === "fraud_rate_percent") return `${v}%`;
    if (mode === "amount_at_risk_usd") return `$${(v / 1000).toFixed(0)}k`;
    return formatNumber(v);
  };

  return (
    <ChartCard
      title="Top 10 Countries by Fraud"
      subtitle="Countries with the most fraud activity"
      isLoading={isLoading}
      controls={
        <div className="flex bg-gray-800 border border-gray-700 rounded-lg p-0.5 gap-0.5">
          {MODES.map((m) => (
            <button
              key={m.key}
              onClick={() => setMode(m.key)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                mode === m.key
                  ? "bg-gray-700 text-white"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      }
    >
      <BaseBarChart
        data={top10}
        xDataKey="name"
        bars={[{ dataKey: "value", name: MODES.find((m) => m.key === mode)?.label, color: "#6366f1" }]}
        formatter={formatter}
        yTickFormatter={yFormatter}
        xTickFormatter={(v) => v?.length > 8 ? `${v.slice(0, 8)}...` : v}
        colorByValue={(val) => {
          const max = Math.max(...top10.map((r) => r.value));
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