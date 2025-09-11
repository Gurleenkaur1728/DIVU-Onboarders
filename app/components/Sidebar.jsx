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
  LayoutDashboard,
  FileEdit,
  ListChecks,
  BookOpen,
} from "lucide-react";

// Example role IDs (match your DB)
const ROLES = {
  SUPER_ADMIN: 1,
  ADMIN: 2,
  USER: 3,
};

function Item({ icon: Icon, label, route, isActive, disabled }) {
  if (disabled) {
    return (
      <div
        className={`group flex items-center px-5 py-3.5 opacity-40 cursor-not-allowed
          ${isActive ? "bg-emerald-800/60 border-l-4 border-emerald-400" : ""}`}
      >
        <Icon size={18} className="mr-3 text-emerald-100" />
        <span className="text-sm font-medium text-emerald-100">{label}</span>
      </div>
    );
  }

  return (
    <Link
      to={route}
      className={`group flex items-center px-5 py-3.5 transition-all duration-300
        hover:bg-emerald-800/40
        ${isActive ? "bg-emerald-800/60 border-l-4 border-emerald-400" : ""}`}
    >
      <Icon
        size={18}
        className={`mr-3 ${
          isActive ? "text-emerald-300" : "text-emerald-100 group-hover:text-emerald-300"
        }`}
      />
      <span
        className={`text-sm font-medium ${
          isActive ? "text-emerald-200" : "text-emerald-100 group-hover:text-emerald-200"
        }`}
      >
        {label}
      </span>
    </Link>
  );
}

export default function Sidebar({ role }) {
  const location = useLocation();

  return (
    <aside
      className="
        flex flex-col 
        bg-gradient-to-b from-emerald-950 via-emerald-900 to-emerald-950 
        w-64 min-h-screen
        border-r border-emerald-700/40
        shadow-lg shadow-emerald-950/50
      "
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-5">
        <Logo size={60} />
      </div>
      <div className="mx-4 mb-4 h-[1px] bg-emerald-700/40" />

      {/* MENU */}
      <nav className="flex flex-col space-y-1">
        {/* User Menu */}
        {role === ROLES.USER && (
          <>
            <Item icon={Home} label="Home Page" route="/home" isActive={location.pathname === "/home"} />
            <Item icon={List} label="Checklist" route="/checklist" isActive={location.pathname === "/checklist"} />
            <Item icon={MessageSquare} label="Feedback" route="/feedback" isActive={location.pathname === "/feedback"} />
            <Item icon={BarChart2} label="Progress" disabled />
            <Item icon={Send} label="Organization" disabled />
            <Item icon={HelpCircle} label="Questions" disabled />
            <div className="flex-grow" />
            <Item icon={User} label="Account" route="/account" isActive={location.pathname === "/account"} />
          </>
        )}

        {/* Admin Menu */}
        {(role === ROLES.ADMIN || role === ROLES.SUPER_ADMIN) && (
          <>
            <Item icon={LayoutDashboard} label="Dashboard" route="/admin/dashboard" isActive={location.pathname === "/admin/dashboard"} />
            <Item icon={FileEdit} label="Manage Content" route="/admin/content" isActive={location.pathname === "/admin/content"} />
            <Item icon={ListChecks} label="Manage Checklist" route="/admin/checklist" isActive={location.pathname === "/admin/checklist"} />
            <Item icon={BookOpen} label="Manage Modules" route="/admin/modules" isActive={location.pathname === "/admin/modules"} />
            <Item icon={MessageSquare} label="View Feedback" route="/admin/feedback" isActive={location.pathname === "/admin/feedback"} />
            <Item icon={BarChart2} label="View Progress" route="/admin/progress" isActive={location.pathname === "/admin/progress"} />
            <Item icon={BookOpen} label="Manage Questions" route="/admin/manage-questions" isActive={location.pathname === "/admin/manage-questions"} />
            <Item icon={User} label="Account" route="/account" isActive={location.pathname === "/account"} />
          </>
        )}
      </nav>
    </aside>
  );
}

// ✅ Export roles for reuse
export { ROLES };
