import { supabase } from "../../supabaseClient";

/**
 * Upload a file to the home-media bucket and return a PUBLIC URL.
 * @param {File} file - the file from an <input type="file" />
 * @param {string} folder - e.g. "hero", "culture", "about"
 * @returns {Promise<string>} public URL
 */
export async function uploadHomeMedia(file, folder = "misc") {
  if (!file) throw new Error("No file selected");

  // e.g. hero/1699999999999_my-banner.png
  const ext = file.name.split(".").pop() || "bin";
  const name = `${Date.now()}_${file.name.replace(/\s+/g, "_")}`;
  const path = `${folder}/${name}`;

  const { error: upErr } = await supabase
    .storage
    .from("home-media")
    .upload(path, file, {
      cacheControl: "3600",
      upsert: true,
      contentType: file.type || undefined,
    });

  if (upErr) throw upErr;

  const { data } = supabase
    .storage
    .from("home-media")
    .getPublicUrl(path);

  if (!data?.publicUrl) throw new Error("Could not resolve public URL");
  return data.publicUrl;
}
