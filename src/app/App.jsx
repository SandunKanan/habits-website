import React, { useEffect, useMemo, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "../components/Layout/Layout.jsx";

import Today from "../pages/Today/Today.jsx";
import Habits from "../pages/Habits/Habits.jsx";
import History from "../pages/History/History.jsx";

import { scoreHabitForToday } from "../lib/scoring.js";
import { startOfTodayLocalISO } from "../lib/date.js";
import "./App.scss";

function getDoneDates(habit) {
  return Array.isArray(habit.doneDates) ? habit.doneDates : [];
}

function buildHabitId(name, existingIds) {
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

function getMostRecentDoneISO(habit) {
  const doneDates = getDoneDates(habit);
  if (doneDates.length > 0) {
    return doneDates.reduce((latest, dateISO) => (dateISO > latest ? dateISO : latest));
  }

  return habit.initialLastDone ?? null;
}

export default function App() {
  const [habits, setHabits] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const todayISO = startOfTodayLocalISO();

  useEffect(() => {
    let ignore = false;

    async function loadHabits() {
      try {
        setLoadError("");
        const res = await fetch("/api/habits");
        if (!res.ok) {
          throw new Error(`Load failed with status ${res.status}`);
        }

        const data = await res.json();
        if (!ignore) {
          setHabits(Array.isArray(data.habits) ? data.habits : []);
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
  }, []);

  const lastDoneById = useMemo(() => {
    const map = {};
    for (const h of habits) {
      map[h.id] = getMostRecentDoneISO(h);
    }
    return map;
  }, [habits]);

  const completionLog = useMemo(() => {
    const seeded = [];
    for (const h of habits) {
      for (const dateISO of getDoneDates(h)) {
        seeded.push({ dateISO, habitId: h.id });
      }
    }

    seeded.sort((a, b) => b.dateISO.localeCompare(a.dateISO));
    return seeded;
  }, [habits]);

  const curatedTop5 = useMemo(() => {
    const scored = habits.map((h) => {
      const lastDoneISO = lastDoneById[h.id];
      const s = scoreHabitForToday({ habit: h, lastDoneISO, todayISO });
      return { habit: h, ...s };
    });

    const schedulable = scored.filter((item) => item.importance > 0 && item.due);

    // Sort by priorityScore desc
    schedulable.sort((a, b) => b.priorityScore - a.priorityScore);

    return schedulable.slice(0, 5);
  }, [habits, lastDoneById, todayISO]);

  async function persistHabits(nextHabits) {
    try {
      const res = await fetch("/api/habits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nextHabits)
      });

      if (!res.ok) {
        throw new Error(`Persist failed with status ${res.status}`);
      }

      const data = await res.json();
      if (Array.isArray(data.habits)) {
        setHabits(data.habits);
      }

      return { ok: true, habits: Array.isArray(data.habits) ? data.habits : nextHabits };
    } catch (error) {
      console.error("Failed to persist habits.json", error);
      return { ok: false };
    }
  }

  async function addHabit({ name, everyXDays, importance }) {
    const trimmedName = String(name ?? "").trim();
    if (!trimmedName) {
      return { ok: false, error: "Habit name is required." };
    }

    const parsedEveryXDays = Math.max(1, Math.floor(Number(everyXDays) || 1));
    const parsedImportance = Math.max(0, Math.floor(Number(importance) || 0));
    const id = buildHabitId(trimmedName, new Set(habits.map((h) => h.id)));

    const newHabit = {
      id,
      name: trimmedName,
      everyXDays: parsedEveryXDays,
      importance: parsedImportance,
      initialLastDone: null,
      doneDates: []
    };

    const nextHabits = [...habits, newHabit];
    setHabits(nextHabits);

    const persisted = await persistHabits(nextHabits);
    if (!persisted.ok) {
      return { ok: false, error: "Could not save habits.json." };
    }

    return { ok: true, id };
  }

  async function updateHabit(habitId, { name, everyXDays, importance }) {
    const habit = habits.find((h) => h.id === habitId);
    if (!habit) {
      return { ok: false, error: "Habit not found." };
    }

    const trimmedName = String(name ?? "").trim();
    if (!trimmedName) {
      return { ok: false, error: "Habit name is required." };
    }

    const parsedEveryXDays = Math.max(1, Math.floor(Number(everyXDays) || 1));
    const parsedImportance = Math.max(0, Math.floor(Number(importance) || 0));

    const nextHabits = habits.map((h) => {
      if (h.id !== habitId) return h;
      return {
        ...h,
        name: trimmedName,
        everyXDays: parsedEveryXDays,
        importance: parsedImportance
      };
    });

    setHabits(nextHabits);
    const persisted = await persistHabits(nextHabits);
    if (!persisted.ok) {
      return { ok: false, error: "Could not save habits.json." };
    }

    return { ok: true };
  }

  async function deleteHabit(habitId) {
    const habit = habits.find((h) => h.id === habitId);
    if (!habit) {
      return { ok: false, error: "Habit not found." };
    }

    const nextHabits = habits.filter((h) => h.id !== habitId);
    setHabits(nextHabits);

    const persisted = await persistHabits(nextHabits);
    if (!persisted.ok) {
      return { ok: false, error: "Could not save habits.json." };
    }

    return { ok: true };
  }

  async function addCompletionDate(habitId, dateISO) {
    const habit = habits.find((h) => h.id === habitId);
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
    if (currentDoneDates.includes(parsedDateISO)) {
      return { ok: false, error: "That completion date already exists." };
    }

    const nextDoneDates = [...currentDoneDates, parsedDateISO].sort((a, b) => a.localeCompare(b));

    const nextHabits = habits.map((h) => {
      if (h.id !== habitId) return h;
      return {
        ...h,
        doneDates: nextDoneDates
      };
    });

    setHabits(nextHabits);
    const persisted = await persistHabits(nextHabits);
    if (!persisted.ok) {
      return { ok: false, error: "Could not save habits.json." };
    }

    return { ok: true };
  }

  function markDone(habitId) {
    const habit = habits.find((h) => h.id === habitId);
    if (!habit) return;

    const currentDoneDates = getDoneDates(habit);
    const alreadyDoneToday = currentDoneDates.includes(todayISO);
    if (alreadyDoneToday) return;

    const nextHabits = habits.map((h) => {
      if (h.id !== habitId) return h;
      return {
        ...h,
        doneDates: [...currentDoneDates, todayISO]
      };
    });

    setHabits(nextHabits);
    void persistHabits(nextHabits);
  }

  function undoDoneToday(habitId) {
    const habit = habits.find((h) => h.id === habitId);
    if (!habit) return;

    const currentDoneDates = getDoneDates(habit);
    if (!currentDoneDates.includes(todayISO)) return;

    const nextDoneDates = currentDoneDates.filter((dateISO) => dateISO !== todayISO);

    const nextHabits = habits.map((h) => {
      if (h.id !== habitId) return h;
      return {
        ...h,
        doneDates: nextDoneDates
      };
    });

    setHabits(nextHabits);
    void persistHabits(nextHabits);
  }

  if (isLoading) {
    return <div className="appstatus card">Loading habits...</div>;
  }

  if (loadError) {
    return <div className="appstatus card">{loadError}</div>;
  }

  return (
    <Routes>
      <Route
        element={
          <Layout
            todayISO={todayISO}
            habits={habits}
            curatedTop5={curatedTop5}
            lastDoneById={lastDoneById}
            onAddHabit={addHabit}
            onUpdateHabit={updateHabit}
            onDeleteHabit={deleteHabit}
            onAddCompletionDate={addCompletionDate}
            onMarkDone={markDone}
            onUndoDoneToday={undoDoneToday}
            completionLog={completionLog}
          />
        }
      >
        <Route index element={<Navigate to="/today" replace />} />
        <Route path="/today" element={<Today />} />
        <Route path="/habits" element={<Habits />} />
        <Route path="/history" element={<History />} />
        <Route path="*" element={<Navigate to="/today" replace />} />
      </Route>
    </Routes>
  );
}
