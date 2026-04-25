import { normalizeTimelineLane } from "./timeline.js";

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

function normalizeTimelineBlock(block) {
  return {
    id: String(block.id ?? ""),
    title: String(block.title ?? "").trim(),
    lane: normalizeTimelineLane(block.lane ?? block.lane_key),
    startMonth: String(block.startMonth ?? block.start_month ?? "").slice(0, 10),
    endMonth: String(block.endMonth ?? block.end_month ?? "").slice(0, 10),
    createdAt: block.createdAt ?? block.created_at ?? null,
    updatedAt: block.updatedAt ?? block.updated_at ?? null
  };
}

function parseTimelineRows(rows) {
  return (Array.isArray(rows) ? rows : []).map((row) =>
    normalizeTimelineBlock({
      id: row.id,
      title: row.title,
      lane: row.lane_key,
      startMonth: row.start_month,
      endMonth: row.end_month,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    })
  );
}

function serializeTimelineRow(block, userId) {
  return {
    id: block.id,
    user_id: userId,
    title: block.title,
    lane_key: normalizeTimelineLane(block.lane),
    start_month: block.startMonth,
    end_month: block.endMonth,
    created_at: block.createdAt,
    updated_at: block.updatedAt
  };
}

export async function loadTimelineBlocksForSession(accessToken, userId) {
  const rows = await fetchSupabase(
    `/rest/v1/timeline_blocks?user_id=eq.${userId}&select=id,title,lane_key,start_month,end_month,created_at,updated_at&order=start_month.asc&order=created_at.asc`,
    accessToken
  );

  return parseTimelineRows(rows);
}

export async function saveTimelineBlocksForSession(accessToken, userId, blocks) {
  const normalized = Array.isArray(blocks) ? blocks.map(normalizeTimelineBlock) : [];
  const existingRows = await fetchSupabase(`/rest/v1/timeline_blocks?user_id=eq.${userId}&select=id`, accessToken);
  const existingIds = new Set((Array.isArray(existingRows) ? existingRows : []).map((row) => row.id));
  const nextIds = new Set(normalized.map((item) => item.id));
  const idsToDelete = [...existingIds].filter((id) => !nextIds.has(id));

  if (normalized.length > 0) {
    await fetchSupabase("/rest/v1/timeline_blocks?on_conflict=id", accessToken, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates, return=representation"
      },
      body: JSON.stringify(normalized.map((item) => serializeTimelineRow(item, userId)))
    });
  }

  if (idsToDelete.length > 0) {
    await fetchSupabase(`/rest/v1/timeline_blocks?id=in.(${idsToDelete.join(",")})`, accessToken, {
      method: "DELETE"
    });
  }

  return loadTimelineBlocksForSession(accessToken, userId);
}
