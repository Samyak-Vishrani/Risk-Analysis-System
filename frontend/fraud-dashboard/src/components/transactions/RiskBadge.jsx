import { getRiskBgClass } from "@/lib/utils";

export default function RiskBadge({ level }) {
  if (!level) return <span className="text-gray-500 text-xs">-</span>;

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${getRiskBgClass(level)}`}
    >
      {level}
    </span>
  );
}