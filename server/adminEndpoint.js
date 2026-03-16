function getConfig() {
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

function buildHeaders(config, extraHeaders = {}) {
  return {
    apikey: config.serviceRoleKey,
    Authorization: `Bearer ${config.serviceRoleKey}`,
    ...extraHeaders
  };
}

async function fetchSupabase(config, pathname, options = {}) {
  const res = await fetch(`${config.url}${pathname}`, {
    ...options,
    headers: buildHeaders(config, options.headers)
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

async function getAuthenticatedUser(config, request) {
  const authHeader = request.headers.get("authorization");
  const accessToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
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

function buildAdminPayload(users, habits, completions) {
  const completionsByHabitId = new Map();
  for (const completion of completions) {
    const items = completionsByHabitId.get(completion.habit_id) ?? [];
    items.push(completion.completed_on);
    completionsByHabitId.set(completion.habit_id, items);
  }

  const habitsByUserId = new Map();
  for (const habit of habits) {
    const items = habitsByUserId.get(habit.user_id) ?? [];
    const doneDates = [...(completionsByHabitId.get(habit.id) ?? [])].sort((a, b) =>
      b.localeCompare(a)
    );
    items.push({
      id: habit.id,
      slug: habit.slug,
      name: habit.name,
      frequency_mode: habit.frequency_mode,
      frequency_value: habit.frequency_value,
      frequency_unit: habit.frequency_unit,
      importance: habit.importance,
      initial_last_done: habit.initial_last_done,
      done_dates: doneDates,
      completion_count: doneDates.length
    });
    habitsByUserId.set(habit.user_id, items);
  }

  return users.map((user) => {
    const userHabits = habitsByUserId.get(user.id) ?? [];
    const completionCount = userHabits.reduce((total, habit) => total + habit.completion_count, 0);

    return {
      id: user.id,
      email: user.email,
      created_at: user.created_at,
      last_sign_in_at: user.last_sign_in_at,
      habit_count: userHabits.length,
      completion_count: completionCount,
      habits: userHabits
    };
  });
}

export async function handleAdminGet(request) {
  try {
    const config = getConfig();
    if (!config) {
      return Response.json({ error: "Admin API is not configured." }, { status: 500 });
    }

    const auth = await getAuthenticatedUser(config, request);
    if (auth?.error) {
      return Response.json({ error: auth.error }, { status: 401 });
    }

    const userRole =
      (await fetchSupabase(
        config,
        `/rest/v1/user_roles?user_id=eq.${auth.user.id}&select=is_admin&limit=1`
      )) ?? [];

    if (!userRole?.[0]?.is_admin) {
      return Response.json({ error: "Forbidden." }, { status: 403 });
    }

    const [usersResponse, habits, completions] = await Promise.all([
      fetchSupabase(config, "/auth/v1/admin/users?page=1&per_page=1000"),
      fetchSupabase(
        config,
        "/rest/v1/habits?select=id,user_id,slug,name,frequency_mode,frequency_value,frequency_unit,importance,initial_last_done&order=created_at.asc"
      ),
      fetchSupabase(
        config,
        "/rest/v1/habit_completions?select=habit_id,completed_on&order=completed_on.desc"
      )
    ]);

    const users = Array.isArray(usersResponse?.users) ? usersResponse.users : [];
    return Response.json({ users: buildAdminPayload(users, habits ?? [], completions ?? []) });
  } catch (error) {
    console.error("GET /api/admin failed", error);
    return Response.json({ error: "Failed to load admin data." }, { status: 500 });
  }
}
