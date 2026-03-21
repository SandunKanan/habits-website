export async function loadHabitsSnapshot(fetchSupabase, userId, accessToken, options = {}) {
  const {
    habitSelect = "*",
    completionSelect = "id,habit_id,completed_on",
    skipSelect = "id,habit_id,skipped_on",
    includeCompletions = true,
    includeSkips = true
  } = options;

  const habitRows =
    (await fetchSupabase(
      `/rest/v1/habits?user_id=eq.${userId}&select=${habitSelect}&order=created_at.asc`,
      accessToken
    )) ?? [];

  const completionRows = includeCompletions
    ? (await fetchSupabase(
        `/rest/v1/habit_completions?user_id=eq.${userId}&select=${completionSelect}&order=completed_on.asc`,
        accessToken
      )) ?? []
    : [];

  const skipRows = includeSkips
    ? (await fetchSupabase(
        `/rest/v1/habit_skips?user_id=eq.${userId}&select=${skipSelect}&order=skipped_on.asc`,
        accessToken
      )) ?? []
    : [];

  return {
    habitRows,
    completionRows,
    skipRows
  };
}
