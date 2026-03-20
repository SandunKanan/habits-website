import React from "react";
import { useOutletContext } from "react-router-dom";
import "./History.scss";

export default function History() {
  const { habits } = useOutletContext();

  const groupedByDate = new Map();

  function ensureDateGroup(dateISO) {
    if (!groupedByDate.has(dateISO)) {
      groupedByDate.set(dateISO, new Map());
    }

    return groupedByDate.get(dateISO);
  }

  function ensureHabitEvent(dateISO, habitName) {
    const dateGroup = ensureDateGroup(dateISO);
    if (!dateGroup.has(habitName)) {
      dateGroup.set(habitName, {
        habitName,
        type: "subtask_only",
        subtasks: []
      });
    }

    return dateGroup.get(habitName);
  }

  for (const habit of habits) {
    const habitName = habit.name;

    for (const dateISO of Array.isArray(habit.doneDates) ? habit.doneDates : []) {
      const event = ensureHabitEvent(dateISO, habitName);
      event.type = "habit_done";
    }

    for (const dateISO of Array.isArray(habit.skippedDates) ? habit.skippedDates : []) {
      const event = ensureHabitEvent(dateISO, habitName);
      event.type = "habit_skipped";
    }

    for (const subtask of Array.isArray(habit.subtasks) ? habit.subtasks : []) {
      for (const dateISO of Array.isArray(subtask.doneDates) ? subtask.doneDates : []) {
        const event = ensureHabitEvent(dateISO, habitName);
        event.subtasks.push(subtask.name);
      }
    }
  }

  const dailyHistory = [...groupedByDate.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([dateISO, habitEvents]) => ({
      dateISO,
      events: [...habitEvents.values()]
        .map((event) => ({
          ...event,
          subtasks: [...new Set(event.subtasks)].sort((a, b) => a.localeCompare(b))
        }))
        .sort((a, b) => a.habitName.localeCompare(b.habitName))
    }));

  return (
    <div className="history">
      {dailyHistory.length === 0 ? (
        <section className="history__empty card">
          <h2>Day-by-Day History</h2>
          <p>No activity yet. Start logging habits from the Today or Habits pages.</p>
        </section>
      ) : (
        dailyHistory.map(({ dateISO, events }) => (
          <section key={dateISO} className="history__day card">
            <div className="history__day-head">
              <h2>{dateISO}</h2>
              <span>{events.length} event{events.length === 1 ? "" : "s"}</span>
            </div>

            <ul className="history__event-list">
              {events.map((event, idx) => (
                <li key={`${event.type}-${event.habitName}-${idx}`} className="history__event">
                  <span className={`history__badge history__badge--${event.type.replace("_", "-")}`}>
                    {event.type === "habit_done"
                      ? "Completed"
                      : event.type === "habit_skipped"
                        ? "Skipped"
                        : "Subtasks"}
                  </span>
                  <div className="history__event-copy">
                    <strong>{event.habitName}</strong>
                    {event.subtasks.length > 0 ? (
                      <ul className="history__subtask-list">
                        {event.subtasks.map((subtask) => (
                          <li key={subtask} className="history__subtask-copy">
                            {subtask}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
