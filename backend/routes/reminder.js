import express from "express";
import Mailjet from "node-mailjet";
import pg from "pg";

const router = express.Router();

// MAIN REMINDER HANDLER
async function sendChecklistReminders(req, res) {
  // Validate DB URL
  if (!process.env.SUPABASE_DB_URL) {
    return res.status(500).json({ error: "Missing SUPABASE_DB_URL in .env file" });
  }

  const db = new pg.Client({
    connectionString: process.env.SUPABASE_DB_URL,
    ssl: { rejectUnauthorized: false },
  });

  await db.connect();

  try {
    console.log("🔍 Fetching pending and due checklist tasks...");

    // Fetch overdue + due-tomorrow tasks
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

    console.log(`📦 Found ${rows.length} tasks requiring reminders.`);

    if (rows.length === 0) {
      return res.json({ sent: 0, message: "No tasks need reminders" });
    }

    // Setup Mailjet client
    const mailjet = Mailjet.apiConnect(
      process.env.MAILJET_API_KEY,
      process.env.MAILJET_SECRET_KEY
    );

    let count = 0;

    for (const task of rows) {
      console.log(
        `📨 Sending reminder → ${task.employee_email} | "${task.item_title}" | Due: ${task.due_date}`
      );

      // Email HTML content
const html = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <title>Task Reminder</title>
  </head>
  <body style="margin:0; padding:0; background:#f0fdf4; font-family:Arial, sans-serif;">
    
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4; padding:25px 0;">
      <tr>
        <td align="center">
          
          <table width="600" cellpadding="0" cellspacing="0" 
            style="background:#ffffff; border-radius:14px; padding:30px; 
            border-left:6px solid #34D399; box-shadow:0 4px 14px rgba(0,0,0,0.08);">
            
            <tr>
              <td style="font-size:26px; font-weight:bold; color:#064E3B; padding-bottom:10px;">
                🔔 Task Reminder
              </td>
            </tr>

            <tr>
              <td style="font-size:16px; color:#064E3B;">
                Hi <strong>${task.employee_name}</strong>,
              </td>
            </tr>

            <tr>
              <td style="font-size:15px; color:#065F46; padding:15px 0 20px;">
                This is a gentle reminder that you have an onboarding task that needs your attention.
              </td>
            </tr>

            <tr>
              <td>
                <table width="100%" style="background:#ECFDF5; border-radius:12px; border:1px solid #A7F3D0; padding:15px;">
                  <tr>
                    <td style="font-size:16px; color:#064E3B;">
                      <strong>📝 Task:</strong> ${task.item_title}
                    </td>
                  </tr>
                  <tr>
                    <td style="font-size:16px; color:#064E3B; padding-top:8px;">
                      <strong>📅 Due Date:</strong> ${task.due_date}
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <tr>
              <td style="font-size:15px; color:#065F46; padding-top:20px;">
                Please log in to your onboarding portal to complete it.
              </td>
            </tr>

            <tr>
              <td style="padding-top:25px;">
                <a href="https://divu-onboarders.vercel.app/login"
                  style="background:#10B981; color:#ffffff; padding:12px 20px; 
                  border-radius:10px; text-decoration:none; font-size:15px; font-weight:bold;">
                  Open Onboarding Portal
                </a>
              </td>
            </tr>

          </table>

          <p style="font-size:12px; color:#6B7280; margin-top:20px;">
            © DIVU Onboarding · Automated Reminder
          </p>

        </td>
      </tr>
    </table>

  </body>
</html>
`;



      // Send Mailjet email
      try {
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

        // Save a log to Supabase
        await db.query(
          `INSERT INTO reminder_logs (user_email, task_title, due_date)
           VALUES ($1, $2, $3)`,
          [task.employee_email, task.item_title, task.due_date]
        );

        count++;
      } catch (emailErr) {
        console.log(`❌ Failed to send email to ${task.employee_email}`);
        console.error(emailErr);
      }
    }

    console.log(`✅ Finished sending reminders: ${count} emails sent.`);

    res.json({ sent: count });

  } catch (err) {
    console.error("❌ Reminder Error:", err);
    res.status(500).json({ error: err.message });

  } finally {
    db.end();
  }
}

// ROUTES
router.post("/sendNow", sendChecklistReminders);

export default router;
