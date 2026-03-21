export async function executeHabitsSyncPlan({
  fetchSupabase,
  accessToken,
  userId,
  syncPlan
}) {
  await deleteCompletions(fetchSupabase, accessToken, syncPlan.completionIdsToDelete);

  if (syncPlan.completionRowsToInsert.length > 0) {
    await fetchSupabase("/rest/v1/habit_completions?on_conflict=habit_id,completed_on", accessToken, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates, return=representation"
      },
      body: JSON.stringify(syncPlan.completionRowsToInsert)
    });
  }

  await deleteSkips(fetchSupabase, accessToken, syncPlan.skipIdsToDelete);

  if (syncPlan.skipRowsToInsert.length > 0) {
    await fetchSupabase("/rest/v1/habit_skips?on_conflict=habit_id,skipped_on", accessToken, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates, return=representation"
      },
      body: JSON.stringify(syncPlan.skipRowsToInsert)
    });
  }

  await deleteHabits(fetchSupabase, accessToken, userId, syncPlan.habitSlugsToDelete);
}

async function deleteCompletions(fetchSupabase, accessToken, completionIds) {
  if (completionIds.length === 0) return;

  const quotedIds = completionIds.map((id) => `"${id}"`).join(",");
  await fetchSupabase(`/rest/v1/habit_completions?id=in.(${quotedIds})`, accessToken, {
    method: "DELETE",
    headers: {
      Prefer: "return=minimal"
    }
  });
}

async function deleteSkips(fetchSupabase, accessToken, skipIds) {
  if (skipIds.length === 0) return;

  const quotedIds = skipIds.map((id) => `"${id}"`).join(",");
  await fetchSupabase(`/rest/v1/habit_skips?id=in.(${quotedIds})`, accessToken, {
    method: "DELETE",
    headers: {
      Prefer: "return=minimal"
    }
  });
}

async function deleteHabits(fetchSupabase, accessToken, userId, slugs) {
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
