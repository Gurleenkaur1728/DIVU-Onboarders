import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../src/lib/supabaseClient.js";
import Sidebar, { ROLES } from "../../components/Sidebar.jsx";
import { Search } from "lucide-react";

/** Minimal inline audit helper (non-blocking) */
async function logAudit({ actorId, actorName, action, entityType, entityId, details = {} }) {
  try {
    await supabase.from("audit_logs").insert({
      actor_id: actorId ?? null,
      actor_name: actorName ?? null,
      action,
      entity_type: entityType,
      entity_id: entityId ?? null,
      details
    });
  } catch (e) {
    console.error("Audit log failed:", e?.message || e);
  }
}

export default function AssignTemplates() {
  const [users, setUsers] = useState([]);
  const [groups, setGroups] = useState([]);

  const [userQuery, setUserQuery] = useState("");
  const [groupQuery, setGroupQuery] = useState("");

  const [selectedUsers, setSelectedUsers] = useState([]);
  const [selectedGroups, setSelectedGroups] = useState([]);

  const [dueDate, setDueDate] = useState("");   // yyyy-mm-dd or ""
  const [dueDays, setDueDays] = useState("");   // number or ""

  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [modalUser, setModalUser] = useState(null);
  const [modalAssignedGroupIds, setModalAssignedGroupIds] = useState([]);
  const [modalLoading, setModalLoading] = useState(false);

  const [roleId] = useState(() => {
    const r = localStorage.getItem("role_id");
    return r ? parseInt(r, 10) : ROLES.ADMIN;
  });

  useEffect(() => {
    (async () => {
      const { data: u, error: ue } = await supabase
        .from("users")
        .select("id, name, email")
        .order("name");
      if (ue) console.error(ue);
      setUsers(u || []);

      const { data: g, error: ge } = await supabase
        .from("checklist_groups")
        .select("id, name, sort_order")
        .order("sort_order");
      if (ge) console.error(ge);
      setGroups(g || []);
    })();
  }, []);

  /** A–Z */
  const usersAZ = useMemo(() => {
    const label = (u) => (u.name && u.name.trim().length ? u.name : u.email || "");
    return [...users].sort((a, b) => label(a).localeCompare(label(b)));
  }, [users]);

  /** Maps for display/logs */
  const userMap = useMemo(() => {
    const m = new Map();
    for (const u of users) m.set(u.id, { name: u.name || "", email: u.email || "" });
    return m;
  }, [users]);
  const groupMap = useMemo(() => {
    const m = new Map();
    for (const g of groups) m.set(g.id, { name: g.name || "" });
    return m;
  }, [groups]);

  /** Filters */
  const filteredUsers = useMemo(() => {
    const q = userQuery.trim().toLowerCase();
    if (!q) return users;
    return users.filter(u =>
      (u.name || "").toLowerCase().includes(q) ||
      (u.email || "").toLowerCase().includes(q) ||
      String(u.id).toLowerCase().includes(q)
    );
  }, [users, userQuery]);

  const filteredGroups = useMemo(() => {
    const q = groupQuery.trim().toLowerCase();
    if (!q) return groups;
    return groups.filter(g =>
      (g.name || "").toLowerCase().includes(q) ||
      String(g.id).toLowerCase().includes(q)
    );
  }, [groups, groupQuery]);

  /** Get distinct (user_id, group_id) already assigned */
  async function fetchAssignedPairs(userIds, groupIds) {
    if (!userIds?.length) return [];
    let q = supabase
      .from("assigned_checklist_item")
      .select("user_id, group_id")
      .in("user_id", userIds);
    if (groupIds?.length) q = q.in("group_id", groupIds);
    const { data, error } = await q;
    if (error) {
      console.error(error);
      setNotice(`Could not load existing assignments: ${error.message}`);
      return [];
    }
    const uniq = new Map();
    for (const row of data || []) uniq.set(`${row.user_id}|${row.group_id}`, true);
    return [...uniq.keys()].map(k => {
      const [user_id, group_id] = k.split("|");
      return { user_id, group_id };
    });
  }

  /** Modal: open + load assigned groups */
  async function openEmployeeModal(user) {
    setModalUser(user);
    setShowModal(true);
    setModalLoading(true);
    const pairs = await fetchAssignedPairs([user.id]);
    const gids = [...new Set(pairs.filter(p => p.user_id === user.id).map(p => p.group_id))];
    setModalAssignedGroupIds(gids);
    setModalLoading(false);
  }

  /** Selection helpers */
  function toggleSel(setter, arr, id, checked) {
    setter(prev => checked ? [...new Set([...prev, id])] : prev.filter(x => x !== id));
  }
  function selectAllFiltered(kind) {
    if (kind === "users") setSelectedUsers(filteredUsers.map(u => u.id));
    else setSelectedGroups(filteredGroups.map(g => g.id));
  }
  function clearSelected(kind) {
    if (kind === "users") setSelectedUsers([]);
    else setSelectedGroups([]);
  }

  /** Assign with Option-1 overload disambiguation + detailed logs */
  async function assign() {
    setNotice("");
    if (!selectedUsers.length || !selectedGroups.length) {
      setNotice("Pick at least one employee and one template group.");
      return;
    }

    setLoading(true);
    try {
      const { data: authInfo } = await supabase.auth.getUser();
      const assignedBy = localStorage.getItem("profile_id") || authInfo?.user?.id || null;
      const actorName  = localStorage.getItem("profile_name") || null;

      // dedupe existing pairs
      const existingPairs = await fetchAssignedPairs(selectedUsers, selectedGroups);
      const existingSet = new Set(existingPairs.map(p => `${p.user_id}|${p.group_id}`));
      const worklist = [];
      const skipped = [];

      for (const uid of selectedUsers) {
        for (const gid of selectedGroups) {
          const k = `${uid}|${gid}`;
          if (existingSet.has(k)) skipped.push({ uid, gid });
          else worklist.push({ uid, gid });
        }
      }

      // log skips
      for (const s of skipped) {
        await logAudit({
          actorId: assignedBy,
          actorName,
          action: "assignment.skip_duplicate",
          entityType: "assignment",
          entityId: `${s.uid}:${s.gid}`,
          details: {
            user_id: s.uid,
            user_name: userMap.get(s.uid)?.name || null,
            user_email: userMap.get(s.uid)?.email || null,
            group_id: s.gid,
            group_name: groupMap.get(s.gid)?.name || null
          }
        });
      }

      if (!worklist.length) {
        setNotice("Nothing to assign — selected template group(s) already assigned to selected employee(s).");
        return;
      }

      // resolve due date for logging (if any)
      const resolvedDueDate =
        (dueDate && String(dueDate).trim() !== "") ? dueDate :
        (dueDays !== "" && dueDays !== null && Number.isFinite(Number(dueDays))) ? (() => {
          const d = new Date();
          d.setDate(d.getDate() + Number(dueDays));
          return d.toISOString().slice(0, 10);
        })() : null;

      let totalAssignedPairs = 0;
      let totalItemsUpserted = 0;

      for (const { uid, gid } of worklist) {
        const params = {
          p_user_id: uid,
          p_group_id: gid,
          p_assigned_by: assignedBy,
        };

        // ✅ OPTION 1: send exactly ONE optional param
        if (dueDate && String(dueDate).trim() !== "") {
          params.p_due_date = dueDate; // yyyy-mm-dd
        } else if (dueDays !== "" && dueDays !== null && Number.isFinite(Number(dueDays))) {
          params.p_due_in_days = Number(dueDays);
        }
        // else: send none; RPC defaults handle it

        const { data: rpcData, error } = await supabase.rpc("assign_group_to_user", params);
        if (error) {
          await logAudit({
            actorId: assignedBy,
            actorName,
            action: "assignment.error",
            entityType: "assignment",
            entityId: `${uid}:${gid}`,
            details: {
              user_id: uid,
              user_name: userMap.get(uid)?.name || null,
              user_email: userMap.get(uid)?.email || null,
              group_id: gid,
              group_name: groupMap.get(gid)?.name || null,
              due_date_input: dueDate || null,
              due_in_days_input: (dueDays === "" || dueDays === null) ? null : Number(dueDays),
              error: error.message || String(error),
            }
          });
          throw error;
        }

        // SQL returns SELECT count(*) FROM ins;
        let itemsUpserted = 0;
        if (typeof rpcData === "number") {
          itemsUpserted = rpcData;
        } else if (rpcData && typeof rpcData === "object") {
          if (Array.isArray(rpcData) && rpcData[0]?.count != null) {
            itemsUpserted = Number(rpcData[0].count);
          } else if (rpcData.count != null) {
            itemsUpserted = Number(rpcData.count);
          }
        }

        totalAssignedPairs += 1;
        totalItemsUpserted += itemsUpserted;

        await logAudit({
          actorId: assignedBy,
          actorName,
          action: "assignment.create",
          entityType: "assignment",
          entityId: `${uid}:${gid}`,
          details: {
            user_id: uid,
            user_name: userMap.get(uid)?.name || null,
            user_email: userMap.get(uid)?.email || null,
            group_id: gid,
            group_name: groupMap.get(gid)?.name || null,
            due_date_input: dueDate || null,
            due_in_days_input: (dueDays === "" || dueDays === null) ? null : Number(dueDays),
            due_date_resolved: resolvedDueDate,
            items_upserted: itemsUpserted
          }
        });
      }

      await logAudit({
        actorId: localStorage.getItem("profile_id") || null,
        actorName,
        action: "assignment.batch_summary",
        entityType: "assignment",
        entityId: null,
        details: {
          selected_users: selectedUsers,
          selected_groups: selectedGroups,
          total_pairs_attempted: worklist.length + skipped.length,
          total_pairs_assigned: totalAssignedPairs,
          total_pairs_skipped: skipped.length,
          total_items_upserted: totalItemsUpserted,
          due_date_input: dueDate || null,
          due_in_days_input: (dueDays === "" || dueDays === null) ? null : Number(dueDays)
        }
      });

      setNotice(
        `Assigned ${totalAssignedPairs} ${totalAssignedPairs === 1 ? "assignment" : "assignments"} (duplicates skipped: ${skipped.length}, items upserted: ${totalItemsUpserted}).`
      );

      // refresh modal if open for this user
      if (showModal && modalUser) {
        const pairs = await fetchAssignedPairs([modalUser.id]);
        const gids = [...new Set(pairs.filter(p => p.user_id === modalUser.id).map(p => p.group_id))];
        setModalAssignedGroupIds(gids);
      }
    } catch (e) {
      console.error(e);
      setNotice(`Failed assigning: ${e.message || e}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-dvh bg-cover bg-center" style={{ backgroundImage: "url('/bg.png')" }}>
      <Sidebar active="assign-templates" role={roleId} />

      <div className="flex-1 p-6">
        {/* Sticky header actions */}
        <div className="sticky top-0 z-10 mb-4">
          <div className="bg-emerald-900/95 px-6 py-4 rounded-xl shadow text-emerald-100 font-extrabold text-2xl flex items-center justify-between">
            <span>ASSIGN CHECKLIST TEMPLATES</span>
            <div className="flex items-center gap-3 text-sm">
              <span className="bg-white/10 px-3 py-1 rounded">Users: {selectedUsers.length}</span>
              <span className="bg-white/10 px-3 py-1 rounded">Groups: {selectedGroups.length}</span>
              <button
                onClick={assign}
                disabled={loading || !selectedUsers.length || !selectedGroups.length}
                className="px-3 py-1.5 rounded bg-emerald-500 text-white font-semibold hover:bg-emerald-400 disabled:opacity-60"
              >
                {loading ? "Assigning…" : "Assign Selected"}
              </button>
            </div>
          </div>
        </div>

        {notice && (
          <div className="mb-4 px-4 py-2 bg-emerald-50 text-emerald-900 border border-emerald-300 rounded">
            {notice}
          </div>
        )}

        <div className="grid lg:grid-cols-4 gap-6">
          {/* Employees */}
          <section className="bg-white/95 rounded-lg p-4 shadow border lg:col-span-1">
            <h3 className="font-bold mb-3 text-emerald-900">Employees (for assignment)</h3>

            <div className="flex items-center gap-2 mb-3">
              <Search className="w-4 h-4 text-emerald-800" />
              <input
                placeholder="Search name, email, or ID"
                value={userQuery}
                onChange={(e) => setUserQuery(e.target.value)}
                className="w-full border rounded px-2 py-1"
              />
              <button onClick={() => selectAllFiltered("users")} className="text-xs px-2 py-1 rounded bg-emerald-600 text-white">All</button>
              <button onClick={() => clearSelected("users")} className="text-xs px-2 py-1 rounded bg-gray-200">Clear</button>
            </div>

            <div className="max-h-72 overflow-auto space-y-2">
              {filteredUsers.map((u) => (
                <label key={u.id} className="flex items-start gap-3 border-b border-emerald-50 pb-2 last:border-none">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={selectedUsers.includes(u.id)}
                    onChange={(e) => toggleSel(setSelectedUsers, selectedUsers, u.id, e.target.checked)}
                  />
                  <div className="flex flex-col text-sm">
                    <span className="font-semibold text-emerald-900">{u.name || "Unnamed Employee"}</span>
                    <span className="text-gray-600">ID: {u.id}</span>
                    <span className="text-gray-500">{u.email}</span>
                  </div>
                </label>
              ))}
            </div>
          </section>

          {/* Template Groups */}
          <section className="bg-white/95 rounded-lg p-4 shadow border lg:col-span-1">
            <h3 className="font-bold mb-3 text-emerald-900">Template Groups</h3>

            <div className="flex items-center gap-2 mb-3">
              <Search className="w-4 h-4 text-emerald-800" />
              <input
                placeholder="Search group name or ID"
                value={groupQuery}
                onChange={(e) => setGroupQuery(e.target.value)}
                className="w-full border rounded px-2 py-1"
              />
              <button onClick={() => selectAllFiltered("groups")} className="text-xs px-2 py-1 rounded bg-emerald-600 text-white">All</button>
              <button onClick={() => clearSelected("groups")} className="text-xs px-2 py-1 rounded bg-gray-200">Clear</button>
            </div>

            <div className="max-h-72 overflow-auto space-y-1">
              {filteredGroups.map((g) => (
                <label key={g.id} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedGroups.includes(g.id)}
                      onChange={(e) => toggleSel(setSelectedGroups, selectedGroups, g.id, e.target.checked)}
                    />
                    <span>{g.name}</span>
                  </div>
                </label>
              ))}
            </div>
          </section>

          {/* Due Date (mutually exclusive inputs) */}
          <section className="bg-white/95 rounded-lg p-4 shadow border lg:col-span-1">
            <h3 className="font-bold mb-2 text-emerald-900">Due Date</h3>

            <label className="block text-sm mb-1">Absolute date</label>
            <input
              type="date"
              className="border rounded px-2 py-1 w-full mb-3"
              value={dueDate}
              onChange={(e) => {
                setDueDate(e.target.value);
                if (e.target.value) setDueDays(""); // make exclusive
              }}
              disabled={dueDays !== ""} // disable if relative set (including 0)
            />

            <div className="text-center text-gray-500 mb-2">— or —</div>

            <label className="block text-sm mb-1">Relative (days from today)</label>
            <input
              type="number"
              min={0}
              placeholder="e.g. 7"
              className="border rounded px-2 py-1 w-full"
              value={dueDays}
              onChange={(e) => {
                const v = e.target.value;
                setDueDays(v === "" ? "" : Number(v));
                if (v !== "") setDueDate(""); // make exclusive
              }}
              disabled={!!dueDate} // disable if absolute set
            />
          </section>

          {/* Employees A–Z viewer (modal trigger) */}
          <section className="bg-white/95 rounded-lg p-4 shadow border lg:col-span-1">
            <h3 className="font-bold mb-2 text-emerald-900">Employees A–Z (view assigned)</h3>
            <div className="max-h-72 overflow-auto divide-y">
              {usersAZ.map((u) => {
                const label = u.name && u.name.trim().length ? u.name : u.email || "(no name)";
                return (
                  <div key={u.id} className="py-2 flex items-center justify-between gap-2">
                    <div className="truncate">
                      <span className="font-semibold">{label}</span>
                      <span className="text-xs text-gray-500 ml-2">({u.email})</span>
                    </div>
                    <button
                      onClick={() => openEmployeeModal(u)}
                      className="px-2 py-1 text-sm rounded bg-emerald-600 text-white hover:bg-emerald-500"
                    >
                      View
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-lg rounded-xl bg-white shadow-lg overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b">
                <h4 className="font-semibold text-emerald-900">
                  {modalUser?.name || modalUser?.email} — Assigned Groups
                </h4>
                <button
                  className="rounded px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200"
                  onClick={() => setShowModal(false)}
                >
                  Close
                </button>
              </div>
              <div className="p-5 max-h-[60vh] overflow-auto">
                {modalLoading ? (
                  <div className="text-gray-600">Loading…</div>
                ) : modalAssignedGroupIds.length === 0 ? (
                  <div className="text-gray-600">No groups assigned yet.</div>
                ) : (
                  <ul className="list-disc pl-6 space-y-1">
                    {modalAssignedGroupIds.map((gid) => (
                      <li key={gid}>{groupMap.get(gid)?.name || `Group #${gid}`}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
