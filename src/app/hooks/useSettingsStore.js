import { useEffect, useState } from "react";
import {
  loadSettingsForSession,
  saveSettingsForSession
} from "../../lib/settingsClient.js";

function buildEmptySettings(userId) {
  return {
    userId: userId ?? "",
    highlightFocusAttributes: true,
    useAttributeDecay: true,
    createdAt: null,
    updatedAt: null
  };
}

export function useSettingsStore({ authEnabled, isAuthReady, session, authUser }) {
  const [settings, setSettings] = useState(buildEmptySettings(authUser?.id));
  const [isLoading, setIsLoading] = useState(true);
  const [isPersisting, setIsPersisting] = useState(false);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let ignore = false;

    async function loadSettings() {
      if (!isAuthReady) return;
      if (authEnabled && !session?.access_token) {
        if (!ignore) {
          setSettings(buildEmptySettings(authUser?.id));
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
        const data = await loadSettingsForSession(session?.access_token, authUser?.id);
        if (!ignore) {
          setSettings(data ?? buildEmptySettings(authUser?.id));
        }
      } catch (error) {
        if (!ignore) {
          console.error("Failed to load settings", error);
          setLoadError("Could not load settings.");
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    void loadSettings();

    return () => {
      ignore = true;
    };
  }, [authEnabled, authUser?.id, isAuthReady, session?.access_token]);

  async function saveSettings(nextSettings) {
    try {
      setIsPersisting(true);
      const data = await saveSettingsForSession(session?.access_token, authUser?.id, nextSettings);
      setSettings(data ?? buildEmptySettings(authUser?.id));
      return { ok: true, settings: data };
    } catch (error) {
      console.error("Failed to persist settings", error);
      return { ok: false, error: "Could not save settings." };
    } finally {
      setIsPersisting(false);
    }
  }

  function beginLoadingSettings() {
    setIsLoading(true);
  }

  function resetSettingsState() {
    setSettings(buildEmptySettings(""));
    setIsLoading(false);
    setLoadError("");
    setIsPersisting(false);
  }

  return {
    settings,
    isLoading,
    isPersisting,
    loadError,
    saveSettings,
    beginLoadingSettings,
    resetSettingsState
  };
}
