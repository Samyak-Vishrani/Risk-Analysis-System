import { TREND_RANGES } from "@/constants";

export default function RangeSelector({ value, onChange }) {
  return (
    <div className="flex bg-gray-800 border border-gray-700 rounded-lg p-0.5 gap-0.5">
      {TREND_RANGES.map((r) => (
        <button
          key={r.value}
          onClick={() => onChange(r.value)}
          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
            value === r.value
              ? "bg-gray-700 text-white"
              : "text-gray-400 hover:text-white"
          }`}
        >
          {r.label}
        </button>
      ))}
    </div>
  );
}