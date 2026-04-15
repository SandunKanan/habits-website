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

function normalizeItems(items) {
  return (Array.isArray(items) ? items : [])
    .map((item) => ({
      id: String(item?.id ?? ""),
      text: String(item?.text ?? "").trim(),
      completedAt: item?.completedAt ?? item?.completed_at ?? null,
      createdAt: item?.createdAt ?? item?.created_at ?? null
    }))
    .filter((item) => item.id && item.text);
}

function normalizeList(list) {
  return {
    id: String(list.id ?? ""),
    title: String(list.title ?? "").trim(),
    description: String(list.description ?? "").trim(),
    items: normalizeItems(list.items ?? list.items_json),
    createdAt: list.createdAt ?? list.created_at ?? null,
    updatedAt: list.updatedAt ?? list.updated_at ?? null
  };
}

function parseListRows(rows) {
  return (Array.isArray(rows) ? rows : []).map((row) =>
    normalizeList({
      id: row.id,
      title: row.title,
      description: row.description,
      items: row.items_json,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    })
  );
}

function serializeListRow(list, userId) {
  return {
    id: list.id,
    user_id: userId,
    title: list.title,
    description: list.description,
    items_json: Array.isArray(list.items) ? list.items : [],
    created_at: list.createdAt,
    updated_at: list.updatedAt
  };
}

export async function loadListsForSession(accessToken, userId) {
  const rows = await fetchSupabase(
    `/rest/v1/lists?user_id=eq.${userId}&select=id,title,description,items_json,created_at,updated_at&order=updated_at.desc&order=created_at.desc`,
    accessToken
  );

  return parseListRows(rows);
}

export async function saveListsForSession(accessToken, userId, lists) {
  const normalized = Array.isArray(lists) ? lists.map(normalizeList) : [];
  const existingRows = await fetchSupabase(`/rest/v1/lists?user_id=eq.${userId}&select=id`, accessToken);
  const existingIds = new Set((Array.isArray(existingRows) ? existingRows : []).map((row) => row.id));
  const nextIds = new Set(normalized.map((item) => item.id));
  const idsToDelete = [...existingIds].filter((id) => !nextIds.has(id));

  if (normalized.length > 0) {
    await fetchSupabase("/rest/v1/lists?on_conflict=id", accessToken, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates, return=representation"
      },
      body: JSON.stringify(normalized.map((item) => serializeListRow(item, userId)))
    });
  }

  if (idsToDelete.length > 0) {
    await fetchSupabase(`/rest/v1/lists?id=in.(${idsToDelete.join(",")})`, accessToken, {
      method: "DELETE"
    });
  }

  return loadListsForSession(accessToken, userId);
}
