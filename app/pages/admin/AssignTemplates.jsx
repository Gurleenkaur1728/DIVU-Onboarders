import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../src/lib/supabaseClient.js";
import Sidebar, { ROLES } from "../../components/Sidebar.jsx";

export default function AssignTemplates() {
  const [users, setUsers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [selectedGroups, setSelectedGroups] = useState([]);
  const [dueDate, setDueDate] = useState("");
  const [dueDays, setDueDays] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);

  // Modal state for "view assigned groups"
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
      // pulls from users table in supabase
      const { data: u, error: ue } = await supabase
        .from("users")
        .select("id, name, email")
        .order("name");
      if (ue) console.error(ue);
      setUsers(u || []);

      // pulls from checklist_groups table in supabase
      const { data: g, error: ge } = await supabase
        .from("checklist_groups")
        .select("id, name, sort_order")
        .order("sort_order");
      if (ge) console.error(ge);
      setGroups(g || []);
    })();
  }, []);

  const usersAZ = useMemo(() => {
    const label = (u) => (u.name && u.name.trim().length ? u.name : u.email || "");
    return [...users].sort((a, b) => label(a).localeCompare(label(b)));
  }, [users]);

  const groupNameById = useMemo(() => {
    const m = new Map();
    for (const g of groups) m.set(g.id, g.name);
    return m;
  }, [groups]);

  /** Fetch distinct (user_id, group_id) pairs from assigned_checklist_item */
  async function fetchAssignedPairs(userIds, groupIds) {
    if (!userIds?.length) return [];
    let q = supabase
      .from("assigned_checklist_item")
      .select("user_id, group_id", { head: false })
      .in("user_id", userIds);

    if (groupIds?.length) q = q.in("group_id", groupIds);

    const { data, error } = await q;
    if (error) {
      console.error(error);
      setNotice(`Could not load existing assignments: ${error.message}`);
      return [];
    }
    // De-dup in case the table returns multiple rows per (user, group)
    const uniq = new Map(); // key: `${u}|${g}` -> true
    for (const row of data || []) {
      uniq.set(`${row.user_id}|${row.group_id}`, true);
    }
    return [...uniq.keys()].map((k) => {
      const [user_id, group_id] = k.split("|");
      return { user_id, group_id };
    });
  }

  /** For modal: all distinct group_ids already assigned to a specific user */
  async function openEmployeeModal(user) {
    setModalUser(user);
    setShowModal(true);
    setModalLoading(true);

    const pairs = await fetchAssignedPairs([user.id]);
    const gids = [...new Set(pairs.filter(p => p.user_id === user.id).map(p => p.group_id))];
    setModalAssignedGroupIds(gids);
    setModalLoading(false);
  }

  async function assign() {
    setNotice("");
    if (!selectedUsers.length || !selectedGroups.length) {
      setNotice("Pick at least one employee and one template group.");
      return;
    }

    setLoading(true);
    try {
      const { data: authInfo, error: authErr } = await supabase.auth.getUser();
      if (authErr) console.error(authErr);
      const assignedBy = localStorage.getItem("profile_id") || authInfo?.user?.id || null;

      // 1) Load existing (user,group) assignments to block duplicates
      const existingPairs = await fetchAssignedPairs(selectedUsers, selectedGroups);
      const existingSet = new Set(existingPairs.map(p => `${p.user_id}|${p.group_id}`));

      // 2) Build the list of pairs we are allowed to assign (skip duplicates)
      const worklist = [];
      for (const uid of selectedUsers) {
        for (const gid of selectedGroups) {
          const k = `${uid}|${gid}`;
          // STRICT duplicate-prevention at the group level:
          // if ANY item from this group was already assigned to this user, skip.
          if (!existingSet.has(k)) {
            worklist.push({ uid, gid });
          }
        }
      }

      if (!worklist.length) {
        setNotice(
          "Nothing to assign — those template group(s) are already assigned to the selected employee(s)."
        );
        return;
      }

      // 3) Call your RPC for each remaining (user, group) pair
      for (const { uid, gid } of worklist) {
        const params = {
          p_user_id: uid,
          p_group_id: gid,
          p_assigned_by: assignedBy,
        };
        if (dueDate) params.p_due_date = dueDate;
        if (dueDays !== "" && dueDays !== null) params.p_due_in_days = Number(dueDays);

        const { error } = await supabase.rpc("assign_group_to_user", params);
        if (error) {
          console.error(error);
          setNotice(`Failed assigning to some users: ${error.message}`);
          return;
        }
      }

      setNotice(
        `Template(s) assigned successfully. Assigned ${worklist.length} new ${worklist.length === 1 ? "pair" : "pairs"} (duplicates were blocked).`
      );

      // If we were viewing someone in the modal, refresh their list
      if (showModal && modalUser) {
        const pairs = await fetchAssignedPairs([modalUser.id]);
        const gids = [...new Set(pairs.filter(p => p.user_id === modalUser.id).map(p => p.group_id))];
        setModalAssignedGroupIds(gids);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-dvh bg-cover bg-center" style={{ backgroundImage: "url('/bg.png')" }}>
      <Sidebar active="assign-templates" role={roleId} />

      <div className="flex-1 p-6">
        <div className="bg-emerald-900/95 px-6 py-4 rounded-xl shadow mb-6 text-emerald-100 font-extrabold text-2xl">
          ASSIGN CHECKLIST TEMPLATES
        </div>

        {notice && (
          <div className="mb-4 px-4 py-2 bg-emerald-50 text-emerald-900 border border-emerald-300 rounded">
            {notice}
          </div>
        )}

        <div className="grid lg:grid-cols-4 gap-6">
          {/* Employees (checkboxes for assignment) */}
          <section className="bg-white/95 rounded-lg p-4 shadow border lg:col-span-1">
            <h3 className="font-bold mb-2 text-emerald-900">Employees (for assignment)</h3>
            <div className="max-h-72 overflow-auto space-y-2">
                {users.map((u) => (
                <label
                    key={u.id}
                    className="flex items-start gap-3 border-b border-emerald-50 pb-2 last:border-none"
                >
                    <input
                    type="checkbox"
                    className="mt-1"
                    checked={selectedUsers.includes(u.id)}
                    onChange={(e) =>
                        setSelectedUsers((s) =>
                        e.target.checked ? [...s, u.id] : s.filter((x) => x !== u.id)
                        )
                    }
                    />
                    <div className="flex flex-col text-sm">
                    <span className="font-semibold text-emerald-900">
                        {u.name || "Unnamed Employee"}
                    </span>
                    <span className="text-gray-500">{u.email}</span>
                    </div>
                </label>
                ))}
            </div>
            </section>


          {/* Template Groups */}
          <section className="bg-white/95 rounded-lg p-4 shadow border lg:col-span-1">
            <h3 className="font-bold mb-2 text-emerald-900">Template Groups</h3>
            <div className="max-h-72 overflow-auto space-y-1">
              {groups.map((g) => (
                <label key={g.id} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectedGroups.includes(g.id)}
                    onChange={(e) =>
                      setSelectedGroups((s) => (e.target.checked ? [...s, g.id] : s.filter((x) => x !== g.id)))
                    }
                  />
                  <span>{g.name}</span>
                </label>
              ))}
            </div>
          </section>

          {/* Due Date options */}
          <section className="bg-white/95 rounded-lg p-4 shadow border lg:col-span-1">
            <h3 className="font-bold mb-2 text-emerald-900">Due Date</h3>
            <label className="block text-sm mb-1">Absolute date</label>
            <input
              type="date"
              className="border rounded px-2 py-1 w-full mb-3"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />

            <div className="text-center text-gray-500 mb-2">— or —</div>

            <label className="block text-sm mb-1">Relative (days from today)</label>
            <input
              type="number"
              min={0}
              placeholder="e.g. 7"
              className="border rounded px-2 py-1 w-full"
              value={dueDays}
              onChange={(e) => setDueDays(e.target.value === "" ? "" : Number(e.target.value))}
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
                    <div className="truncate">{label}</div>
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

        <div className="mt-6">
          <button
            onClick={assign}
            disabled={loading}
            className="px-4 py-2 rounded bg-emerald-600 text-white font-semibold hover:bg-emerald-500 disabled:opacity-60"
          >
            {loading ? "Assigning..." : "Assign Selected"}
          </button>
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
                      <li key={gid}>{groupNameById.get(gid) || `Group #${gid}`}</li>
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
