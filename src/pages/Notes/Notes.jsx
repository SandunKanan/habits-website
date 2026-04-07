import React, { useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import "./Notes.scss";

function formatTimestamp(timestamp) {
  if (!timestamp) return "Unknown";
  const date = new Date(timestamp);
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
}

export default function Notes() {
  const { notes, onAddNote, onUpdateNote, onDeleteNote, isPersisting } = useOutletContext();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [feedback, setFeedback] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");
  const [editFeedback, setEditFeedback] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState("");

  const sortedNotes = useMemo(
    () => [...notes].sort((a, b) => String(b.updatedAt ?? "").localeCompare(String(a.updatedAt ?? ""))),
    [notes]
  );

  async function handleAddNote(event) {
    event.preventDefault();
    setFeedback("");
    setIsSaving(true);

    const result = await onAddNote({ title, body });
    if (result?.ok) {
      setTitle("");
      setBody("");
      setFeedback("Note saved.");
    } else {
      setFeedback(result?.error ?? "Could not save note.");
    }

    setIsSaving(false);
  }

  function startEdit(note) {
    setEditingId(note.id);
    setEditTitle(note.title);
    setEditBody(note.body ?? "");
    setEditFeedback("");
  }

  function cancelEdit() {
    setEditingId("");
    setEditTitle("");
    setEditBody("");
    setEditFeedback("");
  }

  async function handleSaveEdit(event) {
    event.preventDefault();
    if (!editingId) return;

    setIsSavingEdit(true);
    setEditFeedback("");
    const result = await onUpdateNote(editingId, { title: editTitle, body: editBody });
    if (result?.ok) {
      setEditingId("");
      setFeedback("Note updated.");
    } else {
      setEditFeedback(result?.error ?? "Could not update note.");
    }
    setIsSavingEdit(false);
  }

  async function handleDeleteNote(note) {
    const confirmed = window.confirm(`Delete \"${note.title}\"?`);
    if (!confirmed) return;

    setFeedback("");
    setPendingDeleteId(note.id);
    const result = await onDeleteNote(note.id);
    if (result?.ok) {
      if (editingId === note.id) {
        cancelEdit();
      }
      setFeedback("Note deleted.");
    } else {
      setFeedback(result?.error ?? "Could not delete note.");
    }
    setPendingDeleteId("");
  }

  return (
    <div className="notespage">
      <section className="notespage__hero card">
        <p className="notespage__eyebrow">Capture</p>
        <h2>Notes</h2>
        <p className="notespage__intro">
          Keep quick thoughts, observations, and longer notes in one place. Each note is timestamped
          automatically so you can come back to the context later.
        </p>
      </section>

      <section className="notespage__section card">
        <form className="notespage__form" onSubmit={handleAddNote}>
          <div className="notespage__field">
            <label htmlFor="note-title">Title</label>
            <input
              id="note-title"
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              disabled={isSaving || isPersisting}
              required
            />
          </div>
          <div className="notespage__field">
            <label htmlFor="note-body">Text</label>
            <textarea
              id="note-body"
              rows={8}
              value={body}
              onChange={(event) => setBody(event.target.value)}
              disabled={isSaving || isPersisting}
              required
            />
          </div>
          <div className="notespage__actions">
            <button type="submit" disabled={isSaving || isPersisting}>
              {isSaving || isPersisting ? "Saving..." : "Add note"}
            </button>
            {feedback ? <p className="notespage__feedback">{feedback}</p> : null}
          </div>
        </form>
      </section>

      <section className="notespage__list">
        {sortedNotes.length === 0 ? (
          <article className="notespage__empty card">
            <h3>No notes yet</h3>
            <p>Add your first note above. It will be timestamped automatically.</p>
          </article>
        ) : (
          sortedNotes.map((note) => {
            const isEditing = editingId === note.id;
            return (
              <article key={note.id} className="notespage__item card">
                {isEditing ? (
                  <form className="notespage__edit" onSubmit={handleSaveEdit}>
                    <div className="notespage__field">
                      <label htmlFor={`edit-note-title-${note.id}`}>Title</label>
                      <input
                        id={`edit-note-title-${note.id}`}
                        type="text"
                        value={editTitle}
                        onChange={(event) => setEditTitle(event.target.value)}
                        disabled={isSavingEdit || isPersisting}
                        required
                      />
                    </div>
                    <div className="notespage__field">
                      <label htmlFor={`edit-note-body-${note.id}`}>Text</label>
                      <textarea
                        id={`edit-note-body-${note.id}`}
                        rows={8}
                        value={editBody}
                        onChange={(event) => setEditBody(event.target.value)}
                        disabled={isSavingEdit || isPersisting}
                        required
                      />
                    </div>
                    <div className="notespage__actions">
                      <button type="submit" disabled={isSavingEdit || isPersisting}>
                        {isSavingEdit || isPersisting ? "Saving..." : "Save"}
                      </button>
                      <button type="button" onClick={cancelEdit} disabled={isSavingEdit || isPersisting}>
                        Cancel
                      </button>
                      {editFeedback ? <p className="notespage__feedback">{editFeedback}</p> : null}
                    </div>
                  </form>
                ) : (
                  <>
                    <div className="notespage__item-head">
                      <div>
                        <h3>{note.title}</h3>
                        <p>Updated {formatTimestamp(note.updatedAt ?? note.createdAt)}</p>
                      </div>
                      <div className="notespage__item-actions">
                        <button type="button" onClick={() => startEdit(note)} disabled={isPersisting}>
                          Edit
                        </button>
                        <button
                          type="button"
                          className="notespage__delete-btn"
                          onClick={() => handleDeleteNote(note)}
                          disabled={isPersisting}
                        >
                          {pendingDeleteId === note.id ? "Deleting..." : "Delete"}
                        </button>
                      </div>
                    </div>
                    <p className="notespage__body">{note.body}</p>
                    <div className="notespage__meta">
                      <span>Created {formatTimestamp(note.createdAt)}</span>
                    </div>
                  </>
                )}
              </article>
            );
          })
        )}
      </section>
    </div>
  );
}
