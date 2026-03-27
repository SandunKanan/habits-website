import React, { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { buildAttributeSummaries } from "../../lib/attributeScores.js";
import "./Attributes.scss";

export default function Attributes() {
  const {
    todayISO,
    attributes,
    habits,
    vision,
    onAddAttribute,
    onUpdateAttribute,
    onDeleteAttribute,
    isPersisting
  } = useOutletContext();
  const [name, setName] = useState("");
  const [hasDecay, setHasDecay] = useState(false);
  const [decayRate, setDecayRate] = useState("1");
  const [feedback, setFeedback] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editHasDecay, setEditHasDecay] = useState(false);
  const [editDecayRate, setEditDecayRate] = useState("1");
  const [editFeedback, setEditFeedback] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState("");
  const attributeSummaries = buildAttributeSummaries(attributes, habits, todayISO);
  const focusAttributeIds = new Set(
    Array.isArray(vision?.focusAttributeIds) ? vision.focusAttributeIds : []
  );
  const focusedSummaries = attributeSummaries.filter(({ attribute }) => focusAttributeIds.has(attribute.id));
  const otherSummaries = attributeSummaries.filter(({ attribute }) => !focusAttributeIds.has(attribute.id));

  async function handleAddAttribute(e) {
    e.preventDefault();
    setFeedback("");
    setIsSaving(true);

    const result = await onAddAttribute({
      name,
      decayRate: hasDecay ? decayRate : 0
    });
    if (result?.ok) {
      setName("");
      setHasDecay(false);
      setDecayRate("1");
      setFeedback("Attribute added.");
    } else {
      setFeedback(result?.error ?? "Could not add attribute.");
    }

    setIsSaving(false);
  }

  function startEdit(attribute) {
    setEditingId(attribute.id);
    setEditName(attribute.name);
    setEditHasDecay(Number(attribute.decayRate ?? 0) > 0);
    setEditDecayRate(String(attribute.decayRate ?? 1));
    setEditFeedback("");
  }

  function cancelEdit() {
    setEditingId(null);
    setEditName("");
    setEditHasDecay(false);
    setEditDecayRate("1");
    setEditFeedback("");
  }

  async function handleSaveEdit(e) {
    e.preventDefault();
    if (!editingId) return;

    setIsSavingEdit(true);
    setEditFeedback("");

    const result = await onUpdateAttribute(editingId, {
      name: editName,
      decayRate: editHasDecay ? editDecayRate : 0
    });
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

  function renderAttributeCard(
    { attribute, score, decayRate, linkedHabitCount, contributors },
    { isFocused = false } = {}
  ) {
    const isEditing = editingId === attribute.id;

    return (
      <article
        key={attribute.id}
        className={["attributes__item card", isFocused ? "attributes__item--focus" : ""]
          .filter(Boolean)
          .join(" ")}
      >
        {isEditing ? (
          <form className="attributes__edit" onSubmit={handleSaveEdit}>
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              disabled={isSavingEdit || isPersisting}
              required
            />
            <label className="attributes__decay-toggle">
              <input
                type="checkbox"
                checked={editHasDecay}
                onChange={(e) => setEditHasDecay(e.target.checked)}
                disabled={isSavingEdit || isPersisting}
              />
              <span>Use decay</span>
            </label>
            {editHasDecay ? (
              <input
                type="number"
                min="0"
                step="0.1"
                value={editDecayRate}
                onChange={(e) => setEditDecayRate(e.target.value)}
                disabled={isSavingEdit || isPersisting}
                placeholder="Daily decay"
                required
              />
            ) : null}
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
                <h3>
                  {attribute.name}
                  {isFocused ? <span className="attributes__focus-badge">Focus</span> : null}
                </h3>
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
                <dd>{score.toFixed(2)}</dd>
              </div>
              <div>
                <dt>Linked habits</dt>
                <dd>{linkedHabitCount}</dd>
              </div>
              <div>
                <dt>Daily decay</dt>
                <dd>{decayRate > 0 ? decayRate.toFixed(2) : "Off"}</dd>
              </div>
              <div>
                <dt>Created at</dt>
                <dd>{attribute.createdAt ? String(attribute.createdAt).slice(0, 10) : "Unknown"}</dd>
              </div>
            </dl>

            <div className="attributes__contributors">
              <h4>Top contributors</h4>
              {contributors.length === 0 ? (
                <p className="attributes__contributors-empty">No habits linked yet.</p>
              ) : (
                <ul className="attributes__contributors-list">
                  {contributors.slice(0, 3).map((contributor) => (
                    <li key={contributor.habitId}>
                      <span>{contributor.habitName}</span>
                      <small>
                        {contributor.completionCount} completions × {contributor.weight} ={" "}
                        {contributor.contribution.toFixed(2)}
                      </small>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </article>
    );
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

        <div className="attributes__help">
          <button
            type="button"
            className="attributes__help-toggle"
            aria-expanded={isHelpOpen}
            onClick={() => setIsHelpOpen((current) => !current)}
          >
            <span>How scoring works</span>
            <svg viewBox="0 0 20 20" aria-hidden="true">
              <path
                d={isHelpOpen ? "M5 12l5-5 5 5" : "M5 8l5 5 5-5"}
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          {isHelpOpen ? (
            <div className="attributes__help-panel">
              <p>
                Score is your current attribute score. Each habit completion adds its linked
                contribution weight to the attribute.
              </p>
              <p>
                If decay is turned on, each completion fades linearly over time using:
                <code> max(0, weight - daily decay × days old)</code>
              </p>
              <p>
                If decay is off, each completion keeps its full weight forever.
              </p>
            </div>
          ) : null}
        </div>

        <form className="attributes__form" onSubmit={handleAddAttribute}>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Add attribute"
            disabled={isSaving || isPersisting}
            required
          />
          <label className="attributes__decay-toggle">
            <input
              type="checkbox"
              checked={hasDecay}
              onChange={(e) => setHasDecay(e.target.checked)}
              disabled={isSaving || isPersisting}
            />
            <span>Use decay</span>
          </label>
          {hasDecay ? (
            <input
              type="number"
              min="0"
              step="0.1"
              value={decayRate}
              onChange={(e) => setDecayRate(e.target.value)}
              placeholder="Daily decay"
              disabled={isSaving || isPersisting}
              required
            />
          ) : null}
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
          <>
            {focusedSummaries.length > 0 ? (
              <div className="attributes__group">
                <div className="attributes__group-head">
                  <h3>Current focus</h3>
                  <p>These attributes are currently emphasized on your Vision page.</p>
                </div>
                <div className="attributes__group-list">
                  {focusedSummaries.map((summary) => renderAttributeCard(summary, { isFocused: true }))}
                </div>
              </div>
            ) : null}

            {otherSummaries.length > 0 ? (
              <div className="attributes__group">
                {focusedSummaries.length > 0 ? (
                  <div className="attributes__group-head">
                    <h3>All attributes</h3>
                    <p>The rest of your attribute library.</p>
                  </div>
                ) : null}
                <div className="attributes__group-list">
                  {otherSummaries.map((summary) => renderAttributeCard(summary))}
                </div>
              </div>
            ) : null}
          </>
        )}
      </section>
    </div>
  );
}
