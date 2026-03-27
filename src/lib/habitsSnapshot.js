export async function loadHabitsSnapshot(fetchSupabase, userId, accessToken, options = {}) {
  const {
    habitSelect = "*",
    completionSelect = "id,habit_id,completed_on",
    skipSelect = "id,habit_id,skipped_on",
    linkSelect = "id,habit_id,attribute_id,weight",
    includeCompletions = true,
    includeSkips = true,
    includeAttributeLinks = true
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

  const attributeLinkRows = includeAttributeLinks
    ? (await fetchSupabase(
        `/rest/v1/habit_attribute_links?user_id=eq.${userId}&select=${linkSelect}&order=created_at.asc`,
        accessToken
      )) ?? []
    : [];

  return {
    habitRows,
    completionRows,
    skipRows,
    attributeLinkRows
  };
}
