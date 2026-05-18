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

function normalizeTodayUiState(state, userId, entryDate) {
  return {
    userId: String(state?.userId ?? state?.user_id ?? userId ?? ""),
    entryDate: String(state?.entryDate ?? state?.entry_date ?? entryDate ?? "").slice(0, 10),
    mantraChecked: Boolean(state?.mantraChecked ?? state?.mantra_checked ?? false),
    createdAt: state?.createdAt ?? state?.created_at ?? null,
    updatedAt: state?.updatedAt ?? state?.updated_at ?? null
  };
}

function buildEmptyTodayUiState(userId, entryDate) {
  return normalizeTodayUiState({}, userId, entryDate);
}

function serializeTodayUiStateRow(state, userId, entryDate) {
  const normalized = normalizeTodayUiState(state, userId, entryDate);
  return {
    user_id: normalized.userId,
    entry_date: normalized.entryDate,
    mantra_checked: normalized.mantraChecked
  };
}

export async function loadTodayUiStateForSession(accessToken, userId, entryDate) {
  const rows = await fetchSupabase(
    `/rest/v1/daily_ui_state?user_id=eq.${userId}&entry_date=eq.${entryDate}&select=user_id,entry_date,mantra_checked,created_at,updated_at&limit=1`,
    accessToken
  );

  if (!Array.isArray(rows) || rows.length === 0) {
    return buildEmptyTodayUiState(userId, entryDate);
  }

  return normalizeTodayUiState(rows[0], userId, entryDate);
}

export async function saveTodayUiStateForSession(accessToken, userId, entryDate, state) {
  await fetchSupabase("/rest/v1/daily_ui_state?on_conflict=user_id,entry_date", accessToken, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates, return=representation"
    },
    body: JSON.stringify([serializeTodayUiStateRow(state, userId, entryDate)])
  });

  return loadTodayUiStateForSession(accessToken, userId, entryDate);
}
