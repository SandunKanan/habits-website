import React, { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { getAttributeGainsFromLinks } from "../../lib/attributeScores.js";
import "./History.scss";

export default function History() {
  const { todayISO, habits, attributes, oneOffTasks, trackingMetrics, trackingEntries, onAddOneOffTask, isPersisting } =
    useOutletContext();
  const [taskTitle, setTaskTitle] = useState("");
  const [completedOn, setCompletedOn] = useState(todayISO);
  const [taskAttributeLinks, setTaskAttributeLinks] = useState([]);
  const [feedback, setFeedback] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const groupedByDate = new Map();

  function addTaskAttributeLink() {
    setTaskAttributeLinks((current) => [...current, { attributeId: "", weight: 1 }]);
  }

  function updateTaskAttributeLink(index, updates) {
    setTaskAttributeLinks((current) =>
      current.map((link, linkIndex) => (linkIndex === index ? { ...link, ...updates } : link))
    );
  }

  function removeTaskAttributeLink(index) {
    setTaskAttributeLinks((current) => current.filter((_, linkIndex) => linkIndex !== index));
  }

  async function handleAddPastTask(event) {
    event.preventDefault();
    setFeedback("");
    setIsSaving(true);

    try {
      const result = await onAddOneOffTask({
        title: taskTitle,
        completedOn,
        attributeLinks: taskAttributeLinks
      });

      if (!result?.ok) {
        setFeedback(result?.error || "Could not save completed task.");
        return;
      }

      setTaskTitle("");
      setCompletedOn(todayISO);
      setTaskAttributeLinks([]);
      setFeedback("Past task logged.");
    } finally {
      setIsSaving(false);
    }
  }

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
        subtasks: [],
        attributeGains: []
      });
    }

    return dateGroup.get(habitName);
  }

  function ensureUniqueEvent(dateISO, key, habitName, type) {
    const dateGroup = ensureDateGroup(dateISO);
    dateGroup.set(key, {
      habitName,
      type,
      subtasks: [],
      attributeGains: []
    });
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

    for (const dateISO of Array.isArray(habit.cycleSkipDates) ? habit.cycleSkipDates : []) {
      ensureUniqueEvent(dateISO, `cycle-skip:${habit.id}:${dateISO}`, habitName, "habit_cycle_skipped");
    }

    for (const subtask of Array.isArray(habit.subtasks) ? habit.subtasks : []) {
      for (const dateISO of Array.isArray(subtask.doneDates) ? subtask.doneDates : []) {
        const event = ensureHabitEvent(dateISO, habitName);
        event.subtasks.push(subtask.name);
      }
    }
  }

  for (const task of Array.isArray(oneOffTasks) ? oneOffTasks : []) {
    const dateGroup = ensureDateGroup(task.completedOn);
    dateGroup.set(`one-off:${task.id}`, {
      habitName: task.title,
      type: "one_off_done",
      subtasks: [],
      attributeGains: getAttributeGainsFromLinks(task.attributeLinks, attributes)
    });
  }

  for (const entry of Array.isArray(trackingEntries) ? trackingEntries : []) {
    const metric = trackingMetrics.find((item) => item.id === entry.metricId);
    if (!metric) continue;

    const dateGroup = ensureDateGroup(entry.entryDate);
    dateGroup.set(`metric:${entry.id}`, {
      habitName: metric.name,
      type: metric.mode === "structured_log" ? "structured_entry" : "metric_entry",
      subtasks: [],
      attributeGains: [],
      metricValue: entry.value,
      metricUnit: metric.unit,
      metricFields: Array.isArray(metric.fields) ? metric.fields : [],
      metricValueJson: entry.valueJson ?? {}
    });
  }

  const dailyHistory = [...groupedByDate.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([dateISO, habitEvents]) => ({
      dateISO,
      events: [...habitEvents.values()]
        .map((event) => ({
          ...event,
          subtasks: [...new Set(event.subtasks)].sort((a, b) => a.localeCompare(b)),
          attributeGains: Array.isArray(event.attributeGains) ? event.attributeGains : [],
          metricValue: event.metricValue,
          metricUnit: event.metricUnit
        }))
        .sort((a, b) => a.habitName.localeCompare(b.habitName))
    }));

  return (
    <div className="history">
      <section className="history__log card">
        <div className="history__log-head">
          <div>
            <h2>Log Past Task</h2>
            <p>Add a one-off completion to a previous day.</p>
          </div>
        </div>

        <form className="history__log-form" onSubmit={handleAddPastTask}>
          <div className="history__log-grid">
            <input
              type="text"
              value={taskTitle}
              onChange={(event) => setTaskTitle(event.target.value)}
              placeholder="Task name"
              disabled={isPersisting || isSaving}
            />
            <input
              type="date"
              value={completedOn}
              onChange={(event) => setCompletedOn(event.target.value)}
              disabled={isPersisting || isSaving}
            />
          </div>

          <div className="history__log-links">
            {taskAttributeLinks.map((link, index) => (
              <div key={`${link.attributeId}-${index}`} className="history__log-link-row">
                <select
                  value={link.attributeId}
                  onChange={(event) =>
                    updateTaskAttributeLink(index, { attributeId: event.target.value })
                  }
                  disabled={isPersisting || isSaving}
                >
                  <option value="">Choose attribute</option>
                  {attributes.map((attribute) => (
                    <option key={attribute.id} value={attribute.id}>
                      {attribute.name}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={link.weight}
                  onChange={(event) =>
                    updateTaskAttributeLink(index, { weight: Number(event.target.value) })
                  }
                  disabled={isPersisting || isSaving}
                />
                <button
                  type="button"
                  onClick={() => removeTaskAttributeLink(index)}
                  disabled={isPersisting || isSaving}
                >
                  Remove
                </button>
              </div>
            ))}

            <div className="history__log-actions">
              <button
                type="button"
                className="history__secondary-btn"
                onClick={addTaskAttributeLink}
                disabled={isPersisting || isSaving}
              >
                Add attribute contribution
              </button>
              <button type="submit" disabled={isPersisting || isSaving}>
                {isSaving ? "Saving..." : "Log past task"}
              </button>
            </div>
          </div>

          {feedback ? <p className="history__feedback">{feedback}</p> : null}
        </form>
      </section>

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
                  <span
                    className={`history__badge history__badge--${event.type.replaceAll("_", "-")}`}
                  >
                    {event.type === "habit_done"
                      ? "Completed"
                      : event.type === "habit_skipped"
                        ? "Skipped"
                        : event.type === "habit_cycle_skipped"
                          ? "Cycle skipped"
                        : event.type === "one_off_done"
                            ? "One-off"
                          : event.type === "metric_entry"
                            ? "Metric"
                            : event.type === "structured_entry"
                              ? "Log"
                        : "Subtasks"}
                  </span>
                  <div className="history__event-copy">
                    <strong>{event.habitName}</strong>
                    {event.type === "metric_entry" ? (
                      <small>
                        {event.metricValue}
                        {event.metricUnit ? ` ${event.metricUnit}` : ""}
                      </small>
                    ) : null}
                    {event.type === "structured_entry" ? (
                      <ul className="history__subtask-list">
                        {event.metricFields.map((field) => {
                          const value = event.metricValueJson?.[field.key];
                          if (value === null || value === undefined || value === "") return null;
                          return (
                            <li key={field.key} className="history__subtask-copy">
                              {field.label}: {value}
                              {field.inputType === "number" && field.unit ? ` ${field.unit}` : ""}
                            </li>
                          );
                        })}
                      </ul>
                    ) : null}
                    {event.subtasks.length > 0 ? (
                      <ul className="history__subtask-list">
                        {event.subtasks.map((subtask) => (
                          <li key={subtask} className="history__subtask-copy">
                            {subtask}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    {event.attributeGains.length > 0 ? (
                      <ul className="history__subtask-list">
                        {event.attributeGains.map((gain) => (
                          <li
                            key={`${gain.attributeId}-${gain.attributeName}`}
                            className="history__subtask-copy"
                          >
                            {gain.attributeName} +{gain.weight.toFixed(2).replace(/\.00$/, "")}
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
