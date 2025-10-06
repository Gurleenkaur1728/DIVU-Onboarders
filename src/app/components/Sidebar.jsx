.import { useState } from "react";
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
  UserCheckIcon
} from "lucide-react";

// Example role IDs (match your DB)
const ROLES = {
  SUPER_ADMIN: 2,
  ADMIN: 1,
  USER: 0,
};


// eslint-disable-next-line no-unused-vars
function Item({ icon: Icon, label, route, isActive, disabled, collapsed }) {
  if (disabled) {
    return (
      <div
        className={`group flex items-center 
            ${collapsed ? "justify-center px-3" : "px-5"} 
            py-3.5 opacity-40 cursor-not-allowed
            ${isActive ? "bg-emerald-800/60 border-l-4 border-emerald-400" : ""}`}
      >
        <Icon size={18} className={`shrink-0 ${collapsed ? "" : "mr-3"} text-emerald-100`} />
        {!collapsed && (
            <span className="text-sm font-medium text-emerald-100">{label}</span>
        )}
      </div>
    );
  }

  return (
    <Link
        to={route}
        className={`
            group flex items-center 
            ${collapsed ? "justify-center px-3" : "px-5"}
            py-3.5 rounded-md transition-all duration-300
            ${isActive
                ? "bg-emerald-800 text-emerald-100 border-l-4 border-emerald-400 shadow-md"
                : "text-emerald-200 hover:bg-emerald-800/40 hover:text-emerald-100"
            }
        `}
    >
    <Icon
        size={20}
        className={`shrink-0 
            ${collapsed ? "" : "mr-3"}
            ${isActive 
                ? "text-emerald-300" : "text-emerald-400 group-hover:text-emerald-200"
            }`
        }
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

export default function Sidebar({ role }) {
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
        <Logo size={collapsed ? "" : 140} />
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="text-emerald-300 hover:text-white transition"
        >
          {collapsed ? <ChevronRight size={30} className="mr-2" /> : <ChevronLeft size={30} />}
        </button>
      </div>

      <div className="mx-4 mb-4 h-[1px] bg-emerald-700/40" />

      {/* MENU */}
      <nav className="flex flex-col space-y-1">
        {/* User Menu */}
        {role === ROLES.USER && (
          <>
            <Item icon={Home} label="Home Page" route="/home" isActive={location.pathname === "/home"} collapsed={collapsed}/>
            <Item icon={List} label="Checklist" route="/checklist" isActive={location.pathname === "/checklist"} collapsed={collapsed}/>
            <Item icon={List} label="Modules" route="/modules" isActive={location.pathname === "/modules"} collapsed={collapsed}/>
            <Item icon={MessageSquare} label="Feedback" route="/feedback" isActive={location.pathname === "/feedback"} collapsed={collapsed}/>
            <Item icon={BarChart2} label="Progress" route="/progress" isActive={location.pathname === "/progress"} collapsed={collapsed}/>
            <Item icon={HelpCircle} label="Questions" route="/questions" isActive={location.pathname === "/questions"} collapsed={collapsed}/>
            <div className="flex-grow" />
            <Item icon={User} label="Account" route="/account" isActive={location.pathname === "/account"} collapsed={collapsed}/>
          </>
        )}

        {/* Admin Menu */}
        {(role === ROLES.ADMIN || role === ROLES.SUPER_ADMIN) && (
          <>
            <Item icon={LayoutDashboard} label="Dashboard" route="/admin/dashboard" isActive={location.pathname === "/admin/dashboard"} collapsed={collapsed}/>
            {/* Super Admin Only: Move these just below Dashboard */}
            {role === ROLES.SUPER_ADMIN && (
              <>
                <div className="mx-4 my-2 h-[1px] bg-emerald-700/40" />
                <Item icon={User} label="Manage Employees" route="/admin/super/manage-employees" isActive={location.pathname === "/admin/super/manage-employees"} collapsed={collapsed}/>
                <Item icon={UserPlus} label="Add Employee" route="/admin/super/add-employee" isActive={location.pathname === "/admin/super/add-employee"} collapsed={collapsed}/>
                <Item icon={Shield} label="Manage Admins" route="/admin/super/manage-admins" isActive={location.pathname === "/admin/super/manage-admins"} collapsed={collapsed}/>
                <Item icon={ClipboardCheck} label="Admin Requests" route="/admin/super/admin-requests" isActive={location.pathname === "/admin/super/admin-requests"} collapsed={collapsed}/>
                {/* Divider below admin requests */}
                <div className="mx-4 my-2 h-[1px] bg-emerald-700/40" />
              </>
            )}
            <Item icon={FileEdit} label="Manage Content" route="/admin/content" isActive={location.pathname === "/admin/content"} collapsed={collapsed}/>
            <Item icon={ListChecks} label="Manage Checklist" route="/admin/checklist" isActive={location.pathname === "/admin/checklist"} collapsed={collapsed}/>
            <Item icon={UserCheckIcon} label="Assign Templates" route="/admin/assign-templates" isActive={location.pathname === "/admin/assign-templates"} collapsed={collapsed}/>
            <Item icon={BookOpen} label="Manage Modules" route="/admin/modules" isActive={location.pathname === "/admin/modules"} collapsed={collapsed}/>
            <Item icon={MessageSquare} label="View Feedback" route="/admin/feedback" isActive={location.pathname === "/admin/feedback"} collapsed={collapsed}/>
            <Item icon={BarChart2} label="View Progress" route="/admin/progress" isActive={location.pathname === "/admin/progress"} collapsed={collapsed}/>
            <Item icon={BookOpen} label="Manage Questions" route="/admin/manage-questions" isActive={location.pathname === "/admin/manage-questions"} collapsed={collapsed}/>
            <Item icon={User} label="Account" route="/account" isActive={location.pathname === "/account"} collapsed={collapsed}/>
          </>
        )}
      </nav>
    </aside>
  );
}

export { ROLES }; //sidebar.jsx