import { formatNumber } from "@/lib/utils";
import { RISK_COLORS } from "@/constants";

const RiskBar = ({ label, count, percentage, color }) => (
  <div className="flex items-center gap-3">
    <div className="w-16 shrink-0">
      <p className="text-gray-400 text-xs">{label}</p>
    </div>
    <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${percentage}%`, background: color }}
      />
    </div>
    <div className="w-20 text-right shrink-0">
      <p className="text-white text-xs font-medium">{formatNumber(count)}</p>
      <p className="text-gray-500 text-xs">{percentage}%</p>
    </div>
  </div>
);

export default function ActionBreakdown({ riskLevels }) {
  if (!riskLevels) return null;

  const items = [
    { label: "Critical", key: "CRITICAL" },
    { label: "High", key: "HIGH" },
    { label: "Medium", key: "MEDIUM" },
    { label: "Low", key: "LOW" },
  ];

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <p className="text-white text-sm font-medium mb-4">Risk Level Distribution</p>
      <div className="space-y-3">
        {items.map(({ label, key }) => (
          <RiskBar
            key={key}
            label={label}
            count={riskLevels[key]?.count ?? 0}
            percentage={riskLevels[key]?.percentage ?? 0}
            color={RISK_COLORS[key]}
          />
        ))}
      </div>
    </div>
  );
}

// import { formatNumber } from "@/lib/utils";
// import { ACTION_COLORS, RISK_COLORS } from "@/constants";
// import { ShieldX, Eye, CheckCircle } from "lucide-react";

// const ActionCard = ({ label, total, unreviewed, color, icon: Icon }) => (
//   <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
//     <div className="flex items-center gap-3 mb-3">
//       <div className="p-2 rounded-lg" style={{ background: `${color}15` }}>
//         <Icon size={16} style={{ color }} />
//       </div>
//       <p className="text-gray-300 text-sm font-medium">{label}</p>
//     </div>
//     <p className="text-white text-2xl font-semibold">{formatNumber(total)}</p>
//     {unreviewed > 0 && (
//       <p className="text-xs mt-1" style={{ color }}>
//         {formatNumber(unreviewed)} unreviewed
//       </p>
//     )}
//   </div>
// );

// const RiskCard = ({ label, count, percentage, color }) => (
//   <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
//     <div className="flex items-center justify-between mb-2">
//       <p className="text-gray-400 text-sm">{label}</p>
//       <span
//         className="text-xs font-semibold px-2 py-0.5 rounded-full"
//         style={{ background: `${color}20`, color }}
//       >
//         {percentage}%
//       </span>
//     </div>
//     <p className="text-white text-2xl font-semibold">{formatNumber(count)}</p>
//     {/* progress bar showing proportion */}
//     <div className="mt-3 h-1.5 bg-gray-800 rounded-full overflow-hidden">
//       <div
//         className="h-full rounded-full transition-all"
//         style={{ width: `${percentage}%`, background: color }}
//       />
//     </div>
//   </div>
// );

// export default function ActionBreakdown({ actions, riskLevels }) {
//   if (!actions || !riskLevels) return null;

//   const actionItems = [
//     { label: "Blocked", key: "BLOCK", icon: ShieldX },
//     { label: "Under Review", key: "REVIEW", icon: Eye },
//     { label: "Allowed", key: "ALLOW", icon: CheckCircle },
//   ];

//   const riskItems = [
//     { label: "Critical", key: "CRITICAL" },
//     { label: "High", key: "HIGH" },
//     { label: "Medium", key: "MEDIUM" },
//     { label: "Low", key: "LOW" },
//   ];

//   return (
//     <div className="space-y-4">
//       {/* action breakdown */}
//       <div>
//         <p className="text-gray-400 text-sm font-medium mb-3">Action Breakdown</p>
//         <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
//           {actionItems.map(({ label, key, icon }) => (
//             <ActionCard
//               key={key}
//               label={label}
//               total={actions[key]?.total ?? 0}
//               unreviewed={actions[key]?.unreviewed ?? 0}
//               color={ACTION_COLORS[key]}
//               icon={icon}
//             />
//           ))}
//         </div>
//       </div>

//       {/* risk level breakdown */}
//       <div>
//         <p className="text-gray-400 text-sm font-medium mb-3">Risk Level Breakdown</p>
//         <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
//           {riskItems.map(({ label, key }) => (
//             <RiskCard
//               key={key}
//               label={label}
//               count={riskLevels[key]?.count ?? 0}
//               percentage={riskLevels[key]?.percentage ?? 0}
//               color={RISK_COLORS[key]}
//             />
//           ))}
//         </div>
//       </div>
//     </div>
//   );
// }