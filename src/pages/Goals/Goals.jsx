import React, { useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import "./Goals.scss";

const TIMEFRAME_OPTIONS = [
  { value: "long_term", label: "Long term" },
  { value: "fixed_timeframe", label: "Fixed time frame" }
];

function formatTimeframeType(timeframeType) {
  return TIMEFRAME_OPTIONS.find((option) => option.value === timeframeType)?.label ?? "Long term";
}

export default function Goals() {
  const { goals, onAddGoal, onUpdateGoal, onDeleteGoal, isPersisting } = useOutletContext();
  const [title, setTitle] = useState("");
  const [timeframeType, setTimeframeType] = useState("long_term");
  const [targetDate, setTargetDate] = useState("");
  const [notes, setNotes] = useState("");
  const [subgoals, setSubgoals] = useState([]);
  const [subgoalDraft, setSubgoalDraft] = useState("");
  const [feedback, setFeedback] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editTimeframeType, setEditTimeframeType] = useState("long_term");
  const [editTargetDate, setEditTargetDate] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editSubgoals, setEditSubgoals] = useState([]);
  const [editSubgoalDraft, setEditSubgoalDraft] = useState("");
  const [editFeedback, setEditFeedback] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState("");

  const sortedGoals = useMemo(() => {
    return [...goals].sort((a, b) => {
      const aIsFixed = a.timeframeType === "fixed_timeframe" ? 0 : 1;
      const bIsFixed = b.timeframeType === "fixed_timeframe" ? 0 : 1;
      if (aIsFixed !== bIsFixed) {
        return aIsFixed - bIsFixed;
      }

      if (a.timeframeType === "fixed_timeframe" && b.timeframeType === "fixed_timeframe") {
        const dateComparison = String(a.targetDate ?? "").localeCompare(String(b.targetDate ?? ""));
        if (dateComparison !== 0) {
          return dateComparison;
        }
      }

      return String(a.createdAt ?? "").localeCompare(String(b.createdAt ?? ""));
    });
  }, [goals]);

  const longTermCount = sortedGoals.filter((goal) => goal.timeframeType === "long_term").length;
  const fixedCount = sortedGoals.filter((goal) => goal.timeframeType === "fixed_timeframe").length;

  function addSubgoalItem(currentItems, draft) {
    const trimmedDraft = String(draft ?? "").trim();
    if (!trimmedDraft) {
      return currentItems;
    }

    return [...currentItems, { id: crypto.randomUUID(), title: trimmedDraft }];
  }

  async function handleAddGoal(e) {
    e.preventDefault();
    setFeedback("");
    setIsSaving(true);

    const result = await onAddGoal({ title, timeframeType, targetDate, notes, subgoals });
    if (result?.ok) {
      setTitle("");
      setTimeframeType("long_term");
      setTargetDate("");
      setNotes("");
      setSubgoals([]);
      setSubgoalDraft("");
      setFeedback("Goal added.");
    } else {
      setFeedback(result?.error ?? "Could not add goal.");
    }

    setIsSaving(false);
  }

  function startEdit(goal) {
    setEditingId(goal.id);
    setEditTitle(goal.title);
    setEditTimeframeType(goal.timeframeType);
    setEditTargetDate(goal.targetDate ?? "");
    setEditNotes(goal.notes ?? "");
    setEditSubgoals(Array.isArray(goal.subgoals) ? goal.subgoals : []);
    setEditSubgoalDraft("");
    setEditFeedback("");
  }

  function cancelEdit() {
    setEditingId("");
    setEditTitle("");
    setEditTimeframeType("long_term");
    setEditTargetDate("");
    setEditNotes("");
    setEditSubgoals([]);
    setEditSubgoalDraft("");
    setEditFeedback("");
  }

  async function handleSaveEdit(e) {
    e.preventDefault();
    if (!editingId) return;

    setIsSavingEdit(true);
    setEditFeedback("");

    const result = await onUpdateGoal(editingId, {
      title: editTitle,
      timeframeType: editTimeframeType,
      targetDate: editTargetDate,
      notes: editNotes,
      subgoals: editSubgoals
    });

    if (result?.ok) {
      setEditingId("");
      setFeedback("Goal updated.");
    } else {
      setEditFeedback(result?.error ?? "Could not update goal.");
    }

    setIsSavingEdit(false);
  }

  function handleAddSubgoal() {
    setSubgoals((current) => addSubgoalItem(current, subgoalDraft));
    setSubgoalDraft("");
  }

  function handleAddEditSubgoal() {
    setEditSubgoals((current) => addSubgoalItem(current, editSubgoalDraft));
    setEditSubgoalDraft("");
  }

  function handleSubgoalKeyDown(event, onAddItem) {
    if (event.key !== "Enter") return;
    event.preventDefault();
    onAddItem();
  }

  function removeSubgoal(subgoalId) {
    setSubgoals((current) => current.filter((item) => item.id !== subgoalId));
  }

  function removeEditSubgoal(subgoalId) {
    setEditSubgoals((current) => current.filter((item) => item.id !== subgoalId));
  }

  async function handleDeleteGoal(goal) {
    const confirmed = window.confirm(`Delete "${goal.title}"?`);
    if (!confirmed) return;

    setFeedback("");
    setPendingDeleteId(goal.id);
    const result = await onDeleteGoal(goal.id);

    if (result?.ok) {
      if (editingId === goal.id) {
        cancelEdit();
      }
      setFeedback("Goal deleted.");
    } else {
      setFeedback(result?.error ?? "Could not delete goal.");
    }

    setPendingDeleteId("");
  }

  return (
    <div className="goalspage">
      <section className="goalspage__hero card">
        <p className="goalspage__eyebrow">Aim higher</p>
        <h2>Keep your goals visible</h2>
        <p className="goalspage__intro">
          Use this page for the outcomes you want to move toward over time. Some goals will stay
          open-ended. Others will have a defined window. The point is to keep them visible enough
          that your habits, focus, and pursuits have somewhere real to point.
        </p>
      </section>

      <section className="goalspage__section card">
        <form className="goalspage__form" onSubmit={handleAddGoal}>
          <div className="goalspage__field">
            <label htmlFor="goal-title">Goal</label>
            <p>Name the outcome clearly.</p>
            <input
              id="goal-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isSaving || isPersisting}
              required
            />
          </div>

          <div className="goalspage__grid">
            <div className="goalspage__field">
              <label htmlFor="goal-timeframe-type">Time frame</label>
              <select
                id="goal-timeframe-type"
                value={timeframeType}
                onChange={(e) => setTimeframeType(e.target.value)}
                disabled={isSaving || isPersisting}
              >
                {TIMEFRAME_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="goalspage__field">
              <label htmlFor="goal-target-date">Target date</label>
              <input
                id="goal-target-date"
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                disabled={isSaving || isPersisting || timeframeType !== "fixed_timeframe"}
              />
            </div>
          </div>

          <div className="goalspage__field">
            <label htmlFor="goal-notes">Notes</label>
            <p>Add context, why it matters, or what success would look like.</p>
            <textarea
              id="goal-notes"
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={isSaving || isPersisting}
              placeholder="Example: Get there without sacrificing health or consistency."
            />
          </div>

          <div className="goalspage__field">
            <label htmlFor="goal-subgoal">Subgoals</label>
            <p>Break the bigger goal into a few concrete milestones.</p>
            <div className="goalspage__subgoal-input">
              <input
                id="goal-subgoal"
                type="text"
                value={subgoalDraft}
                onChange={(e) => setSubgoalDraft(e.target.value)}
                onKeyDown={(e) => handleSubgoalKeyDown(e, handleAddSubgoal)}
                disabled={isSaving || isPersisting}
              />
              <button
                type="button"
                onClick={handleAddSubgoal}
                disabled={isSaving || isPersisting || !String(subgoalDraft).trim()}
              >
                Add
              </button>
            </div>
            {subgoals.length > 0 ? (
              <ul className="goalspage__subgoal-list">
                {subgoals.map((subgoal) => (
                  <li key={subgoal.id}>
                    <span>{subgoal.title}</span>
                    <button type="button" onClick={() => removeSubgoal(subgoal.id)} disabled={isSaving || isPersisting}>
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <div className="goalspage__actions">
            <button type="submit" disabled={isSaving || isPersisting}>
              {isSaving || isPersisting ? "Saving..." : "Add goal"}
            </button>
            {feedback ? <p className="goalspage__feedback">{feedback}</p> : null}
          </div>
        </form>
      </section>

      <section className="goalspage__summary">
        <article className="goalspage__summary-card card">
          <span>Total goals</span>
          <strong>{sortedGoals.length}</strong>
        </article>
        <article className="goalspage__summary-card card">
          <span>Long term</span>
          <strong>{longTermCount}</strong>
        </article>
        <article className="goalspage__summary-card card">
          <span>Fixed time frame</span>
          <strong>{fixedCount}</strong>
        </article>
      </section>

      <section className="goalspage__list">
        {sortedGoals.length === 0 ? (
          <article className="goalspage__empty card">
            <h3>No goals yet</h3>
            <p>
              Add the outcomes you care about so your day-to-day system has somewhere larger to
              lead.
            </p>
          </article>
        ) : (
          sortedGoals.map((goal) => {
            const isEditing = editingId === goal.id;

            return (
              <article key={goal.id} className="goalspage__item card">
                {isEditing ? (
                  <form className="goalspage__edit" onSubmit={handleSaveEdit}>
                    <div className="goalspage__field">
                      <label htmlFor={`edit-goal-title-${goal.id}`}>Goal</label>
                      <input
                        id={`edit-goal-title-${goal.id}`}
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        disabled={isSavingEdit || isPersisting}
                        required
                      />
                    </div>

                    <div className="goalspage__grid">
                      <div className="goalspage__field">
                        <label htmlFor={`edit-goal-timeframe-${goal.id}`}>Time frame</label>
                        <select
                          id={`edit-goal-timeframe-${goal.id}`}
                          value={editTimeframeType}
                          onChange={(e) => setEditTimeframeType(e.target.value)}
                          disabled={isSavingEdit || isPersisting}
                        >
                          {TIMEFRAME_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="goalspage__field">
                        <label htmlFor={`edit-goal-target-date-${goal.id}`}>Target date</label>
                        <input
                          id={`edit-goal-target-date-${goal.id}`}
                          type="date"
                          value={editTargetDate}
                          onChange={(e) => setEditTargetDate(e.target.value)}
                          disabled={isSavingEdit || isPersisting || editTimeframeType !== "fixed_timeframe"}
                        />
                      </div>
                    </div>

                    <div className="goalspage__field">
                      <label htmlFor={`edit-goal-notes-${goal.id}`}>Notes</label>
                      <textarea
                        id={`edit-goal-notes-${goal.id}`}
                        rows={4}
                        value={editNotes}
                        onChange={(e) => setEditNotes(e.target.value)}
                        disabled={isSavingEdit || isPersisting}
                      />
                    </div>

                    <div className="goalspage__field">
                      <label htmlFor={`edit-goal-subgoal-${goal.id}`}>Subgoals</label>
                      <div className="goalspage__subgoal-input">
                        <input
                          id={`edit-goal-subgoal-${goal.id}`}
                          type="text"
                          value={editSubgoalDraft}
                          onChange={(e) => setEditSubgoalDraft(e.target.value)}
                          onKeyDown={(e) => handleSubgoalKeyDown(e, handleAddEditSubgoal)}
                          disabled={isSavingEdit || isPersisting}
                        />
                        <button
                          type="button"
                          onClick={handleAddEditSubgoal}
                          disabled={isSavingEdit || isPersisting || !String(editSubgoalDraft).trim()}
                        >
                          Add
                        </button>
                      </div>
                      {editSubgoals.length > 0 ? (
                        <ul className="goalspage__subgoal-list">
                          {editSubgoals.map((subgoal) => (
                            <li key={subgoal.id}>
                              <span>{subgoal.title}</span>
                              <button
                                type="button"
                                onClick={() => removeEditSubgoal(subgoal.id)}
                                disabled={isSavingEdit || isPersisting}
                              >
                                Remove
                              </button>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </div>

                    <div className="goalspage__actions">
                      <button type="submit" disabled={isSavingEdit || isPersisting}>
                        {isSavingEdit || isPersisting ? "Saving..." : "Save"}
                      </button>
                      <button type="button" onClick={cancelEdit} disabled={isSavingEdit || isPersisting}>
                        Cancel
                      </button>
                      {editFeedback ? <p className="goalspage__feedback">{editFeedback}</p> : null}
                    </div>
                  </form>
                ) : (
                  <>
                    <div className="goalspage__item-head">
                      <div>
                        <div className="goalspage__badges">
                          <span className={`goalspage__badge goalspage__badge--${goal.timeframeType}`}>
                            {formatTimeframeType(goal.timeframeType)}
                          </span>
                          {goal.targetDate ? <span className="goalspage__badge">Target {goal.targetDate}</span> : null}
                        </div>
                        <h3>{goal.title}</h3>
                      </div>
                      <div className="goalspage__item-actions">
                        <button type="button" onClick={() => startEdit(goal)} disabled={isPersisting}>
                          Edit
                        </button>
                        <button
                          type="button"
                          className="goalspage__delete-btn"
                          onClick={() => handleDeleteGoal(goal)}
                          disabled={isPersisting}
                        >
                          {pendingDeleteId === goal.id ? "Deleting..." : "Delete"}
                        </button>
                      </div>
                    </div>

                    {goal.notes ? <p className="goalspage__notes">{goal.notes}</p> : null}
                    {Array.isArray(goal.subgoals) && goal.subgoals.length > 0 ? (
                      <div className="goalspage__subgoals">
                        <h4>Subgoals</h4>
                        <ul className="goalspage__subgoal-list goalspage__subgoal-list--read">
                          {goal.subgoals.map((subgoal) => (
                            <li key={subgoal.id}>
                              <span>{subgoal.title}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}

                    <div className="goalspage__meta">
                      <span>Slug: {goal.slug}</span>
                      <span>Updated: {goal.updatedAt ? String(goal.updatedAt).slice(0, 10) : "Unknown"}</span>
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
