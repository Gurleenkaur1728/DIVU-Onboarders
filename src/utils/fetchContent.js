// src/utils/fetchContent.js
import { supabase } from "../../src/supabaseClient.js";

export async function fetchContent(section) {
  const { data, error } = await supabase
    .from("home_content")
    .select("*")
    .eq("section", section)
    .maybeSingle();

  if (error) {
    console.error("Error fetching content:", error);
    return null;
  }

  // Convert storage path to public URL if needed
  if (data?.media_url && !data.media_url.startsWith("http")) {
    const { data: urlData } = supabase.storage.from("home-media").getPublicUrl(data.media_url);
    data.media_url = urlData?.publicUrl || data.media_url;
  }

  return data;
}
