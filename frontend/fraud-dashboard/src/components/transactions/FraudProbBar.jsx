import { getRiskColor } from "@/lib/utils";

export default function FraudProbBar({ probability, riskLevel }) {
  const pct = Math.round((probability ?? 0) * 100);
  const color = getRiskColor(riskLevel);

  return (
    <div className="flex items-center gap-2 min-w-[100px]">
      <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <span className="text-xs text-gray-400 w-8 text-right shrink-0">
        {pct}%
      </span>
    </div>
  );
}