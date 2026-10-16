import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

type Outbox = { id: string; dedupe_key: string; user_id: string; category: string; title: string; body: string; data: Record<string, unknown>; attempts: number };
type Campaign = { id: string; target_role: "cliente" | "anfitrion" | "todos"; title: string; body: string };

const json = (status: number, body: Record<string, unknown>) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });
const b64url = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
const text64url = (value: string) => b64url(new TextEncoder().encode(value));

async function fcmBearer(account: { client_email: string; private_key: string }) {
  const pem = account.private_key.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g, "");
  const der = Uint8Array.from(atob(pem), char => char.charCodeAt(0));
  const key = await crypto.subtle.importKey("pkcs8", der, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const now = Math.floor(Date.now() / 1000);
  const header = text64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = text64url(JSON.stringify({ iss: account.client_email, scope: "https://www.googleapis.com/auth/firebase.messaging", aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600 }));
  const unsigned = `${header}.${claims}`;
  const signature = new Uint8Array(await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(unsigned)));
  const assertion = `${unsigned}.${b64url(signature)}`;
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }),
  });
  if (!response.ok) throw new Error(`FCM OAuth rechazó la credencial (${response.status}).`);
  const token = await response.json();
  return token.access_token as string;
}

Deno.serve(async (request: Request) => {
  if (request.method !== "POST") return json(405, { error: "method_not_allowed" });
  // Supabase verifies the JWT before this function runs; accept only the service role used by the scheduled worker.
  const raw = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  try {
    const payload = JSON.parse(atob(raw.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    if (payload.role !== "service_role") return json(403, { error: "forbidden" });
  } catch { return json(403, { error: "forbidden" }); }

  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const serviceJson = Deno.env.get("FIREBASE_SERVICE_ACCOUNT_JSON");
  if (!url || !serviceKey || !serviceJson) return json(503, { error: "push_not_configured" });
  let account: { project_id: string; client_email: string; private_key: string };
  try { account = JSON.parse(serviceJson); } catch { return json(503, { error: "firebase_credentials_invalid" }); }
  const db = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  let bearer: string;
  try { bearer = await fcmBearer(account); } catch { return json(503, { error: "firebase_auth_failed" }); }

  const now = new Date();
  const lower = new Date(now.getTime() + 23.5 * 60 * 60 * 1000).toISOString();
  const upper = new Date(now.getTime() + 24.5 * 60 * 60 * 1000).toISOString();
  const bookingResult = await db.from("bookings").select("id,client_id,space_id,starts_at,completed_at").eq("status", "confirmada").is("completed_at", null).gte("starts_at", lower).lt("starts_at", upper).limit(250);
  if (bookingResult.error) return json(500, { error: "reminders_query_failed" });
  const bookings = bookingResult.data ?? [];
  const spaceIds = [...new Set(bookings.map(row => row.space_id))];
  const spaceResult = spaceIds.length ? await db.from("spaces").select("id,name,host_id,is_demo").in("id", spaceIds) : { data: [], error: null };
  if (spaceResult.error) return json(500, { error: "spaces_query_failed" });
  const spaceById = new Map((spaceResult.data ?? []).map(space => [space.id, space]));
  const reminderRecipients = new Map<string, { bookingId: string; spaceId: string; name: string; category: "reminders" }>();
  for (const booking of bookings) {
    const space = spaceById.get(booking.space_id);
    if (!space || space.is_demo) continue;
    if (booking.client_id) reminderRecipients.set(`${booking.id}:${booking.client_id}`, { bookingId: booking.id, spaceId: space.id, name: space.name, category: "reminders" });
    if (space.host_id) reminderRecipients.set(`${booking.id}:${space.host_id}`, { bookingId: booking.id, spaceId: space.id, name: space.name, category: "reminders" });
  }
  if (reminderRecipients.size) {
    const userIds = [...new Set([...reminderRecipients.keys()].map(key => key.slice(key.lastIndexOf(":") + 1)))];
    const preferences = await db.from("notification_preferences").select("user_id,reminders").in("user_id", userIds);
    if (preferences.error) return json(500, { error: "preferences_query_failed" });
    const allowed = new Map((preferences.data ?? []).map(row => [row.user_id, row.reminders]));
    const rows = [...reminderRecipients].flatMap(([key, item]) => {
      const userId = key.slice(key.lastIndexOf(":") + 1);
      if (allowed.get(userId) === false) return [];
      const isClient = bookings.some(b => b.id === item.bookingId && b.client_id === userId);
      const title = isClient ? "Tu renta es mañana" : "Tu espacio recibe una renta mañana";
      const body = isClient ? `Mañana tienes una renta en ${item.name}. Consulta los datos de tu ticket.` : `Mañana comienza una renta en ${item.name}. Revisa los detalles.`;
      const dedupe = `booking:${item.bookingId}:reminder24:${userId}`;
      return [{ dedupe_key: dedupe, user_id: userId, category: "reminders", title, body, data: { screen: isClient ? "reservations" : "owner", bookingId: item.bookingId, spaceId: item.spaceId } }];
    });
    if (rows.length) {
      const inbox = await db.from("notification_inbox").upsert(rows, { onConflict: "dedupe_key", ignoreDuplicates: true });
      const outbox = await db.from("push_outbox").upsert(rows, { onConflict: "dedupe_key", ignoreDuplicates: true });
      if (inbox.error || outbox.error) return json(500, { error: "reminders_enqueue_failed" });
    }
  }

  const dueCampaigns = await db.from("notification_campaigns").select("id,target_role,title,body").eq("status", "programada").lte("scheduled_at", now.toISOString()).order("scheduled_at").limit(10);
  if (dueCampaigns.error) return json(500, { error: "campaign_query_failed" });
  for (const candidate of (dueCampaigns.data ?? []) as Campaign[]) {
    const claim = await db.from("notification_campaigns").update({ status: "procesando" }).eq("id", candidate.id).eq("status", "programada").select("id").maybeSingle();
    if (claim.error || !claim.data) continue;
    let profiles = db.from("oficia_profiles").select("user_id,account_type");
    if (candidate.target_role !== "todos") profiles = profiles.eq("account_type", candidate.target_role);
    const profileResult = await profiles;
    if (profileResult.error) { await db.from("notification_campaigns").update({ status: "programada" }).eq("id", candidate.id); continue; }
    const ids = (profileResult.data ?? []).map(profile => profile.user_id);
    if (ids.length) {
      const preferences = await db.from("notification_preferences").select("user_id").eq("promotions", true).in("user_id", ids);
      if (preferences.error) { await db.from("notification_campaigns").update({ status: "programada" }).eq("id", candidate.id); continue; }
      const optedInIds = (preferences.data ?? []).map(pref => pref.user_id);
      const activeDevices = optedInIds.length
        ? await db.from("push_devices").select("user_id").eq("is_active", true).in("user_id", optedInIds)
        : { data: [], error: null };
      if (activeDevices.error) { await db.from("notification_campaigns").update({ status: "programada" }).eq("id", candidate.id); continue; }
      const deliverableIds = new Set((activeDevices.data ?? []).map(device => device.user_id));
      const rows = optedInIds.filter(userId => deliverableIds.has(userId)).map(userId => ({
        dedupe_key: `campaign:${candidate.id}:${userId}`, user_id: userId, category: "promotions",
        title: candidate.title, body: candidate.body, data: { screen: "home", campaignId: candidate.id },
      }));
      if (rows.length) {
        const inbox = await db.from("notification_inbox").upsert(rows, { onConflict: "dedupe_key", ignoreDuplicates: true });
        const outbox = await db.from("push_outbox").upsert(rows, { onConflict: "dedupe_key", ignoreDuplicates: true });
        if (inbox.error || outbox.error) { await db.from("notification_campaigns").update({ status: "programada" }).eq("id", candidate.id); continue; }
      }
    }
    await db.from("notification_campaigns").update({ status: "enviada", sent_at: new Date().toISOString() }).eq("id", candidate.id);
  }

  const pending = await db.from("push_outbox").select("id,dedupe_key,user_id,category,title,body,data,attempts").is("sent_at", null).lte("scheduled_at", new Date().toISOString()).order("created_at").limit(100);
  if (pending.error) return json(500, { error: "outbox_query_failed" });
  let delivered = 0;
  let failed = 0;
  for (const item of (pending.data ?? []) as Outbox[]) {
    const devices = await db.from("push_devices").select("id,token").eq("user_id", item.user_id).eq("is_active", true);
    if (devices.error) { failed++; continue; }
    let complete = true;
    for (const device of devices.data ?? []) {
      const fcm = await fetch(`https://fcm.googleapis.com/v1/projects/${account.project_id}/messages:send`, {
        method: "POST", headers: { authorization: `Bearer ${bearer}`, "content-type": "application/json" },
        body: JSON.stringify({ message: { token: device.token, notification: { title: item.title, body: item.body }, data: Object.fromEntries(Object.entries(item.data ?? {}).map(([key, value]) => [key, String(value)])), android: { priority: "HIGH", notification: { channel_id: "default" } } } }),
      });
      if (!fcm.ok) {
        complete = false;
        const message = await fcm.text();
        if (fcm.status === 404 || message.includes("UNREGISTERED") || message.includes("NOT_FOUND")) await db.from("push_devices").update({ is_active: false }).eq("id", device.id);
      }
    }
    const attempts = item.attempts + 1;
    if (complete) {
      await db.from("push_outbox").update({ sent_at: new Date().toISOString(), attempts, last_error: null }).eq("id", item.id);
      delivered++;
    } else {
      const delayMinutes = Math.min(120, 2 ** Math.min(attempts, 7));
      await db.from("push_outbox").update({ attempts, scheduled_at: new Date(Date.now() + delayMinutes * 60_000).toISOString(), last_error: "Uno o más dispositivos no aceptaron el aviso." }).eq("id", item.id);
      failed++;
    }
  }
  return json(200, { ok: true, reminders: reminderRecipients.size, campaigns: dueCampaigns.data?.length ?? 0, delivered, failed });
});
