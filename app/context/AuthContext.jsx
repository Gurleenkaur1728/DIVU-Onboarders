import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase } from "../../src/lib/supabaseClient.js";

const AUTH_STORAGE_KEYS = [
  "user",
  "profile_id",
  "role_id",
  "role_name",
  "user_name",
  "user_email",
  "employee_id"
];

const AuthContext = createContext();

const clearAuthStorage = () => {
  AUTH_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
};

const readStoredUser = () => {
  const rawUser = localStorage.getItem("user");
  if (!rawUser) return null;

  try {
    const parsedUser = JSON.parse(rawUser) ?? {};
    const profileId = localStorage.getItem("profile_id");
    const roleIdRaw = localStorage.getItem("role_id");

    if (!profileId || !roleIdRaw) {
      clearAuthStorage();
      return null;
    }

    const roleId = Number(roleIdRaw);
    if (Number.isNaN(roleId)) {
      clearAuthStorage();
      return null;
    }

    return {
      email: parsedUser.email ?? "",
      profile_id: profileId,
      name: localStorage.getItem("user_name") || "",
      role_id: roleId,
      role_name: localStorage.getItem("role_name") || "employee",
      isAuthenticated: true
    };
  } catch (error) {
    console.error("Failed to parse stored user:", error);
    clearAuthStorage();
    return null;
  }
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const checkUser = useCallback(async () => {
    setLoading(true);
    try {
      const nextUser = readStoredUser();
      setUser(nextUser);
      return nextUser;
    } catch (error) {
      console.error("Auth check error:", error);
      clearAuthStorage();
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    clearAuthStorage();
    setUser(null);
  }, []);

  useEffect(() => {
    checkUser();
  }, [checkUser]);

  const contextValue = {
    user,
    loading,
    checkUser,
    logout,
    setUser
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}