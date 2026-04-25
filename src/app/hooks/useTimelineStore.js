import { useEffect, useState } from "react";
import { loadTimelineBlocksForSession, saveTimelineBlocksForSession } from "../../lib/timelineClient.js";

export function useTimelineStore({ authEnabled, isAuthReady, session, authUser }) {
  const [timelineBlocks, setTimelineBlocks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPersisting, setIsPersisting] = useState(false);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let ignore = false;

    async function loadTimeline() {
      if (!isAuthReady) return;
      if (authEnabled && !session?.access_token) {
        if (!ignore) {
          setTimelineBlocks([]);
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
        const data = await loadTimelineBlocksForSession(session?.access_token, authUser?.id);
        if (!ignore) {
          setTimelineBlocks(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        if (!ignore) {
          console.error("Failed to load timeline", error);
          setLoadError("Could not load timeline.");
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    void loadTimeline();

    return () => {
      ignore = true;
    };
  }, [authEnabled, authUser?.id, isAuthReady, session?.access_token]);

  async function persistTimeline(nextBlocks) {
    try {
      setIsPersisting(true);
      const data = await saveTimelineBlocksForSession(session?.access_token, authUser?.id, nextBlocks);
      if (Array.isArray(data)) {
        setTimelineBlocks(data);
      }

      return { ok: true, timelineBlocks: Array.isArray(data) ? data : nextBlocks };
    } catch (error) {
      console.error("Failed to persist timeline", error);
      return { ok: false, error: "Could not save timeline." };
    } finally {
      setIsPersisting(false);
    }
  }

  async function addTimelineBlock(block) {
    const title = String(block?.title ?? "").trim();
    const startMonth = String(block?.startMonth ?? "").slice(0, 10);
    const endMonth = String(block?.endMonth ?? "").slice(0, 10);

    if (!title) return { ok: false, error: "Title is required." };
    if (!startMonth || !endMonth) return { ok: false, error: "Start and end months are required." };
    if (endMonth < startMonth) return { ok: false, error: "End month must be after start month." };

    const now = new Date().toISOString();
    const nextBlock = {
      id: crypto.randomUUID(),
      title,
      lane: block.lane,
      startMonth,
      endMonth,
      createdAt: now,
      updatedAt: now
    };

    return persistTimeline([...timelineBlocks, nextBlock]);
  }

  async function deleteTimelineBlock(blockId) {
    const existing = timelineBlocks.find((block) => block.id === blockId);
    if (!existing) return { ok: false, error: "Timeline block not found." };
    return persistTimeline(timelineBlocks.filter((block) => block.id !== blockId));
  }

  async function updateTimelineBlock(blockId, updates) {
    const existing = timelineBlocks.find((block) => block.id === blockId);
    if (!existing) return { ok: false, error: "Timeline block not found." };

    const title = String(updates?.title ?? existing.title).trim();
    const startMonth = String(updates?.startMonth ?? existing.startMonth).slice(0, 10);
    const endMonth = String(updates?.endMonth ?? existing.endMonth).slice(0, 10);

    if (!title) return { ok: false, error: "Title is required." };
    if (!startMonth || !endMonth) return { ok: false, error: "Start and end months are required." };
    if (endMonth < startMonth) return { ok: false, error: "End month must be after start month." };

    const updatedBlock = {
      ...existing,
      title,
      lane: updates?.lane ?? existing.lane,
      startMonth,
      endMonth,
      updatedAt: new Date().toISOString()
    };

    return persistTimeline(timelineBlocks.map((block) => (block.id === blockId ? updatedBlock : block)));
  }

  function beginLoadingTimeline() {
    setIsLoading(true);
  }

  function resetTimelineState() {
    setTimelineBlocks([]);
    setIsLoading(false);
    setLoadError("");
    setIsPersisting(false);
  }

  return {
    timelineBlocks,
    isLoading,
    isPersisting,
    loadError,
    addTimelineBlock,
    updateTimelineBlock,
    deleteTimelineBlock,
    beginLoadingTimeline,
    resetTimelineState
  };
}
