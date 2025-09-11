// utils/getUserWithRole.js
import { supabase } from "./supabaseClient";

export async function getUserWithRole() {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) return null;

  const { data, error } = await supabase
    .from("users")
    .select(`
      id, email, name, role_id,
      roles ( id, name )
    `)
    .eq("id", user.id) // match auth.uid
    .single();

  if (error) throw error;

  return {
    ...data,
    role: data.roles?.name,
  };
}
