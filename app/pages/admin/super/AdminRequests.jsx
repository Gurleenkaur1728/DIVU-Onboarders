import { useState } from "react";
import Sidebar, { ROLES } from "../../../components/Sidebar.jsx";
import { CheckCircle, XCircle } from "lucide-react";

export default function AdminRequests() {
  const [requests] = useState([
    { id: 1, admin: "Alice", request: "Delete employee record EMP002", date: "2025-09-05" },
    { id: 2, admin: "Bob", request: "Remove outdated training module", date: "2025-09-06" },
  ]);

  return (
    <div className="flex min-h-dvh bg-cover bg-center relative" style={{ backgroundImage: "url('/bg.png')" }}>
      <Sidebar active="admin-requests" role={ROLES.SUPER_ADMIN} />

      <div className="flex-1 flex flex-col p-6">
        {/* Ribbon */}
        <div className="flex items-center justify-between h-12 rounded-md bg-emerald-100/90 px-4 mb-4 shadow">
          <span className="font-semibold text-emerald-950">Super Admin – Admin Requests</span>
        </div>

        {/* Title */}
        <div className="bg-emerald-900/95 px-6 py-4 rounded-xl mb-6 shadow-lg text-emerald-100 font-extrabold border border-emerald-400/70 text-2xl tracking-wide">
          ADMIN REQUESTS
        </div>

        {/* Table */}
        <div className="overflow-x-auto bg-white rounded-xl shadow-lg border border-emerald-400/70">
          <table className="min-w-[700px] w-full">
            <thead>
              <tr className="bg-emerald-900/95 text-emerald-100">
                <Th>Admin</Th>
                <Th>Request</Th>
                <Th>Date</Th>
                <Th>Actions</Th>
              </tr>
            </thead>
            <tbody>
              {requests.map((req, idx) => (
                <tr key={req.id} className={idx % 2 === 0 ? "bg-emerald-50/90" : "bg-emerald-100/80"}>
                  <td className="px-4 py-3">{req.admin}</td>
                  <td className="px-4 py-3">{req.request}</td>
                  <td className="px-4 py-3">{req.date}</td>
                  <td className="px-4 py-3 flex gap-2">
                    <button className="flex items-center gap-1 px-2 py-1 rounded bg-emerald-500 text-white hover:bg-emerald-600">
                      <CheckCircle size={14} /> Approve
                    </button>
                    <button className="flex items-center gap-1 px-2 py-1 rounded bg-red-500 text-white hover:bg-red-600">
                      <XCircle size={14} /> Reject
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Th({ children }) {
  return <th className="px-4 py-3 font-bold">{children}</th>;
}
