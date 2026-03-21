const AUTH_STORAGE_KEY = "habits-auth-session";

function getAuthConfig() {
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

function readStoredSession() {
  const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    return null;
  }
}

function writeStoredSession(session) {
  if (!session) {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    return;
  }

  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
}

function normalizeSessionPayload(payload) {
  if (!payload?.access_token || !payload?.refresh_token) {
    return null;
  }

  return {
    access_token: payload.access_token,
    refresh_token: payload.refresh_token,
    token_type: payload.token_type ?? "bearer",
    expires_at: payload.expires_at ?? Math.floor(Date.now() / 1000) + (payload.expires_in ?? 3600),
    user: payload.user ?? null
  };
}

async function fetchAuth(pathname, { method = "GET", accessToken, body } = {}) {
  const config = getAuthConfig();
  if (!config) {
    throw new Error("Supabase auth is not configured.");
  }

  const res = await fetch(`${config.url}${pathname}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      apikey: config.publishableKey,
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
    },
    ...(body ? { body: JSON.stringify(body) } : {})
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = data?.msg || data?.error_description || data?.message || "Auth request failed.";
    throw new Error(message);
  }

  return data;
}

export function isAuthEnabled() {
  return Boolean(getAuthConfig());
}

export function getDemoCredentials() {
  const email = import.meta.env.VITE_DEMO_EMAIL;
  const password = import.meta.env.VITE_DEMO_PASSWORD;

  if (!email || !password) {
    return null;
  }

  return { email, password };
}

export async function getUserForSession(accessToken) {
  return fetchAuth("/auth/v1/user", { accessToken });
}

export async function refreshStoredSession(refreshToken) {
  const data = await fetchAuth("/auth/v1/token?grant_type=refresh_token", {
    method: "POST",
    body: { refresh_token: refreshToken }
  });

  const session = normalizeSessionPayload(data);
  writeStoredSession(session);
  return session;
}

export async function initializeAuth() {
  if (!isAuthEnabled()) {
    return { session: null, user: null };
  }

  const storedSession = readStoredSession();
  if (!storedSession) {
    return { session: null, user: null };
  }

  let session = storedSession;
  const expiresSoon = (session.expires_at ?? 0) <= Math.floor(Date.now() / 1000) + 30;

  try {
    if (expiresSoon) {
      session = await refreshStoredSession(session.refresh_token);
    }

    const user = await getUserForSession(session.access_token);
    const nextSession = { ...session, user };
    writeStoredSession(nextSession);
    return { session: nextSession, user };
  } catch {
    if (storedSession.refresh_token) {
      try {
        const refreshed = await refreshStoredSession(storedSession.refresh_token);
        const user = await getUserForSession(refreshed.access_token);
        const nextSession = { ...refreshed, user };
        writeStoredSession(nextSession);
        return { session: nextSession, user };
      } catch {
        writeStoredSession(null);
        return { session: null, user: null };
      }
    }

    writeStoredSession(null);
    return { session: null, user: null };
  }
}

export async function signInWithPassword({ email, password }) {
  const data = await fetchAuth("/auth/v1/token?grant_type=password", {
    method: "POST",
    body: { email, password }
  });

  const session = normalizeSessionPayload(data);
  if (!session) {
    throw new Error("Could not create a session.");
  }

  const nextSession = { ...session, user: data.user ?? null };
  writeStoredSession(nextSession);
  return { session: nextSession, user: nextSession.user };
}

export async function signUpWithPassword({ email, password }) {
  const data = await fetchAuth("/auth/v1/signup", {
    method: "POST",
    body: { email, password }
  });

  const session = normalizeSessionPayload(data);
  if (!session) {
    return {
      session: null,
      user: data.user ?? null,
      requiresEmailConfirmation: true
    };
  }

  const nextSession = { ...session, user: data.user ?? null };
  writeStoredSession(nextSession);
  return {
    session: nextSession,
    user: nextSession.user,
    requiresEmailConfirmation: false
  };
}

export async function signOutCurrentSession(session) {
  if (session?.access_token) {
    try {
      await fetchAuth("/auth/v1/logout", {
        method: "POST",
        accessToken: session.access_token
      });
    } catch {
      // Keep logout resilient. Local session is still cleared below.
    }
  }

  writeStoredSession(null);
}
