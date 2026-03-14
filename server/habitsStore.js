import fs from "node:fs/promises";
import path from "node:path";

const DEFAULT_ROW_ID = "default";
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

async function loadFromSupabase(config) {
  const res = await fetch(
    `${config.url}/rest/v1/habits_state?id=eq.${DEFAULT_ROW_ID}&select=habits`,
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
    return saveToSupabase(config, fallbackHabits);
  }

  return normalizeHabits(rows[0].habits);
}

async function saveToSupabase(config, habits) {
  const normalized = normalizeHabits(habits);
  const res = await fetch(
    `${config.url}/rest/v1/habits_state?on_conflict=id`,
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
          id: DEFAULT_ROW_ID,
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

export async function loadHabitsFromStore() {
  const supabaseConfig = getSupabaseConfig();
  if (!supabaseConfig) {
    return readLocalHabits();
  }

  return loadFromSupabase(supabaseConfig);
}

export async function saveHabitsToStore(habits) {
  const supabaseConfig = getSupabaseConfig();
  if (!supabaseConfig) {
    return writeLocalHabits(habits);
  }

  return saveToSupabase(supabaseConfig, habits);
}
