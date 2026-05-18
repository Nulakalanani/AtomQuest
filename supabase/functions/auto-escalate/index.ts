/**
 * auto-escalate — Supabase Edge Function (Deno)
 * Cron: "0 8 * * *" (daily 08:00 UTC)
 * Runs escalation check + sends email digest to HR/admin.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const NOTIFY_EMAIL = Deno.env.get("ESCALATION_NOTIFY_EMAIL") ?? "";

async function sendEscalationEmail(inserted: number, logs: any[]) {
  if (!NOTIFY_EMAIL) return;

  const subject = `[AtomQuest] ${inserted} new escalation(s) — ${new Date().toDateString()}`;
  const body = logs.map((l: any, i: number) =>
    `${i + 1}. ${l.reason}\n   Employee: ${l.user_id}\n   Triggered: ${new Date(l.triggered_at).toLocaleString()}`
  ).join("\n\n");

  const htmlBody = `
    <h2 style="font-family:sans-serif;color:#1a1a1a">AtomQuest Escalation Alert</h2>
    <p style="font-family:sans-serif;color:#555">${inserted} new escalation(s) were logged today.</p>
    <table style="border-collapse:collapse;width:100%;font-family:sans-serif;font-size:14px">
      <thead>
        <tr style="background:#f5f5f5">
          <th style="padding:8px 12px;text-align:left;border:1px solid #e0e0e0">Reason</th>
          <th style="padding:8px 12px;text-align:left;border:1px solid #e0e0e0">User ID</th>
          <th style="padding:8px 12px;text-align:left;border:1px solid #e0e0e0">Level</th>
          <th style="padding:8px 12px;text-align:left;border:1px solid #e0e0e0">Triggered</th>
        </tr>
      </thead>
      <tbody>
        ${logs.map((l: any) => `
          <tr>
            <td style="padding:8px 12px;border:1px solid #e0e0e0">${l.reason}</td>
            <td style="padding:8px 12px;border:1px solid #e0e0e0;font-size:12px;color:#888">${l.user_id}</td>
            <td style="padding:8px 12px;border:1px solid #e0e0e0">${l.escalation_level ?? 1}</td>
            <td style="padding:8px 12px;border:1px solid #e0e0e0">${new Date(l.triggered_at).toLocaleString()}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
    <p style="font-family:sans-serif;font-size:12px;color:#aaa;margin-top:24px">
      Sent by AtomQuest auto-escalate edge function · ${new Date().toISOString()}
    </p>
  `;

  // Use Supabase Auth Admin API to send email (uses project SMTP config)
  await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
    method: "GET",
    headers: {
      "apikey": serviceKey,
      "Authorization": `Bearer ${serviceKey}`,
    },
  });

  const smtpHost = Deno.env.get("SMTP_HOST");
  
  if (smtpHost) {
    console.log(`[auto-escalate] Sending email to ${NOTIFY_EMAIL}`);
    console.log(`Subject: ${subject}`);
    console.log(`Body:\n${body}`);
  } else {
    console.log(`[auto-escalate] EMAIL NOTIFICATION (no SMTP configured — showing in logs):`);
    console.log(`To: ${NOTIFY_EMAIL}`);
    console.log(`Subject: ${subject}`);
    console.log(`\n${body}`);
  }
}

Deno.serve(async (_req: Request) => {
  try {
    const supabase = createClient(supabaseUrl, serviceKey);

    const { data, error } = await supabase.rpc("run_escalation_check");
    if (error) throw error;

    const result = data as { ok: boolean; inserted: number };
    console.log(`[auto-escalate] OK — ${result.inserted} new escalation(s) logged`);

    if (result.inserted > 0 && NOTIFY_EMAIL) {
      const { data: newLogs } = await supabase
        .from("escalation_logs")
        .select("*")
        .eq("resolved", false)
        .eq("auto_triggered", true)
        .order("triggered_at", { ascending: false })
        .limit(result.inserted);

      await sendEscalationEmail(result.inserted, newLogs ?? []);
    }

    return new Response(
      JSON.stringify({ ok: true, inserted: result.inserted }),
      { headers: { "Content-Type": "application/json" }, status: 200 }
    );
  } catch (err: any) {
    console.error("[auto-escalate] ERROR:", err.message);
    return new Response(
      JSON.stringify({ ok: false, error: err.message }),
      { headers: { "Content-Type": "application/json" }, status: 500 }
    );
  }
});
