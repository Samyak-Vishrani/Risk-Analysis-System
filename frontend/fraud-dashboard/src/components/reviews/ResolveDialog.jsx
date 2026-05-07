import { useState } from "react";
import { useResolveReview } from "@/hooks/useReviews";
import { ANALYST_DECISIONS } from "@/constants";
import { formatUSD, formatDateTime } from "@/lib/utils";
import RiskBadge from "@/components/transactions/RiskBadge";
import FraudProbBar from "@/components/transactions/FraudProbBar";
import { X, CheckCircle, Loader2 } from "lucide-react";

export default function ResolveDialog({ transaction, onClose }) {
  const [decision, setDecision] = useState(null);
  const [note, setNote] = useState("");
  const { mutate, isPending, error } = useResolveReview();

  if (!transaction) return null;

  const handleSubmit = () => {
    if (!decision) return;
    mutate(
      {
        transaction_id: transaction.transaction_id,
        analyst_decision: decision,
        analyst_note: note.trim() || undefined,
      },
      { onSuccess: onClose }
    );
  };

  return (
    // backdrop
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-lg shadow-2xl">

        {/* header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <p className="text-white font-semibold">Resolve Transaction</p>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-800 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* transaction details */}
        <div className="px-6 py-4 border-b border-gray-800 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-gray-400 text-sm">Transaction</p>
            <p className="text-white text-sm font-mono">#{transaction.transaction_id}</p>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-gray-400 text-sm">Amount</p>
            <div className="text-right">
              <p className="text-white text-sm font-medium">
                {formatUSD(transaction.amount_usd)}
              </p>
              <p className="text-gray-500 text-xs">
                {transaction.amount} {transaction.currency}
              </p>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-gray-400 text-sm">Risk Level</p>
            <RiskBadge level={transaction.risk_level} />
          </div>
          <div className="flex items-center justify-between">
            <p className="text-gray-400 text-sm">Fraud Probability</p>
            <div className="w-36">
              <FraudProbBar
                probability={transaction.fraud_probability}
                riskLevel={transaction.risk_level}
              />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-gray-400 text-sm">Merchant</p>
            <p className="text-white text-sm">{transaction.merchant_name ?? "-"}</p>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-gray-400 text-sm">Customer</p>
            <p className="text-white text-sm">{transaction.customer_name ?? "-"}</p>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-gray-400 text-sm">Scored At</p>
            <p className="text-gray-400 text-xs">
              {transaction.scored_at ? formatDateTime(transaction.scored_at) : "-"}
            </p>
          </div>
        </div>

        {/* analyst decision */}
        <div className="px-6 py-4 space-y-3">
          <p className="text-gray-300 text-sm font-medium">Your Decision</p>
          <div className="space-y-2">
            {ANALYST_DECISIONS.map((d) => (
              <button
                key={d.value}
                onClick={() => setDecision(d.value)}
                className={`w-full flex items-start gap-3 p-3 rounded-xl border text-left transition-colors ${
                  decision === d.value
                    ? "border-indigo-500 bg-indigo-500/10"
                    : "border-gray-800 hover:border-gray-700 bg-gray-800/30"
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full border-2 mt-0.5 shrink-0 flex items-center justify-center ${
                    decision === d.value
                      ? "border-indigo-500 bg-indigo-500"
                      : "border-gray-600"
                  }`}
                >
                  {decision === d.value && (
                    <div className="w-1.5 h-1.5 bg-white rounded-full" />
                  )}
                </div>
                <div>
                  <p className={`text-sm font-medium ${d.color}`}>{d.label}</p>
                  <p className="text-gray-500 text-xs mt-0.5">{d.description}</p>
                </div>
              </button>
            ))}
          </div>

          {/* optional note */}
          <div>
            <p className="text-gray-400 text-xs mb-1.5">Note (optional)</p>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add context or reasoning..."
              rows={2}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 outline-none focus:border-indigo-500 resize-none"
            />
          </div>

          {error && (
            <p className="text-red-400 text-xs">
              {error.response?.data?.error ?? "Failed to resolve. Try again."}
            </p>
          )}
        </div>

        {/* footer */}
        <div className="px-6 py-4 border-t border-gray-800 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!decision || isPending}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
          >
            {isPending ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <CheckCircle size={14} />
            )}
            {isPending ? "Resolving..." : "Confirm Decision"}
          </button>
        </div>

      </div>
    </div>
  );
}