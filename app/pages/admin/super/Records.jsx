import { useEffect, useState } from "react";
import Sidebar, { ROLES } from "../../../components/Sidebar.jsx";
import { supabase } from "../../../../src/lib/supabaseClient.js";
import { ChevronDown, ChevronRight, RefreshCcw } from "lucide-react";

export default function Records() {
  const [logs, setLogs] = useState([]);
  const [expanded, setExpanded] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filteredLogs, setFilteredLogs] = useState([]);

  // ✅ Load logs & enable realtime
  useEffect(() => {
    loadAllLogs();

    // 🔁 Realtime listener for new audit log inserts
    const channel = supabase
      .channel("audit-logs-changes")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "audit_logs" },
        (payload) => {
          const newLog = payload.new;
          setLogs((prev) => [newLog, ...prev]);
          setFilteredLogs((prev) => [newLog, ...prev]);
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  // ✅ Search filter
  useEffect(() => {
    if (!search.trim()) setFilteredLogs(logs);
    else {
      const q = search.toLowerCase();
      setFilteredLogs(
        logs.filter(
          (l) =>
            l.employee_name?.toLowerCase().includes(q) ||
            l.employee_email?.toLowerCase().includes(q) ||
            l.action?.toLowerCase().includes(q) ||
            l.performed_by?.toLowerCase().includes(q)
        )
      );
    }
  }, [search, logs]);

  // ✅ Fetch logs from all sources
  async function loadAllLogs() {
    setLoading(true);
    try {
      const { data: auditLogs } = await supabase.from("audit_logs").select("*");

      const { data: invites } = await supabase
        .from("employee_invitations")
        .select("email, position, status, created_at, first_name, last_name");

      const inviteLogs = (invites || []).map((i) => ({
        employee_email: i.email,
        employee_name: `${i.first_name || ""} ${i.last_name || ""}`.trim(),
        action: `Invitation status: ${i.status} (${i.position || "Employee"})`,
        performed_by: "System (Invitations)",
        performed_at: i.created_at,
      }));

      const { data: requests } = await supabase
        .from("v_admin_requests")
        .select(
          "requested_by_name, requested_by_email, status, created_at, request_type"
        );

      const requestLogs = (requests || []).map((r) => ({
        employee_email: r.requested_by_email,
        employee_name: r.requested_by_name,
        action: `Admin Request: ${r.request_type} → ${r.status}`,
        performed_by: "System (Admin Requests)",
        performed_at: r.created_at,
      }));

      const combined = [...(auditLogs || []), ...inviteLogs, ...requestLogs].sort(
        (a, b) =>
          new Date(b.performed_at || b.created_at) -
          new Date(a.performed_at || a.created_at)
      );

      setLogs(combined);
      setFilteredLogs(combined);
    } catch (err) {
      console.error("Error loading logs:", err);
    }
    setLoading(false);
  }

  // ✅ Group logs by employee name/email
  const grouped = filteredLogs.reduce((acc, log) => {
    const key = log.employee_name?.trim() || log.employee_email?.trim() || "Unknown User";
    if (!acc[key]) acc[key] = [];
    acc[key].push(log);
    return acc;
  }, {});

  return (
    <div
      className="flex min-h-dvh bg-cover bg-center relative"
      style={{ backgroundImage: "url('/bg.png')" }}
    >
      <Sidebar active="records" role={ROLES.SUPER_ADMIN} />

      <div className="flex-1 flex flex-col p-6 overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between h-12 rounded-md bg-emerald-100/90 px-4 mb-4 shadow">
          <span className="font-semibold text-emerald-950">
            Super Admin – Audit Records
          </span>
          <button
            onClick={loadAllLogs}
            className="flex items-center gap-2 text-emerald-800 hover:text-emerald-950 text-sm font-semibold"
            title="Refresh Logs"
          >
            <RefreshCcw size={16} /> Refresh
          </button>
        </div>

        {/* Title */}
        <div className="bg-emerald-900 px-6 py-4 rounded-xl mb-4 shadow-lg text-emerald-100 font-extrabold border border-emerald-400/70 text-2xl tracking-wide">
          USER ACTIVITY RECORDS
        </div>

        {/* Search */}
        <div className="flex items-center gap-3 mb-4">
          <input
            type="text"
            placeholder="Search by name, email, or action..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 px-4 py-2 border border-emerald-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
          />
          <button
            onClick={() => setSearch("")}
            className="px-4 py-2 bg-emerald-700 text-white rounded-md hover:bg-emerald-800"
          >
            Clear
          </button>
        </div>

        {/* Logs */}
        <div className="bg-white rounded-2xl shadow-xl p-4 border border-emerald-200/60">
          {loading ? (
            <p className="text-gray-600 text-center py-6">Loading logs…</p>
          ) : Object.keys(grouped).length === 0 ? (
            <p className="text-gray-600 text-center py-6">No logs found.</p>
          ) : (
            Object.entries(grouped).map(([name, entries]) => (
              <div
                key={name}
                className="mb-3 border border-emerald-200 rounded-lg overflow-hidden transition-all duration-300"
              >
                <button
                  onClick={() =>
                    setExpanded((prev) => ({ ...prev, [name]: !prev[name] }))
                  }
                  className={`w-full flex justify-between items-center px-4 py-3 font-semibold text-emerald-900 ${
                    expanded[name]
                      ? "bg-emerald-300/70"
                      : "bg-emerald-100 hover:bg-emerald-200"
                  }`}
                >
                  <span>
                    {name}'s Logs ({entries.length})
                  </span>
                  {expanded[name] ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </button>

                {expanded[name] && (
                  <div className="bg-white p-3">
                    {entries.map((log, i) => (
                      <div
                        key={i}
                        className="border-b last:border-none py-2 text-sm flex justify-between items-start"
                      >
                        <div>
                          <p className="font-medium text-emerald-800">
                            {log.action}
                          </p>
                          <p className="text-xs text-gray-500">
                            By: {log.performed_by || "System"}
                          </p>
                        </div>
                        <p className="text-xs text-gray-400">
                          {new Date(log.performed_at || log.created_at).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
