import React, { useState } from "react";
import {
  formatRecentDateLabel,
  sortSubtasksByLastCompletion
} from "../../lib/habitUtils.js";
import { getImportanceLabel } from "../../lib/importance.js";
import "./HabitCard.scss";

export default function HabitCard({
  item,
  lastDoneISO,
  todayISO,
  isPersisting,
  onMarkDone,
  onSkipToday,
  onMarkSubtaskDoneToday,
  onUndoSubtaskDoneToday,
  onAddCompletionDate
}) {
  const { habit, trackingScore, due, frequencyLabel, importance, statusLabel } = item;
  const [isPastOpen, setIsPastOpen] = useState(false);
  const [isSubtasksOpen, setIsSubtasksOpen] = useState(false);
  const [pastDateISO, setPastDateISO] = useState("");
  const [feedback, setFeedback] = useState("");
  const [isSavingPast, setIsSavingPast] = useState(false);

  async function handleAddPastCompletion(e) {
    e.preventDefault();
    setFeedback("");
    setIsSavingPast(true);

    const result = await onAddCompletionDate(habit.id, pastDateISO);
    if (result?.ok) {
      setPastDateISO("");
      setIsPastOpen(false);
    } else {
      setFeedback(result?.error ?? "Could not add completion date.");
    }

    setIsSavingPast(false);
  }

  const sortedSubtasks = sortSubtasksByLastCompletion(habit.subtasks);

  return (
    <div className="habitcard card">
      <div className="habitcard__main">
        <div className="habitcard__title">
          {habit.name}
          {due ? <span className="habitcard__badge habitcard__badge--due">DUE</span> : null}
        </div>

        <div className="habitcard__meta">
          {frequencyLabel} · Priority <b>{getImportanceLabel(importance)}</b> · Last done{" "}
          <b>{formatRecentDateLabel(lastDoneISO, todayISO, "lower")}</b> · {statusLabel}
        </div>

        <div className="habitcard__score">
          Tracking score: <b>{trackingScore.toFixed(2)}</b>
        </div>

        <div className="habitcard__inline-actions">
          {isPastOpen ? (
            <form className="habitcard__past-form" onSubmit={handleAddPastCompletion}>
              <input
                type="date"
                value={pastDateISO}
                max={todayISO}
                onChange={(e) => setPastDateISO(e.target.value)}
                required
                disabled={isSavingPast || isPersisting}
              />
              <button type="submit" disabled={isSavingPast || isPersisting}>
                {isSavingPast || isPersisting ? "Saving..." : "Save past date"}
              </button>
              <button
                type="button"
                onClick={() => setIsPastOpen(false)}
                disabled={isSavingPast || isPersisting}
              >
                Cancel
              </button>
            </form>
          ) : (
            <button
              className="habitcard__ghost-btn"
              type="button"
              onClick={() => setIsPastOpen(true)}
              disabled={isPersisting}
            >
              Add past completion
            </button>
          )}

          {sortedSubtasks.length > 0 ? (
            <button
              className="habitcard__ghost-btn"
              type="button"
              onClick={() => setIsSubtasksOpen((current) => !current)}
              disabled={isPersisting}
            >
              {isSubtasksOpen ? "Hide subtasks" : `Show subtasks (${sortedSubtasks.length})`}
            </button>
          ) : null}
        </div>

        {feedback ? <div className="habitcard__feedback">{feedback}</div> : null}

        {sortedSubtasks.length > 0 && isSubtasksOpen ? (
          <div className="habitcard__subtasks">
            <ul className="habitcard__subtask-list">
              {sortedSubtasks.map((subtask) => {
                const doneDates = Array.isArray(subtask.doneDates)
                  ? [...subtask.doneDates].sort((a, b) => b.localeCompare(a))
                  : [];
                const lastSubtaskDone = doneDates[0];
                const isDoneToday = lastSubtaskDone === todayISO;

                return (
                  <li key={subtask.id} className="habitcard__subtask-item">
                    <div>
                      <strong>{subtask.name}</strong>
                      <small>Last completed {formatRecentDateLabel(lastSubtaskDone, todayISO, "lower")}</small>
                    </div>
                    {isDoneToday ? (
                      <button
                        type="button"
                        onClick={() => onUndoSubtaskDoneToday(habit.id, subtask.id)}
                        disabled={isPersisting}
                      >
                        Undo
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onMarkSubtaskDoneToday(habit.id, subtask.id)}
                        disabled={isPersisting}
                      >
                        Tick
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}
      </div>

      <div className="habitcard__actions">
        <button
          className="habitcard__btn"
          type="button"
          onClick={() => onMarkDone(habit.id)}
          disabled={isPersisting}
        >
          {isPersisting ? "Saving..." : "Mark done"}
        </button>
        <button
          className="habitcard__skip-btn"
          type="button"
          onClick={() => onSkipToday(habit.id)}
          disabled={isPersisting}
        >
          {isPersisting ? "Saving..." : "Skip today"}
        </button>
      </div>
    </div>
  );
}
