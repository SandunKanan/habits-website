import fs from "node:fs/promises";
import path from "node:path";
import { normalizeFrequency } from "../src/lib/frequency.js";
import { normalizeImportanceValue } from "../src/lib/importance.js";

const localHabitsPath = path.resolve(process.cwd(), "src/data/habits.json");

function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    return null;
  }

  return {
    url: url.replace(/\/$/, ""),
    serviceRoleKey
  };
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

  if (res.status === 204) {
    return null;
  }

  return res.json();
}

function normalizeHabit(habit) {
  const doneDates = Array.isArray(habit.doneDates)
    ? [...new Set(habit.doneDates)].sort((a, b) => a.localeCompare(b))
    : [];
  const frequency = normalizeFrequency(habit);

  return {
    ...habit,
    ...frequency,
    importance: normalizeImportanceValue(habit.importance),
    initialLastDone: habit.initialLastDone ?? null,
    doneDates
  };
}

function normalizeHabits(habits) {
  return Array.isArray(habits) ? habits.map(normalizeHabit) : [];
}

async function readLocalHabits() {
  const fileContents = await fs.readFile(localHabitsPath, "utf8");
  return normalizeHabits(JSON.parse(fileContents));
}

async function writeLocalHabits(habits) {
  const normalized = normalizeHabits(habits);
  await fs.writeFile(localHabitsPath, `${JSON.stringify(normalized, null, 2)}\n`, "utf8");
  return normalized;
}

function serializeHabitRow(userId, habit) {
  const frequency = normalizeFrequency(habit);

  return {
    user_id: userId,
    slug: habit.id,
    name: habit.name,
    frequency_mode: frequency.frequencyMode,
    frequency_value: frequency.frequencyValue,
    frequency_unit: frequency.frequencyUnit,
    importance: normalizeImportanceValue(habit.importance),
    initial_last_done: habit.initialLastDone ?? null
  };
}

function parseHabitRows(habitRows, completionRows) {
  const completionsByHabitId = new Map();

  for (const completion of completionRows) {
    const dates = completionsByHabitId.get(completion.habit_id) ?? [];
    dates.push(completion.completed_on);
    completionsByHabitId.set(completion.habit_id, dates);
  }

  return habitRows.map((habitRow) =>
    normalizeHabit({
      id: habitRow.slug,
      name: habitRow.name,
      frequencyMode: habitRow.frequency_mode,
      frequencyValue: habitRow.frequency_value,
      frequencyUnit: habitRow.frequency_unit,
      everyXDays: habitRow.every_x_days,
      importance: habitRow.importance,
      initialLastDone: habitRow.initial_last_done,
      doneDates: completionsByHabitId.get(habitRow.id) ?? []
    })
  );
}

async function loadFromSupabase(config, userId) {
  const habitRows =
    (await fetchSupabase(
      config,
      `/rest/v1/habits?user_id=eq.${userId}&select=*&order=created_at.asc`
    )) ?? [];

  if (habitRows.length === 0) {
    return [];
  }

  const completionRows =
    (await fetchSupabase(
      config,
      `/rest/v1/habit_completions?user_id=eq.${userId}&select=id,habit_id,completed_on&order=completed_on.asc`
    )) ?? [];

  return parseHabitRows(habitRows, completionRows);
}

function groupDesiredCompletions(habits, habitIdBySlug) {
  const desired = new Map();

  for (const habit of habits) {
    const habitId = habitIdBySlug.get(habit.id);
    if (!habitId) continue;

    for (const completedOn of habit.doneDates) {
      desired.set(`${habitId}:${completedOn}`, {
        user_id: habit.userId,
        habit_id: habitId,
        completed_on: completedOn
      });
    }
  }

  return desired;
}

async function deleteCompletions(config, completionIds) {
  if (completionIds.length === 0) return;

  const quotedIds = completionIds.map((id) => `"${id}"`).join(",");
  await fetchSupabase(config, `/rest/v1/habit_completions?id=in.(${quotedIds})`, {
    method: "DELETE",
    headers: {
      Prefer: "return=minimal"
    }
  });
}

