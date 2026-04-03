import { useEffect, useState } from "react";
import {
  loadOneOffTasksForSession,
  saveOneOffTasksForSession
} from "../../lib/oneOffTasksClient.js";

function normalizeAttributeLinks(attributeLinks) {
  return Array.isArray(attributeLinks)
    ? attributeLinks
        .map((link) => ({
          attributeId: String(link.attributeId ?? ""),
          weight: Number(link.weight)
        }))
        .filter((link) => link.attributeId && Number.isFinite(link.weight) && link.weight > 0)
    : [];
}

export function useOneOffTasksStore({ authEnabled, isAuthReady, session, authUser }) {
  const [oneOffTasks, setOneOffTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPersisting, setIsPersisting] = useState(false);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let ignore = false;

    async function loadTasks() {
      if (!isAuthReady) return;
      if (authEnabled && !session?.access_token) {
        if (!ignore) {
          setOneOffTasks([]);
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
        const data = await loadOneOffTasksForSession(session?.access_token, authUser?.id);
        if (!ignore) {
          setOneOffTasks(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        if (!ignore) {
          console.error("Failed to load one-off tasks", error);
          setLoadError("Could not load completed tasks.");
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    void loadTasks();

    return () => {
      ignore = true;
    };
  }, [authEnabled, authUser?.id, isAuthReady, session?.access_token]);

  async function persistTasks(nextTasks) {
    try {
      setIsPersisting(true);
      const data = await saveOneOffTasksForSession(session?.access_token, authUser?.id, nextTasks);
      if (Array.isArray(data)) {
        setOneOffTasks(data);
      }

      return { ok: true, tasks: Array.isArray(data) ? data : nextTasks };
    } catch (error) {
      console.error("Failed to persist one-off tasks", error);
      return { ok: false };
    } finally {
      setIsPersisting(false);
    }
  }

  async function addOneOffTask({ title, completedOn, attributeLinks }) {
    const trimmedTitle = String(title ?? "").trim();
    if (!trimmedTitle) {
      return { ok: false, error: "Task name is required." };
    }

    const normalizedCompletedOn = String(completedOn ?? "").slice(0, 10);
    if (!normalizedCompletedOn) {
      return { ok: false, error: "Completed date is required." };
    }

    const now = new Date().toISOString();
    const newTask = {
      id: crypto.randomUUID(),
      title: trimmedTitle,
      completedOn: normalizedCompletedOn,
      attributeLinks: normalizeAttributeLinks(attributeLinks),
      createdAt: now,
      updatedAt: now
    };

    const persisted = await persistTasks([...oneOffTasks, newTask]);
    if (!persisted.ok) {
      return { ok: false, error: "Could not save completed task." };
    }

    return { ok: true, id: newTask.id };
  }

  async function deleteOneOffTask(taskId) {
    const existingTask = oneOffTasks.find((task) => task.id === taskId);
    if (!existingTask) {
      return { ok: false, error: "Completed task not found." };
    }

    const persisted = await persistTasks(oneOffTasks.filter((task) => task.id !== taskId));
    if (!persisted.ok) {
      return { ok: false, error: "Could not save completed task." };
    }

    return { ok: true };
  }

  function beginLoadingOneOffTasks() {
    setIsLoading(true);
  }

  function resetOneOffTasksState() {
    setOneOffTasks([]);
    setIsLoading(false);
    setLoadError("");
    setIsPersisting(false);
  }

  return {
    oneOffTasks,
    isLoading,
    isPersisting,
    loadError,
    addOneOffTask,
    deleteOneOffTask,
    beginLoadingOneOffTasks,
    resetOneOffTasksState
  };
}
