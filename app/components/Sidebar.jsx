import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import Logo from "./Logo.jsx";
import {
  Home,
  List,
  MessageSquare,
  BarChart2,
  Send,
  HelpCircle,
  User,
  BookOpen,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

function Item({ icon: Icon, label, route, isActive, disabled, collapsed }) {
  if (disabled) {
    return (
      <div className="flex items-center px-5 py-3.5 cursor-not-allowed opacity-40">
        <Icon size={20} className="text-gray-400" />
        {!collapsed && <span className="ml-3 text-sm text-gray-400">{label}</span>}
      </div>
    );
  }

  return (
    <Link
      to={route}
      className={`
        flex items-center px-5 py-3.5 rounded-md transition-all duration-300
        ${
          isActive
            ? "bg-emerald-800 text-emerald-100 border-l-4 border-emerald-400 shadow-md"
            : "text-emerald-200 hover:bg-emerald-800/40 hover:text-emerald-100"
        }
      `}
    >
      <Icon
        size={20}
        className={`${
          isActive ? "text-emerald-300" : "text-emerald-400 group-hover:text-emerald-200"
        }`}
      />
      {!collapsed && (
        <span
          className={`ml-3 text-sm font-medium ${
            isActive ? "text-emerald-100" : "group-hover:text-emerald-200"
          }`}
        >
          {label}
        </span>
      )}
    </Link>
  );
}

export default function Sidebar() {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={`
        flex flex-col bg-gradient-to-b from-emerald-950 via-emerald-900 to-emerald-950 
        ${collapsed ? "w-20" : "w-64"} 
        min-h-screen border-r border-emerald-700/40 shadow-lg shadow-emerald-950/50 
        transition-all duration-300
      `}
    >
      {/* Header with Logo + Collapse Toggle */}
      <div className="flex items-center justify-between px-4 py-6">
        <Logo size={collapsed ? 60 : 140} />
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="text-emerald-300 hover:text-white transition"
        >
          {collapsed ? <ChevronRight size={22} /> : <ChevronLeft size={22} />}
        </button>
      </div>

      <div className="mx-4 mb-4 h-[1px] bg-emerald-700/40" />

      {/* Menu */}
      <nav className="flex flex-col space-y-1">
        <Item
          icon={Home}
          label="Home Page"
          route="/home"
          isActive={location.pathname === "/home"}
          collapsed={collapsed}
        />
        <Item
          icon={BookOpen}
          label="Modules"
          route="/modules"
          isActive={location.pathname === "/modules"}
          collapsed={collapsed}
        />
        <Item
          icon={List}
          label="Checklist"
          route="/checklist"
          isActive={location.pathname === "/checklist"}
          collapsed={collapsed}
        />
        <Item
          icon={MessageSquare}
          label="Feedback"
          route="/feedback"
          isActive={location.pathname === "/feedback"}
          collapsed={collapsed}
        />
        {/* ✅ Progress is now routable */}
        <Item
          icon={BarChart2}
          label="Progress"
          route="/progress"
          isActive={location.pathname === "/progress"}
          collapsed={collapsed}
        />
        <Item icon={Send} label="Organization" disabled collapsed={collapsed} />
        <Item icon={HelpCircle} label="Questions" disabled collapsed={collapsed} />
      </nav>

      <div className="flex-grow" />

      {/* Account */}
      <div className="mb-6">
        <Item
          icon={User}
          label="Account"
          route="/account"
          isActive={location.pathname === "/account"}
          collapsed={collapsed}
        />
      </div>
    </aside>
  );
}
