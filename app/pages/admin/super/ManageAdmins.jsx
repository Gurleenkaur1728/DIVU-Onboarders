import { useEffect, useMemo, useState } from "react";
import AppLayout from "../../../../src/AppLayout.jsx";
import { useRole } from "../../../../src/lib/hooks/useRole.js";
import { Trash2, Plus, Loader2 } from "lucide-react";
import { supabase } from "../../../../src/lib/supabaseClient.js";

export default function ManageAdmins() {
  const { roleId } = useRole();
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
    <AppLayout>
      <div className="bg-white min-h-screen p-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-emerald-950 mb-2">Manage Admins</h1>
          <p className="text-gray-600">Promote users to admin or remove admin privileges</p>
        </div>

        {/* Banner */}
        {banner && (
          <div className="mb-6 px-4 py-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg">
            {banner}
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-10 text-gray-600">
            <Loader2 className="animate-spin mr-2" /> Loading users...
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-8">
            {/* ✅ Current Admins Table */}
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
              <h3 className="bg-gray-50 border-b border-gray-200 text-gray-900 px-6 py-3 font-bold text-lg">
                Current Admins
              </h3>

              <div className="max-h-[500px] overflow-y-auto overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-2 text-gray-700 font-semibold w-[30%]">
                        Name
                      </th>
                      <th className="px-4 py-2 text-gray-700 font-semibold w-[40%]">
                        Email
                      </th>
                      <th className="px-4 py-2 text-gray-700 font-semibold w-[30%] text-center">
                        Action
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {admins.length === 0 ? (
                      <tr>
                        <td
                          colSpan={3}
                          className="px-4 py-6 text-center text-gray-500"
                        >
                          No admins found.
                        </td>
                      </tr>
                    ) : (
                      admins.map((a, i) => (
                        <tr
                          key={a.id}
                          className="border-b border-gray-200 hover:bg-gray-50 transition"
                        >
                          <td
                            className="px-4 py-3 text-sm font-medium text-gray-900 truncate max-w-[180px]"
                            title={a.name}
                          >
                            {a.name || "—"}
                          </td>
                          <td
                            className="px-4 py-3 text-sm text-gray-600 break-words max-w-[220px]"
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
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
              <h3 className="bg-gray-50 border-b border-gray-200 text-gray-900 px-6 py-3 font-bold text-lg">
                Add Admin
              </h3>

              <div className="max-h-[500px] overflow-y-auto overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-2 text-gray-700 font-semibold w-[30%]">
                        Name
                      </th>
                      <th className="px-4 py-2 text-gray-700 font-semibold w-[40%]">
                        Email
                      </th>
                      <th className="px-4 py-2 text-gray-700 font-semibold w-[30%] text-center">
                        Action
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {users.length === 0 ? (
                      <tr>
                        <td
                          colSpan={3}
                          className="px-4 py-6 text-center text-gray-500"
                        >
                          No users available to promote.
                        </td>
                      </tr>
                    ) : (
                      users.map((u, i) => (
                        <tr
                          key={u.id}
                          className="border-b border-gray-200 hover:bg-gray-50 transition"
                        >
                          <td
                            className="px-4 py-3 text-sm font-medium text-gray-900 truncate max-w-[180px]"
                            title={u.name}
                          >
                            {u.name || "—"}
                          </td>
                          <td
                            className="px-4 py-3 text-sm text-gray-600 break-words max-w-[220px]"
                            title={u.email}
                          >
                            {u.email || "—"}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => promote(u)}
                              className="inline-flex items-center gap-1 px-3 py-1 rounded bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition"
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
    </AppLayout>
  );
}
