function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    return null;
  }

  return {
    url: url.replace(/\/$/, ""),
    serviceRoleKey
  };
}

export function isServerAuthEnabled() {
  return Boolean(getSupabaseConfig());
}

export async function getAuthenticatedUserFromAccessToken(accessToken) {
  const config = getSupabaseConfig();
  if (!config) {
    return null;
  }

  if (!accessToken) {
    return { error: "Missing access token." };
  }

  const res = await fetch(`${config.url}/auth/v1/user`, {
    headers: {
      apikey: config.serviceRoleKey,
      Authorization: `Bearer ${accessToken}`
    }
  });

  if (!res.ok) {
    return { error: "Invalid session." };
  }

  const user = await res.json();
  return { user };
}
