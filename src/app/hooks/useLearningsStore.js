import { useEffect, useState } from "react";
import {
  loadLearningsForSession,
  saveLearningsForSession
} from "../../lib/learningsClient.js";

function buildSlug(title, existingSlugs) {
  const base = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "learning-item";

  let candidate = base;
  let n = 2;
  while (existingSlugs.has(candidate)) {
    candidate = `${base}-${n}`;
    n += 1;
  }

  return candidate;
}

export function useLearningsStore({ authEnabled, isAuthReady, session, authUser }) {
  const [learnings, setLearnings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPersisting, setIsPersisting] = useState(false);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let ignore = false;

    async function loadLearnings() {
      if (!isAuthReady) return;
      if (authEnabled && !session?.access_token) {
        if (!ignore) {
          setLearnings([]);
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
        const data = await loadLearningsForSession(session?.access_token, authUser?.id);
        if (!ignore) {
          setLearnings(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        if (!ignore) {
          console.error("Failed to load learnings", error);
          setLoadError("Could not load learnings.");
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    void loadLearnings();

    return () => {
      ignore = true;
    };
  }, [authEnabled, authUser?.id, isAuthReady, session?.access_token]);

  async function persistLearnings(nextLearnings) {
    try {
      setIsPersisting(true);
      const data = await saveLearningsForSession(session?.access_token, authUser?.id, nextLearnings);
      if (Array.isArray(data)) {
        setLearnings(data);
      }

      return { ok: true, learnings: Array.isArray(data) ? data : nextLearnings };
    } catch (error) {
      console.error("Failed to persist learnings", error);
      return { ok: false };
    } finally {
      setIsPersisting(false);
    }
  }

  async function addLearningItem({ title, itemType, status, notes }) {
    const trimmedTitle = String(title ?? "").trim();
    if (!trimmedTitle) {
      return { ok: false, error: "Title is required." };
    }

    const allowedTypes = new Set(["learning", "course", "project"]);
    const allowedStatuses = new Set(["idea", "active", "paused", "completed"]);
    const normalizedType = allowedTypes.has(itemType) ? itemType : "learning";
    const normalizedStatus = allowedStatuses.has(status) ? status : "idea";
    const slug = buildSlug(trimmedTitle, new Set(learnings.map((item) => item.slug ?? item.id)));
    const now = new Date().toISOString();

    const newItem = {
      id: crypto.randomUUID(),
      slug,
      title: trimmedTitle,
      itemType: normalizedType,
      priority: 3,
      status: normalizedStatus,
      notes: String(notes ?? "").trim(),
      createdAt: now,
      updatedAt: now
    };

    const persisted = await persistLearnings([...learnings, newItem]);
    if (!persisted.ok) {
      return { ok: false, error: "Could not save learnings." };
    }

    return { ok: true, id: newItem.id };
  }

  async function updateLearningItem(itemId, updates) {
    const existingItem = learnings.find((item) => item.id === itemId);
    if (!existingItem) {
      return { ok: false, error: "Item not found." };
    }

    const trimmedTitle = String(updates?.title ?? existingItem.title ?? "").trim();
    if (!trimmedTitle) {
      return { ok: false, error: "Title is required." };
    }

    const allowedTypes = new Set(["learning", "course", "project"]);
    const allowedStatuses = new Set(["idea", "active", "paused", "completed"]);
    const normalizedType = allowedTypes.has(updates?.itemType) ? updates.itemType : existingItem.itemType;
    const normalizedStatus = allowedStatuses.has(updates?.status) ? updates.status : existingItem.status;

    const nextLearnings = learnings.map((item) =>
      item.id !== itemId
        ? item
        : {
            ...item,
            title: trimmedTitle,
            itemType: normalizedType,
            priority: Number(existingItem.priority ?? item.priority ?? 3),
            status: normalizedStatus,
            notes: String(updates?.notes ?? item.notes ?? "").trim(),
            updatedAt: new Date().toISOString()
          }
    );

    const persisted = await persistLearnings(nextLearnings);
    if (!persisted.ok) {
      return { ok: false, error: "Could not save learnings." };
    }

    return { ok: true };
  }

  async function deleteLearningItem(itemId) {
    const existingItem = learnings.find((item) => item.id === itemId);
    if (!existingItem) {
      return { ok: false, error: "Item not found." };
    }

    const persisted = await persistLearnings(learnings.filter((item) => item.id !== itemId));
    if (!persisted.ok) {
      return { ok: false, error: "Could not save learnings." };
    }

    return { ok: true };
  }

  function beginLoadingLearnings() {
    setIsLoading(true);
  }

  function resetLearningsState() {
    setLearnings([]);
    setIsLoading(false);
    setLoadError("");
    setIsPersisting(false);
  }

  return {
    learnings,
    isLoading,
    isPersisting,
    loadError,
    addLearningItem,
    updateLearningItem,
    deleteLearningItem,
    beginLoadingLearnings,
    resetLearningsState
  };
}
