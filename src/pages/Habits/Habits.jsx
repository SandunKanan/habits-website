import React, { useState } from "react";
import { useOutletContext } from "react-router-dom";
import "./Habits.scss";

export default function Habits() {
  const { habits, onAddHabit, onUpdateHabit, onDeleteHabit } = useOutletContext();
  const [name, setName] = useState("");
  const [everyXDays, setEveryXDays] = useState("1");
  const [importance, setImportance] = useState("0");
  const [feedback, setFeedback] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editEveryXDays, setEditEveryXDays] = useState("1");
  const [editImportance, setEditImportance] = useState("0");
  const [editFeedback, setEditFeedback] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [expandedDatesById, setExpandedDatesById] = useState({});

  async function handleAddHabit(e) {
    e.preventDefault();
    setFeedback("");
    setIsSaving(true);

    const result = await onAddHabit({ name, everyXDays, importance });

    if (result?.ok) {
      setName("");
      setEveryXDays("1");
      setImportance("0");
      setFeedback("Habit added.");
      setIsAddOpen(false);
    } else {
      setFeedback(result?.error ?? "Could not add habit.");
    }

    setIsSaving(false);
  }

  function startEdit(habit) {
    setEditingId(habit.id);
    setEditName(String(habit.name ?? ""));
    setEditEveryXDays(String(habit.everyXDays ?? 1));
    setEditImportance(String(habit.importance ?? 0));
    setEditFeedback("");
  }

  function cancelEdit() {
    setEditingId(null);
    setEditFeedback("");
  }

  async function handleSaveEdit(e) {
    e.preventDefault();
    if (!editingId) return;

    setIsSavingEdit(true);
    setEditFeedback("");

    const result = await onUpdateHabit(editingId, {
      name: editName,
      everyXDays: editEveryXDays,
      importance: editImportance
    });

    if (result?.ok) {
      setEditingId(null);
      setFeedback("Habit updated.");
    } else {
      setEditFeedback(result?.error ?? "Could not update habit.");
    }

    setIsSavingEdit(false);
  }

  async function handleDeleteHabit(habit) {
    const confirmed = window.confirm(`Delete "${habit.name}"? This cannot be undone.`);
    if (!confirmed) return;

    setFeedback("");
    const result = await onDeleteHabit(habit.id);

    if (result?.ok) {
      if (editingId === habit.id) setEditingId(null);
      setFeedback("Habit deleted.");
    } else {
      setFeedback(result?.error ?? "Could not delete habit.");
    }
  }

  function toggleCompletionDates(habitId) {
    setExpandedDatesById((prev) => ({ ...prev, [habitId]: !prev[habitId] }));
  }

  return (
    <div className="habits">
      <div className="habits__header card">
        <h2>All Habits</h2>
        <p>
          Synced habits store. Total: <b>{habits.length}</b>
        </p>

        {!isAddOpen ? (
          <div className="habits__actions">
            <button type="button" onClick={() => setIsAddOpen(true)}>
              Add Habit
            </button>
          </div>
        ) : (
          <form className="habits__form" onSubmit={handleAddHabit}>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Habit name"
              required
            />
            <input
              type="number"
              min="1"
              step="1"
              value={everyXDays}
              onChange={(e) => setEveryXDays(e.target.value)}
              title="Repeat every X days"
              required
            />
            <input
              type="number"
              min="0"
              step="1"
              value={importance}
              onChange={(e) => setImportance(e.target.value)}
              title="Importance"
              required
            />
            <button type="submit" disabled={isSaving}>
              {isSaving ? "Adding..." : "Save Habit"}
            </button>
            <button type="button" onClick={() => setIsAddOpen(false)} disabled={isSaving}>
              Cancel
            </button>
          </form>
        )}
        {feedback ? <p className="habits__feedback">{feedback}</p> : null}
      </div>

      <div className="habits__list">
        {habits.map((habit) => (
          <article key={habit.id} className="habits__item card">
            {editingId === habit.id ? (
              <form className="habits__edit-form" onSubmit={handleSaveEdit}>
                <h3>Editing: {habit.id}</h3>
                <label>
                  Name
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    required
                  />
                </label>
                <label>
                  Every X days
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={editEveryXDays}
                    onChange={(e) => setEditEveryXDays(e.target.value)}
                    required
                  />
                </label>
                <label>
                  Importance
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={editImportance}
                    onChange={(e) => setEditImportance(e.target.value)}
                    required
                  />
                </label>
                <div className="habits__item-actions">
                  <button type="submit" disabled={isSavingEdit}>
                    {isSavingEdit ? "Saving..." : "Save"}
                  </button>
                  <button type="button" onClick={cancelEdit} disabled={isSavingEdit}>
                    Cancel
                  </button>
                </div>
                {editFeedback ? <p className="habits__feedback">{editFeedback}</p> : null}
              </form>
            ) : (
              <>
                <div className="habits__item-head">
                  <h3>{habit.name}</h3>
                  <div className="habits__item-head-actions">
                    <button type="button" onClick={() => startEdit(habit)}>
                      Edit
                    </button>
                    <button
                      type="button"
                      className="habits__delete-btn"
                      aria-label={`Delete ${habit.name}`}
                      title="Delete habit"
                      onClick={() => handleDeleteHabit(habit)}
                    >
                      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                        <path
                          d="M9 3h6l1 2h4v2H4V5h4l1-2zm1 6h2v9h-2V9zm4 0h2v9h-2V9zM7 9h2v9H7V9z"
                          fill="currentColor"
                        />
                      </svg>
                    </button>
                  </div>
                </div>

                {(() => {
                  const doneDates = Array.isArray(habit.doneDates) ? habit.doneDates : [];
                  const sortedDoneDates = [...doneDates].sort((a, b) => b.localeCompare(a));
                  const lastCompleted = sortedDoneDates[0] ?? "Never";
                  const isExpanded = Boolean(expandedDatesById[habit.id]);

                  return (
                    <>
                      <dl className="habits__details">
                        <div>
                          <dt>Frequency</dt>
                          <dd>Every {habit.everyXDays} day(s)</dd>
                        </div>
                        <div>
                          <dt>Importance</dt>
                          <dd>{habit.importance}</dd>
                        </div>
                        <div>
                          <dt>Last completed</dt>
                          <dd>{lastCompleted}</dd>
                        </div>
                        <div>
                          <dt>Times completed</dt>
                          <dd>{sortedDoneDates.length}</dd>
                        </div>
                      </dl>

                      <div className="habits__dates">
                        <button
                          type="button"
                          onClick={() => toggleCompletionDates(habit.id)}
                          disabled={sortedDoneDates.length === 0}
                        >
                          {isExpanded ? "Hide completion dates" : "View completion dates"}
                        </button>

                        {isExpanded && sortedDoneDates.length > 0 ? (
                          <ul>
                            {sortedDoneDates.map((dateISO) => (
                              <li key={dateISO}>{dateISO}</li>
                            ))}
                          </ul>
                        ) : null}
                      </div>
                    </>
                  );
                })()}
              </>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
