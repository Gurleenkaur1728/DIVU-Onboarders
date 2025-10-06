import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle, Circle, ChevronDown, ChevronRight } from "lucide-react";
import Sidebar, { ROLES } from "../components/Sidebar.jsx";
import { supabase } from "../../lib/supabaseClient";

// Small helpers
const pad = (n) => (n < 10 ? `0${n}` : `${n}`);
const fmt = (d) => (d ? new Date(d).toISOString().slice(0, 10) : "-");

export default function Checklist() {
  // Current user identity used for filtering
  const me = useMemo(
    () => ({
      // If you store your internal user/profile id, prefer it:
      profileId: localStorage.getItem("profile_id") || null,
      name: localStorage.getItem("profile_name") || "",
    }),
    []
  );

  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [groups, setGroups] = useState([]); // [{id, name, items:[...] }]
  const [expanded, setExpanded] = useState({}); // groupId -> bool

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function load() {
    setLoading(true);
    setNotice("");

    try {
      // Fallback: if profile_id is missing, try auth user id (only if your schema matches)
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
        .order("sort_order", { foreignTable: "checklist_groups", ascending: true })
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
          // keep ids in case you need links later:
          template_item_id: row.template_item_id,
          group_id: row.group_id,
        });
      });

      const list = Array.from(bucket.values());
      setGroups(list);
      // expand all groups by default
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
      // revert if it failed
      await load();
    }
  }

  return (
    <div className="flex min-h-dvh bg-cover bg-center" style={{ backgroundImage: "url('/bg.png')" }}>
      <Sidebar role={ROLES.USER} />

      <div className="flex-1 flex flex-col p-6 z-10">
        {/* Ribbon */}
        <div className="flex items-center justify-between h-12 rounded-md bg-emerald-100/90 px-4 shadow-md mb-4">
          <span className="font-semibold text-emerald-950">
            Welcome {me.name || "to DIVU"}!
          </span>
        </div>

        <div className="bg-emerald-950/90 px-4 py-3 rounded-md mb-4 shadow-md">
          <h2 className="text-lg md:text-xl font-bold text-emerald-100 tracking-wide">
            ONBOARDING CHECKLIST
          </h2>
        </div>

        {notice && (
          <div className="mb-4 px-4 py-2 bg-emerald-50 text-emerald-900 border border-emerald-300 rounded">
            {notice}
          </div>
        )}

        {loading ? (
          <div className="text-emerald-100">Loading…</div>
        ) : groups.length === 0 ? (
          <div className="text-emerald-100">
            Nothing assigned yet. Check back later.
          </div>
        ) : (
          <div className="space-y-4">
            {groups.map((g) => {
              const open = !!expanded[g.id];
              return (
                <div
                  key={g.id}
                  className="bg-white/95 rounded-xl shadow border border-emerald-200"
                >
                  {/* Group header */}
                  <div className="flex items-center justify-between px-4 py-3 bg-emerald-900/95 text-emerald-100 rounded-t-xl">
                    <button
                      className="flex items-center gap-2 font-semibold"
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
                      <table className="min-w-[960px] w-full border-collapse">
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
                              className={
                                idx % 2 === 0
                                  ? "bg-emerald-50/90"
                                  : "bg-emerald-100/80"
                              }
                            >
                              {/* toggle */}
                              <td className="px-4 py-3 text-center">
                                <button onClick={() => toggleDone(it)}>
                                  {it.done ? (
                                    <CheckCircle className="w-5 h-5 text-emerald-500" />
                                  ) : (
                                    <Circle className="w-5 h-5 text-gray-400" />
                                  )}
                                </button>
                              </td>

                              {/* title (optionally link to a module detail if you map it) */}
                              <td className="px-4 py-3">{it.title}</td>

                              {/* assigned_on */}
                              <td className="px-4 py-3">{fmt(it.assigned_on)}</td>

                              {/* completed_at */}
                              <td className="px-4 py-3">
                                {fmt(it.completed_at)}
                              </td>
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

/* ---------- UI bits ---------- */
function Th({ children, className = "" }) {
  return (
    <th className={`px-4 py-3 font-bold border-r border-emerald-800/50 ${className}`}>
      {children}
    </th>
  );
}
