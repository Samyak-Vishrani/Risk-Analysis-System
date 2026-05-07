import { NavLink } from "react-router-dom";
import { NAV_ITEMS } from "@/constants";
import NavBadge from "./NavBadge";

export default function Sidebar() {
  return (
    <aside className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col h-screen shrink-0">

      {/* logo */}
      <div className="px-6 py-5 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center">
            <span className="text-white text-sm font-bold">F</span>
          </div>
          <div>
            <p className="text-white font-semibold text-sm leading-none">FraudGuard</p>
            <p className="text-gray-500 text-xs mt-0.5">Detection System</p>
          </div>
        </div>
      </div>

      {/* nav items */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.href}
            to={item.href}
            className={({ isActive }) =>
              `flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-colors ${
                isActive
                  ? "bg-gray-800 text-white"
                  : "text-gray-400 hover:text-white hover:bg-gray-800/50"
              }`
            }
          >
            <div className="flex items-center gap-3">
              <item.icon size={16} />
              <span>{item.label}</span>
            </div>

            {/* show alert badge on Alerts and Reviews nav items */}
            {item.badge && <NavBadge label={item.label} />}
          </NavLink>
        ))}
      </nav>

      {/* footer */}
      <div className="px-4 py-4 border-t border-gray-800">
        <p className="text-gray-600 text-xs">Fraud Detection Dashboard</p>
        <p className="text-gray-700 text-xs mt-0.5">v1.0.0</p>
      </div>

    </aside>
  );
}