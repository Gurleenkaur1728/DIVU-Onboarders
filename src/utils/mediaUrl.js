// src/utils/mediaUrl.js
import { supabase } from "../../src/supabaseClient";

/** 
 * Accepts either a full URL or a storage path.
 * If it's a storage path, returns a public URL from the 'home-media' bucket.
 */
export function toPublicUrl(possiblePath) {
  if (!possiblePath) return null;
  if (/^https?:\/\//i.test(possiblePath)) return possiblePath;

  // strip accidental leading slash
  const clean = possiblePath.replace(/^\/+/, "");
  const { data } = supabase.storage.from("home-media").getPublicUrl(clean);
  return data?.publicUrl || null;
}
