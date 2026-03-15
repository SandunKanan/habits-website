import fs from "node:fs/promises";
import path from "node:path";

const localHabitsPath = path.resolve(process.cwd(), "src/data/habits.json");

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

function normalizeHabit(habit) {
  const doneDates = Array.isArray(habit.doneDates)
    ? [...new Set(habit.doneDates)].sort((a, b) => a.localeCompare(b))
    : [];

  return {
    ...habit,
    initialLastDone: habit.initialLastDone ?? null,
    doneDates
  };
}

function normalizeHabits(habits) {
  return Array.isArray(habits) ? habits.map(normalizeHabit) : [];
}

async function readLocalHabits() {
  const fileContents = await fs.readFile(localHabitsPath, "utf8");
  return normalizeHabits(JSON.parse(fileContents));
}

async function writeLocalHabits(habits) {
  const normalized = normalizeHabits(habits);
  await fs.writeFile(localHabitsPath, `${JSON.stringify(normalized, null, 2)}\n`, "utf8");
  return normalized;
}

async function loadFromSupabase(config, userId) {
  const res = await fetch(
    `${config.url}/rest/v1/user_habits_state?user_id=eq.${userId}&select=habits`,
    {
      headers: {
        apikey: config.serviceRoleKey,
        Authorization: `Bearer ${config.serviceRoleKey}`
      }
    }
  );

  if (!res.ok) {
    throw new Error(`Supabase load failed with status ${res.status}`);
  }

  const rows = await res.json();
  if (rows.length === 0) {
    const fallbackHabits = await readLocalHabits();
    return saveToSupabase(config, userId, fallbackHabits);
  }

  return normalizeHabits(rows[0].habits);
}

async function saveToSupabase(config, userId, habits) {
  const normalized = normalizeHabits(habits);
  const res = await fetch(
    `${config.url}/rest/v1/user_habits_state?on_conflict=user_id`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: config.serviceRoleKey,
        Authorization: `Bearer ${config.serviceRoleKey}`,
        Prefer: "resolution=merge-duplicates, return=representation"
      },
      body: JSON.stringify([
        {
          user_id: userId,
          habits: normalized
        }
      ])
    }
  );

  if (!res.ok) {
    throw new Error(`Supabase save failed with status ${res.status}`);
  }

  const rows = await res.json();
  return normalizeHabits(rows[0]?.habits ?? normalized);
}

export async function loadHabitsFromStore(userId) {
  const supabaseConfig = getSupabaseConfig();
  if (!supabaseConfig) {
    return readLocalHabits();
  }

  return loadFromSupabase(supabaseConfig, userId);
}

export async function saveHabitsToStore(userId, habits) {
  const supabaseConfig = getSupabaseConfig();
  if (!supabaseConfig) {
    return writeLocalHabits(habits);
  }

  return saveToSupabase(supabaseConfig, userId, habits);
}
