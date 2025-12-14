import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle, Circle, ChevronDown, ChevronRight } from "lucide-react";
import { supabase } from "../../src/lib/supabaseClient.js";
import { useAuth } from "../context/AuthContext.jsx";
import AppLayout from "../../src/AppLayout.jsx";
 
// Small helper to format dates
const fmt = (d) => (d ? new Date(d).toISOString().slice(0, 10) : "-");
 
export default function Checklist() {
  const { user, loading: authLoading } = useAuth();
 
  // Current user identity used for filtering
  const me = useMemo(
    () => ({
      profileId: user?.profile_id || null,
      name: user?.name || "",
    }),
    [user]
  );
 
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [groups, setGroups] = useState([]);
  const [expanded, setExpanded] = useState({});
 
  useEffect(() => {
    if (user) {
      load();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);
 
  // Wait for auth to load before showing content
  if (authLoading) {
    return (
      <div className="ds-loading-full">
        <div className="ds-spinner"></div>
      </div>
    );
  }
 
  async function load() {
    setLoading(true);
    setNotice("");
 
    try {
      // Fallback: if profile_id is missing, try auth user id
      let userId = me.profileId;
      if (!userId) {
        const { data: auth } = await supabase.auth.getUser();
        userId = auth?.user?.id ?? null;
      }
      if (!userId) {
        setNotice("Could not determine your user id.");
        setLoading(false);
        return;
      }
 
      // Pull all assignments for this user + join template item & group
      const { data, error } = await supabase
        .from("assigned_checklist_item")
        .select(
          `
          id,
          user_id,
          template_item_id,
          group_id,
          assigned_on,
          due_date,
          done,
          completed_at,
          checklist_item:checklist_item!inner (
            item_id,
            title,
            is_required
          ),
          group:checklist_groups!inner (
            id,
            name,
            sort_order
          )
        `
        )
        .eq("user_id", userId)
        .order("sort_order", {
          foreignTable: "checklist_groups",
          ascending: true,
        })
        .order("title", { foreignTable: "checklist_item", ascending: true });
 
      if (error) throw error;
 
      // Bucket by group
      const bucket = new Map();
      (data || []).forEach((row) => {
        const g = row.group || { id: row.group_id, name: "General", sort_order: 0 };
        if (!bucket.has(g.id)) bucket.set(g.id, { id: g.id, name: g.name, items: [] });
        bucket.get(g.id).items.push({
          assignedId: row.id,
          title: row.checklist_item?.title ?? "(untitled)",
          is_required: !!row.checklist_item?.is_required,
          assigned_on: row.assigned_on,
          due_date: row.due_date,
          done: !!row.done,
          completed_at: row.completed_at,
          template_item_id: row.template_item_id,
          group_id: row.group_id,
        });
      });
 
      const list = Array.from(bucket.values());
      setGroups(list);
      const exp = {};
      list.forEach((g) => (exp[g.id] = true));
      setExpanded(exp);
    } catch (e) {
      console.error(e);
      setNotice(e.message || "Failed to load your checklist.");
    } finally {
      setLoading(false);
    }
  }
 
  // ✅ NEW: Generate certificate in Supabase
  async function generateCertificate(userId, title) {
    try {
      // Check if one already exists
      const { data: existing } = await supabase
        .from("certificates")
        .select("id")
        .eq("user_id", userId)
        .eq("title", title)
        .maybeSingle();
 
      if (existing) {
        await supabase
          .from("certificates")
          .update({ issue_date: new Date().toISOString() })
          .eq("id", existing.id);
      } else {
        await supabase.from("certificates").insert([
          {
            user_id: userId,
            title,
            issue_date: new Date().toISOString(),
          },
        ]);
      }
    } catch (err) {
      console.error("Certificate generation failed:", err);
    }
  }
 
  async function toggleDone(item) {
    // Optimistic UI update
    setGroups((prev) =>
      prev.map((g) => ({
        ...g,
        items: g.items.map((it) =>
          it.assignedId === item.assignedId
            ? {
                ...it,
                done: !it.done,
                completed_at: !it.done ? new Date().toISOString() : null,
              }
            : it
        ),
      }))
    );
 
    const payload = item.done
      ? { done: false, completed_at: null }
      : { done: true, completed_at: new Date().toISOString() };
 
    const { error } = await supabase
      .from("assigned_checklist_item")
      .update(payload)
      .eq("id", item.assignedId);
 
    if (error) {
      console.error(error);
      setNotice("Could not update item status.");
      await load();
    } else if (!item.done) {
      // ✅ When marking complete, create certificate
      await generateCertificate(me.profileId, item.title);
    }
  }
 
  return (
    <AppLayout>
    <div className="p-6  min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Onboarding Checklist</h1>
          <p className="text-gray-600">Track and complete your onboarding tasks, {me.name || "Employee"}!</p>
        </div>
 
        {/* Notice */}
        {notice && (
          <div className="mb-4 px-4 py-2 bg-emerald-50 text-emerald-900 border border-emerald-300 rounded">
            {notice}
          </div>
        )}
 
        {/* Main Content */}
        {loading ? (
          <div className="text-emerald-800 animate-pulse italic">
            Loading checklist...
          </div>
        ) : groups.length === 0 ? (
          <div className="text-emerald-800">
            Nothing assigned yet. Check back later.
          </div>
        ) : (
          <div className="space-y-4">
            {groups.map((g) => {
              const open = !!expanded[g.id];
              return (
                <div
                  key={g.id}
                  className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden"
                >
                  {/* Group header */}
                  <button
                    className="w-full flex items-center gap-3 px-6 py-4 bg-emerald-100 text-gray-900 hover:bg-emerald-200 transition-colors duration-200"
                    onClick={() =>
                      setExpanded((s) => ({ ...s, [g.id]: !s[g.id] }))
                    }
                  >
                    {open ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                    <span className="font-semibold text-lg">{g.name}</span>
                  </button>
 
                  {/* Group table */}
                  {open && (
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse text-sm">
                        <thead>
                          <tr className="bg-gray-100 text-gray-700 text-left border-b border-gray-200">
                            <th className="px-4 py-3 text-center" style={{width: '100px'}}>Completed</th>
                            <th className="px-4 py-3">Module</th>
                            <th className="px-4 py-3" style={{width: '150px'}}>Date Assigned</th>
                            <th className="px-4 py-3" style={{width: '150px'}}>Date Completed</th>
                          </tr>
                        </thead>
                        <tbody>
                          {g.items.map((it, idx) => (
                            <tr
                              key={it.assignedId}
                              className="border-b border-gray-100 hover:bg-gray-50 transition-colors duration-200"
                            >
                              <td className="px-4 py-3 text-center" style={{width: '100px'}}>
                                <button
                                  onClick={() => toggleDone(it)}
                                  className="focus:outline-none focus:ring-2 focus:ring-emerald-400 rounded-full"
                                  title="Mark complete"
                                >
                                  {it.done ? (
                                    <CheckCircle className="w-5 h-5 text-emerald-600" />
                                  ) : (
                                    <Circle className="w-5 h-5 text-gray-400 hover:text-emerald-500" />
                                  )}
                                </button>
                              </td>

                              <td className="px-4 py-3 text-gray-900">{it.title}</td>
                              <td className="px-4 py-3 text-gray-700" style={{width: '150px'}}>{fmt(it.assigned_on)}</td>
                              <td className="px-4 py-3 text-gray-700" style={{width: '150px'}}>{fmt(it.completed_at)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
    </AppLayout>
  );
}
 
/* ---------- UI bits for table ---------- */
function Th({ children, className = "" }) {
  return (
    <th
      className={`px-4 py-3 font-semibold border-r border-emerald-800/50 ${className}`}
    >
      {children}
    </th>
  );
}
 
function Tab({ label, active, to }) {
  return to ? (
    <Link
      to={to}
      replace={false}
      className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-emerald-400
        ${
          active
            ? "bg-gradient-to-r from-emerald-400 to-green-500 text-emerald-950 shadow-md scale-105"
            : "bg-emerald-800/70 text-emerald-100 hover:bg-emerald-700/80 hover:scale-[1.03]"
        }`}
    >
      {label}
    </Link>
  ) : (
    <button
      className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-emerald-400
        ${
          active
            ? "bg-gradient-to-r from-emerald-400 to-green-500 text-emerald-950 shadow-md scale-105"
            : "bg-emerald-800/70 text-emerald-100 hover:bg-emerald-700/80 hover:scale-[1.03]"
        }`}
      disabled
    >
      {label}
    </button>
  );
}