import React, { useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import "./Journal.scss";

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

export default function Journal() {
  const { journalEntries, onAddJournalEntry, onUpdateJournalEntry, onDeleteJournalEntry, isPersisting } =
    useOutletContext();
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

  const sortedEntries = useMemo(
    () =>
      [...journalEntries].sort((a, b) => String(b.updatedAt ?? "").localeCompare(String(a.updatedAt ?? ""))),
    [journalEntries]
  );

  async function handleAddEntry(event) {
    event.preventDefault();
    setFeedback("");
    setIsSaving(true);

    const result = await onAddJournalEntry({ title, body });
    if (result?.ok) {
      setTitle("");
      setBody("");
      setFeedback("Journal entry saved.");
    } else {
      setFeedback(result?.error ?? "Could not save journal entry.");
    }

    setIsSaving(false);
  }

  function startEdit(entry) {
    setEditingId(entry.id);
    setEditTitle(entry.title ?? "");
    setEditBody(entry.body ?? "");
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

    setEditFeedback("");
    setIsSavingEdit(true);
    const result = await onUpdateJournalEntry(editingId, {
      title: editTitle,
      body: editBody
    });

    if (result?.ok) {
      setEditingId("");
      setFeedback("Journal entry updated.");
    } else {
      setEditFeedback(result?.error ?? "Could not update journal entry.");
    }

    setIsSavingEdit(false);
  }

  async function handleDeleteEntry(entry) {
    const confirmed = window.confirm(`Delete this journal entry${entry.title ? `: "${entry.title}"` : ""}?`);
    if (!confirmed) return;

    setFeedback("");
    setPendingDeleteId(entry.id);
    const result = await onDeleteJournalEntry(entry.id);

    if (result?.ok) {
      if (editingId === entry.id) {
        cancelEdit();
      }
      setFeedback("Journal entry deleted.");
    } else {
      setFeedback(result?.error ?? "Could not delete journal entry.");
    }

    setPendingDeleteId("");
  }

  return (
    <div className="journalpage">
      <section className="journalpage__section card">
        <form className="journalpage__form" onSubmit={handleAddEntry}>
          <div className="journalpage__field">
            <label htmlFor="journal-title">Title</label>
            <input
              id="journal-title"
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              disabled={isSaving || isPersisting}
            />
          </div>

          <div className="journalpage__field">
            <label htmlFor="journal-body">Entry</label>
            <textarea
              id="journal-body"
              rows={8}
              value={body}
              onChange={(event) => setBody(event.target.value)}
              disabled={isSaving || isPersisting}
              required
            />
          </div>

          <div className="journalpage__actions">
            <button type="submit" disabled={isSaving || isPersisting}>
              {isSaving || isPersisting ? "Saving..." : "Save entry"}
            </button>
            {feedback ? <p className="journalpage__feedback">{feedback}</p> : null}
          </div>
        </form>
      </section>

      <section className="journalpage__list">
        {sortedEntries.length === 0 ? (
          <article className="journalpage__empty card">
            <h3>No journal entries yet</h3>
            <p>When you want to reflect on the day or capture something deeper, start here.</p>
          </article>
        ) : (
          sortedEntries.map((entry) => {
            const isEditing = editingId === entry.id;

            return (
              <article key={entry.id} className="journalpage__item card">
                {isEditing ? (
                  <form className="journalpage__edit" onSubmit={handleSaveEdit}>
                    <div className="journalpage__field">
                      <label htmlFor={`journal-edit-title-${entry.id}`}>Title</label>
                      <input
                        id={`journal-edit-title-${entry.id}`}
                        type="text"
                        value={editTitle}
                        onChange={(event) => setEditTitle(event.target.value)}
                        disabled={isSavingEdit || isPersisting}
                      />
                    </div>
                    <div className="journalpage__field">
                      <label htmlFor={`journal-edit-body-${entry.id}`}>Entry</label>
                      <textarea
                        id={`journal-edit-body-${entry.id}`}
                        rows={8}
                        value={editBody}
                        onChange={(event) => setEditBody(event.target.value)}
                        disabled={isSavingEdit || isPersisting}
                        required
                      />
                    </div>
                    <div className="journalpage__actions">
                      <button type="submit" disabled={isSavingEdit || isPersisting}>
                        {isSavingEdit || isPersisting ? "Saving..." : "Save"}
                      </button>
                      <button type="button" onClick={cancelEdit} disabled={isSavingEdit || isPersisting}>
                        Cancel
                      </button>
                      {editFeedback ? <p className="journalpage__feedback">{editFeedback}</p> : null}
                    </div>
                  </form>
                ) : (
                  <>
                    <div className="journalpage__item-head">
                      <div>
                        <h3>{entry.title || "Untitled entry"}</h3>
                        <p>{formatTimestamp(entry.createdAt)}</p>
                      </div>
                      <div className="journalpage__item-actions">
                        <button type="button" onClick={() => startEdit(entry)} disabled={isPersisting}>
                          Edit
                        </button>
                        <button
                          type="button"
                          className="journalpage__delete-btn"
                          onClick={() => handleDeleteEntry(entry)}
                          disabled={isPersisting}
                        >
                          {pendingDeleteId === entry.id ? "Deleting..." : "Delete"}
                        </button>
                      </div>
                    </div>
                    <p className="journalpage__body">{entry.body}</p>
                    <div className="journalpage__meta">
                      <span>Created: {formatTimestamp(entry.createdAt)}</span>
                      <span>Updated: {formatTimestamp(entry.updatedAt)}</span>
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
