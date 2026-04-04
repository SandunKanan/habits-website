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

function normalizeField(field) {
  const inputType = field.inputType === "number" ? "number" : "text";
  return {
    id: String(field.id ?? field.key ?? ""),
    key: String(field.key ?? "").trim(),
    label: String(field.label ?? "").trim(),
    inputType,
    unit: inputType === "number" ? String(field.unit ?? "").trim() : ""
  };
}

function normalizeMetric(metric) {
  return {
    id: String(metric.id ?? ""),
    slug: String(metric.slug ?? metric.id ?? ""),
    name: String(metric.name ?? "").trim(),
    unit: String(metric.unit ?? "").trim(),
    targetValue:
      metric.targetValue === null || metric.targetValue === undefined || metric.target_value === null
        ? null
        : Number(metric.targetValue ?? metric.target_value),
    mode: metric.mode ?? metric.entry_mode ?? "single_value",
    fields: Array.isArray(metric.fields ?? metric.fields_json)
      ? (metric.fields ?? metric.fields_json).map(normalizeField).filter((field) => field.key && field.label)
      : [],
    createdAt: metric.createdAt ?? metric.created_at ?? null,
    updatedAt: metric.updatedAt ?? metric.updated_at ?? null
  };
}

function normalizeEntry(entry) {
  const rawValue = entry.value;
  const normalizedValue = rawValue === null || rawValue === undefined || rawValue === "" ? null : Number(rawValue);
  return {
    id: String(entry.id ?? ""),
    metricId: String(entry.metricId ?? entry.metric_id ?? ""),
    entryDate: String(entry.entryDate ?? entry.entry_date ?? "").slice(0, 10),
    value: Number.isFinite(normalizedValue) ? normalizedValue : null,
    valueJson:
      entry.valueJson && typeof entry.valueJson === "object"
        ? entry.valueJson
        : entry.value_json && typeof entry.value_json === "object"
          ? entry.value_json
          : Number.isFinite(normalizedValue)
            ? { value: normalizedValue }
            : {},
    createdAt: entry.createdAt ?? entry.created_at ?? null,
    updatedAt: entry.updatedAt ?? entry.updated_at ?? null
  };
}

function parseMetricRows(rows) {
  return (Array.isArray(rows) ? rows : []).map((row) =>
    normalizeMetric({
      id: row.id,
      slug: row.slug,
      name: row.name,
      unit: row.unit,
      targetValue: row.target_value,
      mode: row.entry_mode,
      fields: row.fields_json,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    })
  );
}

function parseEntryRows(rows) {
  return (Array.isArray(rows) ? rows : []).map((row) =>
    normalizeEntry({
      id: row.id,
      metricId: row.metric_id,
      entryDate: row.entry_date,
      value: row.value,
      valueJson: row.value_json,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    })
  );
}

function serializeMetricRow(metric, userId) {
  return {
    id: metric.id,
    user_id: userId,
    slug: metric.slug ?? metric.id,
    name: metric.name,
    unit: metric.unit,
    target_value:
      metric.targetValue === null || metric.targetValue === undefined || metric.targetValue === ""
        ? null
        : Number(metric.targetValue),
    entry_mode: metric.mode ?? "single_value",
    fields_json: Array.isArray(metric.fields) ? metric.fields : []
  };
}

function serializeEntryRow(entry, userId) {
  const value = entry.value === null || entry.value === undefined || entry.value === "" ? null : Number(entry.value);

  return {
    id: entry.id,
    user_id: userId,
    metric_id: entry.metricId,
    entry_date: entry.entryDate,
    value: Number.isFinite(value) ? value : null,
    value_json: entry.valueJson && typeof entry.valueJson === "object" ? entry.valueJson : {}
  };
}

export async function loadTrackingForSession(accessToken, userId) {
  const [metricRows, entryRows] = await Promise.all([
    fetchSupabase(
      `/rest/v1/track_metrics?user_id=eq.${userId}&select=id,slug,name,unit,target_value,entry_mode,fields_json,created_at,updated_at&order=created_at.asc`,
      accessToken
    ),
    fetchSupabase(
      `/rest/v1/track_metric_entries?user_id=eq.${userId}&select=id,metric_id,entry_date,value,value_json,created_at,updated_at&order=entry_date.desc&order=created_at.desc`,
      accessToken
    )
  ]);

  return {
    metrics: parseMetricRows(metricRows),
    entries: parseEntryRows(entryRows)
  };
}

export async function saveTrackingMetricsForSession(accessToken, userId, metrics) {
  const normalized = Array.isArray(metrics) ? metrics.map(normalizeMetric) : [];
  const existingRows = await fetchSupabase(
    `/rest/v1/track_metrics?user_id=eq.${userId}&select=id`,
    accessToken
  );
  const existingIds = new Set((Array.isArray(existingRows) ? existingRows : []).map((row) => row.id));
  const nextIds = new Set(normalized.map((item) => item.id));
  const idsToDelete = [...existingIds].filter((id) => !nextIds.has(id));

  if (normalized.length > 0) {
    await fetchSupabase("/rest/v1/track_metrics?on_conflict=id", accessToken, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates, return=representation"
      },
      body: JSON.stringify(normalized.map((item) => serializeMetricRow(item, userId)))
    });
  }

  if (idsToDelete.length > 0) {
    await fetchSupabase(`/rest/v1/track_metrics?id=in.(${idsToDelete.join(",")})`, accessToken, {
      method: "DELETE"
    });
  }

  const metricRows = await fetchSupabase(
    `/rest/v1/track_metrics?user_id=eq.${userId}&select=id,slug,name,unit,target_value,entry_mode,fields_json,created_at,updated_at&order=created_at.asc`,
    accessToken
  );

  return parseMetricRows(metricRows);
}

export async function saveTrackingEntriesForSession(accessToken, userId, entries) {
  const normalized = Array.isArray(entries) ? entries.map(normalizeEntry) : [];
  const existingRows = await fetchSupabase(
    `/rest/v1/track_metric_entries?user_id=eq.${userId}&select=id`,
    accessToken
  );
  const existingIds = new Set((Array.isArray(existingRows) ? existingRows : []).map((row) => row.id));
  const nextIds = new Set(normalized.map((item) => item.id));
  const idsToDelete = [...existingIds].filter((id) => !nextIds.has(id));

  if (normalized.length > 0) {
    await fetchSupabase("/rest/v1/track_metric_entries?on_conflict=id", accessToken, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates, return=representation"
      },
      body: JSON.stringify(normalized.map((item) => serializeEntryRow(item, userId)))
    });
  }

  if (idsToDelete.length > 0) {
    await fetchSupabase(`/rest/v1/track_metric_entries?id=in.(${idsToDelete.join(",")})`, accessToken, {
      method: "DELETE"
    });
  }

  const entryRows = await fetchSupabase(
    `/rest/v1/track_metric_entries?user_id=eq.${userId}&select=id,metric_id,entry_date,value,value_json,created_at,updated_at&order=entry_date.desc&order=created_at.desc`,
    accessToken
  );

  return parseEntryRows(entryRows);
}
