import { supabase } from "../supabaseClient";

/**
 * Adds a log entry to audit_logs.
 * @param {string} employeeEmail - Target employee’s email.
 * @param {string} employeeName - Target employee’s name (optional).
 * @param {string} action - What happened (e.g., "Invitation sent").
 * @param {string} performedBy - The user or HR who performed the action.
 */
export async function addAuditLog(employeeEmail, employeeName, action, performedBy) {
  const { error } = await supabase.from("audit_logs").insert([
    {
      employee_email: employeeEmail,
      employee_name: employeeName,
      action,
      performed_by: performedBy,
    },
  ]);

  if (error) console.error("Failed to add audit log:", error);
  else console.log("✅ Audit log added:", action);
}
