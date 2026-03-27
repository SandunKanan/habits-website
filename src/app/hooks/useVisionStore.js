import { useEffect, useState } from "react";
import {
  loadVisionForSession,
  saveVisionForSession
} from "../../lib/visionClient.js";

function buildEmptyVision(userId) {
  return {
    userId: userId ?? "",
    idealSelf: "",
    idealLife: "",
    currentFocus: "",
    focusIntention: "",
    focusViewEnabled: true,
    focusAttributeIds: [],
    createdAt: null,
    updatedAt: null
  };
}

export function useVisionStore({ authEnabled, isAuthReady, session, authUser }) {
  const [vision, setVision] = useState(buildEmptyVision(authUser?.id));
  const [isLoading, setIsLoading] = useState(true);
  const [isPersisting, setIsPersisting] = useState(false);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let ignore = false;

    async function loadVision() {
      if (!isAuthReady) return;
      if (authEnabled && !session?.access_token) {
        if (!ignore) {
          setVision(buildEmptyVision(authUser?.id));
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
        const data = await loadVisionForSession(session?.access_token, authUser?.id);
        if (!ignore) {
          setVision(data ?? buildEmptyVision(authUser?.id));
        }
      } catch (error) {
        if (!ignore) {
          console.error("Failed to load vision", error);
          setLoadError("Could not load vision.");
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    void loadVision();

    return () => {
      ignore = true;
    };
  }, [authEnabled, authUser?.id, isAuthReady, session?.access_token]);

  async function saveVision(nextVision) {
    try {
      setIsPersisting(true);
      const data = await saveVisionForSession(session?.access_token, authUser?.id, nextVision);
      setVision(data ?? buildEmptyVision(authUser?.id));
      return { ok: true, vision: data };
    } catch (error) {
      console.error("Failed to persist vision", error);
      return { ok: false, error: "Could not save vision." };
    } finally {
      setIsPersisting(false);
    }
  }

  function beginLoadingVision() {
    setIsLoading(true);
  }

  function resetVisionState() {
    setVision(buildEmptyVision(""));
    setIsLoading(false);
    setLoadError("");
    setIsPersisting(false);
  }

  return {
    vision,
    isLoading,
    isPersisting,
    loadError,
    saveVision,
    beginLoadingVision,
    resetVisionState
  };
}
