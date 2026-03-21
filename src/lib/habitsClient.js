import { normalizeFrequency } from "./frequency.js";
import { normalizeImportanceValue } from "./importance.js";
import { loadHabitsSnapshot } from "./habitsSnapshot.js";
import { computeHabitsSyncPlan } from "./habitsSyncPlan.js";
import { executeHabitsSyncPlan } from "./executeHabitsSyncPlan.js";

function getConfig() {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !publishableKey) {
    return null;
  }

  return {
    url: url.replace(/\/$/, ""),
    publishableKey
  };
}

function buildHeaders(config, accessToken, extraHeaders = {}) {
  return {
    apikey: config.publishableKey,
    Authorization: `Bearer ${accessToken}`,
    ...extraHeaders
  };
}

async function fetchSupabase(pathname, accessToken, options = {}) {
  const config = getConfig();
  if (!config) {
    throw new Error("Supabase client is not configured.");
  }
  if (!accessToken) {
    throw new Error("Missing access token.");
  }

  const res = await fetch(`${config.url}${pathname}`, {
    ...options,
    headers: buildHeaders(config, accessToken, options.headers)
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
  const skippedDates = Array.isArray(habit.skippedDates)
    ? [...new Set(habit.skippedDates)].sort((a, b) => a.localeCompare(b))
    : [];
  const subtasks = Array.isArray(habit.subtasks)
    ? habit.subtasks.map((subtask) => ({
        id: String(subtask.id ?? ""),
        name: String(subtask.name ?? "").trim(),
        doneDates: Array.isArray(subtask.doneDates)
          ? [...new Set(subtask.doneDates)].sort((a, b) => a.localeCompare(b))
          : []
      }))
    : [];
  const frequency = normalizeFrequency(habit);

  return {
    ...habit,
    id: String(habit.id ?? ""),
    slug: String(habit.slug ?? habit.id ?? ""),
    ...frequency,
    importance: normalizeImportanceValue(habit.importance),
    createdAt: habit.createdAt ?? null,
    initialLastDone: habit.initialLastDone ?? null,
    doneDates,
    skippedDates,
    subtasks
  };
}

function parseHabitRows(habitRows, completionRows, skipRows) {
  const completionsByHabitId = new Map();
  const skipsByHabitId = new Map();

  for (const completion of completionRows) {
    const dates = completionsByHabitId.get(completion.habit_id) ?? [];
    dates.push(completion.completed_on);
    completionsByHabitId.set(completion.habit_id, dates);
  }

  for (const skip of skipRows) {
    const dates = skipsByHabitId.get(skip.habit_id) ?? [];
    dates.push(skip.skipped_on);
    skipsByHabitId.set(skip.habit_id, dates);
  }

  return habitRows.map((habitRow) =>
    normalizeHabit({
      id: habitRow.id,
      slug: habitRow.slug,
      name: habitRow.name,
      frequencyMode: habitRow.frequency_mode,
      frequencyValue: habitRow.frequency_value,
      frequencyUnit: habitRow.frequency_unit,
      importance: habitRow.importance,
      createdAt: habitRow.created_at,
      initialLastDone: habitRow.initial_last_done,
      doneDates: completionsByHabitId.get(habitRow.id) ?? [],
      skippedDates: skipsByHabitId.get(habitRow.id) ?? [],
      subtasks: habitRow.subtasks ?? []
    })
  );
}

function serializeHabitRow(habit, userId) {
  const frequency = normalizeFrequency(habit);

  return {
    user_id: userId,
    slug: habit.slug ?? habit.id,
    name: habit.name,
    frequency_mode: frequency.frequencyMode === "rate" ? "quota" : frequency.frequencyMode,
    frequency_value: frequency.frequencyValue,
    frequency_unit: frequency.frequencyUnit,
    importance: normalizeImportanceValue(habit.importance),
    created_at: habit.createdAt ?? null,
    initial_last_done: habit.initialLastDone ?? null,
    subtasks: habit.subtasks ?? []
  };
}

export async function loadHabitsForSession(accessToken, userId) {
  const { habitRows, completionRows, skipRows } = await loadHabitsSnapshot(
    fetchSupabase,
    userId,
    accessToken
  );

  if (habitRows.length === 0) {
    return [];
  }

  return parseHabitRows(habitRows, completionRows, skipRows);
}

export async function saveHabitsForSession(accessToken, userId, habits) {
  const normalized = Array.isArray(habits) ? habits.map(normalizeHabit) : [];
  const { habitRows: existingHabitRows } = await loadHabitsSnapshot(fetchSupabase, userId, accessToken, {
    habitSelect: "id,slug",
    includeCompletions: false,
    includeSkips: false
  });

  if (normalized.length > 0) {
    const upsertRows = normalized.map((habit) => serializeHabitRow(habit, userId));
    await fetchSupabase("/rest/v1/habits?on_conflict=user_id,slug", accessToken, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates, return=representation"
      },
      body: JSON.stringify(upsertRows)
    });
  }

  const {
    habitRows: currentHabitRows,
    completionRows: existingCompletionRows,
    skipRows: existingSkipRows
  } = await loadHabitsSnapshot(fetchSupabase, userId, accessToken, {
    habitSelect: "*",
    completionSelect: "id,habit_id,completed_on",
    skipSelect: "id,habit_id,skipped_on"
  });

  const syncPlan = computeHabitsSyncPlan({
    normalizedHabits: normalized,
    userId,
    existingHabitRows,
    currentHabitRows,
    existingCompletionRows,
    existingSkipRows
  });

  await executeHabitsSyncPlan({
    fetchSupabase,
    accessToken,
    userId,
    syncPlan
  });

  const {
    habitRows: finalHabitRows,
    completionRows: finalCompletionRows,
    skipRows: finalSkipRows
  } = await loadHabitsSnapshot(fetchSupabase, userId, accessToken);

  return parseHabitRows(finalHabitRows, finalCompletionRows, finalSkipRows);
}
