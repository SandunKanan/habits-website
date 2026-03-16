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

export async function loadUserRole(accessToken, userId) {
  const config = getConfig();
  if (!config || !accessToken || !userId) {
    return { isAdmin: false };
  }

  const res = await fetch(
    `${config.url}/rest/v1/user_roles?user_id=eq.${userId}&select=is_admin&limit=1`,
    {
      headers: {
        apikey: config.publishableKey,
        Authorization: `Bearer ${accessToken}`
      }
    }
  );

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to load user role (${res.status}): ${errorText}`);
  }

  const rows = await res.json();
  return {
    isAdmin: Boolean(rows?.[0]?.is_admin)
  };
}
