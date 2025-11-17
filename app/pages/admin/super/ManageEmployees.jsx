import { useState } from "react";
import AppLayout from "../../../../src/AppLayout.jsx";
import { useRole } from "../../../../src/lib/hooks/useRole.js";
import { Edit, Trash2 } from "lucide-react";

export default function ManageEmployees() {
  const { roleId } = useRole();
  const [employees] = useState([
    { id: 1, name: "John Doe", email: "john@company.com", position: "Developer", employeeId: "EMP001" },
    { id: 2, name: "Jane Smith", email: "jane@company.com", position: "HR Manager", employeeId: "EMP002" },
    { id: 3, name: "David Lee", email: "david@company.com", position: "Designer", employeeId: "EMP003" },
  ]);

  return (
  <AppLayout>
    
  {/* //   <div className="flex min-h-dvh bg-cover bg-center relative" style={{ backgroundImage: "url('/bg.png')" }}>
  // <Sidebar active="manage-employees" role={roleId} /> */}

      <div className="flex-1 flex flex-col p-6 z-10">
        {/* Ribbon */}
        <div className="flex items-center justify-between h-12 rounded-md bg-emerald-100/90 px-4 mb-4 shadow">
          <span className="font-semibold text-emerald-950">Super Admin – Manage Employees</span>
        </div>

        {/* Title */}
        <div className="bg-emerald-900/95 px-6 py-4 rounded-xl mb-4 shadow-lg text-emerald-100 font-extrabold border border-emerald-400/70 text-2xl tracking-wide">
          MANAGE EMPLOYEES
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-lg border border-emerald-400/70 shadow-lg bg-white">
          <table className="min-w-[900px] w-full border-collapse">
            <thead>
              <tr className="bg-emerald-900/95 text-emerald-100">
                <Th>ID</Th>
                <Th>Name</Th>
                <Th>Email</Th>
                <Th>Position</Th>
                <Th>Actions</Th>
              </tr>
            </thead>
            <tbody>
              {employees.map((emp, idx) => (
                <tr key={emp.id} className={idx % 2 === 0 ? "bg-emerald-50/90" : "bg-emerald-100/80"}>
                  <td className="px-4 py-3">{emp.employeeId}</td>
                  <td className="px-4 py-3">{emp.name}</td>
                  <td className="px-4 py-3">{emp.email}</td>
                  <td className="px-4 py-3">{emp.position}</td>
                  <td className="px-4 py-3 flex gap-2">
                    <button className="p-2 rounded bg-blue-500 text-white hover:bg-blue-600"><Edit size={16} /></button>
                    <button className="p-2 rounded bg-red-500 text-white hover:bg-red-600"><Trash2 size={16} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppLayout>
  );
}

function Th({ children }) {
  return <th className="px-4 py-3 font-bold border-r border-emerald-800/50">{children}</th>;
}
