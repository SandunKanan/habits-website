import { useEffect, useState } from "react";
import {
  loadAttributesForSession,
  saveAttributesForSession
} from "../../lib/attributesClient.js";

function buildSlug(name, existingSlugs) {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "attribute";

  let candidate = base;
  let n = 2;
  while (existingSlugs.has(candidate)) {
    candidate = `${base}-${n}`;
    n += 1;
  }

  return candidate;
}

export function useAttributesStore({ authEnabled, isAuthReady, session, authUser }) {
  const [attributes, setAttributes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPersisting, setIsPersisting] = useState(false);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let ignore = false;

    async function loadAttributes() {
      if (!isAuthReady) return;
      if (authEnabled && !session?.access_token) {
        if (!ignore) {
          setAttributes([]);
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
        const data = await loadAttributesForSession(session?.access_token, authUser?.id);
        if (!ignore) {
          setAttributes(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        if (!ignore) {
          console.error("Failed to load attributes", error);
          setLoadError("Could not load attributes.");
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    void loadAttributes();

    return () => {
      ignore = true;
    };
  }, [authEnabled, authUser?.id, isAuthReady, session?.access_token]);

  async function persistAttributes(nextAttributes) {
    try {
      setIsPersisting(true);
      const data = await saveAttributesForSession(session?.access_token, authUser?.id, nextAttributes);
      if (Array.isArray(data)) {
        setAttributes(data);
      }

      return { ok: true, attributes: Array.isArray(data) ? data : nextAttributes };
    } catch (error) {
      console.error("Failed to persist attributes", error);
      return { ok: false };
    } finally {
      setIsPersisting(false);
    }
  }

  async function addAttribute({ name, decayRate }) {
    const trimmedName = String(name ?? "").trim();
    if (!trimmedName) {
      return { ok: false, error: "Attribute name is required." };
    }
    const parsedDecayRate = Number(decayRate ?? 0);
    if (!Number.isFinite(parsedDecayRate) || parsedDecayRate < 0) {
      return { ok: false, error: "Decay rate must be 0 or greater." };
    }

    const slug = buildSlug(trimmedName, new Set(attributes.map((attribute) => attribute.slug ?? attribute.id)));
    const newAttribute = {
      id: crypto.randomUUID(),
      slug,
      name: trimmedName,
      decayRate: parsedDecayRate,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const persisted = await persistAttributes([...attributes, newAttribute]);
    if (!persisted.ok) {
      return { ok: false, error: "Could not save attributes." };
    }

    return { ok: true, id: newAttribute.id };
  }

  async function updateAttribute(attributeId, { name, decayRate }) {
    const attribute = attributes.find((item) => item.id === attributeId);
    if (!attribute) {
      return { ok: false, error: "Attribute not found." };
    }

    const trimmedName = String(name ?? "").trim();
    if (!trimmedName) {
      return { ok: false, error: "Attribute name is required." };
    }
    const parsedDecayRate = Number(decayRate ?? 0);
    if (!Number.isFinite(parsedDecayRate) || parsedDecayRate < 0) {
      return { ok: false, error: "Decay rate must be 0 or greater." };
    }

    const nextAttributes = attributes.map((item) =>
      item.id !== attributeId
        ? item
        : {
            ...item,
            name: trimmedName,
            decayRate: parsedDecayRate,
            updatedAt: new Date().toISOString()
          }
    );

    const persisted = await persistAttributes(nextAttributes);
    if (!persisted.ok) {
      return { ok: false, error: "Could not save attributes." };
    }

    return { ok: true };
  }

  async function deleteAttribute(attributeId) {
    const attribute = attributes.find((item) => item.id === attributeId);
    if (!attribute) {
      return { ok: false, error: "Attribute not found." };
    }

    const persisted = await persistAttributes(attributes.filter((item) => item.id !== attributeId));
    if (!persisted.ok) {
      return { ok: false, error: "Could not save attributes." };
    }

    return { ok: true };
  }

  function beginLoadingAttributes() {
    setIsLoading(true);
  }

  function resetAttributesState() {
    setAttributes([]);
    setIsLoading(false);
    setLoadError("");
    setIsPersisting(false);
  }

  return {
    attributes,
    isLoading,
    isPersisting,
    loadError,
    addAttribute,
    updateAttribute,
    deleteAttribute,
    beginLoadingAttributes,
    resetAttributesState
  };
}
