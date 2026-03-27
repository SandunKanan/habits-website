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

function normalizeVision(vision) {
  return {
    userId: String(vision.userId ?? vision.user_id ?? ""),
    idealSelf: String(vision.idealSelf ?? vision.ideal_self ?? "").trim(),
    idealLife: String(vision.idealLife ?? vision.ideal_life ?? "").trim(),
    currentFocus: String(vision.currentFocus ?? vision.current_season ?? "").trim(),
    focusIntention: String(vision.focusIntention ?? vision.season_intention ?? "").trim(),
    focusViewEnabled: Boolean(vision.focusViewEnabled ?? vision.focus_view_enabled ?? true),
    focusAttributeIds: Array.isArray(vision.focusAttributeIds ?? vision.focus_attribute_ids)
      ? [...new Set((vision.focusAttributeIds ?? vision.focus_attribute_ids).map(String))]
      : [],
    createdAt: vision.createdAt ?? vision.created_at ?? null,
    updatedAt: vision.updatedAt ?? vision.updated_at ?? null
  };
}

function buildEmptyVision(userId) {
  return normalizeVision({
    userId,
    idealSelf: "",
    idealLife: "",
    currentFocus: "",
    focusIntention: "",
    focusViewEnabled: true,
    focusAttributeIds: [],
    createdAt: null,
    updatedAt: null
  });
}

function serializeVisionRow(vision, userId) {
  return {
    user_id: userId,
    ideal_self: vision.idealSelf,
    ideal_life: vision.idealLife,
    current_season: vision.currentFocus,
    season_intention: vision.focusIntention,
    focus_view_enabled: vision.focusViewEnabled
  };
}

export async function loadVisionForSession(accessToken, userId) {
  const [rows, focusRows] = await Promise.all([
    fetchSupabase(
    `/rest/v1/visions?user_id=eq.${userId}&select=user_id,ideal_self,ideal_life,current_season,season_intention,focus_view_enabled,created_at,updated_at&limit=1`,
    accessToken
    ),
    fetchSupabase(
      `/rest/v1/vision_focus_attributes?user_id=eq.${userId}&select=attribute_id`,
      accessToken
    )
  ]);

  if (!Array.isArray(rows) || rows.length === 0) {
    return buildEmptyVision(userId);
  }

  return normalizeVision({
    ...rows[0],
    focusAttributeIds: Array.isArray(focusRows) ? focusRows.map((row) => row.attribute_id) : []
  });
}

export async function saveVisionForSession(accessToken, userId, vision) {
  const normalized = normalizeVision(vision);

  await fetchSupabase("/rest/v1/visions?on_conflict=user_id", accessToken, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates, return=representation"
    },
    body: JSON.stringify([serializeVisionRow(normalized, userId)])
  });

  const existingFocusRows = await fetchSupabase(
    `/rest/v1/vision_focus_attributes?user_id=eq.${userId}&select=id,attribute_id`,
    accessToken
  );
  const existingByAttributeId = new Map(
    (Array.isArray(existingFocusRows) ? existingFocusRows : []).map((row) => [row.attribute_id, row])
  );
  const nextAttributeIds = new Set(normalized.focusAttributeIds);
  const idsToDelete = (Array.isArray(existingFocusRows) ? existingFocusRows : [])
    .filter((row) => !nextAttributeIds.has(row.attribute_id))
    .map((row) => row.id);
  const rowsToInsert = normalized.focusAttributeIds
    .filter((attributeId) => !existingByAttributeId.has(attributeId))
    .map((attributeId) => ({
      user_id: userId,
      attribute_id: attributeId
    }));

  if (idsToDelete.length > 0) {
    await fetchSupabase(`/rest/v1/vision_focus_attributes?id=in.(${idsToDelete.join(",")})`, accessToken, {
      method: "DELETE"
    });
  }

  if (rowsToInsert.length > 0) {
    await fetchSupabase("/rest/v1/vision_focus_attributes", accessToken, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates, return=representation"
      },
      body: JSON.stringify(rowsToInsert)
    });
  }

  return loadVisionForSession(accessToken, userId);
}
