import React, { useState } from "react";
import { useOutletContext } from "react-router-dom";
import "./Attributes.scss";

export default function Attributes() {
  const {
    attributes,
    onAddAttribute,
    onUpdateAttribute,
    onDeleteAttribute,
    isPersisting
  } = useOutletContext();
  const [name, setName] = useState("");
  const [feedback, setFeedback] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editFeedback, setEditFeedback] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState("");

  async function handleAddAttribute(e) {
    e.preventDefault();
    setFeedback("");
    setIsSaving(true);

    const result = await onAddAttribute({ name });
    if (result?.ok) {
      setName("");
      setFeedback("Attribute added.");
    } else {
      setFeedback(result?.error ?? "Could not add attribute.");
    }

    setIsSaving(false);
  }

  function startEdit(attribute) {
    setEditingId(attribute.id);
    setEditName(attribute.name);
    setEditFeedback("");
  }

  function cancelEdit() {
    setEditingId(null);
    setEditName("");
    setEditFeedback("");
  }

  async function handleSaveEdit(e) {
    e.preventDefault();
    if (!editingId) return;

    setIsSavingEdit(true);
    setEditFeedback("");

    const result = await onUpdateAttribute(editingId, { name: editName });
    if (result?.ok) {
      setEditingId(null);
      setFeedback("Attribute updated.");
    } else {
      setEditFeedback(result?.error ?? "Could not update attribute.");
    }

    setIsSavingEdit(false);
  }

  async function handleDeleteAttribute(attribute) {
    const confirmed = window.confirm(`Delete "${attribute.name}"?`);
    if (!confirmed) return;

    setFeedback("");
    setPendingDeleteId(attribute.id);
    const result = await onDeleteAttribute(attribute.id);

    if (result?.ok) {
      if (editingId === attribute.id) {
        cancelEdit();
      }
      setFeedback("Attribute deleted.");
    } else {
      setFeedback(result?.error ?? "Could not delete attribute.");
    }

    setPendingDeleteId("");
  }

  return (
    <div className="attributes">
      <section className="attributes__intro card">
        <p className="attributes__eyebrow">Growth areas</p>
        <h2>Build your attributes library</h2>
        <p className="attributes__copy">
          Attributes are the areas your habits will eventually strengthen over time, like Fitness,
          Focus, or Calm. For now, you can create and organize them here before we connect habits,
          weights, and decay.
        </p>

        <form className="attributes__form" onSubmit={handleAddAttribute}>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Add attribute"
            disabled={isSaving || isPersisting}
            required
          />
          <button type="submit" disabled={isSaving || isPersisting}>
            {isSaving || isPersisting ? "Saving..." : "Add attribute"}
          </button>
        </form>

        {feedback ? <p className="attributes__feedback">{feedback}</p> : null}
      </section>

      <section className="attributes__list">
        {attributes.length === 0 ? (
          <article className="attributes__empty card">
            <p className="attributes__empty-eyebrow">No attributes yet</p>
            <h3>Create your first one.</h3>
            <p className="attributes__empty-copy">
              Try starting with a few broad areas like Fitness, Focus, or Energy.
            </p>
          </article>
        ) : (
          attributes.map((attribute) => {
            const isEditing = editingId === attribute.id;

            return (
              <article key={attribute.id} className="attributes__item card">
                {isEditing ? (
                  <form className="attributes__edit" onSubmit={handleSaveEdit}>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      disabled={isSavingEdit || isPersisting}
                      required
                    />
                    <div className="attributes__edit-actions">
                      <button type="submit" disabled={isSavingEdit || isPersisting}>
                        {isSavingEdit || isPersisting ? "Saving..." : "Save"}
                      </button>
                      <button type="button" onClick={cancelEdit} disabled={isSavingEdit || isPersisting}>
                        Cancel
                      </button>
                    </div>
                    {editFeedback ? <p className="attributes__feedback">{editFeedback}</p> : null}
                  </form>
                ) : (
                  <>
                    <div className="attributes__item-head">
                      <div>
                        <h3>{attribute.name}</h3>
                        <p>{attribute.slug}</p>
                      </div>
                      <div className="attributes__item-actions">
                        <button type="button" onClick={() => startEdit(attribute)} disabled={isPersisting}>
                          Edit
                        </button>
                        <button
                          type="button"
                          className="attributes__delete-btn"
                          onClick={() => handleDeleteAttribute(attribute)}
                          disabled={isPersisting}
                        >
                          {pendingDeleteId === attribute.id ? "Deleting..." : "Delete"}
                        </button>
                      </div>
                    </div>

                    <dl className="attributes__details">
                      <div>
                        <dt>Score</dt>
                        <dd>0.00</dd>
                      </div>
                      <div>
                        <dt>Created at</dt>
                        <dd>{attribute.createdAt ? String(attribute.createdAt).slice(0, 10) : "Unknown"}</dd>
                      </div>
                    </dl>
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
