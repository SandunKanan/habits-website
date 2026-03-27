import { useEffect, useState } from "react";
import {
  loadFocusForSession,
  saveFocusForSession
} from "../../lib/focusClient.js";

function buildEmptyFocus(userId) {
  return {
    userId: userId ?? "",
    title: "",
    startDate: "",
    endDate: "",
    whyNow: "",
    endState: "",
    currentObstacles: "",
    createdAt: null,
    updatedAt: null
  };
}

export function useFocusStore({ authEnabled, isAuthReady, session, authUser }) {
  const [focus, setFocus] = useState(buildEmptyFocus(authUser?.id));
  const [isLoading, setIsLoading] = useState(true);
  const [isPersisting, setIsPersisting] = useState(false);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let ignore = false;

    async function loadFocus() {
      if (!isAuthReady) return;
      if (authEnabled && !session?.access_token) {
        if (!ignore) {
          setFocus(buildEmptyFocus(authUser?.id));
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
          setFocus(data ?? buildEmptyFocus(authUser?.id));
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

  async function saveFocus(nextFocus) {
    try {
      setIsPersisting(true);
      const data = await saveFocusForSession(session?.access_token, authUser?.id, nextFocus);
      setFocus(data ?? buildEmptyFocus(authUser?.id));
      return { ok: true, focus: data };
    } catch (error) {
      console.error("Failed to persist focus", error);
      return { ok: false, error: "Could not save focus." };
    } finally {
      setIsPersisting(false);
    }
  }

  function beginLoadingFocus() {
    setIsLoading(true);
  }

  function resetFocusState() {
    setFocus(buildEmptyFocus(""));
    setIsLoading(false);
    setLoadError("");
    setIsPersisting(false);
  }

  return {
    focus,
    isLoading,
    isPersisting,
    loadError,
    saveFocus,
    beginLoadingFocus,
    resetFocusState
  };
}
