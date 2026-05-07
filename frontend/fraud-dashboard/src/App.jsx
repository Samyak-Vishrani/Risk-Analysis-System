import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";
import Overview from "@/pages/Overview";
import Transactions from "@/pages/Transactions";
// import Merchants from "@/pages/Merchants";
// import Customers from "@/pages/Customers";
// import Devices from "@/pages/Devices";
// import Geography from "@/pages/Geography";
// import Model from "@/pages/Model";
// import Alerts from "@/pages/Alerts";
// import Reviews from "@/pages/Reviews";

export default function App() {
  return (
    <BrowserRouter>
      <div className="flex h-screen bg-gray-950 text-white overflow-hidden">

        <Sidebar />

        <div className="flex flex-col flex-1 overflow-hidden">
          <Topbar />

          <main className="flex-1 overflow-y-auto p-6">
            <Routes>
              <Route path="/" element={<Navigate to="/overview" replace />} />
              <Route path="/overview" element={<Overview />} />
              <Route path="/transactions" element={<Transactions />} />
              {/* <Route path="/merchants" element={<Merchants />} />
              <Route path="/customers" element={<Customers />} />
              <Route path="/devices" element={<Devices />} />
              <Route path="/geography" element={<Geography />} />
              <Route path="/model" element={<Model />} />
              <Route path="/alerts" element={<Alerts />} />
              <Route path="/reviews" element={<Reviews />} /> */}
            </Routes>
          </main>
        </div>

      </div>
    </BrowserRouter>
  );
}