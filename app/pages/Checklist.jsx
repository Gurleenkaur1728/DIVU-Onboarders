import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle, Circle, ChevronDown, ChevronRight } from "lucide-react";
import Sidebar, { ROLES } from "../components/Sidebar.jsx";
import { supabase } from "../../src/lib/supabaseClient.js";
import { useAuth } from "../context/AuthContext.jsx";

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
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
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
    <div
      className="flex min-h-dvh bg-gradient-to-br from-emerald-50 to-green-100/60 bg-cover bg-center relative"
      style={{ backgroundImage: "url('/bg.png')" }}
    >
      <Sidebar role={ROLES.USER} />
      <div className="flex-1 flex flex-col p-4 sm:p-6 md:p-8 z-10">
        {/* Ribbon */}
        <div className="flex items-center justify-between h-12 rounded-lg bg-emerald-100/90 px-4 shadow-sm border border-emerald-200/50 mb-6">
          <span className="font-semibold text-emerald-950 text-sm sm:text-base">
            Welcome {me.name || "Employee"}!
          </span>
        </div>

        {/* Header Tabs */}
        <div className="flex flex-wrap items-center justify-between bg-emerald-950/90 px-4 py-3 rounded-lg mb-6 shadow-md border border-emerald-800/70">
          <h2 className="text-lg md:text-xl font-bold text-emerald-100 tracking-wide">
            ONBOARDING CHECKLIST
          </h2>
          <div className="flex gap-2 mt-2 sm:mt-0">
            <Tab label="Checklist" active />
            <Tab label="Modules" to="/modules" />
          </div>
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
                  className="bg-white/95 rounded-xl shadow-md border border-emerald-200 overflow-hidden transition-all duration-300"
                >
                  {/* Group header */}
                  <div className="flex items-center justify-between px-4 py-3 bg-emerald-900 text-emerald-100 rounded-t-xl">
                    <button
                      className="flex items-center gap-2 font-semibold hover:text-emerald-300 transition-colors duration-200"
                      onClick={() =>
                        setExpanded((s) => ({ ...s, [g.id]: !s[g.id] }))
                      }
                    >
                      {open ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                      {g.name}
                    </button>
                  </div>

                  {/* Group table */}
                  {open && (
                    <div className="overflow-x-auto">
                      <table className="min-w-[960px] w-full border-collapse text-emerald-950 text-sm">
                        <thead>
                          <tr className="bg-emerald-800 text-left text-emerald-100">
                            <Th>Completed</Th>
                            <Th>Module</Th>
                            <Th>Date Assigned</Th>
                            <Th>Date Completed</Th>
                          </tr>
                        </thead>
                        <tbody>
                          {g.items.map((it, idx) => (
                            <tr
                              key={it.assignedId}
                              className={`transition-colors duration-200 ${
                                idx % 2 === 0
                                  ? "bg-emerald-50/90 hover:bg-emerald-100"
                                  : "bg-emerald-100/80 hover:bg-emerald-200/80"
                              }`}
                            >
                              <td className="px-4 py-3 text-center">
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

                              <td className="px-4 py-3">{it.title}</td>
                              <td className="px-4 py-3">{fmt(it.assigned_on)}</td>
                              <td className="px-4 py-3">{fmt(it.completed_at)}</td>
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
