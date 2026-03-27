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
    currentSeason: String(vision.currentSeason ?? vision.current_season ?? "").trim(),
    seasonIntention: String(vision.seasonIntention ?? vision.season_intention ?? "").trim(),
    createdAt: vision.createdAt ?? vision.created_at ?? null,
    updatedAt: vision.updatedAt ?? vision.updated_at ?? null
  };
}

function buildEmptyVision(userId) {
  return normalizeVision({
    userId,
    idealSelf: "",
    idealLife: "",
    currentSeason: "",
    seasonIntention: "",
    createdAt: null,
    updatedAt: null
  });
}

function serializeVisionRow(vision, userId) {
  return {
    user_id: userId,
    ideal_self: vision.idealSelf,
    ideal_life: vision.idealLife,
    current_season: vision.currentSeason,
    season_intention: vision.seasonIntention
  };
}

export async function loadVisionForSession(accessToken, userId) {
  const rows = await fetchSupabase(
    `/rest/v1/visions?user_id=eq.${userId}&select=user_id,ideal_self,ideal_life,current_season,season_intention,created_at,updated_at&limit=1`,
    accessToken
  );

  if (!Array.isArray(rows) || rows.length === 0) {
    return buildEmptyVision(userId);
  }

  return normalizeVision(rows[0]);
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

  return loadVisionForSession(accessToken, userId);
}
