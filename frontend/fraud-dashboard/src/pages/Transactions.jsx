import { useState } from "react";
import { useRecentTransactions } from "@/hooks/useRecentTransactions";
import TransactionTable from "@/components/transactions/TransactionTable";

export default function Transactions() {
  const [limit, setLimit] = useState(20);
  const { data, isLoading, error, dataUpdatedAt } = useRecentTransactions(limit);

  const transactions = data?.data ?? [];

  return (
    <div className="space-y-4">

      {/* page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white text-xl font-semibold">Transactions</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Live feed updating every 5 seconds
          </p>
        </div>
        {dataUpdatedAt > 0 && (
          <p className="text-gray-600 text-xs">
            Last updated{" "}
            {new Date(dataUpdatedAt).toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })}
          </p>
        )}
      </div>

      {/* error state */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
          <p className="text-red-400 text-sm font-medium">Failed to load transactions</p>
          <p className="text-red-400/70 text-xs mt-1">{error.message}</p>
        </div>
      )}

      {/* live table */}
      <TransactionTable
        data={transactions}
        isLoading={isLoading}
        limit={limit}
        onLimitChange={setLimit}
      />

    </div>
  );
}