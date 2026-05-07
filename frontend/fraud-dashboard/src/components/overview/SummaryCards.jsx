import { useState } from "react";
import { formatUSD, formatNumber, formatPercent } from "@/lib/utils";
import { TrendingUp, ShieldAlert, DollarSign, Activity, ShieldX, Eye, CheckCircle } from "lucide-react";
import { ACTION_COLORS } from "@/constants";

const RANGES = [
  { label: "Today", txKey: "transactions_today", fraudKey: "fraud_today" },
  { label: "This Week", txKey: "transactions_this_week", fraudKey: "fraud_this_week" },
  { label: "This Month", txKey: "transactions_this_month", fraudKey: "fraud_this_month" },
];

const StatCard = ({ title, value, sub, icon: Icon, iconBg, iconColor }) => (
  <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
    <div className="flex items-start justify-between">
      <div className="flex-1 min-w-0">
        <p className="text-gray-400 text-sm truncate">{title}</p>
        <p className="text-white text-2xl font-semibold mt-1 truncate">{value}</p>
        {sub && <p className="text-gray-500 text-xs mt-1 truncate">{sub}</p>}
      </div>
      <div className={`p-2 rounded-lg ml-3 shrink-0 ${iconBg}`}>
        <Icon size={18} className={iconColor} />
      </div>
    </div>
  </div>
);

const ActionCard = ({ label, total, unreviewed, color, icon: Icon }) => (
  <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
    <div className="flex items-center gap-2 mb-3">
      <Icon size={15} style={{ color }} />
      <p className="text-gray-400 text-sm">{label}</p>
    </div>
    <p className="text-white text-2xl font-semibold">{formatNumber(total ?? 0)}</p>
    {unreviewed > 0 && (
      <p className="text-xs mt-1" style={{ color }}>
        {formatNumber(unreviewed)} unreviewed
      </p>
    )}
  </div>
);

export default function SummaryCards({ data, actions }) {
  const [activeRange, setActiveRange] = useState(0);

  if (!data) return null;

  const range = RANGES[activeRange];

  return (
    <div className="space-y-4">

      {/* range selector */}
      <div className="flex items-center justify-between">
        <p className="text-gray-400 text-sm">Overview</p>
        <div className="flex bg-gray-900 border border-gray-800 rounded-lg p-0.5 gap-0.5">
          {RANGES.map((r, i) => (
            <button
              key={r.label}
              onClick={() => setActiveRange(i)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                activeRange === i
                  ? "bg-gray-700 text-white"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* top row - transactions + fraud for selected range */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          title={`Transactions - ${range.label}`}
          value={formatNumber(data[range.txKey] ?? 0)}
          sub={`${formatNumber(data.total_transactions)} all time`}
          icon={Activity}
          iconBg="bg-blue-500/10"
          iconColor="text-blue-400"
        />
        <StatCard
          title={`Fraud Detected - ${range.label}`}
          value={formatNumber(data[range.fraudKey] ?? 0)}
          sub={`${formatPercent(data.fraud_rate_percent)} overall fraud rate`}
          icon={ShieldAlert}
          iconBg="bg-red-500/10"
          iconColor="text-red-400"
        />
        <StatCard
          title="Total Amount at Risk"
          value={formatUSD(data.amount_at_risk_usd ?? 0)}
          sub="All fraud transactions in USD"
          icon={DollarSign}
          iconBg="bg-orange-500/10"
          iconColor="text-orange-400"
        />
        <StatCard
          title="Total Volume"
          value={formatUSD(data.total_volume_usd ?? 0)}
          sub={`${formatPercent(data.fraud_rate_percent)} is fraud`}
          icon={TrendingUp}
          iconBg="bg-green-500/10"
          iconColor="text-green-400"
        />
      </div>

      {/* bottom row - action counts */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <ActionCard
          label="Blocked"
          total={actions?.BLOCK?.total}
          unreviewed={actions?.BLOCK?.unreviewed}
          color={ACTION_COLORS.BLOCK}
          icon={ShieldX}
        />
        <ActionCard
          label="Flagged for Review"
          total={actions?.REVIEW?.total}
          unreviewed={actions?.REVIEW?.unreviewed}
          color={ACTION_COLORS.REVIEW}
          icon={Eye}
        />
        <ActionCard
          label="Allowed"
          total={actions?.ALLOW?.total}
          unreviewed={actions?.ALLOW?.unreviewed}
          color={ACTION_COLORS.ALLOW}
          icon={CheckCircle}
        />
      </div>

    </div>
  );
}