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

function normalizeAttribute(attribute) {
  return {
    id: String(attribute.id ?? ""),
    slug: String(attribute.slug ?? attribute.id ?? ""),
    name: String(attribute.name ?? "").trim(),
    createdAt: attribute.createdAt ?? attribute.created_at ?? null,
    updatedAt: attribute.updatedAt ?? attribute.updated_at ?? null
  };
}

function parseAttributeRows(rows) {
  return rows.map((row) =>
    normalizeAttribute({
      id: row.id,
      slug: row.slug,
      name: row.name,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    })
  );
}

function serializeAttributeRow(attribute, userId) {
  return {
    id: attribute.id,
    user_id: userId,
    slug: attribute.slug ?? attribute.id,
    name: attribute.name
  };
}

export async function loadAttributesForSession(accessToken, userId) {
  const rows = await fetchSupabase(
    `/rest/v1/attributes?user_id=eq.${userId}&select=id,slug,name,created_at,updated_at&order=created_at.asc`,
    accessToken
  );

  return parseAttributeRows(Array.isArray(rows) ? rows : []);
}

export async function saveAttributesForSession(accessToken, userId, attributes) {
  const normalized = Array.isArray(attributes) ? attributes.map(normalizeAttribute) : [];

  const existingRows = await fetchSupabase(
    `/rest/v1/attributes?user_id=eq.${userId}&select=id`,
    accessToken
  );
  const existingIds = new Set((Array.isArray(existingRows) ? existingRows : []).map((row) => row.id));
  const nextIds = new Set(normalized.map((attribute) => attribute.id));
  const idsToDelete = [...existingIds].filter((id) => !nextIds.has(id));

  if (normalized.length > 0) {
    await fetchSupabase("/rest/v1/attributes?on_conflict=id", accessToken, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates, return=representation"
      },
      body: JSON.stringify(normalized.map((attribute) => serializeAttributeRow(attribute, userId)))
    });
  }

  if (idsToDelete.length > 0) {
    await fetchSupabase(`/rest/v1/attributes?id=in.(${idsToDelete.join(",")})`, accessToken, {
      method: "DELETE"
    });
  }

  return loadAttributesForSession(accessToken, userId);
}
