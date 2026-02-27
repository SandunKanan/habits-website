import React from "react";
import "./HabitCard.scss";

export default function HabitCard({ item, lastDoneISO, onMarkDone }) {
  const { habit, priorityScore, due, daysSinceLastDone, intervalDays, importance } = item;

  return (
    <div className="habitcard card">
      <div className="habitcard__main">
        <div className="habitcard__title">
          {habit.name}
          {due ? <span className="habitcard__badge habitcard__badge--due">DUE</span> : null}
        </div>

        <div className="habitcard__meta">
          Every <b>{intervalDays}</b>d · Importance <b>{importance}</b> · Last done{" "}
          <b>{lastDoneISO ?? "never"}</b> · Behind <b>{daysSinceLastDone ?? "—"}</b>d
        </div>

        <div className="habitcard__score">
          Priority score: <b>{priorityScore.toFixed(2)}</b>
        </div>
      </div>

      <button className="habitcard__btn" onClick={() => onMarkDone(habit.id)}>
        Mark done
      </button>
    </div>
  );
}
