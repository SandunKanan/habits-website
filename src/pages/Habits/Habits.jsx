import React, { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { daysBetweenISO, startOfTodayLocalISO } from "../../lib/date.js";
import {
  formatFrequencyLabel,
  FREQUENCY_MODES,
  getFrequencyUnitsForMode,
  normalizeFrequency
} from "../../lib/frequency.js";
import {
  DEFAULT_IMPORTANCE_VALUE,
  getImportanceLabel,
  IMPORTANCE_LEVELS,
  normalizeImportanceValue
} from "../../lib/importance.js";
import { scoreHabitForToday } from "../../lib/scoring.js";
import "./Habits.scss";

export default function Habits() {
  const {
    habits,
    todayISO: contextTodayISO,
    onAddHabit,
    onUpdateHabit,
    onDeleteHabit,
    onAddSubtask,
    onMarkSubtaskDoneToday,
    onUndoSubtaskDoneToday,
    onAddCompletionDate,
    onMarkDone,
    onUndoDoneToday
  } = useOutletContext();
  const [name, setName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [frequencyMode, setFrequencyMode] = useState("interval");
  const [frequencyValue, setFrequencyValue] = useState("1");
  const [frequencyUnit, setFrequencyUnit] = useState("day");
  const [importance, setImportance] = useState(String(IMPORTANCE_LEVELS[0].value));
  const [feedback, setFeedback] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editFrequencyMode, setEditFrequencyMode] = useState("interval");
  const [editFrequencyValue, setEditFrequencyValue] = useState("1");
  const [editFrequencyUnit, setEditFrequencyUnit] = useState("day");
  const [editImportance, setEditImportance] = useState(String(DEFAULT_IMPORTANCE_VALUE));
  const [editCreatedAt, setEditCreatedAt] = useState("");
  const [editFeedback, setEditFeedback] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [expandedDetailsById, setExpandedDetailsById] = useState({});
  const [expandedDatesById, setExpandedDatesById] = useState({});
  const [subtaskNameByHabitId, setSubtaskNameByHabitId] = useState({});
  const [subtaskFeedbackByHabitId, setSubtaskFeedbackByHabitId] = useState({});
  const [isSavingSubtaskByHabitId, setIsSavingSubtaskByHabitId] = useState({});
  const [pastDateById, setPastDateById] = useState({});
  const [isPastOpenById, setIsPastOpenById] = useState({});
  const [completionFeedbackById, setCompletionFeedbackById] = useState({});
  const [isSavingCompletionById, setIsSavingCompletionById] = useState({});
  const todayISO = contextTodayISO ?? startOfTodayLocalISO();
  const normalizedSearchQuery = searchQuery.trim().toLowerCase();
  const filteredHabits = habits.filter((habit) => {
    if (!normalizedSearchQuery) return true;

    const subtaskNames = Array.isArray(habit.subtasks)
      ? habit.subtasks.map((subtask) => String(subtask.name ?? ""))
      : [];

    return [habit.name, habit.id, ...subtaskNames].some((value) =>
      String(value ?? "").toLowerCase().includes(normalizedSearchQuery)
    );
  });

  function formatLastCompleted(dateISO) {
    if (!dateISO) return "Never";

    const daysAgo = daysBetweenISO(dateISO, todayISO);
    if (daysAgo !== null && daysAgo >= 0 && daysAgo <= 7) {
      if (daysAgo === 0) return "Today";
      if (daysAgo === 1) return "1 day ago";
      return `${daysAgo} days ago`;
    }

    return dateISO;
  }

  async function handleAddHabit(e) {
    e.preventDefault();
    setFeedback("");
    setIsSaving(true);

    const result = await onAddHabit({
      name,
      frequencyMode,
      frequencyValue,
      frequencyUnit,
      importance
    });

    if (result?.ok) {
      setName("");
      setFrequencyMode("interval");
      setFrequencyValue("1");
      setFrequencyUnit("day");
      setImportance(String(IMPORTANCE_LEVELS[0].value));
      setFeedback("Habit added.");
      setIsAddOpen(false);
    } else {
      setFeedback(result?.error ?? "Could not add habit.");
    }

    setIsSaving(false);
  }

  function startEdit(habit) {
    const frequency = normalizeFrequency(habit);
    setEditingId(habit.id);
    setEditName(String(habit.name ?? ""));
    setEditFrequencyMode(frequency.frequencyMode);
    setEditFrequencyValue(String(frequency.frequencyValue));
    setEditFrequencyUnit(frequency.frequencyUnit);
    setEditImportance(String(normalizeImportanceValue(habit.importance)));
    setEditCreatedAt(habit.createdAt ? String(habit.createdAt).slice(0, 10) : todayISO);
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
      frequencyMode: editFrequencyMode,
      frequencyValue: editFrequencyValue,
      frequencyUnit: editFrequencyUnit,
      importance: editImportance,
      createdAt: editCreatedAt
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

  function toggleDetails(habitId) {
    setExpandedDetailsById((prev) => ({ ...prev, [habitId]: !prev[habitId] }));
  }

  function togglePastCompletionForm(habitId) {
    setIsPastOpenById((prev) => ({ ...prev, [habitId]: !prev[habitId] }));
    setCompletionFeedbackById((prev) => ({ ...prev, [habitId]: "" }));
  }

  async function handleAddSubtask(habitId) {
    const subtaskName = String(subtaskNameByHabitId[habitId] ?? "").trim();
    if (!subtaskName) {
      setSubtaskFeedbackByHabitId((prev) => ({ ...prev, [habitId]: "Subtask name is required." }));
      return;
    }

    setIsSavingSubtaskByHabitId((prev) => ({ ...prev, [habitId]: true }));
    setSubtaskFeedbackByHabitId((prev) => ({ ...prev, [habitId]: "" }));

    const result = await onAddSubtask(habitId, subtaskName);
    if (result?.ok) {
      setSubtaskNameByHabitId((prev) => ({ ...prev, [habitId]: "" }));
      setSubtaskFeedbackByHabitId((prev) => ({ ...prev, [habitId]: "Subtask added." }));
    } else {
      setSubtaskFeedbackByHabitId((prev) => ({
        ...prev,
        [habitId]: result?.error ?? "Could not add subtask."
      }));
    }

    setIsSavingSubtaskByHabitId((prev) => ({ ...prev, [habitId]: false }));
  }

  async function handleAddPastCompletion(habitId) {
    const dateISO = String(pastDateById[habitId] ?? "").trim();
    if (!dateISO) {
      setCompletionFeedbackById((prev) => ({ ...prev, [habitId]: "Choose a date first." }));
      return;
    }

    setIsSavingCompletionById((prev) => ({ ...prev, [habitId]: true }));
    setCompletionFeedbackById((prev) => ({ ...prev, [habitId]: "" }));

    const result = await onAddCompletionDate(habitId, dateISO);
    if (result?.ok) {
      setPastDateById((prev) => ({ ...prev, [habitId]: "" }));
      setIsPastOpenById((prev) => ({ ...prev, [habitId]: false }));
      setCompletionFeedbackById((prev) => ({ ...prev, [habitId]: "Past completion saved." }));
    } else {
      setCompletionFeedbackById((prev) => ({
        ...prev,
        [habitId]: result?.error ?? "Could not add completion date."
      }));
    }

    setIsSavingCompletionById((prev) => ({ ...prev, [habitId]: false }));
  }

  function renderFrequencyControls({
    mode,
    value,
    unit,
    onModeChange,
    onValueChange,
    onUnitChange
  }) {
    const numericValue = Math.max(1, Number(value) || 1);

    if (mode === "quota") {
      return (
        <div className="habits__frequency-row">
          <input
            type="number"
            min="1"
            step="1"
            value={value}
            onChange={onValueChange}
            title="Frequency value"
            required
          />
          <select value={mode} onChange={onModeChange} title="Frequency type">
            {FREQUENCY_MODES.map((frequencyMode) => (
              <option key={frequencyMode.value} value={frequencyMode.value}>
                {frequencyMode.label}
              </option>
            ))}
          </select>
          <select value={unit} onChange={onUnitChange} title="Frequency unit">
            {getFrequencyUnitsForMode(mode).map((frequencyUnit) => (
              <option key={frequencyUnit.value} value={frequencyUnit.value}>
                {frequencyUnit.label}
              </option>
            ))}
          </select>
        </div>
      );
    }

    return (
      <div className="habits__frequency-row">
        <select value={mode} onChange={onModeChange} title="Frequency type">
          {FREQUENCY_MODES.map((frequencyMode) => (
            <option key={frequencyMode.value} value={frequencyMode.value}>
              {frequencyMode.label}
            </option>
          ))}
        </select>
        <input
          type="number"
          min="1"
          step="1"
          value={value}
          onChange={onValueChange}
          title="Frequency value"
          required
        />
        <select value={unit} onChange={onUnitChange} title="Frequency unit">
          {getFrequencyUnitsForMode(mode).map((frequencyUnit) => (
            <option key={frequencyUnit.value} value={frequencyUnit.value}>
              {numericValue === 1 ? frequencyUnit.label : `${frequencyUnit.label}s`}
            </option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <div className="habits">
      <div className="habits__header card">
        <div className="habits__header-row">
          <h2>All Habits</h2>
          <label className="habits__search" aria-label="Search habits">
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search habits"
            />
          </label>
        </div>
        <p>
          {habits.length === 0 ? (
            <>
              Your account is empty. Add your first habit to start building a daily plan.
            </>
          ) : (
            <>
              Showing <b>{filteredHabits.length}</b> of <b>{habits.length}</b> habits.
            </>
          )}
        </p>

        {!isAddOpen ? (
          <div className="habits__actions">
            <button type="button" onClick={() => setIsAddOpen(true)}>
              {habits.length === 0 ? "Create first habit" : "Add Habit"}
            </button>
          </div>
        ) : (
          <form className="habits__form" onSubmit={handleAddHabit}>
            <label className="habits__form-field habits__form-field--name">
              <span>Name</span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Habit name"
                required
              />
            </label>

            <div className="habits__form-group">
              <div className="habits__form-label">Frequency</div>
              {renderFrequencyControls({
                mode: frequencyMode,
                value: frequencyValue,
                unit: frequencyUnit,
                onModeChange: (e) => {
                  const nextMode = e.target.value;
                  setFrequencyMode(nextMode);
                  setFrequencyUnit(nextMode === "quota" ? "week" : "day");
                },
                onValueChange: (e) => setFrequencyValue(e.target.value),
                onUnitChange: (e) => setFrequencyUnit(e.target.value)
              })}
            </div>

            <label className="habits__form-field habits__form-field--priority">
              <span>Priority</span>
              <select
                value={importance}
                onChange={(e) => setImportance(e.target.value)}
                title="Priority"
                required
              >
                {IMPORTANCE_LEVELS.map((level) => (
                  <option key={level.key} value={level.value}>
                    {level.label}
                  </option>
                ))}
              </select>
            </label>

            <div className="habits__form-actions">
              <button type="submit" className="habits__save-btn" disabled={isSaving}>
                {isSaving ? "Adding..." : "Save Habit"}
              </button>
              <button
                type="button"
                className="habits__cancel-btn"
                onClick={() => setIsAddOpen(false)}
                disabled={isSaving}
              >
                Cancel
              </button>
            </div>
          </form>
        )}
        {feedback ? <p className="habits__feedback">{feedback}</p> : null}
      </div>

      <div className="habits__list">
        {habits.length === 0 ? (
          <section className="habits__empty card">
            <p className="habits__empty-eyebrow">First setup</p>
            <h3>No habits yet.</h3>
            <p className="habits__empty-copy">
              Create a few habits with their frequency and priority level. Once they exist, the Today
              page will automatically decide what belongs on your schedule.
            </p>
            {!isAddOpen ? (
              <button type="button" onClick={() => setIsAddOpen(true)}>
                Add your first habit
              </button>
            ) : null}
          </section>
        ) : null}

        {habits.length > 0 && filteredHabits.length === 0 ? (
          <section className="habits__empty card">
            <p className="habits__empty-eyebrow">No matches</p>
            <h3>No habits match that search.</h3>
            <p className="habits__empty-copy">
              Try a different name or search by a subtask keyword.
            </p>
          </section>
        ) : null}

        {filteredHabits.map((habit) => (
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
                  Frequency
                  {renderFrequencyControls({
                    mode: editFrequencyMode,
                    value: editFrequencyValue,
                    unit: editFrequencyUnit,
                    onModeChange: (e) => {
                      const nextMode = e.target.value;
                      setEditFrequencyMode(nextMode);
                      setEditFrequencyUnit(nextMode === "quota" ? "week" : "day");
                    },
                    onValueChange: (e) => setEditFrequencyValue(e.target.value),
                    onUnitChange: (e) => setEditFrequencyUnit(e.target.value)
                  })}
                </label>
                <label>
                  Created at
                  <input
                    type="date"
                    value={editCreatedAt}
                    onChange={(e) => setEditCreatedAt(e.target.value)}
                    max={todayISO}
                    required
                  />
                </label>
                <label>
                  Priority
                  <select
                    value={editImportance}
                    onChange={(e) => setEditImportance(e.target.value)}
                    required
                  >
                    {IMPORTANCE_LEVELS.map((level) => (
                      <option key={level.key} value={level.value}>
                        {level.label}
                      </option>
                    ))}
                  </select>
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
                    <button type="button" onClick={() => toggleDetails(habit.id)}>
                      {Boolean(expandedDetailsById[habit.id]) ? "Hide details" : "Show details"}
                    </button>
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
                  const lastCompleted = formatLastCompleted(sortedDoneDates[0]);
                  const isDetailsExpanded = Boolean(expandedDetailsById[habit.id]);
                  const isExpanded = Boolean(expandedDatesById[habit.id]);
                  const isPastOpen = Boolean(isPastOpenById[habit.id]);
                  const completionFeedback = completionFeedbackById[habit.id];
                  const isSavingCompletion = Boolean(isSavingCompletionById[habit.id]);
                  const isDoneToday = sortedDoneDates[0] === todayISO;
                  const subtasks = Array.isArray(habit.subtasks) ? habit.subtasks : [];
                  const sortedSubtasks = [...subtasks].sort((a, b) => {
                    const aLast = [...(Array.isArray(a.doneDates) ? a.doneDates : [])]
                      .sort((x, y) => y.localeCompare(x))[0] ?? "";
                    const bLast = [...(Array.isArray(b.doneDates) ? b.doneDates : [])]
                      .sort((x, y) => y.localeCompare(x))[0] ?? "";
                    return aLast.localeCompare(bLast) || a.name.localeCompare(b.name);
                  });
                  const score = scoreHabitForToday({
                    habit,
                    lastDoneISO: sortedDoneDates[0] ?? habit.initialLastDone ?? null,
                    todayISO
                  });

                  return (
                    <>
                      <dl className="habits__details">
                        <div>
                          <dt>Frequency</dt>
                          <dd>{formatFrequencyLabel(habit)}</dd>
                        </div>
                        <div>
                          <dt>Priority</dt>
                          <dd>{getImportanceLabel(habit.importance)}</dd>
                        </div>
                        <div>
                          <dt>Last completed</dt>
                          <dd>{lastCompleted}</dd>
                        </div>
                      </dl>

                      {isDetailsExpanded ? (
                        <>
                          <dl className="habits__details habits__details--expanded">
                            <div>
                              <dt>Created at</dt>
                              <dd>{habit.createdAt ? String(habit.createdAt).slice(0, 10) : "Unknown"}</dd>
                            </div>
                            <div>
                              <dt>Times completed</dt>
                              <dd>{sortedDoneDates.length}</dd>
                            </div>
                            <div>
                              <dt>Current score</dt>
                              <dd>{score.parScore.toFixed(2)}</dd>
                            </div>
                            <div>
                              <dt>Priority score</dt>
                              <dd>{score.priorityScore.toFixed(2)}</dd>
                            </div>
                          </dl>

                          <div className="habits__completion-actions">
                            {isDoneToday ? (
                              <button type="button" onClick={() => onUndoDoneToday(habit.id)}>
                                Undo today
                              </button>
                            ) : (
                              <button type="button" onClick={() => onMarkDone(habit.id)}>
                                Mark done today
                              </button>
                            )}
                            <button type="button" onClick={() => togglePastCompletionForm(habit.id)}>
                              {isPastOpen ? "Cancel past date" : "Add past completion"}
                            </button>
                          </div>

                          {isPastOpen ? (
                            <div className="habits__past-form">
                              <input
                                type="date"
                                value={pastDateById[habit.id] ?? ""}
                                max={todayISO}
                                onChange={(e) =>
                                  setPastDateById((prev) => ({ ...prev, [habit.id]: e.target.value }))
                                }
                              />
                              <button
                                type="button"
                                onClick={() => handleAddPastCompletion(habit.id)}
                                disabled={isSavingCompletion}
                              >
                                {isSavingCompletion ? "Saving..." : "Save past date"}
                              </button>
                            </div>
                          ) : null}

                          {completionFeedback ? (
                            <p className="habits__feedback habits__feedback--inline">
                              {completionFeedback}
                            </p>
                          ) : null}

                          <div className="habits__subtasks">
                            <div className="habits__subtasks-head">
                              <h4>Subtasks</h4>
                              <small>Track smaller parts separately from the main habit.</small>
                            </div>

                            <div className="habits__subtask-create">
                              <input
                                type="text"
                                value={subtaskNameByHabitId[habit.id] ?? ""}
                                onChange={(e) =>
                                  setSubtaskNameByHabitId((prev) => ({
                                    ...prev,
                                    [habit.id]: e.target.value
                                  }))
                                }
                                placeholder="Add subtask"
                              />
                              <button
                                type="button"
                                onClick={() => handleAddSubtask(habit.id)}
                                disabled={Boolean(isSavingSubtaskByHabitId[habit.id])}
                              >
                                {isSavingSubtaskByHabitId[habit.id] ? "Saving..." : "Add"}
                              </button>
                            </div>

                            {subtaskFeedbackByHabitId[habit.id] ? (
                              <p className="habits__feedback habits__feedback--inline">
                                {subtaskFeedbackByHabitId[habit.id]}
                              </p>
                            ) : null}

                            {sortedSubtasks.length === 0 ? (
                              <p className="habits__subtasks-empty">No subtasks yet.</p>
                            ) : (
                              <ul className="habits__subtask-list">
                                {sortedSubtasks.map((subtask) => {
                                  const subtaskDoneDates = Array.isArray(subtask.doneDates)
                                    ? [...subtask.doneDates].sort((a, b) => b.localeCompare(a))
                                    : [];
                                  const lastSubtaskDone = subtaskDoneDates[0];
                                  const isSubtaskDoneToday = lastSubtaskDone === todayISO;

                                  return (
                                    <li key={subtask.id} className="habits__subtask-item">
                                      <div>
                                        <strong>{subtask.name}</strong>
                                        <small>
                                          Last completed {formatLastCompleted(lastSubtaskDone)} ·{" "}
                                          {subtaskDoneDates.length} total
                                        </small>
                                      </div>
                                      {isSubtaskDoneToday ? (
                                        <button
                                          type="button"
                                          onClick={() => onUndoSubtaskDoneToday(habit.id, subtask.id)}
                                        >
                                          Undo today
                                        </button>
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={() => onMarkSubtaskDoneToday(habit.id, subtask.id)}
                                        >
                                          Tick today
                                        </button>
                                      )}
                                    </li>
                                  );
                                })}
                              </ul>
                            )}
                          </div>

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
                      ) : null}
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
