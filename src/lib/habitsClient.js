import { normalizeFrequency } from "./frequency.js";
import { normalizeImportanceValue } from "./importance.js";

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
  const frequency = normalizeFrequency(habit);

  return {
    ...habit,
    ...frequency,
    importance: normalizeImportanceValue(habit.importance),
    initialLastDone: habit.initialLastDone ?? null,
    doneDates,
    skippedDates
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
      id: habitRow.slug,
      name: habitRow.name,
      frequencyMode: habitRow.frequency_mode,
      frequencyValue: habitRow.frequency_value,
      frequencyUnit: habitRow.frequency_unit,
      importance: habitRow.importance,
      initialLastDone: habitRow.initial_last_done,
      doneDates: completionsByHabitId.get(habitRow.id) ?? [],
      skippedDates: skipsByHabitId.get(habitRow.id) ?? []
    })
  );
}

function serializeHabitRow(habit, userId) {
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

async function deleteCompletions(accessToken, completionIds) {
  if (completionIds.length === 0) return;

  const quotedIds = completionIds.map((id) => `"${id}"`).join(",");
  await fetchSupabase(`/rest/v1/habit_completions?id=in.(${quotedIds})`, accessToken, {
    method: "DELETE",
    headers: {
      Prefer: "return=minimal"
    }
  });
}

async function deleteSkips(accessToken, skipIds) {
  if (skipIds.length === 0) return;

  const quotedIds = skipIds.map((id) => `"${id}"`).join(",");
  await fetchSupabase(`/rest/v1/habit_skips?id=in.(${quotedIds})`, accessToken, {
    method: "DELETE",
    headers: {
      Prefer: "return=minimal"
    }
  });
}

async function deleteHabits(accessToken, userId, slugs) {
  if (slugs.length === 0) return;

  const quotedSlugs = slugs.map((slug) => `"${slug}"`).join(",");
  await fetchSupabase(
    `/rest/v1/habits?user_id=eq.${userId}&slug=in.(${quotedSlugs})`,
    accessToken,
    {
      method: "DELETE",
      headers: {
        Prefer: "return=minimal"
      }
    }
  );
}

export async function loadHabitsForSession(accessToken, userId) {
  const habitRows =
    (await fetchSupabase(
      `/rest/v1/habits?user_id=eq.${userId}&select=*&order=created_at.asc`,
      accessToken
    )) ?? [];

  if (habitRows.length === 0) {
    return [];
  }

  const completionRows =
    (await fetchSupabase(
      `/rest/v1/habit_completions?user_id=eq.${userId}&select=id,habit_id,completed_on&order=completed_on.asc`,
      accessToken
    )) ?? [];
  const skipRows =
    (await fetchSupabase(
      `/rest/v1/habit_skips?user_id=eq.${userId}&select=id,habit_id,skipped_on&order=skipped_on.asc`,
      accessToken
    )) ?? [];

  return parseHabitRows(habitRows, completionRows, skipRows);
}

export async function saveHabitsForSession(accessToken, userId, habits) {
  const normalized = Array.isArray(habits) ? habits.map(normalizeHabit) : [];
  const existingHabitRows =
    (await fetchSupabase(
      `/rest/v1/habits?user_id=eq.${userId}&select=id,slug&order=created_at.asc`,
      accessToken
    )) ?? [];

  const existingSlugSet = new Set(existingHabitRows.map((row) => row.slug));
  const nextSlugSet = new Set(normalized.map((habit) => habit.id));

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

  const currentHabitRows =
    (await fetchSupabase(
      `/rest/v1/habits?user_id=eq.${userId}&select=*&order=created_at.asc`,
      accessToken
    )) ?? [];
  const habitIdBySlug = new Map(currentHabitRows.map((row) => [row.slug, row.id]));

  const existingCompletionRows =
    (await fetchSupabase(
      `/rest/v1/habit_completions?user_id=eq.${userId}&select=id,habit_id,completed_on`,
      accessToken
    )) ?? [];
  const existingCompletionMap = new Map(
    existingCompletionRows.map((row) => [`${row.habit_id}:${row.completed_on}`, row])
  );
  const existingSkipRows =
    (await fetchSupabase(
      `/rest/v1/habit_skips?user_id=eq.${userId}&select=id,habit_id,skipped_on`,
      accessToken
    )) ?? [];
  const existingSkipMap = new Map(
    existingSkipRows.map((row) => [`${row.habit_id}:${row.skipped_on}`, row])
  );

  const desiredCompletionMap = new Map();
  const desiredSkipMap = new Map();
  for (const habit of normalized) {
    const habitId = habitIdBySlug.get(habit.id);
    if (!habitId) continue;

    for (const completedOn of habit.doneDates) {
      desiredCompletionMap.set(`${habitId}:${completedOn}`, {
        user_id: userId,
        habit_id: habitId,
        completed_on: completedOn
      });
    }

    for (const skippedOn of habit.skippedDates) {
      desiredSkipMap.set(`${habitId}:${skippedOn}`, {
        user_id: userId,
        habit_id: habitId,
        skipped_on: skippedOn
      });
    }
  }

  const completionIdsToDelete = existingCompletionRows
    .filter((row) => !desiredCompletionMap.has(`${row.habit_id}:${row.completed_on}`))
    .map((row) => row.id);
  await deleteCompletions(accessToken, completionIdsToDelete);

  const completionsToInsert = [...desiredCompletionMap.entries()]
    .filter(([key]) => !existingCompletionMap.has(key))
    .map(([, value]) => value);

  if (completionsToInsert.length > 0) {
    await fetchSupabase("/rest/v1/habit_completions?on_conflict=habit_id,completed_on", accessToken, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates, return=representation"
      },
      body: JSON.stringify(completionsToInsert)
    });
  }

  const skipIdsToDelete = existingSkipRows
    .filter((row) => !desiredSkipMap.has(`${row.habit_id}:${row.skipped_on}`))
    .map((row) => row.id);
  await deleteSkips(accessToken, skipIdsToDelete);

  const skipsToInsert = [...desiredSkipMap.entries()]
    .filter(([key]) => !existingSkipMap.has(key))
    .map(([, value]) => value);

  if (skipsToInsert.length > 0) {
    await fetchSupabase("/rest/v1/habit_skips?on_conflict=habit_id,skipped_on", accessToken, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates, return=representation"
      },
      body: JSON.stringify(skipsToInsert)
    });
  }

  await deleteHabits(
    accessToken,
    userId,
    [...existingSlugSet].filter((slug) => !nextSlugSet.has(slug))
  );

  const finalHabitRows =
    (await fetchSupabase(
      `/rest/v1/habits?user_id=eq.${userId}&select=*&order=created_at.asc`,
      accessToken
    )) ?? [];
  const finalCompletionRows =
    (await fetchSupabase(
      `/rest/v1/habit_completions?user_id=eq.${userId}&select=id,habit_id,completed_on&order=completed_on.asc`,
      accessToken
    )) ?? [];
  const finalSkipRows =
    (await fetchSupabase(
      `/rest/v1/habit_skips?user_id=eq.${userId}&select=id,habit_id,skipped_on&order=skipped_on.asc`,
      accessToken
    )) ?? [];

  return parseHabitRows(finalHabitRows, finalCompletionRows, finalSkipRows);
}
