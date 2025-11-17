import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import Logo from "./Logo.jsx";
import {
  Home,
  List,
  MessageSquare,
  BarChart2,
  HelpCircle,
  User,
  LayoutDashboard,
  FileEdit,
  ListChecks,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Shield,
  UserPlus,
  ClipboardCheck,
  Book,
  UserCheckIcon,
  CalendarDays,
  CalendarPlus,
} from "lucide-react";

// Role constants
const ROLES = {
  SUPER_ADMIN: 2,
  ADMIN: 1,
  USER: 0,
};

// Reusable sidebar item
function Item({ icon: Icon, label, route, isActive, collapsed, disabled }) {
  return (
    <Link
      to={disabled ? "#" : route}
      className={`
        group flex items-center 
        ${collapsed ? "justify-center px-3" : "px-5"}
        py-3.5 rounded-md transition-all duration-300
        ${isActive ? "bg-emerald-800 text-white border-l-4 border-emerald-400" 
                   : "text-emerald-200 hover:bg-emerald-800/40 hover:text-emerald-100"}
        ${disabled ? "opacity-40 pointer-events-none" : ""}
      `}
    >
      {Icon && (
        <Icon
          size={20}
          className={`shrink-0 ${collapsed ? "" : "mr-3"}`}
        />
      )}

      {!collapsed && (
        <span className="ml-3 text-sm font-medium">{label}</span>
      )}
    </Link>
  );
}

// Main Sidebar Component
export default function Sidebar({ role }) {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={`
        flex flex-col bg-gradient-to-b from-emerald-950 via-emerald-900 to-emerald-950
        ${collapsed ? "w-20" : "w-64"}
        min-h-screen border-r border-emerald-700/40 shadow-lg
        transition-all duration-300
      `}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-6">
        <Logo size={collapsed ? "" : 140} />

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="text-emerald-300 hover:text-white transition"
        >
          {collapsed ? <ChevronRight size={30} /> : <ChevronLeft size={30} />}
        </button>
      </div>

      <div className="mx-4 mb-4 h-[1px] bg-emerald-700/40" />

      {/* Menu */}
      <nav className="flex flex-col space-y-1">
        {/* USER */}
        {role === ROLES.USER && (
          <>
            <Item icon={Home} label="Home Page" route="/home" isActive={location.pathname === "/home"} collapsed={collapsed} />
            <Item icon={List} label="Checklist" route="/checklist" isActive={location.pathname === "/checklist"} collapsed={collapsed} />
            <Item icon={CalendarDays} label="Events" route="/events" isActive={location.pathname === "/events"} collapsed={collapsed} />
            <Item icon={MessageSquare} label="Feedback" route="/feedback" isActive={location.pathname === "/feedback"} collapsed={collapsed} />
            <Item icon={BarChart2} label="Progress" route="/progress" isActive={location.pathname === "/progress"} collapsed={collapsed} />
            <Item icon={HelpCircle} label="Questions" route="/questions" isActive={location.pathname === "/questions"} collapsed={collapsed} />
            <div className="flex-grow" />
            <Item icon={User} label="Account" route="/account" isActive={location.pathname === "/account"} collapsed={collapsed} />
          </>
        )}

        {/* ADMIN + SUPER ADMIN */}
        {(role === ROLES.ADMIN || role === ROLES.SUPER_ADMIN) && (
          <>
            <Item icon={LayoutDashboard} label="Dashboard" route="/admin/dashboard" isActive={location.pathname === "/admin/dashboard"} collapsed={collapsed} />

            {role === ROLES.SUPER_ADMIN && (
              <>
                <div className="mx-4 my-2 h-[1px] bg-emerald-700/40" />
                <Item icon={User} label="Manage Employees" route="/admin/super/manage-employees" isActive={location.pathname === "/admin/super/manage-employees"} collapsed={collapsed} />
                <Item icon={UserPlus} label="Add Employee" route="/admin/super/add-employee" isActive={location.pathname === "/admin/super/add-employee"} collapsed={collapsed} />
                <Item icon={Shield} label="Manage Admins" route="/admin/super/manage-admins" isActive={location.pathname === "/admin/super/manage-admins"} collapsed={collapsed} />
                <Item icon={ClipboardCheck} label="Admin Requests" route="/admin/super/admin-requests" isActive={location.pathname === "/admin/super/admin-requests"} collapsed={collapsed} />
                <Item icon={ClipboardCheck} label="Employee Requests" route="/admin/super/access-requests" isActive={location.pathname === "/admin/super/access-requests"} collapsed={collapsed} />
                <Item icon={Book} label="Records" route="/admin/super/records" isActive={location.pathname === "/admin/super/records"} collapsed={collapsed} />
                <div className="mx-4 my-2 h-[1px] bg-emerald-700/40" />
              </>
            )}

            <Item icon={FileEdit} label="Manage Content" route="/admin/content" isActive={location.pathname === "/admin/content"} collapsed={collapsed} />
            <Item icon={ListChecks} label="Manage Checklist" route="/admin/checklist" isActive={location.pathname === "/admin/checklist"} collapsed={collapsed} />
            <Item icon={UserCheckIcon} label="Assign Templates" route="/admin/assign-templates" isActive={location.pathname === "/admin/assign-templates"} collapsed={collapsed} />
            <Item icon={BookOpen} label="Manage Modules" route="/admin/modules" isActive={location.pathname === "/admin/modules"} collapsed={collapsed} />
            <Item icon={CalendarPlus} label="Manage Events" route="/admin/manage-events" isActive={location.pathname === "/admin/manage-events"} collapsed={collapsed} />
            <Item icon={MessageSquare} label="View Feedback" route="/admin/feedback" isActive={location.pathname === "/admin/feedback"} collapsed={collapsed} />
            <Item icon={BarChart2} label="View Progress" route="/admin/progress" isActive={location.pathname === "/admin/progress"} collapsed={collapsed} />
            <Item icon={BookOpen} label="Manage Questions" route="/admin/manage-questions" isActive={location.pathname === "/admin/manage-questions"} collapsed={collapsed} />
            <Item icon={User} label="Account" route="/account" isActive={location.pathname === "/account"} collapsed={collapsed} />
          </>
        )}
      </nav>
    </aside>
  );
}

export { ROLES };
