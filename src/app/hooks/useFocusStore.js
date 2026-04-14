import { useEffect, useMemo, useState } from "react";
import {
  deleteFocusForSession,
  loadFocusForSession,
  saveFocusForSession
} from "../../lib/focusClient.js";
import { getCurrentFocusBlock } from "../../lib/focusUtils.js";
import { startOfTodayLocalISO } from "../../lib/date.js";

export function useFocusStore({ authEnabled, isAuthReady, session, authUser }) {
  const [focusBlocks, setFocusBlocks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPersisting, setIsPersisting] = useState(false);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let ignore = false;

    async function loadFocus() {
      if (!isAuthReady) return;
      if (authEnabled && !session?.access_token) {
        if (!ignore) {
          setFocusBlocks([]);
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
        const data = await loadFocusForSession(session?.access_token, authUser?.id);
        if (!ignore) {
          setFocusBlocks(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        if (!ignore) {
          console.error("Failed to load focus", error);
          setLoadError("Could not load focus.");
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    void loadFocus();

    return () => {
      ignore = true;
    };
  }, [authEnabled, authUser?.id, isAuthReady, session?.access_token]);

  const focus = useMemo(() => getCurrentFocusBlock(focusBlocks, startOfTodayLocalISO()), [focusBlocks]);

  async function saveFocus(nextFocus) {
    try {
      setIsPersisting(true);
      const data = await saveFocusForSession(session?.access_token, authUser?.id, nextFocus);
      setFocusBlocks(Array.isArray(data) ? data : []);
      return { ok: true, focus: data };
    } catch (error) {
      console.error("Failed to persist focus", error);
      return { ok: false, error: "Could not save focus." };
    } finally {
      setIsPersisting(false);
    }
  }

  async function deleteFocus(focusId) {
    try {
      setIsPersisting(true);
      const data = await deleteFocusForSession(session?.access_token, authUser?.id, focusId);
      setFocusBlocks(Array.isArray(data) ? data : []);
      return { ok: true };
    } catch (error) {
      console.error("Failed to delete focus", error);
      return { ok: false, error: "Could not delete focus." };
    } finally {
      setIsPersisting(false);
    }
  }

  function beginLoadingFocus() {
    setIsLoading(true);
  }

  function resetFocusState() {
    setFocusBlocks([]);
    setIsLoading(false);
    setLoadError("");
    setIsPersisting(false);
  }

  return {
    focus,
    focusBlocks,
    isLoading,
    isPersisting,
    loadError,
    saveFocus,
    deleteFocus,
    beginLoadingFocus,
    resetFocusState
  };
}
