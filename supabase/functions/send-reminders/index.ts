// Sends study session reminders. Called once a minute by pg_cron. It authenticates with a shared
// secret kept in the app_secrets table, finds sessions whose reminder time has arrived, and sends a
// web push notification to every device the student has turned reminders on for.
// Deploy with the Supabase CLI or paste into Edge Functions (turn "Verify JWT" off; the function checks the secret itself).
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const VAPID_PUBLIC_KEY = "BPIQMLnsuqSWrW7TARwmchf7fayMKZYzeBythYv1gKxTqsKcRJgyFBzYtIb-wyTtDLG-6gKCVlzXQj4M9qOdE1g";
const VAPID_SUBJECT = "mailto:benlubona735@gmail.com";

type Due = {
  sid: string;
  uid: string;
  stitle: string;
  sstarts: string;
  mins: number;
  endpoint: string;
  p256dh: string;
  auth_key: string;
};

Deno.serve(async (req: Request) => {
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const { data: rows, error: secretError } = await admin.from("app_secrets").select("name, value");
  if (secretError) return new Response("error", { status: 500 });
  const secrets: Record<string, string> = Object.fromEntries((rows ?? []).map((r) => [r.name, r.value]));

  if (!secrets.cron_secret || req.headers.get("x-cron-secret") !== secrets.cron_secret) {
    return new Response("forbidden", { status: 403 });
  }
  if (!secrets.vapid_private_key) return new Response("push keys missing", { status: 500 });

  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, secrets.vapid_private_key);

  const { data, error } = await admin.rpc("claim_due_reminders", { p_secret: secrets.cron_secret });
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });

  const due = (data ?? []) as Due[];
  let sent = 0;
  let failed = 0;

  await Promise.all(
    due.map(async (row) => {
      const when = row.mins <= 0 ? "is starting now" : `starts in ${row.mins} minute${row.mins === 1 ? "" : "s"}`;
      const payload = JSON.stringify({
        title: `Study time: ${row.stitle}`,
        body: `Your study session ${when}.`,
        url: "/",
        tag: `session-${row.sid}`,
      });
      try {
        await webpush.sendNotification(
          { endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth_key } },
          payload,
          { TTL: 1800, urgency: "high" },
        );
        sent++;
      } catch (err) {
        failed++;
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          await admin.from("push_subscriptions").delete().eq("endpoint", row.endpoint);
        } else {
          console.error("push failed", status, (err as Error).message);
        }
      }
    }),
  );

  return new Response(JSON.stringify({ due: due.length, sent, failed }), {
    headers: { "Content-Type": "application/json" },
  });
});
