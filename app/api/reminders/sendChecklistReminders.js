import Mailjet from "node-mailjet";
import pg from "pg";

export default async function handler(req, res) {
  // ---- CORS FIX ----
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();
  // -------------------

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const db = new pg.Client({
    connectionString: process.env.SUPABASE_DB_URL,
  });
  await db.connect();

  try {
    // Query for pending/due reminders
    const { rows } = await db.query(`
      SELECT 
        aci.id AS assignment_id,
        aci.due_date,
        u.email AS employee_email,
        u.name AS employee_name,
        ci.title AS item_title
      FROM assigned_checklist_item aci
      JOIN users u ON u.id = aci.user_id
      JOIN checklist_item ci ON ci.item_id = aci.template_item_id
      WHERE aci.done = FALSE
        AND (
          aci.due_date <= CURRENT_DATE
          OR aci.due_date = CURRENT_DATE + INTERVAL '1 day'
        );
    `);

    const mailjet = Mailjet.apiConnect(
      process.env.MAILJET_API_KEY,
      process.env.MAILJET_SECRET_KEY
    );

    for (const task of rows) {
      const html = `
        <h3>Reminder: ${task.item_title}</h3>
        <p>Hi ${task.employee_name},</p>
        <p>You have a pending or upcoming checklist item.</p>
        <p><strong>Task:</strong> ${task.item_title}</p>
        <p><strong>Due Date:</strong> ${task.due_date}</p>
      `;

      await mailjet.post("send", { version: "v3.1" }).request({
        Messages: [
          {
            From: {
              Email: process.env.FROM_EMAIL,
              Name: "DIVU Onboarding",
            },
            To: [{ Email: task.employee_email }],
            Subject: `Reminder: ${task.item_title}`,
            HTMLPart: html,
          },
        ],
      });
    }

    res.status(200).json({ sent: rows.length });
  } catch (error) {
    console.error("Reminder Error:", error);
    res.status(500).json({ error: error.message });
  } finally {
    await db.end();
  }
}
