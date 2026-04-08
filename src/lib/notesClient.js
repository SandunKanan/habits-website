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

function normalizeNote(note) {
  const rawTags = Array.isArray(note.tags ?? note.tags_json) ? note.tags ?? note.tags_json : [];
  const rawBulletItems = Array.isArray(note.bulletItems ?? note.bullet_items_json)
    ? note.bulletItems ?? note.bullet_items_json
    : [];
  return {
    id: String(note.id ?? ""),
    title: String(note.title ?? "").trim(),
    mode: note.mode === "bullet_list" ? "bullet_list" : "text",
    body: String(note.body ?? note.content ?? ""),
    bulletItems: rawBulletItems.map((item) => String(item ?? "").trim()).filter(Boolean),
    tags: rawTags
      .map((tag) => String(tag ?? "").trim())
      .filter(Boolean)
      .filter((tag, index, collection) => collection.indexOf(tag) === index),
    archivedAt: note.archivedAt ?? note.archived_at ?? null,
    createdAt: note.createdAt ?? note.created_at ?? null,
    updatedAt: note.updatedAt ?? note.updated_at ?? null
  };
}

function parseNoteRows(rows) {
  return (Array.isArray(rows) ? rows : []).map((row) =>
    normalizeNote({
      id: row.id,
      title: row.title,
      mode: row.mode,
      body: row.body,
      bulletItems: row.bullet_items_json,
      tags: row.tags_json,
      archivedAt: row.archived_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    })
  );
}

function serializeNoteRow(note, userId) {
  return {
    id: note.id,
    user_id: userId,
    title: note.title,
    mode: note.mode === "bullet_list" ? "bullet_list" : "text",
    body: note.body,
    bullet_items_json: Array.isArray(note.bulletItems) ? note.bulletItems : [],
    tags_json: Array.isArray(note.tags) ? note.tags : [],
    archived_at: note.archivedAt,
    created_at: note.createdAt,
    updated_at: note.updatedAt
  };
}

export async function loadNotesForSession(accessToken, userId) {
  const rows = await fetchSupabase(
    `/rest/v1/notes?user_id=eq.${userId}&select=id,title,mode,body,bullet_items_json,tags_json,archived_at,created_at,updated_at&order=updated_at.desc&order=created_at.desc`,
    accessToken
  );

  return parseNoteRows(rows);
}

export async function saveNotesForSession(accessToken, userId, notes) {
  const normalized = Array.isArray(notes) ? notes.map(normalizeNote) : [];
  const existingRows = await fetchSupabase(`/rest/v1/notes?user_id=eq.${userId}&select=id`, accessToken);
  const existingIds = new Set((Array.isArray(existingRows) ? existingRows : []).map((row) => row.id));
  const nextIds = new Set(normalized.map((item) => item.id));
  const idsToDelete = [...existingIds].filter((id) => !nextIds.has(id));

  if (normalized.length > 0) {
    await fetchSupabase("/rest/v1/notes?on_conflict=id", accessToken, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates, return=representation"
      },
      body: JSON.stringify(normalized.map((item) => serializeNoteRow(item, userId)))
    });
  }

  if (idsToDelete.length > 0) {
    await fetchSupabase(`/rest/v1/notes?id=in.(${idsToDelete.join(",")})`, accessToken, {
      method: "DELETE"
    });
  }

  return loadNotesForSession(accessToken, userId);
}
