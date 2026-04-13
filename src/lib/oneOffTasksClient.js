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

function normalizeAttributeLinks(attributeLinks) {
  return Array.isArray(attributeLinks)
    ? attributeLinks
        .map((link) => ({
          attributeId: String(link.attributeId ?? link.attribute_id ?? ""),
          weight: Number(link.weight)
        }))
        .filter((link) => link.attributeId && Number.isFinite(link.weight) && link.weight > 0)
    : [];
}

function normalizeOneOffTask(task) {
  const completedOn = String(task.completedOn ?? task.completed_on ?? "").slice(0, 10);
  const scheduledFor = String(task.scheduledFor ?? task.scheduled_for ?? completedOn ?? "").slice(0, 10);

  return {
    id: String(task.id ?? ""),
    title: String(task.title ?? "").trim(),
    scheduledFor,
    completedOn,
    attributeLinks: normalizeAttributeLinks(task.attributeLinks ?? task.attribute_links_json),
    createdAt: task.createdAt ?? task.created_at ?? null,
    updatedAt: task.updatedAt ?? task.updated_at ?? null
  };
}

function parseTaskRows(rows) {
  return rows.map((row) =>
    normalizeOneOffTask({
      id: row.id,
      title: row.title,
      scheduledFor: row.scheduled_for,
      completedOn: row.completed_on,
      attributeLinks: row.attribute_links_json,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    })
  );
}

function serializeTaskRow(task, userId) {
  return {
    id: task.id,
    user_id: userId,
    title: task.title,
    scheduled_for: task.scheduledFor || null,
    completed_on: task.completedOn,
    attribute_links_json: Array.isArray(task.attributeLinks) ? task.attributeLinks : []
  };
}

export async function loadOneOffTasksForSession(accessToken, userId) {
  const rows = await fetchSupabase(
    `/rest/v1/one_off_tasks?user_id=eq.${userId}&select=id,title,scheduled_for,completed_on,attribute_links_json,created_at,updated_at&order=created_at.desc`,
    accessToken
  );

  return parseTaskRows(Array.isArray(rows) ? rows : []).sort((a, b) => {
    const aAnchor = a.scheduledFor || a.completedOn || "";
    const bAnchor = b.scheduledFor || b.completedOn || "";
    return bAnchor.localeCompare(aAnchor) || String(b.createdAt ?? "").localeCompare(String(a.createdAt ?? ""));
  });
}

export async function saveOneOffTasksForSession(accessToken, userId, tasks) {
  const normalized = Array.isArray(tasks) ? tasks.map(normalizeOneOffTask) : [];

  const existingRows = await fetchSupabase(`/rest/v1/one_off_tasks?user_id=eq.${userId}&select=id`, accessToken);
  const existingIds = new Set((Array.isArray(existingRows) ? existingRows : []).map((row) => row.id));
  const nextIds = new Set(normalized.map((task) => task.id));
  const idsToDelete = [...existingIds].filter((id) => !nextIds.has(id));

  if (normalized.length > 0) {
    await fetchSupabase("/rest/v1/one_off_tasks?on_conflict=id", accessToken, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates, return=representation"
      },
      body: JSON.stringify(normalized.map((task) => serializeTaskRow(task, userId)))
    });
  }

  if (idsToDelete.length > 0) {
    await fetchSupabase(`/rest/v1/one_off_tasks?id=in.(${idsToDelete.join(",")})`, accessToken, {
      method: "DELETE"
    });
  }

  return loadOneOffTasksForSession(accessToken, userId);
}
