import { createHmac, timingSafeEqual } from "crypto";
import { buildProjectedHabitEvents, buildUpcomingOneOffTaskEvents, CALENDAR_HORIZON_DAYS } from "../src/lib/calendar.js";
import { buildICSFeed } from "../src/lib/icsBuilder.js";

function getConfig() {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const calendarSecret = process.env.CALENDAR_SECRET;

  if (!url || !serviceRoleKey || !calendarSecret) return null;

  return { url: url.replace(/\/$/, ""), serviceRoleKey, calendarSecret };
}

function buildHeaders(config, extraHeaders = {}) {
  return {
    apikey: config.serviceRoleKey,
    Authorization: `Bearer ${config.serviceRoleKey}`,
    ...extraHeaders
  };
}

async function fetchSupabase(config, pathname, options = {}) {
  const res = await fetch(`${config.url}${pathname}`, {
    ...options,
    headers: buildHeaders(config, options.headers)
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Supabase request failed (${res.status}): ${errorText}`);
  }

  if (res.status === 204) return null;
  return res.json();
}

async function getAuthenticatedUser(config, request) {
  const authHeader = request.headers.get("authorization");
  const accessToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!accessToken) return { error: "Missing access token." };

  const res = await fetch(`${config.url}/auth/v1/user`, {
    headers: {
      apikey: config.serviceRoleKey,
      Authorization: `Bearer ${accessToken}`
    }
  });

  if (!res.ok) return { error: "Invalid session." };
  return { user: await res.json() };
}

function generateToken(userId, secret) {
  return createHmac("sha256", secret).update(userId).digest("hex");
}

function verifyToken(userId, token, secret) {
  if (typeof token !== "string" || token.length !== 64) return false;
  const expected = generateToken(userId, secret);
  try {
    return timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(token, "hex"));
  } catch {
    return false;
  }
}

async function fetchHabitsForUser(config, userId) {
  const habitRows = await fetchSupabase(
    config,
    `/rest/v1/habits?user_id=eq.${userId}&calendar_sync=eq.true&select=id,slug,name,frequency_mode,frequency_value,frequency_unit,importance,initial_last_done,created_at,cycle_skip_dates_json&order=created_at.asc`
  ) ?? [];

  if (habitRows.length === 0) return [];

  const habitIds = habitRows.map((row) => row.id).join(",");

  const [completionRows, skipRows] = await Promise.all([
    fetchSupabase(config, `/rest/v1/habit_completions?habit_id=in.(${habitIds})&select=habit_id,completed_on`),
    fetchSupabase(config, `/rest/v1/habit_skips?habit_id=in.(${habitIds})&select=habit_id,skipped_on`)
  ]);

  const completionsByHabitId = new Map();
  for (const row of (completionRows ?? [])) {
    const dates = completionsByHabitId.get(row.habit_id) ?? [];
    dates.push(row.completed_on);
    completionsByHabitId.set(row.habit_id, dates);
  }

  const skipsByHabitId = new Map();
  for (const row of (skipRows ?? [])) {
    const dates = skipsByHabitId.get(row.habit_id) ?? [];
    dates.push(row.skipped_on);
    skipsByHabitId.set(row.habit_id, dates);
  }

  return habitRows.map((row) => ({
    id: row.id,
    slug: row.slug ?? row.id,
    name: row.name,
    frequencyMode: row.frequency_mode,
    frequencyValue: row.frequency_value,
    frequencyUnit: row.frequency_unit,
    importance: row.importance,
    createdAt: row.created_at,
    initialLastDone: row.initial_last_done ?? null,
    doneDates: [...new Set(completionsByHabitId.get(row.id) ?? [])].sort(),
    skippedDates: [...new Set(skipsByHabitId.get(row.id) ?? [])].sort(),
    cycleSkipDates: Array.isArray(row.cycle_skip_dates_json) ? row.cycle_skip_dates_json : [],
    subtasks: [],
    attributeLinks: [],
    domainIds: []
  }));
}

async function fetchOneOffTasksForUser(config, userId) {
  const rows = await fetchSupabase(
    config,
    `/rest/v1/one_off_tasks?user_id=eq.${userId}&scheduled_for=not.is.null&completed_on=is.null&select=id,title,scheduled_for,completed_on`
  ) ?? [];

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    scheduledFor: row.scheduled_for,
    completedOn: row.completed_on ?? ""
  }));
}

export async function handleCalendarTokenGet(request) {
  try {
    const config = getConfig();
    if (!config) {
      return Response.json({ error: "Calendar feed is not configured." }, { status: 500 });
    }

    const auth = await getAuthenticatedUser(config, request);
    if (auth.error) {
      return Response.json({ error: auth.error }, { status: 401 });
    }

    const token = generateToken(auth.user.id, config.calendarSecret);
    return Response.json({ token, userId: auth.user.id });
  } catch (error) {
    console.error("GET /api/calendar-token failed", error);
    return Response.json({ error: "Failed to generate calendar token." }, { status: 500 });
  }
}

export async function handleCalendarFeedGet(request) {
  const textResponse = (body, status) =>
    new Response(body, { status, headers: { "Content-Type": "text/plain" } });

  try {
    const config = getConfig();
    if (!config) return textResponse("Calendar feed is not configured.", 500);

    const url = new URL(request.url);
    const userId = url.searchParams.get("userId") ?? "";
    const token = url.searchParams.get("token") ?? "";

    if (!userId || !verifyToken(userId, token, config.calendarSecret)) {
      return textResponse("Unauthorized.", 401);
    }

    const todayISO = new Date().toISOString().slice(0, 10);
    const [habits, oneOffTasks] = await Promise.all([
      fetchHabitsForUser(config, userId),
      fetchOneOffTasksForUser(config, userId)
    ]);

    const habitEvents = buildProjectedHabitEvents({ habits, todayISO, horizonDays: CALENDAR_HORIZON_DAYS });
    const taskEvents = buildUpcomingOneOffTaskEvents(oneOffTasks, todayISO);
    const allEvents = [...taskEvents, ...habitEvents].sort((a, b) => a.dateISO.localeCompare(b.dateISO));

    const ics = buildICSFeed(allEvents);

    return new Response(ics, {
      status: 200,
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": 'attachment; filename="habits.ics"',
        "Cache-Control": "no-cache, no-store"
      }
    });
  } catch (error) {
    console.error("GET /api/calendar failed", error);
    return textResponse("Failed to generate calendar feed.", 500);
  }
}
