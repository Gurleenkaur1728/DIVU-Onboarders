import { useEffect, useMemo, useState } from "react";
import Sidebar, { ROLES } from "../../../components/Sidebar.jsx";
import { Trash2, Plus, Loader2 } from "lucide-react";
import { supabase } from "../../../../src/lib/supabaseClient.js";

export default function ManageAdmins() {
  const [admins, setAdmins] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [banner, setBanner] = useState("");

  // ✅ Current logged-in Super Admin info
  const me = useMemo(() => ({
    name: localStorage.getItem("profile_name") || "Super Admin",
    email: JSON.parse(localStorage.getItem("user") || "{}").email || "superadmin@divu.com",
  }), []);

  // ✅ Load data on mount
  useEffect(() => {
    loadUsers();
  }, []);

  // ✅ Fetch all users and separate Admins / Non-admins
  async function loadUsers() {
    setLoading(true);
    const { data, error } = await supabase
      .from("users")
      .select("id, name, email, role_id")
      .order("name", { ascending: true });

    if (error) {
      console.error("Error loading users:", error);
      setBanner("Failed to load users.");
      setLoading(false);
      return;
    }

    setAdmins(data.filter((u) => Number(u.role_id) === 1));
    setUsers(data.filter((u) => Number(u.role_id) === 0));
    setLoading(false);
  }

  // ✅ Log to audit_logs table
  async function logAction({ employee_name, employee_email, action }) {
    const { error } = await supabase.from("audit_logs").insert([
      {
        employee_name,
        employee_email,
        action,
        performed_by: me.name,
        performed_at: new Date().toISOString(),
      },
    ]);
    if (error) console.error("Audit log insert error:", error);
  }

  // ✅ Promote a user to Admin
  async function promote(user) {
    try {
      const { error } = await supabase
        .from("users")
        .update({ role_id: 1 })
        .eq("id", user.id);

      if (error) throw error;

      await logAction({
        employee_name: user.name,
        employee_email: user.email,
        action: `${me.name} promoted ${user.name} to Admin`,
      });

      setBanner(`${user.name} is now an Admin.`);
      await loadUsers();
    } catch (err) {
      console.error(err);
      setBanner("Failed to promote user.");
    }
  }

  // ✅ Demote an Admin to User
  async function demote(user) {
    try {
      const { error } = await supabase
        .from("users")
        .update({ role_id: 0 })
        .eq("id", user.id);

      if (error) throw error;

      await logAction({
        employee_name: user.name,
        employee_email: user.email,
        action: `${me.name} removed ${user.name} from Admin role`,
      });

      setBanner(`${user.name} removed from Admin role.`);
      await loadUsers();
    } catch (err) {
      console.error(err);
      setBanner("Failed to remove admin.");
    }
  }

  return (
    <div
      className="flex min-h-dvh bg-cover bg-center relative"
      style={{ backgroundImage: "url('/bg.png')" }}
    >
      <Sidebar active="manage-admins" role={ROLES.SUPER_ADMIN} />

      <div className="flex-1 flex flex-col p-6">
        {/* Header */}
        <div className="flex items-center justify-between h-12 rounded-md bg-emerald-100/90 px-4 mb-4 shadow">
          <span className="font-semibold text-emerald-950">
            Super Admin – Manage Admins
          </span>
        </div>

        {/* Title */}
        <div className="bg-emerald-900/95 px-6 py-4 rounded-xl mb-6 shadow-lg text-emerald-100 font-extrabold border border-emerald-400/70 text-2xl tracking-wide">
          MANAGE ADMINS
        </div>

        {/* Banner */}
        {banner && (
          <div className="mb-4 px-4 py-2 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded">
            {banner}
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-10 text-emerald-800">
            <Loader2 className="animate-spin mr-2" /> Loading users...
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-8">
            {/* ✅ Current Admins Table */}
            <div className="bg-white rounded-xl shadow-lg border border-emerald-400/70 overflow-hidden">
              <h3 className="bg-emerald-900 text-white px-6 py-3 font-bold text-lg rounded-t-xl">
                Current Admins
              </h3>

              <div className="max-h-[500px] overflow-y-auto overflow-x-hidden">
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 bg-emerald-100 border-b border-emerald-300">
                    <tr>
                      <th className="px-4 py-2 text-emerald-900 font-semibold w-[30%]">
                        Name
                      </th>
                      <th className="px-4 py-2 text-emerald-900 font-semibold w-[40%]">
                        Email
                      </th>
                      <th className="px-4 py-2 text-emerald-900 font-semibold w-[30%] text-center">
                        Action
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {admins.length === 0 ? (
                      <tr>
                        <td
                          colSpan={3}
                          className="px-4 py-6 text-center text-gray-600"
                        >
                          No admins found.
                        </td>
                      </tr>
                    ) : (
                      admins.map((a, i) => (
                        <tr
                          key={a.id}
                          className={`border-b border-emerald-100 ${
                            i % 2 === 0 ? "bg-emerald-50/80" : "bg-emerald-100/70"
                          } hover:bg-emerald-200/60 transition`}
                        >
                          <td
                            className="px-4 py-3 text-sm font-medium text-emerald-900 truncate max-w-[180px]"
                            title={a.name}
                          >
                            {a.name || "—"}
                          </td>
                          <td
                            className="px-4 py-3 text-sm text-gray-700 break-words max-w-[220px]"
                            title={a.email}
                          >
                            {a.email || "—"}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => demote(a)}
                              className="inline-flex items-center gap-1 px-3 py-1 rounded bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition"
                            >
                              <Trash2 size={14} /> Remove
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ✅ Add Admin Table */}
            <div className="bg-white rounded-xl shadow-lg border border-emerald-400/70 overflow-hidden">
              <h3 className="bg-emerald-900 text-white px-6 py-3 font-bold text-lg rounded-t-xl">
                Add Admin
              </h3>

              <div className="max-h-[500px] overflow-y-auto overflow-x-hidden">
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 bg-emerald-100 border-b border-emerald-300">
                    <tr>
                      <th className="px-4 py-2 text-emerald-900 font-semibold w-[30%]">
                        Name
                      </th>
                      <th className="px-4 py-2 text-emerald-900 font-semibold w-[40%]">
                        Email
                      </th>
                      <th className="px-4 py-2 text-emerald-900 font-semibold w-[30%] text-center">
                        Action
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {users.length === 0 ? (
                      <tr>
                        <td
                          colSpan={3}
                          className="px-4 py-6 text-center text-gray-600"
                        >
                          No users available to promote.
                        </td>
                      </tr>
                    ) : (
                      users.map((u, i) => (
                        <tr
                          key={u.id}
                          className={`border-b border-emerald-100 ${
                            i % 2 === 0 ? "bg-emerald-50/80" : "bg-emerald-100/70"
                          } hover:bg-emerald-200/60 transition`}
                        >
                          <td
                            className="px-4 py-3 text-sm font-medium text-emerald-900 truncate max-w-[180px]"
                            title={u.name}
                          >
                            {u.name || "—"}
                          </td>
                          <td
                            className="px-4 py-3 text-sm text-gray-700 break-words max-w-[220px]"
                            title={u.email}
                          >
                            {u.email || "—"}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => promote(u)}
                              className="inline-flex items-center gap-1 px-3 py-1 rounded bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-500 transition"
                            >
                              <Plus size={14} /> Make Admin
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
