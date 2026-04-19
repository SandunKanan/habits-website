import React, { useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import "./Lists.scss";

function formatTimestamp(timestamp) {
  if (!timestamp) return "Unknown";
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(timestamp));
}

export default function Lists() {
  const {
    lists,
    onAddList,
    onUpdateList,
    onDeleteList,
    onAddListItem,
    onToggleListItem,
    onDeleteListItem,
    isPersisting
  } = useOutletContext();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [feedback, setFeedback] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editFeedback, setEditFeedback] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [itemDraftByListId, setItemDraftByListId] = useState({});
  const [pendingDeleteListId, setPendingDeleteListId] = useState("");
  const [pendingItemActionKey, setPendingItemActionKey] = useState("");
  const [showCompletedByListId, setShowCompletedByListId] = useState({});

  const sortedLists = useMemo(
    () => [...lists].sort((a, b) => String(b.updatedAt ?? "").localeCompare(String(a.updatedAt ?? ""))),
    [lists]
  );

  async function handleAddList(event) {
    event.preventDefault();
    setFeedback("");
    setIsSaving(true);

    const result = await onAddList({ title, description });
    if (result?.ok) {
      setTitle("");
      setDescription("");
      setFeedback("List saved.");
    } else {
      setFeedback(result?.error ?? "Could not save list.");
    }

    setIsSaving(false);
  }

  function startEdit(list) {
    setEditingId(list.id);
    setEditTitle(list.title);
    setEditDescription(list.description ?? "");
    setEditFeedback("");
  }

  function cancelEdit() {
    setEditingId("");
    setEditTitle("");
    setEditDescription("");
    setEditFeedback("");
  }

  async function handleSaveEdit(event) {
    event.preventDefault();
    if (!editingId) return;

    setEditFeedback("");
    setIsSavingEdit(true);
    const result = await onUpdateList(editingId, { title: editTitle, description: editDescription });
    if (result?.ok) {
      setEditingId("");
      setFeedback("List updated.");
    } else {
      setEditFeedback(result?.error ?? "Could not update list.");
    }
    setIsSavingEdit(false);
  }

  async function handleDeleteList(list) {
    const confirmed = window.confirm(`Delete "${list.title}"?`);
    if (!confirmed) return;

    setPendingDeleteListId(list.id);
    const result = await onDeleteList(list.id);
    if (result?.ok) {
      if (editingId === list.id) {
        cancelEdit();
      }
      setFeedback("List deleted.");
    } else {
      setFeedback(result?.error ?? "Could not delete list.");
    }
    setPendingDeleteListId("");
  }

  async function handleAddItem(listId) {
    const value = String(itemDraftByListId[listId] ?? "").trim();
    if (!value) return;

    setPendingItemActionKey(`add:${listId}`);
    const result = await onAddListItem(listId, value);
    if (result?.ok) {
      setItemDraftByListId((current) => ({ ...current, [listId]: "" }));
    } else {
      setFeedback(result?.error ?? "Could not add item.");
    }
    setPendingItemActionKey("");
  }

  async function handleToggleItem(listId, itemId) {
    setPendingItemActionKey(`toggle:${itemId}`);
    const result = await onToggleListItem(listId, itemId);
    if (!result?.ok) {
      setFeedback(result?.error ?? "Could not update item.");
    }
    setPendingItemActionKey("");
  }

  async function handleDeleteItem(listId, itemId) {
    setPendingItemActionKey(`delete:${itemId}`);
    const result = await onDeleteListItem(listId, itemId);
    if (!result?.ok) {
      setFeedback(result?.error ?? "Could not delete item.");
    }
    setPendingItemActionKey("");
  }

  function renderList(list) {
    const isEditing = editingId === list.id;
    const activeItems = (Array.isArray(list.items) ? list.items : []).filter((item) => !item.completedAt);
    const completedItems = (Array.isArray(list.items) ? list.items : []).filter((item) => Boolean(item.completedAt));
    const isShowingCompleted = Boolean(showCompletedByListId[list.id]);

    return (
      <article key={list.id} className="listspage__item card">
        {isEditing ? (
          <form className="listspage__edit" onSubmit={handleSaveEdit}>
            <input
              type="text"
              value={editTitle}
              onChange={(event) => setEditTitle(event.target.value)}
              disabled={isPersisting || isSavingEdit}
              required
            />
            <textarea
              value={editDescription}
              onChange={(event) => setEditDescription(event.target.value)}
              rows={3}
              disabled={isPersisting || isSavingEdit}
              placeholder="Optional description"
            />
            <div className="listspage__actions">
              <button type="submit" disabled={isPersisting || isSavingEdit}>
                {isPersisting || isSavingEdit ? "Saving..." : "Save"}
              </button>
              <button type="button" className="listspage__secondary-btn" onClick={cancelEdit} disabled={isPersisting || isSavingEdit}>
                Cancel
              </button>
            </div>
            {editFeedback ? <p className="listspage__feedback">{editFeedback}</p> : null}
          </form>
        ) : (
          <>
            <div className="listspage__item-head">
              <div>
                <h2>{list.title}</h2>
                {list.description ? <p>{list.description}</p> : null}
              </div>
              <div className="listspage__item-meta">
                <span>Updated {formatTimestamp(list.updatedAt)}</span>
                <div className="listspage__actions">
                  <button type="button" className="listspage__secondary-btn" onClick={() => startEdit(list)} disabled={isPersisting}>
                    Edit
                  </button>
                  <button type="button" className="listspage__danger-btn" onClick={() => handleDeleteList(list)} disabled={isPersisting || pendingDeleteListId === list.id}>
                    {pendingDeleteListId === list.id ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </div>
            </div>

            <div className="listspage__add-item">
              <input
                type="text"
                value={itemDraftByListId[list.id] ?? ""}
                onChange={(event) =>
                  setItemDraftByListId((current) => ({ ...current, [list.id]: event.target.value }))
                }
                placeholder="Add an item"
                disabled={isPersisting || pendingItemActionKey === `add:${list.id}`}
              />
              <button type="button" onClick={() => handleAddItem(list.id)} disabled={isPersisting || pendingItemActionKey === `add:${list.id}`}>
                {pendingItemActionKey === `add:${list.id}` ? "Adding..." : "Add item"}
              </button>
            </div>

            <div className="listspage__columns">
              <section className="listspage__panel">
                <div className="listspage__panel-head">
                  <h3>Current items</h3>
                  <span>{activeItems.length}</span>
                </div>
                {activeItems.length === 0 ? (
                  <p className="listspage__empty-copy">Nothing active right now.</p>
                ) : (
                  <ul className="listspage__items">
                    {activeItems.map((item) => (
                      <li key={item.id}>
                        <label>
                          <input
                            type="checkbox"
                            checked={Boolean(item.completedAt)}
                            onChange={() => handleToggleItem(list.id, item.id)}
                            disabled={isPersisting || pendingItemActionKey === `toggle:${item.id}`}
                          />
                          <span>{item.text}</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => handleDeleteItem(list.id, item.id)}
                          disabled={isPersisting || pendingItemActionKey === `delete:${item.id}`}
                        >
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="listspage__panel listspage__panel--completed">
                <div className="listspage__panel-head">
                  <h3>Completed items</h3>
                  <div className="listspage__panel-controls">
                    <span>{completedItems.length}</span>
                    <button
                      type="button"
                      className={[
                        "listspage__caret-btn",
                        isShowingCompleted ? "listspage__caret-btn--open" : ""
                      ].join(" ")}
                      onClick={() =>
                        setShowCompletedByListId((current) => ({
                          ...current,
                          [list.id]: !current[list.id]
                        }))
                      }
                      disabled={completedItems.length === 0}
                      aria-label={isShowingCompleted ? "Hide completed items" : "Show completed items"}
                      title={isShowingCompleted ? "Hide completed items" : "Show completed items"}
                    >
                      <svg viewBox="0 0 20 20" aria-hidden="true">
                        <path
                          d="M5.5 7.5 10 12l4.5-4.5"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
                {completedItems.length === 0 ? (
                  <p className="listspage__empty-copy">Nothing completed yet.</p>
                ) : isShowingCompleted ? (
                  <ul className="listspage__items listspage__items--completed">
                    {completedItems.map((item) => (
                      <li key={item.id}>
                        <label>
                          <input
                            type="checkbox"
                            checked={Boolean(item.completedAt)}
                            onChange={() => handleToggleItem(list.id, item.id)}
                            disabled={isPersisting || pendingItemActionKey === `toggle:${item.id}`}
                          />
                          <span>{item.text}</span>
                        </label>
                        <div className="listspage__actions">
                          <button
                            type="button"
                            className="listspage__secondary-btn"
                            onClick={() => handleToggleItem(list.id, item.id)}
                            disabled={isPersisting || pendingItemActionKey === `toggle:${item.id}`}
                          >
                            Undo
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteItem(list.id, item.id)}
                            disabled={isPersisting || pendingItemActionKey === `delete:${item.id}`}
                          >
                            Remove
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="listspage__empty-copy">Completed items are hidden.</p>
                )}
              </section>
            </div>
          </>
        )}
      </article>
    );
  }

  return (
    <div className="listspage">
      <section className="listspage__composer card">
        <div className="listspage__composer-head">
          <div>
            <h2>Create list</h2>
            <p>Keep a reusable list around and swap items in and out over time.</p>
          </div>
        </div>
        <form className="listspage__composer-form" onSubmit={handleAddList}>
          <input
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Shopping list"
            disabled={isPersisting || isSaving}
            required
          />
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={2}
            placeholder="Optional description"
            disabled={isPersisting || isSaving}
          />
          <button type="submit" disabled={isPersisting || isSaving}>
            {isPersisting || isSaving ? "Saving..." : "Add list"}
          </button>
        </form>
        {feedback ? <p className="listspage__feedback">{feedback}</p> : null}
      </section>

      {sortedLists.length === 0 ? (
        <section className="listspage__empty card">
          <h2>No lists yet</h2>
          <p>Create your first persistent list above. Good fits are shopping lists, to-buy lists, packing lists, and recurring errands.</p>
        </section>
      ) : (
        <section className="listspage__grid">{sortedLists.map(renderList)}</section>
      )}
    </div>
  );
}
