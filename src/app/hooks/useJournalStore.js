import { useEffect, useState } from "react";
import {
  loadJournalEntriesForSession,
  saveJournalEntriesForSession
} from "../../lib/journalClient.js";

export function useJournalStore({ authEnabled, isAuthReady, session, authUser }) {
  const [journalEntries, setJournalEntries] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPersisting, setIsPersisting] = useState(false);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let ignore = false;

    async function loadJournal() {
      if (!isAuthReady) return;
      if (authEnabled && !session?.access_token) {
        if (!ignore) {
          setJournalEntries([]);
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
        const data = await loadJournalEntriesForSession(session?.access_token, authUser?.id);
        if (!ignore) {
          setJournalEntries(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        if (!ignore) {
          console.error("Failed to load journal", error);
          setLoadError("Could not load journal.");
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    void loadJournal();

    return () => {
      ignore = true;
    };
  }, [authEnabled, authUser?.id, isAuthReady, session?.access_token]);

  async function persistJournalEntries(nextEntries) {
    try {
      setIsPersisting(true);
      const data = await saveJournalEntriesForSession(session?.access_token, authUser?.id, nextEntries);
      if (Array.isArray(data)) {
        setJournalEntries(data);
      }
      return { ok: true, entries: Array.isArray(data) ? data : nextEntries };
    } catch (error) {
      console.error("Failed to persist journal entries", error);
      return { ok: false, error: "Could not save journal." };
    } finally {
      setIsPersisting(false);
    }
  }

  async function addJournalEntry({ title, body }) {
    const trimmedTitle = String(title ?? "").trim();
    const trimmedBody = String(body ?? "").trim();
    if (!trimmedBody) {
      return { ok: false, error: "Journal text is required." };
    }

    const now = new Date().toISOString();
    const newEntry = {
      id: crypto.randomUUID(),
      title: trimmedTitle,
      body: trimmedBody,
      createdAt: now,
      updatedAt: now
    };

    const persisted = await persistJournalEntries([newEntry, ...journalEntries]);
    if (!persisted.ok) return persisted;
    return { ok: true, id: newEntry.id };
  }

  async function updateJournalEntry(entryId, { title, body }) {
    const existingEntry = journalEntries.find((entry) => entry.id === entryId);
    if (!existingEntry) {
      return { ok: false, error: "Journal entry not found." };
    }

    const trimmedTitle = String(title ?? "").trim();
    const trimmedBody = String(body ?? "").trim();
    if (!trimmedBody) {
      return { ok: false, error: "Journal text is required." };
    }

    const nextEntries = journalEntries.map((entry) =>
      entry.id !== entryId
        ? entry
        : {
            ...entry,
            title: trimmedTitle,
            body: trimmedBody,
            updatedAt: new Date().toISOString()
          }
    );

    return persistJournalEntries(nextEntries);
  }

  async function deleteJournalEntry(entryId) {
    const existingEntry = journalEntries.find((entry) => entry.id === entryId);
    if (!existingEntry) {
      return { ok: false, error: "Journal entry not found." };
    }

    return persistJournalEntries(journalEntries.filter((entry) => entry.id !== entryId));
  }

  function beginLoadingJournal() {
    setIsLoading(true);
  }

  function resetJournalState() {
    setJournalEntries([]);
    setIsLoading(false);
    setLoadError("");
    setIsPersisting(false);
  }

  return {
    journalEntries,
    isLoading,
    isPersisting,
    loadError,
    addJournalEntry,
    updateJournalEntry,
    deleteJournalEntry,
    beginLoadingJournal,
    resetJournalState
  };
}
