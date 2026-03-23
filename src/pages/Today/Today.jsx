import React, { useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import HabitCard from "../../components/HabitCard/HabitCard.jsx";
import { daysBetweenISO } from "../../lib/date.js";
import { scoreHabitForToday } from "../../lib/scoring.js";
import "./Today.scss";

export default function Today() {
  const navigate = useNavigate();
  const {
    todayISO,
    habits,
    curatedTop5,
    lastDoneById,
    skippedTodayIds,
    onMarkDone,
    onSkipToday,
    onAddCompletionDate,
    onUndoDoneToday,
    onUndoSkipToday,
    isPersisting
  } = useOutletContext();
  const [pendingCompletedHabitId, setPendingCompletedHabitId] = useState("");
  const [pendingSkippedHabitId, setPendingSkippedHabitId] = useState("");

  const todoItems = curatedTop5.filter((item) => {
    const habitId = item.habit.id;
    return lastDoneById[habitId] !== todayISO && !skippedTodayIds.has(habitId);
  });
  const completedToday = habits.filter((habit) => {
    const importance = Number(habit.importance);
    return importance > 0 && lastDoneById[habit.id] === todayISO;
  });
  const skippedToday = habits.filter((habit) => skippedTodayIds.has(habit.id));
  const upcomingItems = habits
    .map((habit) => {
      const lastDoneISO = lastDoneById[habit.id];
      const item = scoreHabitForToday({ habit, lastDoneISO, todayISO });
      const intervalDays = item.intervalDays ?? 0;
      if (Number(habit.importance) <= 0 || item.due || intervalDays < 7 || !item.nextDueISO) {
        return null;
      }

      const daysUntilDue = daysBetweenISO(todayISO, item.nextDueISO);
      const threshold = Math.min(3, Math.max(1, Math.round(intervalDays * 0.1)));
      if (daysUntilDue === null || daysUntilDue < 1 || daysUntilDue > threshold) {
        return null;
      }

      return {
        habit,
        item,
        daysUntilDue
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.daysUntilDue - b.daysUntilDue || b.item.priorityScore - a.item.priorityScore);

  function formatUpcomingLabel(daysUntilDue) {
    if (daysUntilDue === 1) return "Due tomorrow";
    return `Due in ${daysUntilDue} days`;
  }

  async function handleUndoDone(habitId) {
    setPendingCompletedHabitId(habitId);
    try {
      await onUndoDoneToday(habitId);
    } finally {
      setPendingCompletedHabitId("");
    }
  }

  async function handleUndoSkip(habitId) {
    setPendingSkippedHabitId(habitId);
    try {
      await onUndoSkipToday(habitId);
    } finally {
      setPendingSkippedHabitId("");
    }
  }

  if (habits.length === 0) {
    return (
      <section className="today__welcome card">
        <p className="today__eyebrow">New account</p>
        <h2>Start with your first habit.</h2>
        <p className="today__welcome-copy">
          Your daily list will appear here once you add habits. Set a frequency and priority level,
          then this page will decide what is due today.
        </p>
        <div className="today__welcome-actions">
          <button type="button" onClick={() => navigate("/habits")}>
            Create first habit
          </button>
        </div>
      </section>
    );
  }

  return (
    <div className="today">
      <section className="today__section card">
        <h2>To Do</h2>
        {todoItems.length === 0 ? (
          <p className="today__empty">No tasks left for today.</p>
        ) : (
          <div className="today__grid">
            {todoItems.map((item) => (
              <HabitCard
                key={item.habit.id}
                item={item}
                lastDoneISO={lastDoneById[item.habit.id]}
                todayISO={todayISO}
                isPersisting={isPersisting}
                onMarkDone={onMarkDone}
                onSkipToday={onSkipToday}
                onAddCompletionDate={onAddCompletionDate}
              />
            ))}
          </div>
        )}
      </section>

      <section className="today__section card">
        <h2>Completed</h2>
        {completedToday.length === 0 ? (
          <p className="today__empty">No tasks completed yet today.</p>
        ) : (
          <ul className="today__completed-list">
            {completedToday.map((habit) => (
              <li key={habit.id} className="today__completed-item">
                <div>
                  <span>{habit.name}</span>
                  <small>Done on {todayISO}</small>
                </div>
                <button
                  className="today__undo-btn"
                  type="button"
                  onClick={() => handleUndoDone(habit.id)}
                  disabled={isPersisting}
                >
                  {pendingCompletedHabitId === habit.id ? "Saving..." : "Undo"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="today__section card">
        <h2>Skipped</h2>
        {skippedToday.length === 0 ? (
          <p className="today__empty">No tasks skipped today.</p>
        ) : (
          <ul className="today__completed-list">
            {skippedToday.map((habit) => (
              <li key={habit.id} className="today__completed-item today__completed-item--skipped">
                <div>
                  <span>{habit.name}</span>
                  <small>Skipped on {todayISO}</small>
                </div>
                <button
                  className="today__undo-btn"
                  type="button"
                  onClick={() => handleUndoSkip(habit.id)}
                  disabled={isPersisting}
                >
                  {pendingSkippedHabitId === habit.id ? "Saving..." : "Undo skip"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="today__section card">
        <h2>Upcoming</h2>
        {upcomingItems.length === 0 ? (
          <p className="today__empty">No upcoming tasks within the current preview window.</p>
        ) : (
          <ul className="today__completed-list">
            {upcomingItems.map(({ habit, item, daysUntilDue }) => (
              <li key={habit.id} className="today__completed-item today__completed-item--upcoming">
                <div>
                  <span>{habit.name}</span>
                  <small>
                    {item.frequencyLabel} · {formatUpcomingLabel(daysUntilDue)}
                  </small>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
