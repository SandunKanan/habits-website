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

  async function addNote({ title, mode, body, bulletItems, tags }) {
    const trimmedTitle = String(title ?? "").trim();
    const normalizedMode = mode === "bullet_list" ? "bullet_list" : "text";
    const trimmedBody = normalizedMode === "text" ? String(body ?? "").trim() : "";
    const normalizedBulletItems = normalizeBulletItems(bulletItems);
    const normalizedTags = normalizeTags(tags);
    if (!trimmedTitle) return { ok: false, error: "Title is required." };
    if (normalizedMode === "text" && !trimmedBody) return { ok: false, error: "Note text is required." };
    if (normalizedMode === "bullet_list" && normalizedBulletItems.length === 0) {
      return { ok: false, error: "Add at least one bullet item." };
    }

    const now = new Date().toISOString();
    const newNote = {
      id: crypto.randomUUID(),
      title: trimmedTitle,
      mode: normalizedMode,
      body: trimmedBody,
      bulletItems: normalizedBulletItems,
      tags: normalizedTags,
      archivedAt: null,
      createdAt: now,
      updatedAt: now
    };

    const persisted = await persistNotes([newNote, ...notes]);
    if (!persisted.ok) return persisted;
    return { ok: true, id: newNote.id };
  }

  async function updateNote(noteId, { title, mode, body, bulletItems, tags }) {
    const trimmedTitle = String(title ?? "").trim();
    const normalizedMode = mode === "bullet_list" ? "bullet_list" : "text";
    const trimmedBody = normalizedMode === "text" ? String(body ?? "").trim() : "";
    const normalizedBulletItems = normalizeBulletItems(bulletItems);
    const normalizedTags = normalizeTags(tags);
    if (!trimmedTitle) return { ok: false, error: "Title is required." };
    if (normalizedMode === "text" && !trimmedBody) return { ok: false, error: "Note text is required." };
    if (normalizedMode === "bullet_list" && normalizedBulletItems.length === 0) {
      return { ok: false, error: "Add at least one bullet item." };
    }

    const existingNote = notes.find((note) => note.id === noteId);
    if (!existingNote) return { ok: false, error: "Note not found." };

    const nextNotes = notes.map((note) =>
      note.id !== noteId
        ? note
        : {
            ...note,
            title: trimmedTitle,
            mode: normalizedMode,
            body: trimmedBody,
            bulletItems: normalizedBulletItems,
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

  async function archiveNote(noteId) {
    const existingNote = notes.find((note) => note.id === noteId);
    if (!existingNote) return { ok: false, error: "Note not found." };

    const now = new Date().toISOString();
    const nextNotes = notes.map((note) =>
      note.id !== noteId
        ? note
        : {
            ...note,
            archivedAt: now,
            updatedAt: now
          }
    );

    return persistNotes(nextNotes);
  }

  async function unarchiveNote(noteId) {
    const existingNote = notes.find((note) => note.id === noteId);
    if (!existingNote) return { ok: false, error: "Note not found." };

    const now = new Date().toISOString();
    const nextNotes = notes.map((note) =>
      note.id !== noteId
        ? note
        : {
            ...note,
            archivedAt: null,
            updatedAt: now
          }
    );

    return persistNotes(nextNotes);
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
    archiveNote,
    unarchiveNote,
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

function normalizeBulletItems(value) {
  return (Array.isArray(value) ? value : [])
    .map((item) => String(item ?? "").trim())
    .filter(Boolean);
}
