import { supabase } from "../lib/supabaseClient.js";

// Safely update user XP + streak with full logging
export async function updateUserProgress(userId, addXP = 20) {
  if (!userId) {
    console.warn("⚠️ No userId provided to updateUserProgress");
    return;
  }

  try {
    const { data: user, error: fetchError } = await supabase
      .from("users")
      .select("xp, level, streak_days, last_login")
      .eq("id", userId)
      .maybeSingle();

    if (fetchError) throw fetchError;

    // XP calculation
    const newXP = (user?.xp || 0) + addXP;
    const newLevel = Math.floor(newXP / 100) + 1;

    // Streak logic
    const today = new Date();
    const last = user?.last_login ? new Date(user.last_login) : null;
    let streak = user?.streak_days || 0;

    if (!last) streak = 1;
    else {
      const diff = Math.floor((today - last) / (1000 * 60 * 60 * 24));
      if (diff === 1) streak += 1;
      else if (diff > 1) streak = 1;
    }

    const { error: updateError } = await supabase
      .from("users")
      .update({
        xp: newXP,
        level: newLevel,
        streak_days: streak,
        last_login: today.toISOString(),
      })
      .eq("id", userId);

    if (updateError) throw updateError;

    console.log(`✅ XP + Streak updated: +${addXP} XP | Level ${newLevel} | Streak ${streak}`);
  } catch (err) {
    console.error("❌ Failed to update XP/streak:", err.message);
  }
}
