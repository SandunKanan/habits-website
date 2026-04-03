import { useEffect, useState } from "react";
import { loadGoalsForSession, saveGoalsForSession } from "../../lib/goalsClient.js";

function buildSlug(title, existingSlugs) {
  const base = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "goal";

  let candidate = base;
  let n = 2;
  while (existingSlugs.has(candidate)) {
    candidate = `${base}-${n}`;
    n += 1;
  }

  return candidate;
}

export function useGoalsStore({ authEnabled, isAuthReady, session, authUser }) {
  const [goals, setGoals] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPersisting, setIsPersisting] = useState(false);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let ignore = false;

    async function loadGoals() {
      if (!isAuthReady) return;
      if (authEnabled && !session?.access_token) {
        if (!ignore) {
          setGoals([]);
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
        const data = await loadGoalsForSession(session?.access_token, authUser?.id);
        if (!ignore) {
          setGoals(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        if (!ignore) {
          console.error("Failed to load goals", error);
          setLoadError("Could not load goals.");
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    void loadGoals();

    return () => {
      ignore = true;
    };
  }, [authEnabled, authUser?.id, isAuthReady, session?.access_token]);

  async function persistGoals(nextGoals) {
    try {
      setIsPersisting(true);
      const data = await saveGoalsForSession(session?.access_token, authUser?.id, nextGoals);
      if (Array.isArray(data)) {
        setGoals(data);
      }

      return { ok: true, goals: Array.isArray(data) ? data : nextGoals };
    } catch (error) {
      console.error("Failed to persist goals", error);
      return { ok: false };
    } finally {
      setIsPersisting(false);
    }
  }

  async function addGoal({ title, timeframeType, targetDate, notes }) {
    const trimmedTitle = String(title ?? "").trim();
    if (!trimmedTitle) {
      return { ok: false, error: "Goal title is required." };
    }

    const normalizedTimeframeType = timeframeType === "fixed_timeframe" ? "fixed_timeframe" : "long_term";
    if (normalizedTimeframeType === "fixed_timeframe" && !targetDate) {
      return { ok: false, error: "Choose a target date for fixed time frame goals." };
    }

    const now = new Date().toISOString();
    const slug = buildSlug(trimmedTitle, new Set(goals.map((goal) => goal.slug ?? goal.id)));
    const newGoal = {
      id: crypto.randomUUID(),
      slug,
      title: trimmedTitle,
      timeframeType: normalizedTimeframeType,
      targetDate: normalizedTimeframeType === "fixed_timeframe" ? String(targetDate ?? "") : "",
      notes: String(notes ?? "").trim(),
      createdAt: now,
      updatedAt: now
    };

    const persisted = await persistGoals([...goals, newGoal]);
    if (!persisted.ok) {
      return { ok: false, error: "Could not save goals." };
    }

    return { ok: true, id: newGoal.id };
  }

  async function updateGoal(goalId, updates) {
    const existingGoal = goals.find((goal) => goal.id === goalId);
    if (!existingGoal) {
      return { ok: false, error: "Goal not found." };
    }

    const trimmedTitle = String(updates?.title ?? existingGoal.title ?? "").trim();
    if (!trimmedTitle) {
      return { ok: false, error: "Goal title is required." };
    }

    const normalizedTimeframeType = updates?.timeframeType === "fixed_timeframe" ? "fixed_timeframe" : "long_term";
    const normalizedTargetDate = normalizedTimeframeType === "fixed_timeframe" ? String(updates?.targetDate ?? "") : "";
    if (normalizedTimeframeType === "fixed_timeframe" && !normalizedTargetDate) {
      return { ok: false, error: "Choose a target date for fixed time frame goals." };
    }

    const nextGoals = goals.map((goal) =>
      goal.id !== goalId
        ? goal
        : {
            ...goal,
            title: trimmedTitle,
            timeframeType: normalizedTimeframeType,
            targetDate: normalizedTargetDate,
            notes: String(updates?.notes ?? goal.notes ?? "").trim(),
            updatedAt: new Date().toISOString()
          }
    );

    const persisted = await persistGoals(nextGoals);
    if (!persisted.ok) {
      return { ok: false, error: "Could not save goals." };
    }

    return { ok: true };
  }

  async function deleteGoal(goalId) {
    const existingGoal = goals.find((goal) => goal.id === goalId);
    if (!existingGoal) {
      return { ok: false, error: "Goal not found." };
    }

    const persisted = await persistGoals(goals.filter((goal) => goal.id !== goalId));
    if (!persisted.ok) {
      return { ok: false, error: "Could not save goals." };
    }

    return { ok: true };
  }

  function beginLoadingGoals() {
    setIsLoading(true);
  }

  function resetGoalsState() {
    setGoals([]);
    setIsLoading(false);
    setLoadError("");
    setIsPersisting(false);
  }

  return {
    goals,
    isLoading,
    isPersisting,
    loadError,
    addGoal,
    updateGoal,
    deleteGoal,
    beginLoadingGoals,
    resetGoalsState
  };
}
