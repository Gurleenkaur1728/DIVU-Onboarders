import { useEffect, useState } from "react";
import Sidebar, { ROLES } from "../../../components/Sidebar.jsx";

export default function EmployeeRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: Replace with backend fetch
    setTimeout(() => {
      setRequests([
        { id: "req-1", email: "newuser@divu.com", position: "Designer", status: "submitted" },
        { id: "req-2", email: "another@divu.com", position: "Engineer", status: "submitted" },
      ]);
      setLoading(false);
    }, 500);
  }, []);

  return (
    <div
      className="flex min-h-dvh bg-cover bg-center relative"
      style={{ backgroundImage: "url('/bg.png')" }}
    >
      <Sidebar active="employee-requests" role={ROLES.SUPER_ADMIN} />

      <div className="flex-1 flex flex-col p-6 z-10">
        {/* Ribbon */}
        <div className="flex items-center justify-between h-12 rounded-md bg-emerald-100/90 px-4 mb-4 shadow">
          <span className="font-semibold text-emerald-950">
            Super Admin – Employee Requests
          </span>
        </div>

        {/* Title */}
        <div className="bg-emerald-900/95 px-6 py-4 rounded-xl mb-4 shadow-lg text-emerald-100 font-extrabold border border-emerald-400/70 text-2xl tracking-wide">
          EMPLOYEE REQUESTS
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-lg border border-emerald-400/70 shadow-lg bg-white">
          {loading ? (
            <p className="p-4">Loading...</p>
          ) : requests.length === 0 ? (
            <p className="p-4">No pending requests.</p>
          ) : (
            <table className="min-w-[900px] w-full border-collapse">
              <thead>
                <tr className="bg-emerald-900/95 text-emerald-100">
                  <Th>Email</Th>
                  <Th>Position</Th>
                  <Th>Status</Th>
                  <Th>Actions</Th>
                </tr>
              </thead>
              <tbody>
                {requests.map((req, idx) => (
                  <tr
                    key={req.id}
                    className={
                      idx % 2 === 0 ? "bg-emerald-50/90" : "bg-emerald-100/80"
                    }
                  >
                    <td className="px-4 py-3">{req.email}</td>
                    <td className="px-4 py-3">{req.position}</td>
                    <td className="px-4 py-3">{req.status}</td>
                    <td className="px-4 py-3 flex gap-2">
                      <button className="px-3 py-1 rounded bg-emerald-600 text-white hover:bg-emerald-500">
                        Approve
                      </button>
                      <button className="px-3 py-1 rounded bg-red-600 text-white hover:bg-red-500">
                        Reject
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

function Th({ children }) {
  return (
    <th className="px-4 py-3 font-bold border-r border-emerald-800/50">
      {children}
    </th>
  );
}
