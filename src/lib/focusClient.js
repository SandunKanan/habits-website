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

function normalizeFocus(focus) {
  return {
    id: String(focus.id ?? ""),
    userId: String(focus.userId ?? focus.user_id ?? ""),
    title: String(focus.title ?? "").trim(),
    startDate: focus.startDate ?? focus.start_date ?? "",
    endDate: focus.endDate ?? focus.end_date ?? "",
    whyNow: String(focus.whyNow ?? focus.why_now ?? "").trim(),
    endState: String(focus.endState ?? focus.end_state ?? "").trim(),
    currentObstacles: String(focus.currentObstacles ?? focus.current_obstacles ?? "").trim(),
    focusDomainIds: Array.isArray(focus.focusDomainIds ?? focus.focus_domain_ids_json)
      ? [...new Set((focus.focusDomainIds ?? focus.focus_domain_ids_json).map(String).filter(Boolean))]
      : [],
    focusTargets: Array.isArray(focus.focusTargets ?? focus.focus_targets_json)
      ? (focus.focusTargets ?? focus.focus_targets_json)
          .map((target) => ({
            kind: target?.kind === "subgoal" ? "subgoal" : "goal",
            goalId: String(target?.goalId ?? target?.goal_id ?? ""),
            subgoalId: String(target?.subgoalId ?? target?.subgoal_id ?? "")
          }))
          .filter((target) => target.goalId && (target.kind === "goal" || target.subgoalId))
      : [],
    createdAt: focus.createdAt ?? focus.created_at ?? null,
    updatedAt: focus.updatedAt ?? focus.updated_at ?? null
  };
}

function buildEmptyFocus(userId) {
  return normalizeFocus({
    id: "",
    userId,
    title: "",
    startDate: "",
    endDate: "",
    whyNow: "",
    endState: "",
    currentObstacles: "",
    focusDomainIds: [],
    focusTargets: [],
    createdAt: null,
    updatedAt: null
  });
}

function serializeFocusRow(focus, userId) {
  return {
    id: focus.id,
    user_id: userId,
    title: focus.title,
    start_date: focus.startDate || null,
    end_date: focus.endDate || null,
    why_now: focus.whyNow,
    end_state: focus.endState,
    current_obstacles: focus.currentObstacles,
    focus_domain_ids_json: Array.isArray(focus.focusDomainIds) ? focus.focusDomainIds : [],
    focus_targets_json: Array.isArray(focus.focusTargets) ? focus.focusTargets : []
  };
}

export async function loadFocusForSession(accessToken, userId) {
  const rows = await fetchSupabase(
    `/rest/v1/focus_periods?user_id=eq.${userId}&select=id,user_id,title,start_date,end_date,why_now,end_state,current_obstacles,focus_domain_ids_json,focus_targets_json,created_at,updated_at`,
    accessToken
  );

  if (!Array.isArray(rows) || rows.length === 0) {
    return [];
  }

  return rows.map(normalizeFocus);
}

export async function saveFocusForSession(accessToken, userId, focus) {
  const normalized = normalizeFocus(focus);

  await fetchSupabase("/rest/v1/focus_periods?on_conflict=id", accessToken, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates, return=representation"
    },
    body: JSON.stringify([
      serializeFocusRow(
        {
          ...normalized,
          id: normalized.id || crypto.randomUUID()
        },
        userId
      )
    ])
  });

  return loadFocusForSession(accessToken, userId);
}

export async function deleteFocusForSession(accessToken, userId, focusId) {
  await fetchSupabase(`/rest/v1/focus_periods?id=eq.${focusId}&user_id=eq.${userId}`, accessToken, {
    method: "DELETE"
  });

  return loadFocusForSession(accessToken, userId);
}
