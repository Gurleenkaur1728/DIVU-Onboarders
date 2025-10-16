import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../../src/lib/supabaseClient.js";
const AuthContext = createContext();
export function AuthProvider({ children }) {
 const [user, setUser] = useState(null);
 const [loading, setLoading] = useState(true);
 useEffect(() => {
   async function load() {
     try {
       // 1) Load from localStorage
       const storedUser = localStorage.getItem("user");
       const profileId = localStorage.getItem("profile_id");
       const roleId = localStorage.getItem("role_id");
       const role = localStorage.getItem("role");
       if (storedUser) {
         const parsed = JSON.parse(storedUser);
         // 2) (Optional) Verify user still exists in DB
         const { data: profile, error } = await supabase
           .from("users")
           .select("id, email, name")
           .eq("id", profileId)
           .maybeSingle();
         if (!error && profile) {
           setUser({
             ...parsed,
             profile_id: profile.id,
             email: profile.email,
             name: profile.name,
             role_id: roleId,
             role,
           });
         } else {
           // If profile missing, clear session
           localStorage.clear();
           setUser(null);
         }
       } else {
         setUser(null);
       }
     } catch (e) {
       console.error("AuthContext load error:", e);
       setUser(null);
     } finally {
       setLoading(false);
     }
   }
   load();
 }, []);
 return (
<AuthContext.Provider value={{ user, loading, setUser }}>
     {children}
</AuthContext.Provider>
 );
}
export function useAuth() {
 return useContext(AuthContext);
}