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

function normalizeSettings(settings) {
  return {
    userId: String(settings.userId ?? settings.user_id ?? ""),
    highlightFocusAttributes: Boolean(
      settings.highlightFocusAttributes ?? settings.highlight_focus_attributes ?? true
    ),
    useAttributeDecay: Boolean(settings.useAttributeDecay ?? settings.use_attribute_decay ?? true),
    useDecimalDomainScores: Boolean(
      settings.useDecimalDomainScores ?? settings.use_decimal_domain_scores ?? false
    ),
    createdAt: settings.createdAt ?? settings.created_at ?? null,
    updatedAt: settings.updatedAt ?? settings.updated_at ?? null
  };
}

function buildEmptySettings(userId) {
  return normalizeSettings({
    userId,
    highlightFocusAttributes: true,
    useAttributeDecay: true,
    useDecimalDomainScores: false,
    createdAt: null,
    updatedAt: null
  });
}

function serializeSettingsRow(settings, userId) {
  return {
    user_id: userId,
    highlight_focus_attributes: settings.highlightFocusAttributes,
    use_attribute_decay: settings.useAttributeDecay,
    use_decimal_domain_scores: settings.useDecimalDomainScores
  };
}

export async function loadSettingsForSession(accessToken, userId) {
  const rows = await fetchSupabase(
    `/rest/v1/user_settings?user_id=eq.${userId}&select=user_id,highlight_focus_attributes,use_attribute_decay,use_decimal_domain_scores,created_at,updated_at&limit=1`,
    accessToken
  );

  if (!Array.isArray(rows) || rows.length === 0) {
    return buildEmptySettings(userId);
  }

  return normalizeSettings(rows[0]);
}

export async function saveSettingsForSession(accessToken, userId, settings) {
  const normalized = normalizeSettings(settings);

  await fetchSupabase("/rest/v1/user_settings?on_conflict=user_id", accessToken, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates, return=representation"
    },
    body: JSON.stringify([serializeSettingsRow(normalized, userId)])
  });

  return loadSettingsForSession(accessToken, userId);
}
