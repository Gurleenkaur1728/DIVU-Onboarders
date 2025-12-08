import { useEffect, useState } from "react";
import AppLayout from "../../../../src/AppLayout.jsx";
import { useRole } from "../../../../src/lib/hooks/useRole.js";
import { supabase } from "../../../../src/lib/supabaseClient.js";
import { ChevronDown, ChevronRight, RefreshCcw } from "lucide-react";

export default function Records() {
  const { roleId } = useRole();
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
    <AppLayout>
      <div className=" min-h-screen p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-emerald-950 mb-2">Audit Records</h1>
            <p className="text-gray-600">Track all user activity and system events</p>
          </div>
          <button
            onClick={loadAllLogs}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition"
            title="Refresh Logs"
          >
            <RefreshCcw size={16} /> Refresh
          </button>
        </div>

        {/* Search */}
        <div className="flex items-center gap-3 mb-6">
          <input
            type="text"
            placeholder="Search by name, email, or action..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          />
          <button
            onClick={() => setSearch("")}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
          >
            Clear
          </button>
        </div>

        {/* Logs */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4">
          {loading ? (
            <div className="text-center py-10">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading logs…</p>
            </div>
          ) : Object.keys(grouped).length === 0 ? (
            <p className="text-gray-500 text-center py-6">No logs found.</p>
          ) : (
            Object.entries(grouped).map(([name, entries]) => (
              <div
                key={name}
                className="mb-3 border border-gray-200 rounded-lg overflow-hidden transition-all duration-300"
              >
                <button
                  onClick={() =>
                    setExpanded((prev) => ({ ...prev, [name]: !prev[name] }))
                  }
                  className={`w-full flex justify-between items-center px-4 py-3 font-semibold transition ${
                    expanded[name]
                      ? "bg-emerald-600 text-white hover:bg-emerald-700"
                      : "bg-gray-50 text-gray-900 hover:bg-gray-100"
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
                        className="border-b border-gray-200 last:border-none py-3 text-sm flex justify-between items-start gap-4"
                      >
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">
                            {log.action}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            By: {log.performed_by || "System"}
                          </p>
                        </div>
                        <p className="text-xs text-gray-400 whitespace-nowrap">
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
    </AppLayout>
  );
}
