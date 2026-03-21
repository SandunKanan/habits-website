import React, { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { startOfTodayLocalISO } from "../../lib/date.js";
import {
  normalizeFrequency
} from "../../lib/frequency.js";
import {
  DEFAULT_IMPORTANCE_VALUE,
  IMPORTANCE_LEVELS,
  normalizeImportanceValue
} from "../../lib/importance.js";
import { formatRecentDateLabel, getHabitSlug } from "../../lib/habitUtils.js";
import HabitFrequencyControls from "./components/HabitFrequencyControls.jsx";
import HabitListItem from "./components/HabitListItem.jsx";
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
    onUndoDoneToday,
    isPersisting
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

    return [habit.name, getHabitSlug(habit), ...subtaskNames].some((value) =>
      String(value ?? "").toLowerCase().includes(normalizedSearchQuery)
    );
  });

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
            <button type="button" onClick={() => setIsAddOpen(true)} disabled={isPersisting}>
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
                disabled={isSaving || isPersisting}
                required
              />
            </label>

            <div className="habits__form-group">
              <div className="habits__form-label">Frequency</div>
              <HabitFrequencyControls
                mode={frequencyMode}
                value={frequencyValue}
                unit={frequencyUnit}
                disabled={isSaving || isPersisting}
                onModeChange={(e) => {
                  const nextMode = e.target.value;
                  setFrequencyMode(nextMode);
                  setFrequencyUnit(nextMode === "rate" ? "week" : "day");
                }}
                onValueChange={(e) => setFrequencyValue(e.target.value)}
                onUnitChange={(e) => setFrequencyUnit(e.target.value)}
              />
            </div>

            <label className="habits__form-field habits__form-field--priority">
              <span>Priority</span>
              <select
                value={importance}
                onChange={(e) => setImportance(e.target.value)}
                title="Priority"
                disabled={isSaving || isPersisting}
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
              <button type="submit" className="habits__save-btn" disabled={isSaving || isPersisting}>
                {isSaving || isPersisting ? "Saving..." : "Save Habit"}
              </button>
              <button
                type="button"
                className="habits__cancel-btn"
                onClick={() => setIsAddOpen(false)}
                disabled={isSaving || isPersisting}
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
              <button type="button" onClick={() => setIsAddOpen(true)} disabled={isPersisting}>
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
          <HabitListItem
            key={habit.id}
            habit={habit}
            todayISO={todayISO}
            isPersisting={isPersisting}
            isEditing={editingId === habit.id}
            editState={{
              name: editName,
              onNameChange: (e) => setEditName(e.target.value),
              frequencyMode: editFrequencyMode,
              frequencyValue: editFrequencyValue,
              frequencyUnit: editFrequencyUnit,
              onFrequencyModeChange: (e) => {
                const nextMode = e.target.value;
                setEditFrequencyMode(nextMode);
                setEditFrequencyUnit(nextMode === "rate" ? "week" : "day");
              },
              onFrequencyValueChange: (e) => setEditFrequencyValue(e.target.value),
              onFrequencyUnitChange: (e) => setEditFrequencyUnit(e.target.value),
              importance: editImportance,
              onImportanceChange: (e) => setEditImportance(e.target.value),
              createdAt: editCreatedAt,
              onCreatedAtChange: (e) => setEditCreatedAt(e.target.value)
            }}
            editFeedback={editFeedback}
            isSavingEdit={isSavingEdit}
            onStartEdit={startEdit}
            onCancelEdit={cancelEdit}
            onSaveEdit={handleSaveEdit}
            onDeleteHabit={handleDeleteHabit}
            isDetailsExpanded={Boolean(expandedDetailsById[habit.id])}
            onToggleDetails={toggleDetails}
            isDatesExpanded={Boolean(expandedDatesById[habit.id])}
            onToggleDates={toggleCompletionDates}
            isPastOpen={Boolean(isPastOpenById[habit.id])}
            onTogglePastCompletionForm={togglePastCompletionForm}
            pastDateISO={pastDateById[habit.id] ?? ""}
            onPastDateChange={(e) =>
              setPastDateById((prev) => ({ ...prev, [habit.id]: e.target.value }))
            }
            completionFeedback={completionFeedbackById[habit.id]}
            isSavingCompletion={Boolean(isSavingCompletionById[habit.id])}
            onAddPastCompletion={handleAddPastCompletion}
            subtaskName={subtaskNameByHabitId[habit.id] ?? ""}
            onSubtaskNameChange={(e) =>
              setSubtaskNameByHabitId((prev) => ({
                ...prev,
                [habit.id]: e.target.value
              }))
            }
            subtaskFeedback={subtaskFeedbackByHabitId[habit.id]}
            isSavingSubtask={Boolean(isSavingSubtaskByHabitId[habit.id])}
            onAddSubtask={handleAddSubtask}
            onMarkSubtaskDoneToday={onMarkSubtaskDoneToday}
            onUndoSubtaskDoneToday={onUndoSubtaskDoneToday}
            onMarkDone={onMarkDone}
            onUndoDoneToday={onUndoDoneToday}
            formatLastCompleted={(dateISO) => formatRecentDateLabel(dateISO, todayISO)}
          />
        ))}
      </div>
    </div>
  );
}
