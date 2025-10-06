import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";
import Sidebar, { ROLES } from "../../components/Sidebar.jsx";

export default function AssignTemplates() {

    const [users, setUsers] = useState([]);
    const [groups, setGroups] = useState([]);
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [selectedGroups, setSelectedGroups] = useState([]);
    const [dueDate, setDueDate] = useState("");
    const [dueDays, setDueDays] = useState("");
    const [notice, setNotice] = useState("");
    const [roleId] = useState(() => {
        const r = localStorage.getItem("role_id");
        return r ? parseInt(r, 10) : ROLES.ADMIN;
    });

    useEffect(() => {
        (async () => {
        const { data: u } = await supabase
            .from("users")
            .select("id, name, email")
            .order("name");
        setUsers(u || []);

        const { data: g } = await supabase
            .from("checklist_groups")
            .select("id, name")
            .order("sort_order");
        setGroups(g || []);
        })();
    }, []);

    async function assign() {
        if (!selectedUsers.length || !selectedGroups.length) {
        setNotice("Pick at least one employee and one template group.");
        return;
        }

        const { data: { user } } = await supabase.auth.getUser();
        // If you store an internal profile id in localStorage, use that instead:
        const assignedBy = localStorage.getItem("profile_id") || user?.id || null;

        for (const uid of selectedUsers) {
        for (const gid of selectedGroups) {
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
        }
        setNotice("Template(s) assigned successfully.");
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

        <div className="grid md:grid-cols-3 gap-6">
        {/* Employees */}
        <section className="bg-white/95 rounded-lg p-4 shadow border">
            <h3 className="font-bold mb-2 text-emerald-900">Employees</h3>
            <div className="max-h-72 overflow-auto space-y-1">
            {users.map(u => (
                <label key={u.id} className="flex items-center gap-2">
                <input
                    type="checkbox"
                    checked={selectedUsers.includes(u.id)}
                    onChange={(e) =>
                    setSelectedUsers(s =>
                        e.target.checked ? [...s, u.id] : s.filter(x => x !== u.id)
                    )
                    }
                />
                <span>{u.name || u.email}</span>
                </label>
            ))}
            </div>
        </section>

        {/* Template Groups */}
        <section className="bg-white/95 rounded-lg p-4 shadow border">
            <h3 className="font-bold mb-2 text-emerald-900">Template Groups</h3>
            <div className="max-h-72 overflow-auto space-y-1">
            {groups.map(g => (
                <label key={g.id} className="flex items-center gap-2">
                <input
                    type="checkbox"
                    checked={selectedGroups.includes(g.id)}
                    onChange={(e) =>
                    setSelectedGroups(s =>
                        e.target.checked ? [...s, g.id] : s.filter(x => x !== g.id)
                    )
                    }
                />
                <span>{g.name}</span>
                </label>
            ))}
            </div>
        </section>

        {/* Due date options */}
        <section className="bg-white/95 rounded-lg p-4 shadow border">
            <h3 className="font-bold mb-2 text-emerald-900">Due Date</h3>
            <label className="block text-sm mb-1">Absolute date</label>
            <input type="date" className="border rounded px-2 py-1 w-full mb-3"
                value={dueDate} onChange={e => setDueDate(e.target.value)} />

            <div className="text-center text-gray-500 mb-2">— or —</div>

            <label className="block text-sm mb-1">Relative (days from today)</label>
            <input type="number" min={0} placeholder="e.g. 7"
                className="border rounded px-2 py-1 w-full"
                value={dueDays}
                onChange={e => setDueDays(e.target.value === "" ? "" : Number(e.target.value))} />
        </section>
        </div>

        <div className="mt-6">
        <button
            onClick={assign}
            className="px-4 py-2 rounded bg-emerald-600 text-white font-semibold hover:bg-emerald-500"
        >
            Assign Selected
        </button>
        </div>
    </div>
    </div>
);
}