async function deleteHabits(config, userId, slugs) {
  if (slugs.length === 0) return;

  const quotedSlugs = slugs.map((slug) => `"${slug}"`).join(",");
  await fetchSupabase(
    config,
    `/rest/v1/habits?user_id=eq.${userId}&slug=in.(${quotedSlugs})`,
    {
      method: "DELETE",
      headers: {
        Prefer: "return=minimal"
      }
    }
  );
}

async function saveToSupabase(config, userId, habits) {
  const normalized = normalizeHabits(habits).map((habit) => ({ ...habit, userId }));
  const existingHabitRows =
    (await fetchSupabase(
      config,
      `/rest/v1/habits?user_id=eq.${userId}&select=id,slug&order=created_at.asc`
    )) ?? [];

  const existingSlugSet = new Set(existingHabitRows.map((row) => row.slug));
  const nextSlugSet = new Set(normalized.map((habit) => habit.id));

  if (normalized.length > 0) {
    const upsertRows = normalized.map((habit) => serializeHabitRow(userId, habit));
    await fetchSupabase(config, "/rest/v1/habits?on_conflict=user_id,slug", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates, return=representation"
      },
      body: JSON.stringify(upsertRows)
    });
  }

  const currentHabitRows =
    (await fetchSupabase(
      config,
      `/rest/v1/habits?user_id=eq.${userId}&select=*&order=created_at.asc`
    )) ?? [];
  const habitIdBySlug = new Map(currentHabitRows.map((row) => [row.slug, row.id]));

  const existingCompletionRows =
    (await fetchSupabase(
      config,
      `/rest/v1/habit_completions?user_id=eq.${userId}&select=id,habit_id,completed_on`
    )) ?? [];
  const existingCompletionMap = new Map(
    existingCompletionRows.map((row) => [`${row.habit_id}:${row.completed_on}`, row])
  );

  const desiredCompletionMap = groupDesiredCompletions(normalized, habitIdBySlug);
  const completionIdsToDelete = existingCompletionRows
    .filter((row) => !desiredCompletionMap.has(`${row.habit_id}:${row.completed_on}`))
    .map((row) => row.id);

  await deleteCompletions(config, completionIdsToDelete);

  const completionsToInsert = [...desiredCompletionMap.entries()]
    .filter(([key]) => !existingCompletionMap.has(key))
    .map(([, value]) => value);

  if (completionsToInsert.length > 0) {
    await fetchSupabase(config, "/rest/v1/habit_completions?on_conflict=habit_id,completed_on", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates, return=representation"
      },
      body: JSON.stringify(completionsToInsert)
    });
  }

  const slugsToDelete = [...existingSlugSet].filter((slug) => !nextSlugSet.has(slug));
  await deleteHabits(config, userId, slugsToDelete);

  const finalHabitRows =
    (await fetchSupabase(
      config,
      `/rest/v1/habits?user_id=eq.${userId}&select=*&order=created_at.asc`
    )) ?? [];
  const finalCompletionRows =
    (await fetchSupabase(
      config,
      `/rest/v1/habit_completions?user_id=eq.${userId}&select=id,habit_id,completed_on&order=completed_on.asc`
    )) ?? [];

  return parseHabitRows(finalHabitRows, finalCompletionRows);
}

export async function loadHabitsFromStore(userId) {
  const supabaseConfig = getSupabaseConfig();
  if (!supabaseConfig) {
    return readLocalHabits();
  }

  return loadFromSupabase(supabaseConfig, userId);
}

export async function saveHabitsToStore(userId, habits) {
  const supabaseConfig = getSupabaseConfig();
  if (!supabaseConfig) {
    return writeLocalHabits(habits);
  }

  return saveToSupabase(supabaseConfig, userId, habits);
}
