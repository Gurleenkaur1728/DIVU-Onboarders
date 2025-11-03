import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../../src/lib/supabaseClient.js";

export default function ModuleComplete() {
  const { id } = useParams();
  const navigate = useNavigate();

  async function handleCertificateAndXP() {
    const userId = localStorage.getItem("profile_id");
    const moduleTitle = `Module ${id}`;
    const issueDate = new Date().toISOString();

    if (!userId) {
      alert("User ID not found in localStorage. Please log in again.");
      return;
    }
    console.log("User ID:", userId);
const { data: userData, error: userError } = await supabase
  .from("users")
  .select("xp, level, streak_days, last_login")
  .eq("id", userId)
  .single();

console.log("Fetched user data:", userData, "Error:", userError);


    try {
      // 🔹 Check if certificate already exists
      const { data: existing, error: checkError } = await supabase
        .from("certificates")
        .select("id")
        .eq("user_id", userId)
        .eq("title", moduleTitle)
        .maybeSingle();

      if (checkError) throw checkError;

      if (existing) {
        // Update issue_date
        await supabase
          .from("certificates")
          .update({ issue_date: issueDate })
          .eq("id", existing.id);
      } else {
        // Insert new certificate
        await supabase.from("certificates").insert([
          {
            user_id: userId,
            title: moduleTitle,
            issue_date: issueDate,
            status: "completed",
          },
        ]);
      }

      // 🔹 Update XP, streak, and level in users table
      let { data: userData, error: userError } = await supabase
  .from("users")
  .select("xp, level, streak_days, last_login")
  .eq("id", userId)
  .maybeSingle();

// 👇 If user doesn't exist, create a new one
if (!userData) {
  const insertResult = await supabase
    .from("users")
    .insert([
      {
        id: userId,
        xp: 0,
        level: 1,
        streak_days: 0,
        last_login: new Date().toISOString(),
      },
    ])
    .select()
    .single();

  userData = insertResult.data;
  console.log("✅ Created new user record:", userData);
}


      const currentXP = userData?.xp || 0;
      const newXP = currentXP + 20; // 💥 +20 XP per module
      const newLevel = Math.floor(newXP / 100) + 1; // Every 100 XP = new level

      // 🔹 Handle streak logic
      let newStreak = userData?.streak_days || 0;
      const lastLogin = userData?.last_login ? new Date(userData.last_login) : null;
      const today = new Date();
      const diffDays = lastLogin
        ? Math.floor((today - lastLogin) / (1000 * 60 * 60 * 24))
        : 999;

      if (diffDays === 0) {
        newStreak = userData.streak_days; // same day, keep streak
      } else if (diffDays === 1) {
        newStreak = userData.streak_days + 1; // next consecutive day
      } else {
        newStreak = 1; // reset streak
      }

      await supabase
        .from("users")
        .update({
          xp: newXP,
          level: newLevel,
          streak_days: newStreak,
          last_login: today.toISOString(),
        })
        .eq("id", userId);

      console.log("✅ XP & streak updated:", {
        xp: newXP,
        level: newLevel,
        streak_days: newStreak,
      });

      navigate(`/certificate/${id}`);
    } catch (err) {
      console.error("❌ Error updating progress:", err);
      alert("Something went wrong. Check console for details.");
    }
  }

  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-black/60 z-50"
      style={{
        backgroundImage: "url('/bg.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="bg-white p-12 rounded-2xl shadow-2xl text-center w-[500px] max-w-xl">
        <h1 className="text-3xl font-bold text-emerald-900 mb-4">
          🎉 Congratulations!
        </h1>
        <p className="text-lg text-gray-700 mb-8">
          You have completed{" "}
          <span className="font-semibold italic">Module {id}</span>!
        </p>

        <div className="flex flex-col gap-4">
          <button
            onClick={() => navigate(`/feedback/${id}`)}
            className="px-5 py-3 rounded-lg bg-emerald-700 text-white font-semibold hover:bg-emerald-800"
          >
            Create Feedback
          </button>

          <button
            onClick={handleCertificateAndXP}
            className="px-5 py-3 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700"
          >
            See Certificate of Completion
          </button>

          <button
            onClick={() => navigate("/modules")}
            className="px-5 py-3 border border-gray-400 rounded-lg font-semibold hover:bg-gray-100"
          >
            Back to Modules
          </button>
        </div>
      </div>
    </div>
  );
}
