import { useEffect, useState } from "react";
import { loadDomainsForSession, saveDomainsForSession } from "../../lib/domainsClient.js";

function buildSlug(name, existingSlugs) {
  const base =
    String(name ?? "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "domain";

  let candidate = base;
  let n = 2;
  while (existingSlugs.has(candidate)) {
    candidate = `${base}-${n}`;
    n += 1;
  }

  return candidate;
}

function collectDescendantIds(domains, rootId) {
  const descendants = new Set();
  const queue = [rootId];

  while (queue.length > 0) {
    const currentId = queue.shift();
    for (const domain of domains) {
      if (domain.parentId === currentId && !descendants.has(domain.id)) {
        descendants.add(domain.id);
        queue.push(domain.id);
      }
    }
  }

  return descendants;
}

export function useDomainsStore({ authEnabled, isAuthReady, session, authUser }) {
  const [domains, setDomains] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPersisting, setIsPersisting] = useState(false);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let ignore = false;

    async function loadDomains() {
      if (!isAuthReady) return;
      if (authEnabled && !session?.access_token) {
        if (!ignore) {
          setDomains([]);
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
        const data = await loadDomainsForSession(session?.access_token, authUser?.id);
        if (!ignore) {
          setDomains(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        if (!ignore) {
          console.error("Failed to load domains", error);
          setLoadError("Could not load domains.");
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    void loadDomains();

    return () => {
      ignore = true;
    };
  }, [authEnabled, authUser?.id, isAuthReady, session?.access_token]);

  async function persistDomains(nextDomains) {
    try {
      setIsPersisting(true);
      const data = await saveDomainsForSession(session?.access_token, authUser?.id, nextDomains);
      if (Array.isArray(data)) {
        setDomains(data);
      }

      return { ok: true, domains: Array.isArray(data) ? data : nextDomains };
    } catch (error) {
      console.error("Failed to persist domains", error);
      return { ok: false, error: error instanceof Error ? error.message : "Could not save domains." };
    } finally {
      setIsPersisting(false);
    }
  }

  async function addDomain({ name, parentId, notes, scoreOutOfTen }) {
    const trimmedName = String(name ?? "").trim();
    if (!trimmedName) {
      return { ok: false, error: "Domain name is required." };
    }

    if (parentId && !domains.some((domain) => domain.id === parentId)) {
      return { ok: false, error: "Parent domain not found." };
    }

    const normalizedScore = normalizeDomainScore(null, scoreOutOfTen);
    if (normalizedScore.error) {
      return { ok: false, error: normalizedScore.error };
    }

    const now = new Date().toISOString();
    const newDomain = {
      id: crypto.randomUUID(),
      slug: buildSlug(trimmedName, new Set(domains.map((domain) => domain.slug ?? domain.id))),
      name: trimmedName,
      parentId: String(parentId ?? ""),
      notes: String(notes ?? "").trim(),
      scoreOutOfTen: normalizedScore.value,
      sortOrder: domains.length,
      createdAt: now,
      updatedAt: now
    };

    const persisted = await persistDomains([...domains, newDomain]);
    if (!persisted.ok) {
      return { ok: false, error: persisted.error ?? "Could not save domains." };
    }

    return { ok: true, id: newDomain.id };
  }

  async function updateDomain(domainId, updates) {
    const existingDomain = domains.find((domain) => domain.id === domainId);
    if (!existingDomain) {
      return { ok: false, error: "Domain not found." };
    }

    const trimmedName = String(updates?.name ?? existingDomain.name ?? "").trim();
    if (!trimmedName) {
      return { ok: false, error: "Domain name is required." };
    }

    const nextParentId = String(updates?.parentId ?? existingDomain.parentId ?? "");
    if (nextParentId === domainId) {
      return { ok: false, error: "A domain cannot be its own parent." };
    }

    const descendantIds = collectDescendantIds(domains, domainId);
    if (nextParentId && descendantIds.has(nextParentId)) {
      return { ok: false, error: "A domain cannot move inside one of its descendants." };
    }

    if (nextParentId && !domains.some((domain) => domain.id === nextParentId)) {
      return { ok: false, error: "Parent domain not found." };
    }

    const normalizedScore = normalizeDomainScore(existingDomain.scoreOutOfTen, updates?.scoreOutOfTen);
    if (normalizedScore.error) {
      return { ok: false, error: normalizedScore.error };
    }

    const nextDomains = domains.map((domain) =>
      domain.id !== domainId
        ? domain
        : {
            ...domain,
            name: trimmedName,
            parentId: nextParentId,
            notes: String(updates?.notes ?? domain.notes ?? "").trim(),
            scoreOutOfTen: normalizedScore.value,
            updatedAt: new Date().toISOString()
          }
    );

    const persisted = await persistDomains(nextDomains);
    if (!persisted.ok) {
      return { ok: false, error: persisted.error ?? "Could not save domains." };
    }

    return { ok: true };
  }

  async function deleteDomain(domainId) {
    const existingDomain = domains.find((domain) => domain.id === domainId);
    if (!existingDomain) {
      return { ok: false, error: "Domain not found." };
    }

    const descendantIds = collectDescendantIds(domains, domainId);
    const idsToRemove = new Set([domainId, ...descendantIds]);
    const persisted = await persistDomains(domains.filter((domain) => !idsToRemove.has(domain.id)));
    if (!persisted.ok) {
      return { ok: false, error: persisted.error ?? "Could not save domains." };
    }

    return { ok: true };
  }

  function beginLoadingDomains() {
    setIsLoading(true);
  }

  function resetDomainsState() {
    setDomains([]);
    setIsLoading(false);
    setLoadError("");
    setIsPersisting(false);
  }

  return {
    domains,
    isLoading,
    isPersisting,
    loadError,
    addDomain,
    updateDomain,
    deleteDomain,
    beginLoadingDomains,
    resetDomainsState
  };
}

function normalizeDomainScore(currentValue, nextValue) {
  const valueToUse = nextValue ?? currentValue ?? null;
  if (valueToUse === null || valueToUse === undefined || valueToUse === "") {
    return { value: null };
  }

  const parsed = Number(valueToUse);
  if (!Number.isFinite(parsed)) {
    return { error: "Score must be a number between 0 and 10." };
  }

  if (parsed < 0 || parsed > 10) {
    return { error: "Score must be between 0 and 10." };
  }

  return { value: parsed };
}
