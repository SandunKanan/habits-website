import { useEffect, useMemo, useState } from "react";
import { loadHabitsForSession, saveHabitsForSession } from "../../lib/habitsClient.js";
import { normalizeFrequency } from "../../lib/frequency.js";
import { normalizeImportanceValue } from "../../lib/importance.js";
import { scoreHabitForToday } from "../../lib/scoring.js";
import {
  getDoneDates,
  getMostRecentDoneISO,
  getSkippedDates,
  getSubtasks
} from "../../lib/habitUtils.js";

function buildSlug(name, existingIds) {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "habit";

  let candidate = base;
  let n = 2;
  while (existingIds.has(candidate)) {
    candidate = `${base}-${n}`;
    n += 1;
  }

  return candidate;
}

export function useHabitsStore({ authEnabled, isAuthReady, session, authUser, todayISO }) {
  const [habits, setHabits] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPersisting, setIsPersisting] = useState(false);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let ignore = false;

    async function loadHabits() {
      if (!isAuthReady) return;
      if (authEnabled && !session?.access_token) {
        if (!ignore) {
          setHabits([]);
          setIsLoading(false);
          setLoadError("");
        }
        return;
      }

      try {
        if (!ignore) {
          setIsLoading(true);
        }
        setLoadError("");
        const data = await loadHabitsForSession(session?.access_token, authUser?.id);
        if (!ignore) {
          setHabits(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        if (!ignore) {
          console.error("Failed to load habits", error);
          setLoadError("Could not load habits data.");
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    void loadHabits();

    return () => {
      ignore = true;
    };
  }, [authEnabled, authUser?.id, isAuthReady, session?.access_token]);

  const lastDoneById = useMemo(() => {
    const map = {};
    for (const habit of habits) {
      map[habit.id] = getMostRecentDoneISO(habit);
    }
    return map;
  }, [habits]);

  const completionLog = useMemo(() => {
    const seeded = [];
    for (const habit of habits) {
      for (const dateISO of getDoneDates(habit)) {
        seeded.push({ dateISO, habitId: habit.id });
      }
    }

    seeded.sort((a, b) => b.dateISO.localeCompare(a.dateISO));
    return seeded;
  }, [habits]);

  const skippedTodayIds = useMemo(() => {
    const ids = new Set();

    for (const habit of habits) {
      if (getSkippedDates(habit).includes(todayISO)) {
        ids.add(habit.id);
      }
    }

    return ids;
  }, [habits, todayISO]);

  const curatedTop5 = useMemo(() => {
    const scored = habits.map((habit) => {
      const lastDoneISO = lastDoneById[habit.id];
      const score = scoreHabitForToday({ habit, lastDoneISO, todayISO });
      return { habit, ...score };
    });

    const schedulable = scored.filter((item) => item.importance > 0 && item.due);
    schedulable.sort((a, b) => b.priorityScore - a.priorityScore);
    return schedulable.slice(0, 5);
  }, [habits, lastDoneById, todayISO]);

  async function persistHabits(nextHabits) {
    try {
      setIsPersisting(true);
      const data = await saveHabitsForSession(session?.access_token, authUser?.id, nextHabits);
      if (Array.isArray(data)) {
        setHabits(data);
      }

      return { ok: true, habits: Array.isArray(data) ? data : nextHabits };
    } catch (error) {
      console.error("Failed to persist habits", error);
      return { ok: false };
    } finally {
      setIsPersisting(false);
    }
  }

  async function addHabit({
    name,
    frequencyMode,
    frequencyValue,
    frequencyUnit,
    importance,
    attributeLinks
  }) {
    const trimmedName = String(name ?? "").trim();
    if (!trimmedName) {
      return { ok: false, error: "Habit name is required." };
    }

    const frequency = normalizeFrequency({ frequencyMode, frequencyValue, frequencyUnit });
    const parsedImportance = normalizeImportanceValue(importance);
    const slug = buildSlug(trimmedName, new Set(habits.map((habit) => habit.slug ?? habit.id)));

    const newHabit = {
      id: crypto.randomUUID(),
      slug,
      name: trimmedName,
      ...frequency,
      importance: parsedImportance,
      createdAt: new Date().toISOString(),
      initialLastDone: null,
      doneDates: [],
      skippedDates: [],
      subtasks: [],
      attributeLinks: Array.isArray(attributeLinks) ? attributeLinks : []
    };

    const persisted = await persistHabits([...habits, newHabit]);
    if (!persisted.ok) {
      return { ok: false, error: "Could not save habits." };
    }

    return { ok: true, id: newHabit.id };
  }

  async function updateHabit(
    habitId,
    { name, frequencyMode, frequencyValue, frequencyUnit, importance, createdAt, attributeLinks }
  ) {
    const habit = habits.find((item) => item.id === habitId);
    if (!habit) {
      return { ok: false, error: "Habit not found." };
    }

    const trimmedName = String(name ?? "").trim();
    if (!trimmedName) {
      return { ok: false, error: "Habit name is required." };
    }
    if (!createdAt) {
      return { ok: false, error: "Created date is required." };
    }

    const frequency = normalizeFrequency({ frequencyMode, frequencyValue, frequencyUnit });
    const parsedImportance = normalizeImportanceValue(importance);
    const normalizedCreatedAt = `${String(createdAt).slice(0, 10)}T00:00:00.000Z`;

    const nextHabits = habits.map((item) =>
      item.id !== habitId
        ? item
        : {
            ...item,
            name: trimmedName,
            ...frequency,
            importance: parsedImportance,
            createdAt: normalizedCreatedAt,
            attributeLinks: Array.isArray(attributeLinks) ? attributeLinks : []
          }
    );

    const persisted = await persistHabits(nextHabits);
    if (!persisted.ok) {
      return { ok: false, error: "Could not save habits." };
    }

    return { ok: true };
  }

  async function deleteHabit(habitId) {
    const habit = habits.find((item) => item.id === habitId);
    if (!habit) {
      return { ok: false, error: "Habit not found." };
    }

    const persisted = await persistHabits(habits.filter((item) => item.id !== habitId));
    if (!persisted.ok) {
      return { ok: false, error: "Could not save habits." };
    }

    return { ok: true };
  }

  async function addSubtask(habitId, name) {
    const habit = habits.find((item) => item.id === habitId);
    if (!habit) {
      return { ok: false, error: "Habit not found." };
    }

    const trimmedName = String(name ?? "").trim();
    if (!trimmedName) {
      return { ok: false, error: "Subtask name is required." };
    }

    const existingIds = new Set(getSubtasks(habit).map((subtask) => subtask.id));
    const subtaskId = buildSlug(trimmedName, existingIds);
    const nextSubtasks = [
      ...getSubtasks(habit),
      {
        id: subtaskId,
        name: trimmedName,
        doneDates: []
      }
    ];

    const nextHabits = habits.map((item) =>
      item.id !== habitId
        ? item
        : {
            ...item,
            subtasks: nextSubtasks
          }
    );

    const persisted = await persistHabits(nextHabits);
    if (!persisted.ok) {
      return { ok: false, error: "Could not save subtasks." };
    }

    return { ok: true };
  }

  async function markSubtaskDoneToday(habitId, subtaskId) {
    const habit = habits.find((item) => item.id === habitId);
    if (!habit) return;

    const nextSubtasks = getSubtasks(habit).map((subtask) => {
      if (subtask.id !== subtaskId) return subtask;
      const currentDoneDates = Array.isArray(subtask.doneDates) ? subtask.doneDates : [];
      if (currentDoneDates.includes(todayISO)) {
        return subtask;
      }

      return {
        ...subtask,
        doneDates: [...currentDoneDates, todayISO].sort((a, b) => a.localeCompare(b))
      };
    });

    const nextHabits = habits.map((item) =>
      item.id !== habitId
        ? item
        : {
            ...item,
            subtasks: nextSubtasks
          }
    );

    await persistHabits(nextHabits);
  }

  async function undoSubtaskDoneToday(habitId, subtaskId) {
    const habit = habits.find((item) => item.id === habitId);
    if (!habit) return;

    const nextSubtasks = getSubtasks(habit).map((subtask) => {
      if (subtask.id !== subtaskId) return subtask;
      const currentDoneDates = Array.isArray(subtask.doneDates) ? subtask.doneDates : [];
      if (!currentDoneDates.includes(todayISO)) {
        return subtask;
      }

      return {
        ...subtask,
        doneDates: currentDoneDates.filter((dateISO) => dateISO !== todayISO)
      };
    });

    const nextHabits = habits.map((item) =>
      item.id !== habitId
        ? item
        : {
            ...item,
            subtasks: nextSubtasks
          }
    );

    await persistHabits(nextHabits);
  }

  async function addCompletionDate(habitId, dateISO) {
    const habit = habits.find((item) => item.id === habitId);
    if (!habit) {
      return { ok: false, error: "Habit not found." };
    }

    const parsedDateISO = String(dateISO ?? "").trim();
    if (!parsedDateISO) {
      return { ok: false, error: "Completion date is required." };
    }

    if (parsedDateISO > todayISO) {
      return { ok: false, error: "Completion date cannot be in the future." };
    }

    const currentDoneDates = getDoneDates(habit);
    const currentSkippedDates = getSkippedDates(habit);
    if (currentDoneDates.includes(parsedDateISO)) {
      return { ok: false, error: "That completion date already exists." };
    }

    const nextDoneDates = [...currentDoneDates, parsedDateISO].sort((a, b) => a.localeCompare(b));

    const nextHabits = habits.map((item) =>
      item.id !== habitId
        ? item
        : {
            ...item,
            doneDates: nextDoneDates,
            skippedDates: currentSkippedDates.filter((value) => value !== parsedDateISO)
          }
    );

    const persisted = await persistHabits(nextHabits);
    if (!persisted.ok) {
      return { ok: false, error: "Could not save habits." };
    }

    return { ok: true };
  }

  async function markDone(habitId, options = {}) {
    const habit = habits.find((item) => item.id === habitId);
    if (!habit) return;

    const currentDoneDates = getDoneDates(habit);
    const currentSkippedDates = getSkippedDates(habit);
    if (currentDoneDates.includes(todayISO)) return;
    const subtaskIdsToMarkToday = Array.isArray(options.subtaskIds)
      ? options.subtaskIds.map((value) => String(value))
      : [];
    const nextSubtasks = getSubtasks(habit).map((subtask) => {
      if (!subtaskIdsToMarkToday.includes(subtask.id)) {
        return subtask;
      }

      const currentSubtaskDoneDates = Array.isArray(subtask.doneDates) ? subtask.doneDates : [];
      if (currentSubtaskDoneDates.includes(todayISO)) {
        return subtask;
      }

      return {
        ...subtask,
        doneDates: [...currentSubtaskDoneDates, todayISO].sort((a, b) => a.localeCompare(b))
      };
    });

    const nextHabits = habits.map((item) =>
      item.id !== habitId
        ? item
        : {
            ...item,
            doneDates: [...currentDoneDates, todayISO],
            skippedDates: currentSkippedDates.filter((value) => value !== todayISO),
            subtasks: nextSubtasks
          }
    );

    await persistHabits(nextHabits);
  }

  async function undoDoneToday(habitId) {
    const habit = habits.find((item) => item.id === habitId);
    if (!habit) return;

    const currentDoneDates = getDoneDates(habit);
    if (!currentDoneDates.includes(todayISO)) return;

    const nextHabits = habits.map((item) =>
      item.id !== habitId
        ? item
        : {
            ...item,
            doneDates: currentDoneDates.filter((dateISO) => dateISO !== todayISO)
          }
    );

    await persistHabits(nextHabits);
  }

  async function skipToday(habitId) {
    const habit = habits.find((item) => item.id === habitId);
    if (!habit) return;

    const currentDoneDates = getDoneDates(habit);
    const currentSkippedDates = getSkippedDates(habit);
    if (currentDoneDates.includes(todayISO) || currentSkippedDates.includes(todayISO)) return;

    const nextHabits = habits.map((item) =>
      item.id !== habitId
        ? item
        : {
            ...item,
            skippedDates: [...currentSkippedDates, todayISO]
          }
    );

    await persistHabits(nextHabits);
  }

  async function undoSkipToday(habitId) {
    const habit = habits.find((item) => item.id === habitId);
    if (!habit) return;

    const currentSkippedDates = getSkippedDates(habit);
    if (!currentSkippedDates.includes(todayISO)) return;

    const nextHabits = habits.map((item) =>
      item.id !== habitId
        ? item
        : {
            ...item,
            skippedDates: currentSkippedDates.filter((dateISO) => dateISO !== todayISO)
          }
    );

    await persistHabits(nextHabits);
  }

  function beginLoadingHabits() {
    setIsLoading(true);
  }

  function resetHabitsState() {
    setHabits([]);
    setIsLoading(false);
    setLoadError("");
    setIsPersisting(false);
  }

  return {
    habits,
    isLoading,
    isPersisting,
    loadError,
    lastDoneById,
    completionLog,
    skippedTodayIds,
    curatedTop5,
    addHabit,
    updateHabit,
    deleteHabit,
    addSubtask,
    markSubtaskDoneToday,
    undoSubtaskDoneToday,
    addCompletionDate,
    markDone,
    undoDoneToday,
    skipToday,
    undoSkipToday,
    beginLoadingHabits,
    resetHabitsState
  };
}
