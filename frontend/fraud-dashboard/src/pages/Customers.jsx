import { useState } from "react";
import {
  useTopRiskCustomers,
  useCustomersByAgeBracket,
} from "@/hooks/useCustomers";
import TopCustomersTable from "@/components/customers/TopCustomersTable";
import AgeBracketChart from "@/components/customers/AgeBracketChart";
import IncomeScatter from "@/components/customers/IncomeScatter";
import { formatUSD, formatNumber, formatPercent } from "@/lib/utils";

export default function Customers() {
  const [tableLimit, setTableLimit] = useState(10);

  const { data: topData, isLoading: topLoading } =
    useTopRiskCustomers(tableLimit);
  const { data: bracketData, isLoading: bracketLoading } =
    useCustomersByAgeBracket();

  const topCustomers = topData?.data ?? [];
  const bracketRows = bracketData?.data ?? [];

  const totalFraud = bracketRows.reduce((s, r) => s + r.fraud_count, 0);
  const totalCustomers = bracketRows.reduce((s, r) => s + r.customer_count, 0);
  const highestBracket = [...bracketRows].sort(
    (a, b) => b.fraud_rate_percent - a.fraud_rate_percent
  )[0];
  const totalAtRisk = topCustomers.reduce(
    (s, c) => s + (c.amount_at_risk_usd ?? 0),
    0
  );

  return (
    <div className="space-y-4">

      {/* page header */}
      <div>
        <h1 className="text-white text-xl font-semibold">Customer Analysis</h1>
        <p className="text-gray-500 text-sm mt-0.5">
          Patterns and risk signals at the customer level
        </p>
      </div>

      {/* summary chips */}
      {!bracketLoading && bracketRows.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            {
              label: "Total Customers",
              value: formatNumber(totalCustomers),
              color: "text-blue-400",
            },
            {
              label: "Total Fraud Txns",
              value: formatNumber(totalFraud),
              color: "text-red-400",
            },
            {
              label: "Amount at Risk (Top)",
              value: formatUSD(totalAtRisk),
              color: "text-orange-400",
            },
            {
              label: "Riskiest Age Group",
              value: highestBracket
                ? `${highestBracket.age_bracket} (${formatPercent(highestBracket.fraud_rate_percent)})`
                : "-",
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

      {/* top customers table */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-gray-400 text-xs">Showing top customers by risk</p>
          <select
            value={tableLimit}
            onChange={(e) => setTableLimit(Number(e.target.value))}
            className="bg-gray-800 border border-gray-700 text-gray-300 text-xs rounded-lg px-2 py-1.5 outline-none"
          >
            {[10, 20, 50].map((n) => (
              <option key={n} value={n}>
                Top {n}
              </option>
            ))}
          </select>
        </div>
        <TopCustomersTable data={topCustomers} isLoading={topLoading} />
      </div>

      {/* age bracket histogram + income scatter */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <AgeBracketChart data={bracketRows} isLoading={bracketLoading} />
        <IncomeScatter data={topCustomers} isLoading={topLoading} />
      </div>

    </div>
  );
}