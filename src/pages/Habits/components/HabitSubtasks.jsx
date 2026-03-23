import React from "react";
import { getSortedDoneDates, sortSubtasksByLastCompletion } from "../../../lib/habitUtils.js";

export default function HabitSubtasks({
  habitId,
  todayISO,
  subtasks,
  subtaskName,
  onSubtaskNameChange,
  subtaskFeedback,
  isSavingSubtask,
  isPersisting,
  pendingSubtaskActionKey,
  formatLastCompleted,
  onAddSubtask,
  onMarkSubtaskDoneToday,
  onUndoSubtaskDoneToday
}) {
  const sortedSubtasks = sortSubtasksByLastCompletion(subtasks);

  function handleSubmit(e) {
    e.preventDefault();
    void onAddSubtask(habitId);
  }

  return (
    <div className="habits__subtasks">
      <div className="habits__subtasks-head">
        <h4>Subtasks</h4>
        <small>Track smaller parts separately from the main habit.</small>
      </div>

      <form className="habits__subtask-create" onSubmit={handleSubmit}>
        <input
          type="text"
          value={subtaskName}
          onChange={onSubtaskNameChange}
          placeholder="Add subtask"
          disabled={isSavingSubtask || isPersisting}
        />
        <button type="submit" disabled={isSavingSubtask || isPersisting}>
          {isSavingSubtask || isPersisting ? "Saving..." : "Add"}
        </button>
      </form>

      {subtaskFeedback ? <p className="habits__feedback habits__feedback--inline">{subtaskFeedback}</p> : null}

      {sortedSubtasks.length === 0 ? (
        <p className="habits__subtasks-empty">No subtasks yet.</p>
      ) : (
        <ul className="habits__subtask-list">
          {sortedSubtasks.map((subtask) => {
            const subtaskDoneDates = getSortedDoneDates(subtask);
            const lastSubtaskDone = subtaskDoneDates[0];
            const isSubtaskDoneToday = lastSubtaskDone === todayISO;

            return (
              <li key={subtask.id} className="habits__subtask-item">
                <div>
                  <strong>{subtask.name}</strong>
                  <small>
                    Last completed {formatLastCompleted(lastSubtaskDone)} · {subtaskDoneDates.length} total
                  </small>
                </div>
                <button
                  type="button"
                  className={`habits__subtask-checkbox ${isSubtaskDoneToday ? "habits__subtask-checkbox--checked" : ""}`}
                  onClick={() =>
                    isSubtaskDoneToday
                      ? onUndoSubtaskDoneToday(habitId, subtask.id)
                      : onMarkSubtaskDoneToday(habitId, subtask.id)
                  }
                  disabled={isPersisting}
                  aria-pressed={isSubtaskDoneToday}
                  aria-label={
                    pendingSubtaskActionKey === `subtask:${habitId}:${subtask.id}:undo` ||
                    pendingSubtaskActionKey === `subtask:${habitId}:${subtask.id}:tick`
                      ? `Saving ${subtask.name}`
                      : isSubtaskDoneToday
                        ? `Untick ${subtask.name} for today`
                        : `Tick ${subtask.name} for today`
                  }
                  title={isSubtaskDoneToday ? "Done today" : "Not done today"}
                >
                  {pendingSubtaskActionKey === `subtask:${habitId}:${subtask.id}:undo` ||
                  pendingSubtaskActionKey === `subtask:${habitId}:${subtask.id}:tick` ? (
                    <span className="habits__subtask-checkbox-spinner" aria-hidden="true" />
                  ) : (
                    <span className="habits__subtask-checkbox-mark" aria-hidden="true">
                      {isSubtaskDoneToday ? "✓" : ""}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
