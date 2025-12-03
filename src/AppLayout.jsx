import { useState } from "react";
import Sidebar from "../app/components/Sidebar.jsx";
import { useRole } from "../src/lib/hooks/useRole.js";

export default function AppLayout({ children }) {
  const [collapsed, setCollapsed] = useState(false);

  const { roleId } = useRole();

  return (
    <div className="flex min-h-screen w-full overflow-hidden">
      {/* Sidebar */}
      <Sidebar
        role={roleId}        // ← USE REAL ROLE HERE
        collapsed={collapsed}
        setCollapsed={setCollapsed}
      />

      <main
        className={`
          bg-gray-50 relative
          flex-1 min-h-screen overflow-y-auto
          transition-all duration-300
          ${collapsed ? "ml-20" : "ml-64"}
        `}
      >
        
        {children}
      </main>
    </div>
  );
}
