import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../src/lib/supabaseClient.js";
import Sidebar, { ROLES } from "../../components/Sidebar.jsx";


export default function AssignTemplates() {
  // ----- tabs for the whole page -----
  const [tab, setTab] = useState("assign"); // "assign" | "view" | "update"
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);

  // ----- auth/role -----
  const [roleId] = useState(() => {
    const r = localStorage.getItem("role_id");
    return r ? parseInt(r, 10) : ROLES.ADMIN;
  });

  // ----- source data -----
  const [users, setUsers] = useState([]);
  const [groups, setGroups] = useState([]);

  // ----- assign form state -----
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [selectedGroups, setSelectedGroups] = useState([]);
  const [dueDate, setDueDate] = useState("");
  const [dueDays, setDueDays] = useState("");

  // ----- search/filter A–Z -----
  const [search, setSearch] = useState("");
  const [filterBy, setFilterBy] = useState("name"); // "name" | "first" | "last" | "email"

  // ----- modal (per-employee editor) -----
  const [showModal, setShowModal] = useState(false);
  const [modalUser, setModalUser] = useState(null);
  const [modalTab, setModalTab] = useState("templates"); // "templates" | "items" | "add"
  const [modalLoading, setModalLoading] = useState(false);

  // Data inside the modal
  const [employeeItems, setEmployeeItems] = useState([]); // list of assigned_checklist_item rows
  const [employeeGroups, setEmployeeGroups] = useState([]); // distinct groups with counts

  // Add Custom Item form (inside modal)
  const [newCustomTitle, setNewCustomTitle] = useState("");
  const [newCustomGroupId, setNewCustomGroupId] = useState("");
  const [newCustomDue, setNewCustomDue] = useState("");

  // ======== bootstrap ========
  useEffect(() => {
    (async () => {
      const { data: u, error: ue } = await supabase
        .from("users")
        .select("id, name, email")
        .order("name", { ascending: true });
      if (ue) console.error(ue);
      setUsers(u || []);

      const { data: g, error: ge } = await supabase
        .from("checklist_groups")
        .select("id, name, sort_order")
        .order("sort_order", { ascending: true });
      if (ge) console.error(ge);
      setGroups(g || []);
    })();
  }, []);

  // ======== utilities ========
  function labelForUser(u) {
    return (u?.name && u.name.trim().length ? u.name : u?.email || "").trim();
  }
  function firstNameOf(u) {
    const n = (u?.name || "").trim();
    return n ? n.split(/\s+/)[0] : "";
  }
  function lastNameOf(u) {
    const n = (u?.name || "").trim();
    const parts = n.split(/\s+/);
    return parts.length > 1 ? parts[parts.length - 1] : "";
  }

  // A–Z sorting then filter
  const usersAZ = useMemo(() => {
    const sorted = [...users].sort((a, b) =>
      labelForUser(a).localeCompare(labelForUser(b))
    );
    if (!search.trim()) return sorted;

    const q = search.toLowerCase();
    return sorted.filter((u) => {
      if (filterBy === "email") return (u.email || "").toLowerCase().includes(q);
      if (filterBy === "first") return firstNameOf(u).toLowerCase().includes(q);
      if (filterBy === "last") return lastNameOf(u).toLowerCase().includes(q);
      // default "name"
      return (
        (u.name || "").toLowerCase().includes(q) ||
        (u.email || "").toLowerCase().includes(q)
      );
    });
  }, [users, search, filterBy]);

  // ======== ASSIGN ========
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
      const assignedBy =
        localStorage.getItem("profile_id") || authInfo?.user?.id || null;

      // Resolve final due date
      let finalDue = dueDate || null;
      if (!finalDue && dueDays !== "" && dueDays !== null) {
        const d = new Date();
        d.setDate(d.getDate() + Number(dueDays || 0));
        finalDue = d.toISOString().slice(0, 10);
      }

      let total = 0;

      // For each (user, group), assign every item in that group
      for (const uid of selectedUsers) {
        for (const gid of selectedGroups) {
          const { data: items, error: ie } = await supabase
            .from("checklist_item")
            .select("item_id, title, is_required")
            .eq("group_id", gid);
          if (ie) {
            console.error(ie);
            continue;
          }
          if (!items?.length) continue;

          // Build rows
          const rows = items.map((it) => ({
            user_id: uid,
            group_id: gid,
            template_item_id: it.item_id,
            done: false,
            assigned_by: assignedBy,
            assigned_on: new Date().toISOString(),
            due_date: finalDue,
          }));

          const { error: insErr } = await supabase
            .from("assigned_checklist_item")
            .insert(rows);
          if (insErr) console.error(insErr);
          else total += rows.length;
        }
      }

      setNotice(`✅ Assigned ${total} checklist item(s).`);
    } finally {
      setLoading(false);
    }
  }

  // ======== MODAL: open + load ========
  async function openEmployeeModal(user) {
    setModalUser(user);
    setShowModal(true);
    setModalTab("templates");
    setNewCustomTitle("");
    setNewCustomGroupId("");
    setNewCustomDue("");
    await hydrateEmployeeData(user.id);
  }

  async function hydrateEmployeeData(userId) {
    setModalLoading(true);
    try {
      // fetch all assigned rows for this user
      const { data, error } = await supabase
        .from("assigned_checklist_item")
        .select(
          `
          id, user_id, group_id, template_item_id, due_date, done,
          checklist_groups(name),
          checklist_item:template_item_id(title)
        `
        )
        .eq("user_id", userId)
        .order("group_id", { ascending: true });
      if (error) {
        console.error(error);
        setEmployeeItems([]);
        setEmployeeGroups([]);
        return;
      }
      setEmployeeItems(data || []);

      // build distinct groups with counts
      const byGroup = new Map();
      for (const row of data || []) {
        const gid = row.group_id;
        const gname = row.checklist_groups?.name || "Template";
        const arr = byGroup.get(gid) || [];
        arr.push(row);
        byGroup.set(gid, arr);
      }
      const groupsArr = Array.from(byGroup.entries()).map(([gid, rows]) => ({
        id: gid,
        name: rows[0]?.checklist_groups?.name || "Template",
        count: rows.length,
      }));
      setEmployeeGroups(groupsArr);
    } finally {
      setModalLoading(false);
    }
  }

  // ======== MODAL actions ========
  async function deleteWholeTemplate(gid) {
    if (!modalUser?.id) return;
    if (!confirm("Delete this entire template for this employee?")) return;

    const { error } = await supabase
      .from("assigned_checklist_item")
      .delete()
      .eq("user_id", modalUser.id)
      .eq("group_id", gid);
    if (error) console.error(error);
    await hydrateEmployeeData(modalUser.id);
  }

  async function deleteSingleItem(id) {
    if (!confirm("Delete this item?")) return;
    const { error } = await supabase
      .from("assigned_checklist_item")
      .delete()
      .eq("id", id);
    if (error) console.error(error);
    await hydrateEmployeeData(modalUser.id);
  }

  async function updateDueDate(id, newDate) {
    const { error } = await supabase
      .from("assigned_checklist_item")
      .update({ due_date: newDate || null })
      .eq("id", id);
    if (error) console.error(error);
    await hydrateEmployeeData(modalUser.id);
  }

  async function addCustomItem() {
    if (!modalUser?.id) return;
    const title = newCustomTitle.trim();
    if (!title || !newCustomGroupId) return;

    const { data: authInfo } = await supabase.auth.getUser();
    const assignedBy =
      localStorage.getItem("profile_id") || authInfo?.user?.id || null;

    const payload = {
      user_id: modalUser.id,
      group_id: newCustomGroupId,
      template_item_id: null,
      custom_title: title,
      done: false,
      assigned_by: assignedBy,
      assigned_on: new Date().toISOString(),
      due_date: newCustomDue || null,
    };

    const { error } = await supabase
      .from("assigned_checklist_item")
      .insert(payload);
    if (error) console.error(error);

    setNewCustomTitle("");
    setNewCustomGroupId("");
    setNewCustomDue("");
    await hydrateEmployeeData(modalUser.id);
    setModalTab("items");
  }

  // ======== RENDER ========
  return (
    <div
      className="flex min-h-dvh bg-cover bg-center"
      style={{ backgroundImage: "url('/bg.png')" }}
    >
      <Sidebar active="assign-templates" role={roleId} />
      <div className="flex-1 p-6">
        <div className="bg-emerald-900/95 px-6 py-4 rounded-xl shadow mb-6 text-emerald-100 font-extrabold text-2xl flex items-center justify-between">
          ASSIGN CHECKLIST TEMPLATES
          <div className="flex gap-2">
            {["assign", "viewupdate"].map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-3 py-1 rounded ${
                  tab === t
                    ? "bg-emerald-600 text-white"
                    : "bg-white text-emerald-800 border"
                }`}
              >
                {t === "viewupdate" ? "View / Update" : t[0].toUpperCase() + t.slice(1)}

              </button>
            ))}
          </div>
        </div>

        {/* Search + Filter */}
        <div className="mb-4 flex flex-wrap gap-3 items-center">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search employees (name/email)…"
            className="border border-emerald-300 rounded px-3 py-2 w-full sm:w-80"
          />
          <select
            value={filterBy}
            onChange={(e) => setFilterBy(e.target.value)}
            className="border border-emerald-300 rounded px-3 py-2"
          >
            <option value="name">Filter by: Name</option>
            <option value="first">Filter by: First Name</option>
            <option value="last">Filter by: Last Name</option>
            <option value="email">Filter by: Email</option>
          </select>
        </div>

        {/* Assign tab */}
        {tab === "assign" && (
          <>
            {notice && (
              <div className="mb-4 px-4 py-2 bg-emerald-50 text-emerald-900 border border-emerald-300 rounded">
                {notice}
              </div>
            )}

            <div className="grid lg:grid-cols-3 gap-6">
              {/* Employees (with modal trigger) */}
              <section className="bg-white/95 rounded-lg p-4 shadow border">
                <h3 className="font-bold mb-2 text-emerald-900">
                  Employees (A–Z)
                </h3>
                <div className="max-h-72 overflow-auto divide-y">
                  {usersAZ.map((u) => (
                    <div
                      key={u.id}
                      className="py-2 flex items-center justify-between gap-2"
                    >
                      <label className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          className="mt-1"
                          checked={selectedUsers.includes(u.id)}
                          onChange={(e) =>
                            setSelectedUsers((s) =>
                              e.target.checked
                                ? [...s, u.id]
                                : s.filter((x) => x !== u.id)
                            )
                          }
                        />
                        <div className="text-sm">
                          <div className="font-semibold text-emerald-900">
                            {u.name || u.email}
                          </div>
                          <div className="text-gray-500">{u.email}</div>
                        </div>
                      </label>
                      <button
                        onClick={() => openEmployeeModal(u)}
                        className="px-2 py-1 text-xs rounded bg-emerald-600 text-white hover:bg-emerald-500"
                      >
                        Edit
                      </button>
                    </div>
                  ))}
                </div>
              </section>

              {/* Template Groups */}
              <section className="bg-white/95 rounded-lg p-4 shadow border">
                <h3 className="font-bold mb-2 text-emerald-900">Template Groups</h3>
                <div className="max-h-72 overflow-auto space-y-1">
                  {groups.map((g) => (
                    <label key={g.id} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedGroups.includes(g.id)}
                        onChange={(e) =>
                          setSelectedGroups((s) =>
                            e.target.checked
                              ? [...s, g.id]
                              : s.filter((x) => x !== g.id)
                          )
                        }
                      />
                      <span>{g.name}</span>
                    </label>
                  ))}
                </div>
              </section>

              {/* Due Date */}
              <section className="bg-white/95 rounded-lg p-4 shadow border">
                <h3 className="font-bold mb-2 text-emerald-900">Due Date</h3>
                <label className="block text-sm mb-1">Absolute date</label>
                <input
                  type="date"
                  className="border rounded px-2 py-1 w-full mb-3"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />

                <div className="text-center text-gray-500 mb-2">— or —</div>

                <label className="block text-sm mb-1">
                  Relative (days from today)
                </label>
                <input
                  type="number"
                  min={0}
                  placeholder="e.g. 7"
                  className="border rounded px-2 py-1 w-full"
                  value={dueDays}
                  onChange={(e) =>
                    setDueDays(e.target.value === "" ? "" : Number(e.target.value))
                  }
                />
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
          </>
        )}

        {/* View/Update tab */}
        {tab === "viewupdate" && (
          <section className="bg-white rounded-lg p-4 shadow border">
            <h3 className="text-emerald-900 font-bold mb-4">
              Select an employee to view, edit, or update their templates/items
            </h3>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {usersAZ.map((u) => (
                <button
                  key={u.id}
                  onClick={() => openEmployeeModal(u)}
                  className="text-left p-3 border rounded hover:border-emerald-400"
                >
                  <div className="font-semibold text-emerald-900">
                    {u.name || u.email}
                  </div>
                  <div className="text-xs text-gray-500">{u.email}</div>
                </button>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* ===== Modal ===== */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-3xl rounded-xl bg-white shadow-lg overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <div>
                <h4 className="font-semibold text-emerald-900">
                  {modalUser?.name || modalUser?.email}
                </h4>
                <p className="text-xs text-gray-500">{modalUser?.email}</p>
              </div>
              <button
                className="rounded px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200"
                onClick={() => setShowModal(false)}
              >
                Close
              </button>
            </div>

            {/* Modal tabs */}
            <div className="px-5 pt-3 border-b flex gap-2">
              {["templates", "items", "add"].map((t) => (
                <button
                  key={t}
                  onClick={() => setModalTab(t)}
                  className={`px-3 py-1.5 rounded-t ${
                    modalTab === t
                      ? "bg-emerald-600 text-white"
                      : "bg-emerald-100 text-emerald-900"
                  }`}
                >
                  {t === "templates" && "Templates"}
                  {t === "items" && "Checklist Items"}
                  {t === "add" && "Add Custom Item"}
                </button>
              ))}
            </div>

            <div className="p-5 max-h-[70vh] overflow-auto">
              {modalLoading ? (
                <div className="text-gray-600">Loading…</div>
              ) : modalTab === "templates" ? (
                <TemplatesTab
                  employeeGroups={employeeGroups}
                  onDeleteGroup={deleteWholeTemplate}
                />
              ) : modalTab === "items" ? (
                <ItemsTab
                  items={employeeItems}
                  onDeleteItem={deleteSingleItem}
                  onUpdateDue={updateDueDate}
                />
              ) : (
                <AddCustomItemTab
                  groups={groups}
                  newCustomTitle={newCustomTitle}
                  setNewCustomTitle={setNewCustomTitle}
                  newCustomGroupId={newCustomGroupId}
                  setNewCustomGroupId={setNewCustomGroupId}
                  newCustomDue={newCustomDue}
                  setNewCustomDue={setNewCustomDue}
                  onAdd={addCustomItem}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- Modal Tab subcomponents ---------- */

function TemplatesTab({ employeeGroups, onDeleteGroup }) {
  if (!employeeGroups.length)
    return <div className="text-gray-600">No templates assigned.</div>;

  return (
    <div className="space-y-3">
      {employeeGroups.map((g) => (
        <div
          key={g.id}
          className="flex items-center justify-between border rounded px-4 py-3"
        >
          <div>
            <div className="font-semibold text-emerald-900">{g.name}</div>
            <div className="text-xs text-gray-500">
              {g.count} item{g.count === 1 ? "" : "s"}
            </div>
          </div>
          <button
            onClick={() => onDeleteGroup(g.id)}
            className="text-red-600 hover:text-red-800 text-sm"
          >
            Delete Template
          </button>
        </div>
      ))}
    </div>
  );
}

function ItemsTab({ items, onDeleteItem, onUpdateDue }) {
  if (!items.length)
    return <div className="text-gray-600">No items yet.</div>;

  return (
    <div className="space-y-2">
      {items.map((it) => {
        const title = it.custom_title || it.checklist_item?.title || "(untitled)";
        const groupName = it.checklist_groups?.name || "Template";
        const dateStr = it.due_date ? String(it.due_date).slice(0, 10) : "";
        return (
          <div
            key={it.id}
            className="flex flex-wrap items-center justify-between gap-3 border-b pb-2"
          >
            <div className="min-w-[240px]">
              <div className="font-medium text-emerald-900">{title}</div>
              <div className="text-xs text-gray-500">Group: {groupName}</div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="date"
                defaultValue={dateStr}
                onChange={(e) => onUpdateDue(it.id, e.target.value)}
                className="border rounded px-2 py-1 text-xs"
              />
              <button
                onClick={() => onDeleteItem(it.id)}
                className="text-red-600 hover:text-red-800 text-xs"
              >
                Delete
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function AddCustomItemTab({
  groups,
  newCustomTitle,
  setNewCustomTitle,
  newCustomGroupId,
  setNewCustomGroupId,
  newCustomDue,
  setNewCustomDue,
  onAdd,
}) {
  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-emerald-900 mb-1">
          Item title
        </label>
        <input
          value={newCustomTitle}
          onChange={(e) => setNewCustomTitle(e.target.value)}
          placeholder="E.g., ‘Upload security training certificate’"
          className="border rounded px-3 py-2 w-full"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-emerald-900 mb-1">
          Template group
        </label>
        <select
          value={newCustomGroupId}
          onChange={(e) => setNewCustomGroupId(e.target.value)}
          className="border rounded px-3 py-2 w-full"
        >
          <option value="">Select…</option>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-emerald-900 mb-1">
          Due date (optional)
        </label>
        <input
          type="date"
          value={newCustomDue}
          onChange={(e) => setNewCustomDue(e.target.value)}
          className="border rounded px-3 py-2 w-full"
        />
      </div>

      <div className="pt-2">
        <button
          onClick={onAdd}
          className="px-4 py-2 rounded bg-emerald-600 text-white font-semibold hover:bg-emerald-500 disabled:opacity-60"
          disabled={!newCustomTitle.trim() || !newCustomGroupId}
        >
          Add Item
        </button>
      </div>
    </div>
  );
}
