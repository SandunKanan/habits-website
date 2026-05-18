import { useEffect, useState } from "react";
import {
  loadTodayUiStateForSession,
  saveTodayUiStateForSession
} from "../../lib/todayUiClient.js";

function buildEmptyTodayUiState(userId, entryDate) {
  return {
    userId: userId ?? "",
    entryDate: entryDate ?? "",
    mantraChecked: false,
    createdAt: null,
    updatedAt: null
  };
}

export function useTodayUiStore({ authEnabled, isAuthReady, session, authUser, todayISO }) {
  const [todayUiState, setTodayUiState] = useState(buildEmptyTodayUiState(authUser?.id, todayISO));
  const [isLoading, setIsLoading] = useState(true);
  const [isPersisting, setIsPersisting] = useState(false);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let ignore = false;

    async function loadTodayUiState() {
      if (!isAuthReady) return;
      if (authEnabled && !session?.access_token) {
        if (!ignore) {
          setTodayUiState(buildEmptyTodayUiState(authUser?.id, todayISO));
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
        const data = await loadTodayUiStateForSession(session?.access_token, authUser?.id, todayISO);
        if (!ignore) {
          setTodayUiState(data ?? buildEmptyTodayUiState(authUser?.id, todayISO));
        }
      } catch (error) {
        if (!ignore) {
          console.error("Failed to load today UI state", error);
          setLoadError("Could not load today state.");
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    void loadTodayUiState();

    return () => {
      ignore = true;
    };
  }, [authEnabled, authUser?.id, isAuthReady, session?.access_token, todayISO]);

  async function saveTodayUiState(nextState) {
    try {
      setIsPersisting(true);
      const data = await saveTodayUiStateForSession(session?.access_token, authUser?.id, todayISO, nextState);
      setTodayUiState(data ?? buildEmptyTodayUiState(authUser?.id, todayISO));
      return { ok: true, todayUiState: data };
    } catch (error) {
      console.error("Failed to persist today UI state", error);
      return { ok: false, error: "Could not save today state." };
    } finally {
      setIsPersisting(false);
    }
  }

  async function setTodayMantraChecked(mantraChecked) {
    return saveTodayUiState({
      ...todayUiState,
      userId: authUser?.id ?? todayUiState.userId,
      entryDate: todayISO,
      mantraChecked: Boolean(mantraChecked)
    });
  }

  function beginLoadingTodayUi() {
    setIsLoading(true);
  }

  function resetTodayUiState() {
    setTodayUiState(buildEmptyTodayUiState("", todayISO));
    setIsLoading(false);
    setLoadError("");
    setIsPersisting(false);
  }

  return {
    todayUiState,
    isLoading,
    isPersisting,
    loadError,
    setTodayMantraChecked,
    beginLoadingTodayUi,
    resetTodayUiState
  };
}
