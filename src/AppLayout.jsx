import { useState } from "react";
import Sidebar from "../app/components/Sidebar.jsx";
import { useRole } from "../src/lib/hooks/useRole.js";
import { Menu } from "lucide-react";

export default function AppLayout({ children }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const { roleId } = useRole();

  return (
    <div className="flex min-h-screen w-full overflow-hidden">
      {/* Sidebar */}
      <Sidebar
        role={roleId}
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />

      <main
        className={`
          bg-cover bg-center bg-fixed relative
          flex-1 min-h-screen overflow-y-auto
          transition-all duration-300
          ${collapsed ? "ml-20" : "ml-64"}
        `}
        style={{ backgroundImage: "url('/bg.png')" }}
      >
        {/* Mobile Menu Button */}
        <button
          onClick={() => setMobileOpen(true)}
          className="fixed top-4 left-4 z-10 bg-emerald-600 text-white p-2.5 rounded-lg shadow-lg lg:hidden hover:bg-emerald-700 transition"
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>

        <div className="pt-14 lg:pt-0">
          {children}
        </div>
      </main>
    </div>
  );
}
