import { useEffect, useState } from "react";
import { loadNotesForSession, saveNotesForSession } from "../../lib/notesClient.js";

export function useNotesStore({ authEnabled, isAuthReady, session, authUser }) {
  const [notes, setNotes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPersisting, setIsPersisting] = useState(false);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let ignore = false;

    async function loadNotes() {
      if (!isAuthReady) return;
      if (authEnabled && !session?.access_token) {
        if (!ignore) {
          setNotes([]);
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
        const data = await loadNotesForSession(session?.access_token, authUser?.id);
        if (!ignore) {
          setNotes(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        if (!ignore) {
          console.error("Failed to load notes", error);
          setLoadError("Could not load notes.");
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    void loadNotes();

    return () => {
      ignore = true;
    };
  }, [authEnabled, authUser?.id, isAuthReady, session?.access_token]);

  async function persistNotes(nextNotes) {
    try {
      setIsPersisting(true);
      const data = await saveNotesForSession(session?.access_token, authUser?.id, nextNotes);
      if (Array.isArray(data)) {
        setNotes(data);
      }
      return { ok: true, notes: Array.isArray(data) ? data : nextNotes };
    } catch (error) {
      console.error("Failed to persist notes", error);
      return { ok: false, error: "Could not save notes." };
    } finally {
      setIsPersisting(false);
    }
  }

  async function addNote({ title, body, tags }) {
    const trimmedTitle = String(title ?? "").trim();
    const trimmedBody = String(body ?? "").trim();
    const normalizedTags = normalizeTags(tags);
    if (!trimmedTitle) return { ok: false, error: "Title is required." };
    if (!trimmedBody) return { ok: false, error: "Note text is required." };

    const now = new Date().toISOString();
    const newNote = {
      id: crypto.randomUUID(),
      title: trimmedTitle,
      body: trimmedBody,
      tags: normalizedTags,
      createdAt: now,
      updatedAt: now
    };

    const persisted = await persistNotes([newNote, ...notes]);
    if (!persisted.ok) return persisted;
    return { ok: true, id: newNote.id };
  }

  async function updateNote(noteId, { title, body, tags }) {
    const trimmedTitle = String(title ?? "").trim();
    const trimmedBody = String(body ?? "").trim();
    const normalizedTags = normalizeTags(tags);
    if (!trimmedTitle) return { ok: false, error: "Title is required." };
    if (!trimmedBody) return { ok: false, error: "Note text is required." };

    const existingNote = notes.find((note) => note.id === noteId);
    if (!existingNote) return { ok: false, error: "Note not found." };

    const nextNotes = notes.map((note) =>
      note.id !== noteId
        ? note
        : {
            ...note,
            title: trimmedTitle,
            body: trimmedBody,
            tags: normalizedTags,
            updatedAt: new Date().toISOString()
          }
    );

    return persistNotes(nextNotes);
  }

  async function deleteNote(noteId) {
    const existingNote = notes.find((note) => note.id === noteId);
    if (!existingNote) return { ok: false, error: "Note not found." };
    return persistNotes(notes.filter((note) => note.id !== noteId));
  }

  function beginLoadingNotes() {
    setIsLoading(true);
  }

  function resetNotesState() {
    setNotes([]);
    setIsLoading(false);
    setLoadError("");
    setIsPersisting(false);
  }

  return {
    notes,
    isLoading,
    isPersisting,
    loadError,
    addNote,
    updateNote,
    deleteNote,
    beginLoadingNotes,
    resetNotesState
  };
}

function normalizeTags(value) {
  const rawTags = Array.isArray(value) ? value : String(value ?? "").split(",");
  return rawTags
    .map((tag) => String(tag ?? "").trim().toLowerCase())
    .filter(Boolean)
    .filter((tag, index, collection) => collection.indexOf(tag) === index);
}
