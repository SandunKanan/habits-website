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

  return (
    <div className="habits__subtasks">
      <div className="habits__subtasks-head">
        <h4>Subtasks</h4>
        <small>Track smaller parts separately from the main habit.</small>
      </div>

      <div className="habits__subtask-create">
        <input
          type="text"
          value={subtaskName}
          onChange={onSubtaskNameChange}
          placeholder="Add subtask"
          disabled={isSavingSubtask || isPersisting}
        />
        <button type="button" onClick={() => onAddSubtask(habitId)} disabled={isSavingSubtask || isPersisting}>
          {isSavingSubtask || isPersisting ? "Saving..." : "Add"}
        </button>
      </div>

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
                {isSubtaskDoneToday ? (
                  <button
                    type="button"
                    onClick={() => onUndoSubtaskDoneToday(habitId, subtask.id)}
                    disabled={isPersisting}
                  >
                    {pendingSubtaskActionKey === `subtask:${habitId}:${subtask.id}:undo`
                      ? "Saving..."
                      : "Undo today"}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => onMarkSubtaskDoneToday(habitId, subtask.id)}
                    disabled={isPersisting}
                  >
                    {pendingSubtaskActionKey === `subtask:${habitId}:${subtask.id}:tick`
                      ? "Saving..."
                      : "Tick today"}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
