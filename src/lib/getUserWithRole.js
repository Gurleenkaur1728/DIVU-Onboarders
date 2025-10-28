// utils/getUserWithRole.js
import { ROLES } from "../../app/components/Sidebar";

export function getUserWithRole() {
  try {
  const roleIdRaw = localStorage.getItem("role_id");
  const roleId = roleIdRaw !== null ? parseInt(roleIdRaw, 10) : ROLES.USER;
  const normalizedRoleId = Number.isNaN(roleId) ? ROLES.USER : roleId;
    const rawUser = localStorage.getItem("user");
    const parsedUser = rawUser ? JSON.parse(rawUser) : {};
    const email = parsedUser?.email || "";
    const name = localStorage.getItem("user_name");
    const id = localStorage.getItem("profile_id");

    return {
      id,
      email,
      name,
  role_id: normalizedRoleId,
  role: normalizedRoleId === ROLES.SUPER_ADMIN ? "super_admin" :
    normalizedRoleId === ROLES.ADMIN ? "admin" : "user"
    };
  } catch (error) {
    console.error("Error getting user with role:", error);
    return null;
  }
}