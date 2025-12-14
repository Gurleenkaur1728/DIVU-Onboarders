import { useState } from "react";
import Sidebar from "../app/components/Sidebar.jsx";
import { useRole } from "../src/lib/hooks/useRole.js";
import { Menu } from "lucide-react";
import { useTheme } from "../src/lib/hooks/useTheme.js";

export default function AppLayout({ children }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const { theme, setTheme } = useTheme();
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

      {/* MAIN CONTENT WRAPPER */}
      <main
        className={`
          flex-1 min-h-screen overflow-y-auto transition-all duration-300
          ${theme === "light" ? "bg-white text-gray-900" : "bg-[#0f1513] text-gray-200"}
          bg-cover bg-center bg-fixed relative
          ${collapsed ? "lg:ml-20" : "lg:ml-64"}
        `}
        style={{
          backgroundImage: theme === "dark"
            ? "url('/bg3.png')"
            : "url('/bg.png')",
        }}
      >
        {/* THEME OVERLAY (only one) */}
        <div
          className={`
            absolute inset-0 pointer-events-none transition-all duration-300
            ${theme === "dark" ? "bg-[#0f1513]/70" : "bg-white/70"}
          `}
        ></div>

        {/* MOBILE MENU BUTTON */}
        <button
          onClick={() => setMobileOpen(true)}
          className="fixed top-4 left-4 z-20 bg-emerald-600 text-white p-2.5 rounded-lg shadow-lg lg:hidden hover:bg-emerald-700 transition"
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>

        {/* THEME TOGGLE BUTTON */}
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
          className="
            fixed bottom-4 right-4 z-20 px-4 py-2 rounded-lg shadow-lg
            bg-emerald-600 text-white hover:bg-emerald-700 transition
          "
        >
          {theme === "dark" ? "🔆" : "🌑"}
        </button>

        {/* CONTENT (only once) */}
        <div className="relative z-10 pt-14 lg:pt-0">
          {children}
        </div>

      </main>
    </div>
  );
}
