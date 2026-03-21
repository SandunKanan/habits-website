import React, { useEffect, useMemo, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "../components/Layout/Layout.jsx";

import Today from "../pages/Today/Today.jsx";
import Habits from "../pages/Habits/Habits.jsx";
import History from "../pages/History/History.jsx";
import Help from "../pages/Help/Help.jsx";
import Admin from "../pages/Admin/Admin.jsx";
import Auth from "../pages/Auth/Auth.jsx";

import { normalizeFrequency } from "../lib/frequency.js";
import { loadHabitsForSession, saveHabitsForSession } from "../lib/habitsClient.js";
import { normalizeImportanceValue } from "../lib/importance.js";
import { scoreHabitForToday } from "../lib/scoring.js";
import { startOfTodayLocalISO } from "../lib/date.js";
import { loadUserRole } from "../lib/userRoleClient.js";
import {
  initializeAuth,
  isAuthEnabled,
  signInWithPassword,
  signOutCurrentSession,
  signUpWithPassword
} from "../lib/authClient.js";
import "./App.scss";

function getDoneDates(habit) {
  return Array.isArray(habit.doneDates) ? habit.doneDates : [];
}

function getSkippedDates(habit) {
  return Array.isArray(habit.skippedDates) ? habit.skippedDates : [];
}

function getSubtasks(habit) {
  return Array.isArray(habit.subtasks) ? habit.subtasks : [];
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
  const [isPersisting, setIsPersisting] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [session, setSession] = useState(null);
  const [authUser, setAuthUser] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isAuthWorking, setIsAuthWorking] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isRoleReady, setIsRoleReady] = useState(false);

  const todayISO = startOfTodayLocalISO();
  const authEnabled = isAuthEnabled();

  useEffect(() => {
    let ignore = false;

    async function bootstrapAuth() {
      if (!authEnabled) {
        if (!ignore) {
          setIsAuthReady(true);
        }
        return;
      }

      const { session: nextSession, user } = await initializeAuth();
      if (!ignore) {
        setSession(nextSession);
        setAuthUser(user);
        setIsAuthReady(true);
      }
    }

    void bootstrapAuth();

    return () => {
      ignore = true;
    };
  }, [authEnabled]);

  useEffect(() => {
    let ignore = false;

    async function loadRole() {
      if (!isAuthReady) return;

      if (!authEnabled || !session?.access_token || !authUser?.id) {
        if (!ignore) {
          setIsAdmin(false);
          setIsRoleReady(true);
        }
        return;
      }

      try {
        if (!ignore) {
          setIsRoleReady(false);
        }

        const role = await loadUserRole(session.access_token, authUser.id);
        if (!ignore) {
          setIsAdmin(Boolean(role.isAdmin));
        }
      } catch (error) {
        if (!ignore) {
          console.error("Failed to load user role", error);
          setIsAdmin(false);
        }
      } finally {
        if (!ignore) {
          setIsRoleReady(true);
        }
      }
    }

    void loadRole();

    return () => {
      ignore = true;
    };
  }, [authEnabled, authUser?.id, isAuthReady, session?.access_token]);

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

  const skippedTodayIds = useMemo(() => {
    const ids = new Set();

    for (const h of habits) {
      if (getSkippedDates(h).includes(todayISO)) {
        ids.add(h.id);
      }
    }

    return ids;
  }, [habits, todayISO]);

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

  async function addHabit({ name, frequencyMode, frequencyValue, frequencyUnit, importance }) {
    const trimmedName = String(name ?? "").trim();
    if (!trimmedName) {
      return { ok: false, error: "Habit name is required." };
    }

    const frequency = normalizeFrequency({ frequencyMode, frequencyValue, frequencyUnit });
    const parsedImportance = normalizeImportanceValue(importance);
    const id = buildHabitId(trimmedName, new Set(habits.map((h) => h.id)));

    const newHabit = {
      id,
      name: trimmedName,
      ...frequency,
      importance: parsedImportance,
      createdAt: new Date().toISOString(),
      initialLastDone: null,
      doneDates: [],
      skippedDates: [],
      subtasks: []
    };

    const nextHabits = [...habits, newHabit];
    const persisted = await persistHabits(nextHabits);
    if (!persisted.ok) {
      return { ok: false, error: "Could not save habits." };
    }

    return { ok: true, id };
  }

  async function updateHabit(
    habitId,
    { name, frequencyMode, frequencyValue, frequencyUnit, importance, createdAt }
  ) {
    const habit = habits.find((h) => h.id === habitId);
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

    const nextHabits = habits.map((h) => {
      if (h.id !== habitId) return h;
      return {
        ...h,
        name: trimmedName,
        ...frequency,
        importance: parsedImportance,
        createdAt: normalizedCreatedAt
      };
    });

    const persisted = await persistHabits(nextHabits);
    if (!persisted.ok) {
      return { ok: false, error: "Could not save habits." };
    }

    return { ok: true };
  }

  async function deleteHabit(habitId) {
    const habit = habits.find((h) => h.id === habitId);
    if (!habit) {
      return { ok: false, error: "Habit not found." };
    }

    const nextHabits = habits.filter((h) => h.id !== habitId);
    const persisted = await persistHabits(nextHabits);
    if (!persisted.ok) {
      return { ok: false, error: "Could not save habits." };
    }

    return { ok: true };
  }

  async function addSubtask(habitId, name) {
    const habit = habits.find((h) => h.id === habitId);
    if (!habit) {
      return { ok: false, error: "Habit not found." };
    }

    const trimmedName = String(name ?? "").trim();
    if (!trimmedName) {
      return { ok: false, error: "Subtask name is required." };
    }

    const existingIds = new Set(getSubtasks(habit).map((subtask) => subtask.id));
    const subtaskId = buildHabitId(trimmedName, existingIds);
    const nextSubtasks = [
      ...getSubtasks(habit),
      {
        id: subtaskId,
        name: trimmedName,
        doneDates: []
      }
    ];

    const nextHabits = habits.map((h) => {
      if (h.id !== habitId) return h;
      return {
        ...h,
        subtasks: nextSubtasks
      };
    });

    const persisted = await persistHabits(nextHabits);
    if (!persisted.ok) {
      return { ok: false, error: "Could not save subtasks." };
    }

    return { ok: true };
  }

  async function markSubtaskDoneToday(habitId, subtaskId) {
    const habit = habits.find((h) => h.id === habitId);
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

    const nextHabits = habits.map((h) => {
      if (h.id !== habitId) return h;
      return {
        ...h,
        subtasks: nextSubtasks
      };
    });

    await persistHabits(nextHabits);
  }

  async function undoSubtaskDoneToday(habitId, subtaskId) {
    const habit = habits.find((h) => h.id === habitId);
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

    const nextHabits = habits.map((h) => {
      if (h.id !== habitId) return h;
      return {
        ...h,
        subtasks: nextSubtasks
      };
    });

    await persistHabits(nextHabits);
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
    const currentSkippedDates = getSkippedDates(habit);
    if (currentDoneDates.includes(parsedDateISO)) {
      return { ok: false, error: "That completion date already exists." };
    }

    const nextDoneDates = [...currentDoneDates, parsedDateISO].sort((a, b) => a.localeCompare(b));

    const nextHabits = habits.map((h) => {
      if (h.id !== habitId) return h;
      return {
        ...h,
        doneDates: nextDoneDates,
        skippedDates: currentSkippedDates.filter((value) => value !== parsedDateISO)
      };
    });

    const persisted = await persistHabits(nextHabits);
    if (!persisted.ok) {
      return { ok: false, error: "Could not save habits." };
    }

    return { ok: true };
  }

  async function markDone(habitId) {
    const habit = habits.find((h) => h.id === habitId);
    if (!habit) return;

    const currentDoneDates = getDoneDates(habit);
    const currentSkippedDates = getSkippedDates(habit);
    const alreadyDoneToday = currentDoneDates.includes(todayISO);
    if (alreadyDoneToday) return;

    const nextHabits = habits.map((h) => {
      if (h.id !== habitId) return h;
      return {
        ...h,
        doneDates: [...currentDoneDates, todayISO],
        skippedDates: currentSkippedDates.filter((value) => value !== todayISO)
      };
    });

    await persistHabits(nextHabits);
  }

  async function undoDoneToday(habitId) {
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

    await persistHabits(nextHabits);
  }

  async function skipToday(habitId) {
    const habit = habits.find((h) => h.id === habitId);
    if (!habit) return;

    const currentDoneDates = getDoneDates(habit);
    const currentSkippedDates = getSkippedDates(habit);
    if (currentDoneDates.includes(todayISO) || currentSkippedDates.includes(todayISO)) return;

    const nextHabits = habits.map((h) => {
      if (h.id !== habitId) return h;
      return {
        ...h,
        skippedDates: [...currentSkippedDates, todayISO]
      };
    });

    await persistHabits(nextHabits);
  }

  async function undoSkipToday(habitId) {
    const habit = habits.find((h) => h.id === habitId);
    if (!habit) return;

    const currentSkippedDates = getSkippedDates(habit);
    if (!currentSkippedDates.includes(todayISO)) return;

    const nextHabits = habits.map((h) => {
      if (h.id !== habitId) return h;
      return {
        ...h,
        skippedDates: currentSkippedDates.filter((dateISO) => dateISO !== todayISO)
      };
    });

    await persistHabits(nextHabits);
  }

  async function handleSignIn({ email, password }) {
    setIsAuthWorking(true);

    try {
      const { session: nextSession, user } = await signInWithPassword({ email, password });
      setIsLoading(true);
      setSession(nextSession);
      setAuthUser(user);
      return { ok: true };
    } catch (error) {
      return { ok: false, error: error.message };
    } finally {
      setIsAuthWorking(false);
    }
  }

  async function handleSignUp({ email, password }) {
    setIsAuthWorking(true);

    try {
      const result = await signUpWithPassword({ email, password });
      if (result.requiresEmailConfirmation) {
        return {
          ok: true,
          message: "Account created. Check your email to confirm, then sign in."
        };
      }

      setIsLoading(true);
      setSession(result.session);
      setAuthUser(result.user);
      return { ok: true };
    } catch (error) {
      return { ok: false, error: error.message };
    } finally {
      setIsAuthWorking(false);
    }
  }

  async function handleSignOut() {
    await signOutCurrentSession(session);
    setSession(null);
    setAuthUser(null);
    setIsAdmin(false);
    setIsRoleReady(false);
    setHabits([]);
    setIsLoading(false);
    setLoadError("");
  }

  if (authEnabled && !isAuthReady) {
    return <div className="appstatus card">Checking session...</div>;
  }

  if (authEnabled && session && !isRoleReady) {
    return <div className="appstatus card">Loading account access...</div>;
  }

  if (isLoading) {
    return <div className="appstatus card">Loading habits...</div>;
  }

  if (loadError) {
    return <div className="appstatus card">{loadError}</div>;
  }

  if (authEnabled && !session) {
    return <Auth onSignIn={handleSignIn} onSignUp={handleSignUp} isLoading={isAuthWorking} />;
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
            onAddSubtask={addSubtask}
            onMarkSubtaskDoneToday={markSubtaskDoneToday}
            onUndoSubtaskDoneToday={undoSubtaskDoneToday}
            onAddCompletionDate={addCompletionDate}
            onMarkDone={markDone}
            onUndoDoneToday={undoDoneToday}
            onSkipToday={skipToday}
            onUndoSkipToday={undoSkipToday}
            completionLog={completionLog}
            skippedTodayIds={skippedTodayIds}
            isPersisting={isPersisting}
            authUser={authUser}
            isAdmin={isAdmin}
            session={session}
            onSignOut={handleSignOut}
          />
        }
      >
        <Route index element={<Navigate to="/today" replace />} />
        <Route path="/today" element={<Today />} />
        <Route path="/habits" element={<Habits />} />
        <Route path="/history" element={<History />} />
        <Route path="/help" element={<Help />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="*" element={<Navigate to="/today" replace />} />
      </Route>
    </Routes>
  );
}
