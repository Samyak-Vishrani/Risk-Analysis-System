import {
  useModelHealth,
  useModelMetrics,
  useModelChampion,
  useModelFeatures,
} from "@/hooks/useModel";
import ChampionCards from "@/components/model/ChampionCards";
import MetricsLineChart from "@/components/model/MetricsLineChart";
import TrainingHistory from "@/components/model/TrainingHistory";
import FeatureImportance from "@/components/model/FeatureImportance";
import { Brain, RefreshCw } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

export default function Model() {
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const { data: healthData, isLoading: healthLoading } = useModelHealth();
  const { data: metricsData, isLoading: metricsLoading } = useModelMetrics();
  const { data: championData, isLoading: championLoading } = useModelChampion();
  const { data: featuresData, isLoading: featuresLoading } = useModelFeatures();

  const health = healthData?.data;
  const champion = championData?.data;
  const allRuns = metricsData?.data ?? [];
  const summary = metricsData?.summary;
  const features = featuresData?.data ?? [];
  const grouped = featuresData?.grouped;
  const modelVersion = featuresData?.model_version;

  const handleRefresh = async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ["modelHealth"] });
    await queryClient.invalidateQueries({ queryKey: ["modelMetrics"] });
    await queryClient.invalidateQueries({ queryKey: ["modelChampion"] });
    await queryClient.invalidateQueries({ queryKey: ["modelFeatures"] });
    setTimeout(() => setRefreshing(false), 600);
  };

  return (
    <div className="space-y-4">

      {/* page header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-white text-xl font-semibold">Model Performance</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Track how the fraud detection model improves over time
          </p>
        </div>
        <button
          onClick={handleRefresh}
          className="flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 text-xs rounded-lg transition-colors"
        >
          <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* champion metric cards */}
      <ChampionCards
        champion={champion}
        health={health}
        metricsData={metricsData}
      />

      {/* metrics line chart */}
      <MetricsLineChart
        data={allRuns}
        isLoading={metricsLoading}
      />

      {/* feature importance + training history side by side on xl */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <FeatureImportance
          data={features}
          grouped={grouped}
          modelVersion={modelVersion}
          isLoading={featuresLoading}
        />
        <TrainingHistory
          data={allRuns}
          summary={summary}
          isLoading={metricsLoading}
        />
      </div>

    </div>
  );
}