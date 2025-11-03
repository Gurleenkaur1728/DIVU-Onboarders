import { supabase } from "../lib/supabaseClient.js";

export async function updateUserProgress(addXP = 20) {
  try {
    // ✅ Get authenticated user ID
    const { data: auth } = await supabase.auth.getUser();
    const userId = auth?.user?.id;
    if (!userId) {
      console.error("❌ No Supabase auth user found!");
      return;
    }

    console.log("➡️ Updating progress for user:", userId);

    // ✅ Fetch existing progress
    const { data: user, error: fetchError } = await supabase
      .from("users")
      .select("xp, level, streak_days, last_login")
      .eq("id", userId)
      .maybeSingle();

    if (fetchError) throw fetchError;
    console.log("Current user data:", user);

    const now = new Date();
    const xp = (user?.xp || 0) + addXP;
    const level = Math.floor(xp / 100) + 1;

    // ✅ Calculate streak
    let streak = user?.streak_days || 0;
    const last = user?.last_login ? new Date(user.last_login) : null;

    if (!last) streak = 1;
    else {
      const diff = Math.floor((now - last) / (1000 * 60 * 60 * 24));
      if (diff === 1) streak += 1;
      else if (diff > 1) streak = 1;
    }

    console.log("New XP:", xp, "New Level:", level, "New Streak:", streak);

    // ✅ Update user record
    const { error: updateError } = await supabase
      .from("users")
      .update({
        xp,
        level,
        streak_days: streak,
        last_login: now.toISOString(),
      })
      .eq("id", userId);

    if (updateError) throw updateError;

    console.log("✅ Progress updated successfully in Supabase!");
  } catch (err) {
    console.error("❌ updateUserProgress failed:", err);
  }
}
