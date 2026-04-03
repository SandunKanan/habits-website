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

function normalizeDomain(domain) {
  return {
    id: String(domain.id ?? ""),
    slug: String(domain.slug ?? domain.id ?? ""),
    name: String(domain.name ?? "").trim(),
    parentId: domain.parentId ?? domain.parent_id ?? "",
    notes: String(domain.notes ?? "").trim(),
    sortOrder: Number(domain.sortOrder ?? domain.sort_order ?? 0),
    createdAt: domain.createdAt ?? domain.created_at ?? null,
    updatedAt: domain.updatedAt ?? domain.updated_at ?? null
  };
}

function parseDomainRows(rows) {
  return (Array.isArray(rows) ? rows : []).map((row) =>
    normalizeDomain({
      id: row.id,
      slug: row.slug,
      name: row.name,
      parentId: row.parent_id,
      notes: row.notes,
      sortOrder: row.sort_order,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    })
  );
}

function serializeDomainRow(domain, userId) {
  return {
    id: domain.id,
    user_id: userId,
    slug: domain.slug ?? domain.id,
    name: domain.name,
    parent_id: domain.parentId || null,
    notes: domain.notes ?? "",
    sort_order: Number(domain.sortOrder ?? 0)
  };
}

export async function loadDomainsForSession(accessToken, userId) {
  const rows = await fetchSupabase(
    `/rest/v1/domains?user_id=eq.${userId}&select=id,slug,name,parent_id,notes,sort_order,created_at,updated_at&order=sort_order.asc&order=created_at.asc`,
    accessToken
  );

  return parseDomainRows(rows);
}

export async function saveDomainsForSession(accessToken, userId, domains) {
  const normalized = Array.isArray(domains) ? domains.map(normalizeDomain) : [];
  const existingRows = await fetchSupabase(`/rest/v1/domains?user_id=eq.${userId}&select=id`, accessToken);
  const existingIds = new Set((Array.isArray(existingRows) ? existingRows : []).map((row) => row.id));
  const nextIds = new Set(normalized.map((domain) => domain.id));
  const idsToDelete = [...existingIds].filter((id) => !nextIds.has(id));

  if (normalized.length > 0) {
    await fetchSupabase("/rest/v1/domains?on_conflict=id", accessToken, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates, return=representation"
      },
      body: JSON.stringify(normalized.map((domain) => serializeDomainRow(domain, userId)))
    });
  }

  if (idsToDelete.length > 0) {
    await fetchSupabase(`/rest/v1/domains?id=in.(${idsToDelete.join(",")})`, accessToken, {
      method: "DELETE"
    });
  }

  return loadDomainsForSession(accessToken, userId);
}
