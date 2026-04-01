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

function normalizeLearningItem(item) {
  return {
    id: String(item.id ?? ""),
    slug: String(item.slug ?? item.id ?? ""),
    title: String(item.title ?? "").trim(),
    itemType: String(item.itemType ?? item.item_type ?? "learning"),
    priority: Number(item.priority ?? 3),
    status: String(item.status ?? "idea"),
    notes: String(item.notes ?? "").trim(),
    createdAt: item.createdAt ?? item.created_at ?? null,
    updatedAt: item.updatedAt ?? item.updated_at ?? null
  };
}

function parseLearningRows(rows) {
  return rows.map((row) =>
    normalizeLearningItem({
      id: row.id,
      slug: row.slug,
      title: row.title,
      itemType: row.item_type,
      priority: row.priority,
      status: row.status,
      notes: row.notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    })
  );
}

function serializeLearningRow(item, userId) {
  return {
    id: item.id,
    user_id: userId,
    slug: item.slug ?? item.id,
    title: item.title,
    item_type: item.itemType,
    priority: Number(item.priority ?? 3),
    status: item.status,
    notes: item.notes ?? ""
  };
}

export async function loadLearningsForSession(accessToken, userId) {
  const rows = await fetchSupabase(
    `/rest/v1/learning_items?user_id=eq.${userId}&select=id,slug,title,item_type,priority,status,notes,created_at,updated_at&order=created_at.asc`,
    accessToken
  );

  return parseLearningRows(Array.isArray(rows) ? rows : []);
}

export async function saveLearningsForSession(accessToken, userId, items) {
  const normalized = Array.isArray(items) ? items.map(normalizeLearningItem) : [];

  const existingRows = await fetchSupabase(
    `/rest/v1/learning_items?user_id=eq.${userId}&select=id`,
    accessToken
  );
  const existingIds = new Set((Array.isArray(existingRows) ? existingRows : []).map((row) => row.id));
  const nextIds = new Set(normalized.map((item) => item.id));
  const idsToDelete = [...existingIds].filter((id) => !nextIds.has(id));

  if (normalized.length > 0) {
    await fetchSupabase("/rest/v1/learning_items?on_conflict=id", accessToken, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates, return=representation"
      },
      body: JSON.stringify(normalized.map((item) => serializeLearningRow(item, userId)))
    });
  }

  if (idsToDelete.length > 0) {
    await fetchSupabase(`/rest/v1/learning_items?id=in.(${idsToDelete.join(",")})`, accessToken, {
      method: "DELETE"
    });
  }

  return loadLearningsForSession(accessToken, userId);
}
