import React, { useState } from "react";
import { daysBetweenISO } from "../../lib/date.js";
import "./HabitCard.scss";

export default function HabitCard({ item, lastDoneISO, todayISO, onMarkDone, onAddCompletionDate }) {
  const { habit, priorityScore, due, overdueDays, intervalDays, importance } = item;
  const [isPastOpen, setIsPastOpen] = useState(false);
  const [pastDateISO, setPastDateISO] = useState("");
  const [feedback, setFeedback] = useState("");
  const [isSavingPast, setIsSavingPast] = useState(false);

  function formatLastDone(dateISO) {
    if (!dateISO) return "never";

    const daysAgo = daysBetweenISO(dateISO, todayISO);
    if (daysAgo !== null && daysAgo >= 0 && daysAgo <= 7) {
      if (daysAgo === 0) return "today";
      if (daysAgo === 1) return "1 day ago";
      return `${daysAgo} days ago`;
    }

    return dateISO;
  }

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

  return (
    <div className="habitcard card">
      <div className="habitcard__main">
        <div className="habitcard__title">
          {habit.name}
          {due ? <span className="habitcard__badge habitcard__badge--due">DUE</span> : null}
        </div>

        <div className="habitcard__meta">
          Every <b>{intervalDays}</b>d · Importance <b>{importance}</b> · Last done{" "}
          <b>{formatLastDone(lastDoneISO)}</b> · {due ? (
            overdueDays > 0 ? (
              <>
                Behind <b>{overdueDays}</b>d
              </>
            ) : (
              <>Due today</>
            )
          ) : (
            <>On schedule</>
          )}
        </div>

        <div className="habitcard__score">
          Priority score: <b>{priorityScore.toFixed(2)}</b>
        </div>

        {isPastOpen ? (
          <form className="habitcard__past-form" onSubmit={handleAddPastCompletion}>
            <input
              type="date"
              value={pastDateISO}
              max={todayISO}
              onChange={(e) => setPastDateISO(e.target.value)}
              required
            />
            <button type="submit" disabled={isSavingPast}>
              {isSavingPast ? "Saving..." : "Save past date"}
            </button>
            <button type="button" onClick={() => setIsPastOpen(false)} disabled={isSavingPast}>
              Cancel
            </button>
          </form>
        ) : (
          <button className="habitcard__ghost-btn" type="button" onClick={() => setIsPastOpen(true)}>
            Add past completion
          </button>
        )}

        {feedback ? <div className="habitcard__feedback">{feedback}</div> : null}
      </div>

      <button className="habitcard__btn" type="button" onClick={() => onMarkDone(habit.id)}>
        Mark done
      </button>
    </div>
  );
}
