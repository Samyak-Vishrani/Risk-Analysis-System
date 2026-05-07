import { useSummary } from "@/hooks/useSummary";
import SummaryCards from "@/components/overview/SummaryCards";
import ActionBreakdown from "@/components/overview/ActionBreakdown";
import ModelInfo from "@/components/overview/ModelInfo";

const SkeletonCard = () => (
  <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 animate-pulse">
    <div className="flex items-start justify-between">
      <div className="flex-1">
        <div className="h-3 bg-gray-800 rounded w-28 mb-3" />
        <div className="h-7 bg-gray-800 rounded w-36 mb-2" />
        <div className="h-3 bg-gray-800 rounded w-20" />
      </div>
      <div className="w-9 h-9 bg-gray-800 rounded-lg ml-3" />
    </div>
  </div>
);

export default function Overview() {
  const { summary, actions, riskLevels, isLoading, error } = useSummary();

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-400 font-medium mb-1">Failed to load overview</p>
          <p className="text-gray-500 text-sm">
            Is your backend running at{" "}
            <span className="text-gray-400 font-mono">
              {import.meta.env.VITE_API_URL}
            </span>
            ?
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">

      {/* range-filtered transaction + fraud + volume + risk cards */}
      {isLoading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => <SkeletonCard key={i} />)}
          </div>
        </div>
      ) : (
        <SummaryCards data={summary} actions={actions} />
      )}

      {/* bottom row - risk distribution + model status side by side */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {isLoading ? (
          <>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 animate-pulse h-40" />
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 animate-pulse h-40" />
          </>
        ) : (
          <>
            <ActionBreakdown riskLevels={riskLevels} />
            <ModelInfo />
          </>
        )}
      </div>

    </div>
  );
}