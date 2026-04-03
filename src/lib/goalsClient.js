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

function normalizeGoal(goal) {
  return {
    id: String(goal.id ?? ""),
    slug: String(goal.slug ?? goal.id ?? ""),
    title: String(goal.title ?? "").trim(),
    timeframeType: String(goal.timeframeType ?? goal.timeframe_type ?? "long_term"),
    targetDate: goal.targetDate ?? goal.target_date ?? "",
    notes: String(goal.notes ?? "").trim(),
    subgoals: Array.isArray(goal.subgoals ?? goal.subgoals_json)
      ? (goal.subgoals ?? goal.subgoals_json)
          .map((subgoal) => ({
            id: String(subgoal?.id ?? ""),
            title: String(subgoal?.title ?? "").trim()
          }))
          .filter((subgoal) => subgoal.id && subgoal.title)
      : [],
    createdAt: goal.createdAt ?? goal.created_at ?? null,
    updatedAt: goal.updatedAt ?? goal.updated_at ?? null
  };
}

function parseGoalRows(rows) {
  return rows.map((row) =>
    normalizeGoal({
      id: row.id,
      slug: row.slug,
      title: row.title,
      timeframeType: row.timeframe_type,
      targetDate: row.target_date,
      notes: row.notes,
      subgoals: row.subgoals_json,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    })
  );
}

function serializeGoalRow(goal, userId) {
  return {
    id: goal.id,
    user_id: userId,
    slug: goal.slug ?? goal.id,
    title: goal.title,
    timeframe_type: goal.timeframeType,
    target_date: goal.targetDate || null,
    notes: goal.notes ?? "",
    subgoals_json: Array.isArray(goal.subgoals) ? goal.subgoals : []
  };
}

export async function loadGoalsForSession(accessToken, userId) {
  const rows = await fetchSupabase(
    `/rest/v1/goals?user_id=eq.${userId}&select=id,slug,title,timeframe_type,target_date,notes,subgoals_json,created_at,updated_at&order=created_at.asc`,
    accessToken
  );

  return parseGoalRows(Array.isArray(rows) ? rows : []);
}

export async function saveGoalsForSession(accessToken, userId, goals) {
  const normalized = Array.isArray(goals) ? goals.map(normalizeGoal) : [];

  const existingRows = await fetchSupabase(`/rest/v1/goals?user_id=eq.${userId}&select=id`, accessToken);
  const existingIds = new Set((Array.isArray(existingRows) ? existingRows : []).map((row) => row.id));
  const nextIds = new Set(normalized.map((goal) => goal.id));
  const idsToDelete = [...existingIds].filter((id) => !nextIds.has(id));

  if (normalized.length > 0) {
    await fetchSupabase("/rest/v1/goals?on_conflict=id", accessToken, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates, return=representation"
      },
      body: JSON.stringify(normalized.map((goal) => serializeGoalRow(goal, userId)))
    });
  }

  if (idsToDelete.length > 0) {
    await fetchSupabase(`/rest/v1/goals?id=in.(${idsToDelete.join(",")})`, accessToken, {
      method: "DELETE"
    });
  }

  return loadGoalsForSession(accessToken, userId);
}
