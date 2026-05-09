import { useState } from "react";
import { useTopFraudMerchants, useMerchantsByCategory } from "@/hooks/useMerchants";
import TopMerchantsTable from "@/components/merchants/TopMerchantsTable";
import CategoryBarChart from "@/components/merchants/CategoryBarChart";
import MerchantScatter from "@/components/merchants/MerchantScatter";
import { formatUSD, formatPercent, formatNumber } from "@/lib/utils";

export default function Merchants() {
  const [tableLimit, setTableLimit] = useState(10);

  const { data: topData, isLoading: topLoading } = useTopFraudMerchants(tableLimit);
  const { data: categoryData, isLoading: categoryLoading } = useMerchantsByCategory();

  const topMerchants = topData?.data ?? [];
  const categoryRows = categoryData?.data ?? [];

  // summary stats across all categories
  const totalFraud = categoryRows.reduce((s, r) => s + r.fraud_count, 0);
  const totalAtRisk = categoryRows.reduce((s, r) => s + r.amount_at_risk_usd, 0);
  const highestCategory = [...categoryRows].sort(
    (a, b) => b.fraud_rate_percent - a.fraud_rate_percent
  )[0];

  return (
    <div className="space-y-4">

      {/* page header */}
      <div>
        <h1 className="text-white text-xl font-semibold">Merchant Analysis</h1>
        <p className="text-gray-500 text-sm mt-0.5">
          Which merchants are generating the most fraud
        </p>
      </div>

      {/* summary chips */}
      {!categoryLoading && categoryRows.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            {
              label: "Total Merchants",
              value: formatNumber(
                categoryRows.reduce((s, r) => s + r.merchant_count, 0)
              ),
              color: "text-blue-400",
            },
            {
              label: "Total Fraud Txns",
              value: formatNumber(totalFraud),
              color: "text-red-400",
            },
            {
              label: "Total at Risk",
              value: formatUSD(totalAtRisk),
              color: "text-orange-400",
            },
            {
              label: "Riskiest Category",
              value: highestCategory?.category ?? "-",
              color: "text-yellow-400",
            },
          ].map((s) => (
            <div
              key={s.label}
              className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center"
            >
              <p className={`text-base font-semibold truncate ${s.color}`}>
                {s.value}
              </p>
              <p className="text-gray-500 text-xs mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* top merchants table */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-gray-400 text-xs">Showing top merchants</p>
          <select
            value={tableLimit}
            onChange={(e) => setTableLimit(Number(e.target.value))}
            className="bg-gray-800 border border-gray-700 text-gray-300 text-xs rounded-lg px-2 py-1.5 outline-none"
          >
            {[10, 20, 50].map((n) => (
              <option key={n} value={n}>Top {n}</option>
            ))}
          </select>
        </div>
        <TopMerchantsTable data={topMerchants} isLoading={topLoading} />
      </div>

      {/* bar chart + scatter side by side on large screens */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <CategoryBarChart data={categoryRows} isLoading={categoryLoading} />
        <MerchantScatter data={topMerchants} isLoading={topLoading} />
      </div>

    </div>
  );
}