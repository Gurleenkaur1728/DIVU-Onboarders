import { useMemo } from "react";
import { ROLES } from "../../../app/components/Sidebar";
import { useAuth } from "../../../app/context/AuthContext.jsx";

export function useRole() {
  const { user } = useAuth();

  const resolveRoleId = () => {
    const stored = localStorage.getItem("role_id");
    if (stored === null) return ROLES.USER;
    const parsed = parseInt(stored, 10);
    return Number.isNaN(parsed) ? ROLES.USER : parsed;
  };

  const roleId = user?.role_id ?? resolveRoleId();

  const role = useMemo(() => {
    if (roleId === ROLES.SUPER_ADMIN) return ROLES.SUPER_ADMIN;
    if (roleId === ROLES.ADMIN) return ROLES.ADMIN;
    return ROLES.USER;
  }, [roleId]);

  const isAdmin = role === ROLES.ADMIN || role === ROLES.SUPER_ADMIN;
  const isSuperAdmin = role === ROLES.SUPER_ADMIN;
  const isUser = role === ROLES.USER;

  return { roleId, role, isAdmin, isSuperAdmin, isUser };
}