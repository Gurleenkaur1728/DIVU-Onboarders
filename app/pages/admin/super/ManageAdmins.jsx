import { useState } from "react";
import Sidebar, { ROLES } from "../../../components/Sidebar.jsx";
import { Trash2, Plus } from "lucide-react";

export default function ManageAdmins() {
  const [admins] = useState([
    { id: 1, name: "Alice", email: "alice@company.com" },
    { id: 2, name: "Bob", email: "bob@company.com" },
  ]);

  return (
    <div className="flex min-h-dvh bg-cover bg-center relative" style={{ backgroundImage: "url('/bg.png')" }}>
      <Sidebar active="manage-admins" role={ROLES.SUPER_ADMIN} />

      <div className="flex-1 flex flex-col p-6">
        {/* Ribbon */}
        <div className="flex items-center justify-between h-12 rounded-md bg-emerald-100/90 px-4 mb-4 shadow">
          <span className="font-semibold text-emerald-950">Super Admin – Manage Admins</span>
          <button className="flex items-center gap-2 px-3 py-1.5 rounded bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-500">
            <Plus size={16} /> Add Admin
          </button>
        </div>

        {/* Title */}
        <div className="bg-emerald-900/95 px-6 py-4 rounded-xl mb-6 shadow-lg text-emerald-100 font-extrabold border border-emerald-400/70 text-2xl tracking-wide">
          MANAGE ADMINS
        </div>

        {/* Table */}
        <div className="overflow-x-auto bg-white rounded-xl shadow-lg border border-emerald-400/70">
          <table className="min-w-[600px] w-full">
            <thead>
              <tr className="bg-emerald-900/95 text-emerald-100">
                <Th>Name</Th>
                <Th>Email</Th>
                <Th>Action</Th>
              </tr>
            </thead>
            <tbody>
              {admins.map((a, idx) => (
                <tr key={a.id} className={idx % 2 === 0 ? "bg-emerald-50/90" : "bg-emerald-100/80"}>
                  <td className="px-4 py-3">{a.name}</td>
                  <td className="px-4 py-3">{a.email}</td>
                  <td className="px-4 py-3">
                    <button className="flex items-center gap-1 px-2 py-1 rounded bg-red-500 text-white hover:bg-red-600">
                      <Trash2 size={14} /> Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Th({ children }) {
  return <th className="px-4 py-3 font-bold">{children}</th>;
}
