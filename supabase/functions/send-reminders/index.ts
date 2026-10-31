// Sends reminders. Called once a minute by pg_cron. It authenticates with a shared secret kept in the
// app_secrets table, asks the database for everything that is due (study sessions, timetable classes and
// Pomodoro timer alerts), and sends a web push notification to every device the student has turned reminders on for.
// Deploy with the Supabase CLI or paste into Edge Functions (turn "Verify JWT" off; the function checks the secret itself).
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const VAPID_PUBLIC_KEY = "BPIQMLnsuqSWrW7TARwmchf7fayMKZYzeBythYv1gKxTqsKcRJgyFBzYtIb-wyTtDLG-6gKCVlzXQj4M9qOdE1g";
const VAPID_SUBJECT = "mailto:benlubona735@gmail.com";

type Target = { endpoint: string; p256dh: string; auth_key: string };
type SessionRow = Target & { sid: string; stitle: string; mins: number };
type ClassRow = Target & { cid: string; ctitle: string; croom: string | null; mins: number };
type TimerRow = Target & { aid: string; atitle: string; abody: string };
type Message = { title: string; body: string; tag: string; ttl: number };

const plural = (n: number) => `${n} minute${n === 1 ? "" : "s"}`;

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

  let sent = 0;
  let failed = 0;

  async function deliver<T extends Target>(fn: string, build: (row: T) => Message) {
    const { data, error } = await admin.rpc(fn, { p_secret: secrets.cron_secret });
    if (error) {
      console.error(fn, error.message);
      return 0;
    }
    const due = (data ?? []) as T[];
    await Promise.all(
      due.map(async (row) => {
        const m = build(row);
        try {
          await webpush.sendNotification(
            { endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth_key } },
            JSON.stringify({ title: m.title, body: m.body, url: "/", tag: m.tag }),
            { TTL: m.ttl, urgency: "high" },
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
    return due.length;
  }

  const sessions = await deliver<SessionRow>("claim_due_reminders", (row) => ({
    title: `Study time: ${row.stitle}`,
    body: `Your study session ${row.mins <= 0 ? "is starting now" : `starts in ${plural(row.mins)}`}.`,
    tag: `session-${row.sid}`,
    ttl: 1800,
  }));

  const classes = await deliver<ClassRow>("claim_due_class_reminders", (row) => ({
    title: `Class: ${row.ctitle}`,
    body: `${row.mins <= 0 ? "Starting now" : `Starts in ${plural(row.mins)}`}${row.croom ? ` · ${row.croom}` : ""}`,
    tag: `class-${row.cid}`,
    ttl: 900,
  }));

  const timers = await deliver<TimerRow>("claim_due_timer_alerts", (row) => ({
    title: row.atitle,
    body: row.abody,
    tag: "pomodoro",
    ttl: 600,
  }));

  return new Response(JSON.stringify({ sessions, classes, timers, sent, failed }), {
    headers: { "Content-Type": "application/json" },
  });
});
