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
    userId: String(focus.userId ?? focus.user_id ?? ""),
    title: String(focus.title ?? "").trim(),
    startDate: focus.startDate ?? focus.start_date ?? "",
    endDate: focus.endDate ?? focus.end_date ?? "",
    whyNow: String(focus.whyNow ?? focus.why_now ?? "").trim(),
    endState: String(focus.endState ?? focus.end_state ?? "").trim(),
    currentObstacles: String(focus.currentObstacles ?? focus.current_obstacles ?? "").trim(),
    createdAt: focus.createdAt ?? focus.created_at ?? null,
    updatedAt: focus.updatedAt ?? focus.updated_at ?? null
  };
}

function buildEmptyFocus(userId) {
  return normalizeFocus({
    userId,
    title: "",
    startDate: "",
    endDate: "",
    whyNow: "",
    endState: "",
    currentObstacles: "",
    createdAt: null,
    updatedAt: null
  });
}

function serializeFocusRow(focus, userId) {
  return {
    user_id: userId,
    title: focus.title,
    start_date: focus.startDate || null,
    end_date: focus.endDate || null,
    why_now: focus.whyNow,
    end_state: focus.endState,
    current_obstacles: focus.currentObstacles
  };
}

export async function loadFocusForSession(accessToken, userId) {
  const rows = await fetchSupabase(
    `/rest/v1/focus_periods?user_id=eq.${userId}&select=user_id,title,start_date,end_date,why_now,end_state,current_obstacles,created_at,updated_at&limit=1`,
    accessToken
  );

  if (!Array.isArray(rows) || rows.length === 0) {
    return buildEmptyFocus(userId);
  }

  return normalizeFocus(rows[0]);
}

export async function saveFocusForSession(accessToken, userId, focus) {
  const normalized = normalizeFocus(focus);

  await fetchSupabase("/rest/v1/focus_periods?on_conflict=user_id", accessToken, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates, return=representation"
    },
    body: JSON.stringify([serializeFocusRow(normalized, userId)])
  });

  return loadFocusForSession(accessToken, userId);
}
