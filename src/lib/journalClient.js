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

function normalizeJournalEntry(entry) {
  return {
    id: String(entry.id ?? ""),
    title: String(entry.title ?? "").trim(),
    body: String(entry.body ?? ""),
    createdAt: entry.createdAt ?? entry.created_at ?? null,
    updatedAt: entry.updatedAt ?? entry.updated_at ?? null
  };
}

function parseJournalRows(rows) {
  return (Array.isArray(rows) ? rows : []).map((row) =>
    normalizeJournalEntry({
      id: row.id,
      title: row.title,
      body: row.body,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    })
  );
}

function serializeJournalRow(entry, userId) {
  return {
    id: entry.id,
    user_id: userId,
    title: entry.title ?? "",
    body: entry.body,
    created_at: entry.createdAt,
    updated_at: entry.updatedAt
  };
}

export async function loadJournalEntriesForSession(accessToken, userId) {
  const rows = await fetchSupabase(
    `/rest/v1/journal_entries?user_id=eq.${userId}&select=id,title,body,created_at,updated_at&order=updated_at.desc&order=created_at.desc`,
    accessToken
  );

  return parseJournalRows(rows);
}

export async function saveJournalEntriesForSession(accessToken, userId, entries) {
  const normalized = Array.isArray(entries) ? entries.map(normalizeJournalEntry) : [];
  const existingRows = await fetchSupabase(`/rest/v1/journal_entries?user_id=eq.${userId}&select=id`, accessToken);
  const existingIds = new Set((Array.isArray(existingRows) ? existingRows : []).map((row) => row.id));
  const nextIds = new Set(normalized.map((entry) => entry.id));
  const idsToDelete = [...existingIds].filter((id) => !nextIds.has(id));

  if (normalized.length > 0) {
    await fetchSupabase("/rest/v1/journal_entries?on_conflict=id", accessToken, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates, return=representation"
      },
      body: JSON.stringify(normalized.map((entry) => serializeJournalRow(entry, userId)))
    });
  }

  if (idsToDelete.length > 0) {
    await fetchSupabase(`/rest/v1/journal_entries?id=in.(${idsToDelete.join(",")})`, accessToken, {
      method: "DELETE"
    });
  }

  return loadJournalEntriesForSession(accessToken, userId);
}
