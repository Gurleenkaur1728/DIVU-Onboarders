import { useEffect, useMemo, useState } from "react";
import AppLayout from "../../../src/AppLayout.jsx";
import { Plus, 
  Edit, 
  Trash2, 
  X, 
  CheckCircle, 
  Circle }
from "lucide-react";
import { supabase } from "../../../src/lib/supabaseClient.js";
import { useRole } from "../../../src/lib/hooks/useRole.js";

const TABLES = {
  groups: "checklist_groups",
  items: "checklist_item",
};

export default function ManageChecklist() {
  const { roleId, role } = useRole();
  const isSuperAdmin = role === "SUPER_ADMIN" || role === 2;

  const me = useMemo(
    () => ({
      profileId: localStorage.getItem("profile_id") || null,
      name: localStorage.getItem("profile_name") || "Unknown",
    }),
    []
  );

  const [groups, setGroups] = useState([]);
  const [itemsByGroup, setItemsByGroup] = useState({});
  const [activeVersionId, setActiveVersionId] = useState(null);
  const [expanded, setExpanded] = useState({});
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);
    setNotice("");

    // get newest template version id (used when creating new items)
    const { data: v } = await supabase
      .from("checklist_version")
      .select("version_id")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
      setActiveVersionId(v?.version_id ?? null);

    const { data: gRows, error } = await supabase
      .from(TABLES.groups)
      .select("id, name, sort_order, created_at")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) {
      console.error(error);
      setNotice("Could not load groups.");
      setLoading(false);
      return;
    }
    setGroups(gRows || []);

    // READ (template items)
    const { data: iRows, error: iErr } = await supabase
      .from("checklist_item")
      .select("item_id, group_id, title, is_required, created_at, version_id")
      .order("created_at", { ascending: true });

    if (iErr) {
      console.error(iErr);
      setNotice("Could not load items.");
      setLoading(false);
      return;
    }

    const bucket = {};
    (iRows || []).forEach((r) => {
      if (!bucket[r.group_id]) bucket[r.group_id] = [];
      bucket[r.group_id].push(r);
    });
    setItemsByGroup(bucket);
    setLoading(false);
  }

  /* ----------------- Group CRUD ----------------- */
  const [groupModal, setGroupModal] = useState({ open: false, id: null, title: "" });

  function openNewGroup() {
    setGroupModal({ open: true, id: null, title: "" });
  }
  function openEditGroup(g) {
    setGroupModal({ open: true, id: g.id, title: g.name || "" });
  }
  function closeGroupModal() {
    setGroupModal({ open: false, id: null, title: "" });
  }

  const [savingGroup, setSavingGroup] = useState(false);

  async function saveGroup() {
    if (savingGroup) return;
    const title = groupModal.title.trim();
    if (!title) return;

    setSavingGroup(true);
    try {
      const { data: maxRow } = await supabase
        .from("checklist_groups")
        .select("sort_order")
        .order("sort_order", { ascending: false })
        .limit(1)
        .maybeSingle();

      const nextSort = (maxRow?.sort_order ?? 0) + 10;

      const payload = {
        name: title,
        sort_order: nextSort,
        created_by: me.profileId,
      };

      if (groupModal.id) {
        await supabase.from("checklist_groups").update({ name: title }).eq("id", groupModal.id);
      } else {
        const { error } = await supabase.from("checklist_groups").insert(payload).select().single();
        if (error) throw error;
      }

      await loadAll();
      closeGroupModal();
      setNotice(groupModal.id ? "Group updated." : "Group created.");
    } catch (e) {
      console.error(e);
      setNotice(e.message || "Could not save group.");
    } finally {
      setSavingGroup(false);
    }
  }

  async function deleteGroup(g) {
    if (isSuperAdmin) {
      const { error } = await supabase.from(TABLES.groups).delete().eq("id", g.id);
      if (error) {
        console.error(error);
        setNotice("Failed to delete group.");
      } else {
        setNotice("Group deleted.");
        await loadAll();
      }
    } else {
      await createDeleteRequest("group", g.id, { name: g.name });
      setNotice("Delete request sent to Super Admin.");
    }
  }

  /* ----------------- Item CRUD ----------------- */
  const [itemModal, setItemModal] = useState({
    open: false,
    item_id: null,
    group_id: null,
    title: "",
    created_by: "",
    is_required: true,
  });

  function openNewItem(groupId) {
    setItemModal({
      open: true,
      item_id: null,
      group_id: groupId,
      title: "",
      assigned_on: "",
      is_required: true,
    });
  }
  function openEditItem(item) {
    setItemModal({
      open: true,
      item_id: item.item_id,
      group_id: item.group_id,
      title: item.title || "",
      assigned_on: item.assigned || "",
      is_required: !!item.is_required,
    });
  }
  function closeItemModal() {
    setItemModal({
      open: false,
      item_id: null,
      group_id: null,
      title: "",
      is_required: true,
    });
  }

  async function saveItem() {
    const title = itemModal.title.trim();
    if (!title || !itemModal.group_id) return;

    const payload = {
      title,
      item_id: crypto.randomUUID(),
      group_id: itemModal.group_id,
      is_required: !!itemModal.is_required,
      created_by: me.profileId, 
      version_id: activeVersionId,
    };

    if (itemModal.item_id) {
      const { error } = await supabase
      .from(TABLES.items)
      .update({
        title,
        is_required: !!itemModal.is_required,
      })
      .eq("item_id", itemModal.item_id);
      if (error) {
        console.error(error);
        setNotice("Could not update checklist item.");
      } else {
        setNotice(itemModal.item_id ? "Checklist item updated." : "Checklist item created.");
        await loadAll();
        closeItemModal();
      }
    } else {
      const { error } = await supabase.from(TABLES.items).insert(payload);
      if (error) {
        console.error(error);
        setNotice("Could not create checklist item.");
      } else {
        setNotice("Checklist item created.");
        await loadAll();
        closeItemModal();
      }
    }
  }

  async function deleteItem(item) {
    if (isSuperAdmin) {
      const { error } = await supabase.from(TABLES.items).delete().eq("item_id", item.item_id);
      if (error) {
        console.error(error);
        setNotice("Failed to delete item.");
      } else {
        setNotice("Item deleted.");
        await loadAll();
      }
    } else {
      await createDeleteRequest("item", item.item_id, { title: item.title, group_id: item.group_id });
      setNotice("Delete request sent to Super Admin.");
    }
  }

  /* ----------- Admin request helper ----------- */
  async function createDeleteRequest(kind, id, payload = {}) {
    const req = {
      request_type: kind === "group" ? "delete_group" : "delete_item",
      target_table: kind === "group" ? TABLES.groups : TABLES.items,
      target_id: id,
      payload,
      requested_by: me.profileId,
      status: "pending",
    };
    const { error } = await supabase.from(TABLES.adminRequests).insert(req);
    if (error) {
      console.error(error);
      setNotice("Could not send approval request.");
    }
  }

  return (
    <AppLayout>
       <div className="flex-1 min-h-dvh p-6 space-y-6">
        <div
          className="
            rounded-lg shadow-sm border px-6 py-4 mb-6
            flex items-center justify-between transition
            bg-white border-gray-300 text-gray-900
            dark:bg-black/30 dark:border-black dark:text-white
          "
        >
          {/* LEFT — TITLE + SUBTITLE */}
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Manage Checklist
            </h1>

            <p className="text-gray-600 dark:text-gray-300">
              Create and manage checklist groups and items for employee onboarding
            </p>
          </div>

          {/* RIGHT — ACTION BUTTON */}
          <button
            onClick={openNewGroup}
            className="
              flex items-center gap-2 px-4 py-2 rounded-md
              text-sm font-semibold border
              bg-DivuDarkGreen text-white border-black
              hover:bg-DivuBlue
               transition
            "
          >
            <Plus size={16} />
            New Group
          </button>
        </div>


        {notice && <div className="mb-6 px-4 py-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg">{notice}</div>}

        <div className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading…</p>
              </div>
            </div>
          ) : groups.length === 0 ? (
            <div className="text-gray-600 bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
              No groups yet. Create your first group.
            </div>
          ) : (
            groups.map((g) => {
              const open = !!expanded[g.id];
              const items = itemsByGroup[g.id] || [];
              return (
                <div
                  key={g.id}
                  className="
                    rounded-lg shadow-sm border transition
                    bg-white border-gray-300 text-gray-900
                    dark:bg-black/70 dark:border-black dark:text-white
                  "
                >
                  <div className="flex items-center justify-between px-4 py-3 bg-DivuLightGreen/40 
                  border-b border-gray-200 rounded-t-lg">
                    <button
                      className="flex items-center gap-2 font-semibold "
                      onClick={() => setExpanded((s) => ({ ...s, [g.id]: !s[g.id] }))}
                      title={open ? "Collapse" : "Expand"}
                    >
                      <span className="inline-block w-2 h-2 rounded-full bg-emerald-600" />
                      {g.name}
                    </button>
                    <div className="flex gap-2">
                      <button
                        onClick={() => openNewItem(g.id)}
                        className="px-2 py-1 rounded bg-emerald-600 text-white text-sm hover:bg-emerald-700 transition"
                        title="Add checklist item"
                      >
                        <Plus size={14} />
                      </button>
                      <button
                        onClick={() => openEditGroup(g)}
                        className="px-2 py-1 rounded bg-blue-600 text-white text-sm hover:bg-blue-700 transition"
                        title="Rename group"
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        onClick={() => deleteGroup(g)}
                        className="px-2 py-1 rounded bg-red-600 text-white text-sm hover:bg-red-700 transition"
                        title={isSuperAdmin ? "Delete group" : "Request delete"}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {open && (
                    <div className="overflow-x-auto">
                      <table className="w-full table-auto border-collapse">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-200 text-left">
                            <Th>Required</Th>
                            <Th>Module</Th>
                            <Th>Date Assigned</Th>
                            <Th className="text-right pr-4">Actions</Th>
                          </tr>
                        </thead>
                        <tbody>
                          {items.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="px-4 py-4 text-gray-500 text-center">
                                No items in this group yet.
                              </td>
                            </tr>
                          ) : (
                            items.map((it, idx) => (
                              <tr key={it.item_id} className="border-b border-gray-200 hover:bg-DivuBlue/20
                               transition">
                                <td className="px-4 py-3">
                                  {it.is_required ? (
                                    <CheckCircle className="w-5 h-5 text-emerald-600" />
                                  ) : (
                                    <Circle className="w-5 h-5 text-gray-400" />
                                  )}
                                </td>
                                <td className="px-4 py-3">{it.title}</td>
                                <td className="px-4 py-3 text-gray-600">{it.assigned || "-"}</td>
                                <td className="px-4 py-3">
                                  <div className="flex gap-2 justify-end pr-1">
                                    <button
                                      onClick={() => openEditItem(it)}
                                      className="p-2 rounded bg-blue-600 text-white hover:bg-blue-700 transition"
                                      title="Edit item"
                                    >
                                      <Edit size={16} />
                                    </button>
                                    <button
                                      onClick={() => deleteItem(it)}
                                      className="p-2 rounded bg-red-600 text-white hover:bg-red-700 transition"
                                      title={isSuperAdmin ? "Delete item" : "Request delete"}
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {groupModal.open && (
        <Modal onClose={closeGroupModal} title={groupModal.id ? "Edit Group" : "New Group"}>
          <div className="space-y-3">
            <label className="block text-sm text-gray-700 font-medium">Group title</label>
            <input
              value={groupModal.title}
              onChange={(e) => setGroupModal((m) => ({ ...m, title: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              placeholder="e.g. Complete within first week of employment"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={closeGroupModal} className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 text-sm hover:bg-gray-200 transition">
                Cancel
              </button>
              <button onClick={saveGroup} disabled={savingGroup} className="px-4 py-2 rounded-lg bg-DivuDarkGreen text-white text-sm hover:bg-DivuLightGreen hover:text-black
              transition">
                { savingGroup ? "Saving..." : "Save" }
              </button>
            </div>
          </div>
        </Modal>
      )}

      {itemModal.open && (
        <Modal onClose={closeItemModal} title={itemModal.id ? "Edit Checklist Item" : "Add Checklist Item"}>
          <div className="space-y-3">
            <label className="block text-sm text-gray-700 font-medium">Title</label>
            <input
              value={itemModal.title}
              onChange={(e) => setItemModal((m) => ({ ...m, title: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              placeholder="e.g. Security Training"
            />
            <label className="block text-sm text-gray-700 font-medium mt-2">Date Assigned (optional)</label>
            <input
              type="date"
              value={itemModal.assigned_on || ""}
              onChange={(e) => setItemModal((m) => ({ ...m, assigned_on: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
            <label className="inline-flex items-center gap-2 mt-2">
              <input
                type="checkbox"
                checked={itemModal.is_required}
                onChange={(e) => setItemModal((m) => ({ ...m, is_required: e.target.checked }))}
                className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
              />
              <span className="text-sm text-gray-700">Required</span>
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={closeItemModal} className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 text-sm hover:bg-gray-200 transition">
                Cancel
              </button>
              <button onClick={saveItem} className="px-4 py-2 rounded-lg bg-DivuDarkGreen
               text-white text-sm hover:bg-DivuLightGreen hover:text-black transition">
                Save
              </button>
            </div>
          </div>
        </Modal>
      )}
    </AppLayout>
  );
}

/* ---------- UI helpers ---------- */
function Th({ children, className = "" }) {
  return <th className={`px-4 py-3 font-semibold text-gray-700 ${className}`}>{children}</th>;
}
function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-6 relative">
        <button onClick={onClose} className="absolute top-3 right-3 p-2 rounded-full hover:bg-gray-100 transition" title="Close">
          <X size={18} className="text-gray-600" />
        </button>
        <h2 className="text-lg font-bold text-gray-900 mb-4">{title}</h2>
        {children}
      </div>
    </div>
  );
}
