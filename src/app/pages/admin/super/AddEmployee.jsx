import Sidebar, { ROLES } from "../../../components/admin/Sidebar";
import { Send } from "lucide-react";

export default function AddEmployee() {
  return (
    <div className="flex min-h-dvh bg-cover bg-center relative" style={{ backgroundImage: "url('/bg.png')" }}>
      <Sidebar active="add-employee" role={ROLES.SUPER_ADMIN} />

      <div className="flex-1 flex flex-col p-6">
        {/* Ribbon */}
        <div className="flex items-center justify-between h-12 rounded-md bg-emerald-100/90 px-4 mb-4 shadow">
          <span className="font-semibold text-emerald-950">Super Admin – Add Employee</span>
        </div>

        {/* Title */}
        <div className="bg-emerald-900/95 px-6 py-4 rounded-xl mb-6 shadow-lg text-emerald-100 font-extrabold border border-emerald-400/70 text-2xl tracking-wide">
          ADD EMPLOYEE
        </div>

        {/* Form */}
        <div className="bg-white/95 rounded-xl p-6 shadow-lg max-w-2xl space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input placeholder="Employee ID" className="border rounded px-3 py-2" />
            <input placeholder="Email" className="border rounded px-3 py-2" />
            <input placeholder="Position" className="border rounded px-3 py-2" />
          </div>
          <button className="flex items-center gap-2 px-4 py-2 rounded bg-emerald-600 text-white font-semibold hover:bg-emerald-500">
            <Send size={16} /> Send Invitation Link
          </button>
        </div>
      </div>
    </div>
  );
}