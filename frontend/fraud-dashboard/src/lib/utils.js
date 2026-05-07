import { format, formatDistanceToNow } from "date-fns";


// Currency
export const formatCurrency = (amount, currency = "USD") => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

export const formatUSD = (amount) => formatCurrency(amount, "USD");


// Numbers Format
export const formatNumber = (num) =>
  new Intl.NumberFormat("en-US").format(num);

export const formatPercent = (num) =>
  `${parseFloat(num).toFixed(2)}%`;

// compact large numbers - 1,200,000 → 1.2M
export const formatCompact = (num) =>
  new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(num);


// Dates
export const formatDate = (date) =>
  format(new Date(date), "MMM dd, yyyy");

export const formatDateTime = (date) =>
  format(new Date(date), "MMM dd, yyyy HH:mm");

export const formatTimeAgo = (date) =>
  formatDistanceToNow(new Date(date), { addSuffix: true });

export const formatMinutes = (minutes) => {
  if (!minutes || minutes === 0) return "-";
  if (minutes < 60)  return `${Math.round(minutes)}m`;
  if (minutes < 1440) return `${Math.round(minutes / 60)}h ${Math.round(minutes % 60)}m`;
  return `${Math.round(minutes / 1440)}d`;
};


// Risk
export const getRiskColor = (level) =>
  ({
    CRITICAL: "#ef4444",
    HIGH: "#f97316",
    MEDIUM: "#eab308",
    LOW: "#22c55e",
  }[level] ?? "#6b7280");

export const getRiskBgClass = (level) =>
  ({
    CRITICAL: "bg-red-500/10 text-red-400 border-red-500/20",
    HIGH: "bg-orange-500/10 text-orange-400 border-orange-500/20",
    MEDIUM: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    LOW: "bg-green-500/10 text-green-400 border-green-500/20",
  }[level] ?? "bg-gray-500/10 text-gray-400 border-gray-500/20");

export const getActionColor = (action) =>
  ({
    BLOCK: "#ef4444",
    REVIEW: "#f97316",
    ALLOW: "#22c55e",
  }[action] ?? "#6b7280");

export const getActionBgClass = (action) =>
  ({
    BLOCK: "bg-red-500/10 text-red-400 border-red-500/20",
    REVIEW: "bg-orange-500/10 text-orange-400 border-orange-500/20",
    ALLOW: "bg-green-500/10 text-green-400 border-green-500/20",
  }[action] ?? "bg-gray-500/10 text-gray-400 border-gray-500/20");



export const truncate = (str, length = 12) =>
  str?.length > length ? `${str.substring(0, length)}...` : str;

export const cn = (...classes) =>
  classes.filter(Boolean).join(" ");