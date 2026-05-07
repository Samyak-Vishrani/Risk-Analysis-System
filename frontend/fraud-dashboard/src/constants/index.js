import {
  LayoutDashboard,
  ArrowLeftRight,
  Bell,
  ClipboardCheck,
  Store,
  Users,
  Smartphone,
  Globe,
  Brain,
} from "lucide-react";

//  RISK 

export const RISK_COLORS = {
  CRITICAL: "#ef4444",
  HIGH: "#f97316",
  MEDIUM: "#eab308",
  LOW: "#22c55e",
};

export const RISK_LEVELS = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];


//  ACTIONS 
export const ACTION_COLORS = {
  BLOCK: "#ef4444",
  REVIEW: "#f97316",
  ALLOW: "#22c55e",
};

export const ACTIONS = ["BLOCK", "REVIEW", "ALLOW"];


//  ANALYST DECISIONS 
export const ANALYST_DECISIONS = [
  {
    value: "CONFIRMED_FRAUD",
    label: "Confirmed Fraud",
    description: "This transaction is genuine fraud",
    color: "text-red-400",
  },
  {
    value: "FALSE_POSITIVE",
    label: "False Positive",
    description: "Legitimate transaction incorrectly flagged",
    color: "text-green-400",
  },
  {
    value: "NEEDS_INVESTIGATION",
    label: "Needs Investigation",
    description: "Requires further review",
    color: "text-yellow-400",
  },
];


//  CURRENCIES 
export const CURRENCY_SYMBOLS = {
  USD: "$",
  INR: "₹",
  EUR: "€",
  GBP: "£",
  JPY: "¥",
  AED: "د.إ",
};

export const CURRENCIES = ["USD", "INR", "EUR", "GBP", "JPY", "AED"];


//  CHART COLORS 
// consistent palette used across all recharts components
export const CHART_COLORS = [
  "#6366f1",  // indigo
  "#22c55e",  // green
  "#f97316",  // orange
  "#3b82f6",  // blue
  "#a855f7",  // purple
  "#ef4444",  // red
  "#eab308",  // yellow
  "#14b8a6",  // teal
];


//  NAV 
export const NAV_ITEMS = [
  {
    label: "Overview",
    href:  "/overview",
    icon:  LayoutDashboard,
  },
  {
    label: "Transactions",
    href:  "/transactions",
    icon:  ArrowLeftRight,
  },
  {
    label: "Alerts",
    href:  "/alerts",
    icon:  Bell,
    badge: true,
  },
  {
    label: "Reviews",
    href:  "/reviews",
    icon:  ClipboardCheck,
    badge: true,
  },
  {
    label: "Merchants",
    href:  "/merchants",
    icon:  Store,
  },
  {
    label: "Customers",
    href:  "/customers",
    icon:  Users,
  },
  {
    label: "Devices",
    href:  "/devices",
    icon:  Smartphone,
  },
  {
    label: "Geography",
    href:  "/geography",
    icon:  Globe,
  },
  {
    label: "Model",
    href:  "/model",
    icon:  Brain,
  },
];


//  POLLING INTERVALS
export const POLL_INTERVALS = {
  ALERT_COUNT: 10000,   // nav badge - every 10s
  RECENT_FEED: 5000,   // live transaction feed - every 5s
  SUMMARY: 30000,   // overview cards - every 30s
  TRENDS: 60000,   // charts - every 60s
  STATIC: 300000,   // merchants, geography etc - every 5 min
};


//  TREND RANGE OPTIONS 
export const TREND_RANGES = [
  { label: "7 days", value: 7 },
  { label: "30 days", value: 30 },
  { label: "90 days", value: 90 },
];