import { useLocation } from "react-router-dom";
import { NAV_ITEMS } from "@/constants";
import { formatDateTime } from "@/lib/utils";
import { RefreshCw } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

// derive page title from current route
const getPageTitle = (pathname) => {
  const item = NAV_ITEMS.find((n) => n.href === pathname);
  return item?.label ?? "Dashboard";
};

export default function Topbar() {
  const location = useLocation();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries();
    setTimeout(() => setRefreshing(false), 600);
  };

  return (
    <header className="h-14 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-6 shrink-0">

      {/* page title */}
      <h1 className="text-white font-semibold text-base">
        {getPageTitle(location.pathname)}
      </h1>

      <div className="flex items-center gap-4">
        {/* current time */}
        <span className="text-gray-500 text-xs hidden md:block">
          {formatDateTime(new Date())}
        </span>

        {/* refresh all queries */}
        <button
          onClick={handleRefresh}
          className="text-gray-400 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-gray-800"
          title="Refresh all data"
        >
          <RefreshCw
            size={15}
            className={refreshing ? "animate-spin" : ""}
          />
        </button>

        {/* live indicator */}
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-gray-400 text-xs">Live</span>
        </div>
      </div>

    </header>
  );
}