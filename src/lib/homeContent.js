// src/lib/homeContent.js
import { supabase } from "../../src/supabaseClient";

const BUCKET = "home-media";

export function toPublicUrl(raw) {
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) return raw; // already absolute
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(raw);
  return data?.publicUrl ?? raw;
}

export async function getBlock(section, sort = 0) {
  const { data, error } = await supabase
    .from("home_content")
    .select("*")
    .eq("section", section)
    .eq("sort_order", sort)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  // Normalize media to a public URL (works for both images & videos)
  return {
    ...data,
    media_url: toPublicUrl(data.media_url),
  };
}

// About can have 3 rows: sort_order 0,1,2
export async function getAboutBlocks() {
  const { data, error } = await supabase
    .from("home_content")
    .select("*")
    .eq("section", "about")
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return (data || []).map((row) => ({ ...row, media_url: toPublicUrl(row.media_url) }));
}
