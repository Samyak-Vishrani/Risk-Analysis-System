export default function ChartCard({ title, subtitle, controls, children, isLoading }) {
  if (isLoading) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 animate-pulse">
        <div className="h-4 bg-gray-800 rounded w-40 mb-2" />
        <div className="h-3 bg-gray-800 rounded w-28 mb-6" />
        <div className="h-64 bg-gray-800/50 rounded" />
      </div>
    );
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-white text-sm font-medium">{title}</p>
          {subtitle && <p className="text-gray-500 text-xs mt-0.5">{subtitle}</p>}
        </div>
        {controls && <div className="flex items-center gap-2">{controls}</div>}
      </div>
      {children}
    </div>
  );
}