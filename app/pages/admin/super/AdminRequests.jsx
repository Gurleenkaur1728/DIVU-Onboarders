import { useEffect, useMemo, useState } from "react";
import AppLayout from "../../../../src/AppLayout.jsx";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { supabase } from "../../../../src/lib/supabaseClient.js";
import { useRole } from "../../../../src/lib/hooks/useRole.js";

export default function AdminRequests() {
  const { roleId } = useRole();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [banner, setBanner] = useState("");

  const me = useMemo(
    () => ({
      profileId: localStorage.getItem("profile_id") || null,
      name: localStorage.getItem("profile_name") || "Unknown",
    }),
    []
  );

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    setBanner("");
    const { data, error } = await supabase
      .from("v_admin_requests")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      setBanner(error.message || "Failed to load requests.");
    } else {
      setRows(data || []);
    }
    setLoading(false);
  }

  async function approve(id) {
    setBanner("");
    try {
      const decider =
        me.profileId || (await supabase.auth.getUser()).data.user?.id || null;

      const { data, error } = await supabase.rpc("approve_admin_request", {
        p_id: id,
        p_decider: decider,
      });
      
      if (error) {
        console.error("RPC approve_admin_request error:", error);
        setBanner(`Approve failed: ${error.message}. Check if RPC function exists in database.`);
        return;
      }
      
      console.log("Approve successful:", data);
      setBanner("✅ Request approved.");
      await load();
    } catch (err) {
      console.error("Approve exception:", err);
      setBanner(`Error: ${err.message}`);
    }
  }

  async function reject(id) {
    setBanner("");
    try {
      const decider =
        me.profileId || (await supabase.auth.getUser()).data.user?.id || null;

      const { data, error } = await supabase.rpc("reject_admin_request", {
        p_id: id,
        p_decider: decider,
      });
      
      if (error) {
        console.error("RPC reject_admin_request error:", error);
        setBanner(`Reject failed: ${error.message}. Check if RPC function exists in database.`);
        return;
      }
      
      console.log("Reject successful:", data);
      setBanner("✅ Request rejected.");
      await load();
    } catch (err) {
      console.error("Reject exception:", err);
      setBanner(`Error: ${err.message}`);
    }
  }

  return (
    <AppLayout>
      <div className="flex-1 flex flex-col p-6">
        {/* Ribbon */}
      <div
        className="
          rounded-lg shadow-sm border px-6 py-4 mb-6 transition
          bg-white border-gray-300 text-gray-900
          dark:bg-black/30 dark:border-black dark:text-white
        "
      >
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Admin Requests
        </h1>

        <p className="text-gray-600 dark:text-gray-300">
          Review and approve admin access requests
        </p>
      </div>



        {banner && (
          <div className="mb-4 px-4 py-2 bg-emerald-50 text-emerald-900 border border-emerald-300 rounded">
            {banner}
          </div>
        )}

        <div className="overflow-x-auto bg-white rounded-xl shadow-lg border border-emerald-400/70">
          <table className="min-w-[820px] w-full">
            <thead>
              <tr className="bg-DivuLightGreen text-black">
                <Th>Requested By</Th>
                <Th>Type</Th>
                <Th>Target</Th>
                <Th>When</Th>
                <Th>Status</Th>
                <Th>Actions</Th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center">
                    <Loader2 className="inline mr-2 animate-spin" />
                    Loading…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center">
                    No requests.
                  </td>
                </tr>
              ) : (
                rows.map((r, idx) => (
                  <tr
                    key={r.id}
                    className={idx % 2 === 0 ? "bg-emerald-50/90" : "bg-emerald-100/80"}
                  >
                    <td className="px-4 py-3">{r.requested_by_name}</td>
                    <td className="px-4 py-3">{r.request_type}</td>
                    <td className="px-4 py-3">
                      {r.target_table} · {r.target_id}
                    </td>
                    <td className="px-4 py-3">
                      {new Date(r.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 capitalize">{r.status}</td>
                    <td className="px-4 py-3 flex gap-2">
                      <button
                        disabled={r.status !== "pending"}
                        onClick={() => approve(r.id)}
                        className="flex items-center gap-1 px-2 py-1 rounded bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
                        title="Approve"
                      >
                        <CheckCircle size={14} /> Approve
                      </button>
                      <button
                        disabled={r.status !== "pending"}
                        onClick={() => reject(r.id)}
                        className="flex items-center gap-1 px-2 py-1 rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                        title="Reject"
                      >
                        <XCircle size={14} /> Reject
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AppLayout>
  );
}

function Th({ children }) {
  return <th className="px-4 py-3 font-bold">{children}</th>;
}
