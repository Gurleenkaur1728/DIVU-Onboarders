import { useEffect, useState } from "react";
import Sidebar, { ROLES } from "../../../components/Sidebar.jsx";

export default function Records() {
  const [activeTab, setActiveTab] = useState("invitations");
  const [invitations, setInvitations] = useState([]);
  const [selectedInvite, setSelectedInvite] = useState(null); // for modal
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load invitations (simulated for now)
  useEffect(() => {
    // TODO: replace with backend fetch → /api/audit-logs?entity_type=invitation
    setTimeout(() => {
      setInvitations([
        {
          entity_id: "abc-123",
          entity_label: "newuser@divu.com",
          performed_by_email: "hr@divu.com",
          created_at: "2025-09-26 09:15",
          details: { position: "Designer" },
        },
        {
          entity_id: "def-456",
          entity_label: "another@divu.com",
          performed_by_email: "hr@divu.com",
          created_at: "2025-09-26 09:45",
          details: { position: "Engineer" },
        },
      ]);
      setLoading(false);
    }, 500);
  }, []);

  const handleOpenModal = (invite) => {
    setSelectedInvite(invite);
    setLogs([]); // reset logs
    // TODO: replace with backend fetch → /api/audit-logs?entity_id=abc-123
    setTimeout(() => {
      setLogs([
        {
          id: 1,
          created_at: "2025-09-26 09:15",
          performed_by_email: "hr@divu.com",
          details: { event: "Invitation created" },
        },
        {
          id: 2,
          created_at: "2025-09-26 09:30",
          performed_by_email: "system",
          details: { event: "Invitation email sent" },
        },
        {
          id: 3,
          created_at: "2025-09-26 10:00",
          performed_by_email: "superadmin@divu.com",
          details: { event: "Invitation approved" },
        },
      ]);
    }, 300);
  };

  const handleCloseModal = () => {
    setSelectedInvite(null);
    setLogs([]);
  };

  return (
    <div
      className="flex min-h-dvh bg-cover bg-center relative"
      style={{ backgroundImage: "url('/bg.png')" }}
    >
      <Sidebar active="records" role={ROLES.SUPER_ADMIN} />

      <div className="flex-1 flex flex-col p-6 z-10">
        {/* Ribbon */}
        <div className="flex items-center justify-between h-12 rounded-md bg-emerald-100/90 px-4 mb-4 shadow">
          <span className="font-semibold text-emerald-950">
            Super Admin – Records
          </span>
        </div>

        {/* Title */}
        <div className="bg-emerald-900/95 px-6 py-4 rounded-xl mb-4 shadow-lg text-emerald-100 font-extrabold border border-emerald-400/70 text-2xl tracking-wide">
          AUDIT RECORDS
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-4">
          <button
            onClick={() => setActiveTab("invitations")}
            className={`px-4 py-2 rounded-md font-medium ${
              activeTab === "invitations"
                ? "bg-emerald-700 text-white"
                : "bg-emerald-100 text-emerald-900 hover:bg-emerald-200"
            }`}
          >
            Invitations
          </button>
          {/* Future tabs */}
          <button
            onClick={() => setActiveTab("employees")}
            className={`px-4 py-2 rounded-md font-medium ${
              activeTab === "employees"
                ? "bg-emerald-700 text-white"
                : "bg-emerald-100 text-emerald-900 hover:bg-emerald-200"
            }`}
          >
            Employees
          </button>
          <button
            onClick={() => setActiveTab("admins")}
            className={`px-4 py-2 rounded-md font-medium ${
              activeTab === "admins"
                ? "bg-emerald-700 text-white"
                : "bg-emerald-100 text-emerald-900 hover:bg-emerald-200"
            }`}
          >
            Admins
          </button>
        </div>

        {/* Invitations Tab Content */}
        {activeTab === "invitations" && (
          <div className="overflow-x-auto rounded-lg border border-emerald-400/70 shadow-lg bg-white">
            {loading ? (
              <p className="p-4">Loading...</p>
            ) : invitations.length === 0 ? (
              <p className="p-4">No invitations found.</p>
            ) : (
              <table className="min-w-[900px] w-full border-collapse">
                <thead>
                  <tr className="bg-emerald-900/95 text-emerald-100">
                    <Th>Email</Th>
                    <Th>Sent By</Th>
                    <Th>Time</Th>
                    <Th>Position</Th>
                  </tr>
                </thead>
                <tbody>
                  {invitations.map((inv, idx) => (
                    <tr
                      key={inv.entity_id}
                      className={`cursor-pointer ${
                        idx % 2 === 0 ? "bg-emerald-50/90" : "bg-emerald-100/80"
                      } hover:bg-emerald-200/70`}
                      onClick={() => handleOpenModal(inv)}
                    >
                      <td className="px-4 py-3">{inv.entity_label}</td>
                      <td className="px-4 py-3">{inv.performed_by_email}</td>
                      <td className="px-4 py-3">{inv.created_at}</td>
                      <td className="px-4 py-3">
                        {inv.details.position || "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Modal for invite logs */}
        {selectedInvite && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6 relative">
              <button
                onClick={handleCloseModal}
                className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
              <h2 className="text-xl font-bold mb-4">
                Invitation Logs – {selectedInvite.entity_label}
              </h2>
              {logs.length === 0 ? (
                <p>Loading logs...</p>
              ) : (
                <ul className="space-y-3">
                  {logs.map((log) => (
                    <li
                      key={log.id}
                      className="border-b border-gray-200 pb-2 text-sm"
                    >
                      <div className="font-medium text-emerald-700">
                        {log.details.event}
                      </div>
                      <div className="text-gray-600">
                        {log.created_at} – {log.performed_by_email}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
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
