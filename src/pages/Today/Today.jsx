import React, { useEffect, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import HabitCard from "../../components/HabitCard/HabitCard.jsx";
import {
  buildTodayAttributeGainSummary,
  getAttributeGainsFromLinks,
  getHabitAttributeGains
} from "../../lib/attributeScores.js";
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
    attributes,
    vision,
    focus,
    domains,
    goals,
    learnings,
    oneOffTasks,
    trackingMetrics,
    trackingEntries,
    settings,
    skippedTodayIds,
    onAddOneOffTask,
    onSaveTrackingEntry,
    onDeleteTrackingEntry,
    onMarkDone,
    onDeleteOneOffTask,
    onSkipToday,
    onAddCompletionDate,
    onUndoDoneToday,
    onUndoSkipToday,
    isPersisting
  } = useOutletContext();
  const [pendingCompletedHabitId, setPendingCompletedHabitId] = useState("");
  const [pendingSkippedHabitId, setPendingSkippedHabitId] = useState("");
  const [pendingUpcomingHabitId, setPendingUpcomingHabitId] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskAttributeLinks, setTaskAttributeLinks] = useState([]);
  const [taskFeedback, setTaskFeedback] = useState("");
  const [isSavingTask, setIsSavingTask] = useState(false);
  const [pendingDeleteTaskId, setPendingDeleteTaskId] = useState("");
  const [metricDrafts, setMetricDrafts] = useState({});
  const [metricFeedback, setMetricFeedback] = useState("");
  const [pendingMetricId, setPendingMetricId] = useState("");
  const isFocusViewEnabled = Boolean(settings?.highlightFocusAttributes ?? true);
  const focusAttributeIds = new Set(
    isFocusViewEnabled && Array.isArray(vision?.focusAttributeIds) ? vision.focusAttributeIds : []
  );
  const focusDomainIds = new Set(
    isFocusViewEnabled && Array.isArray(focus?.focusDomainIds) ? focus.focusDomainIds : []
  );
  const focusedDomains = Array.isArray(domains)
    ? domains.filter((domain) => focusDomainIds.has(domain.id))
    : [];
  const focusedTargetGoalIds = new Set(
    isFocusViewEnabled && Array.isArray(focus?.focusTargets)
      ? focus.focusTargets.map((target) => target.goalId).filter(Boolean)
      : []
  );
  const focusedGoals = Array.isArray(goals) ? goals.filter((goal) => focusedTargetGoalIds.has(goal.id)) : [];
  const alignedPursuits = Array.isArray(learnings)
    ? learnings.filter((item) => {
        const matchesDomain =
          Array.isArray(item.domainIds) && item.domainIds.some((domainId) => focusDomainIds.has(domainId));
        const matchesGoal =
          Array.isArray(item.pursuitTargets) &&
          item.pursuitTargets.some((target) => focusedTargetGoalIds.has(target.goalId));
        return matchesDomain || matchesGoal;
      })
    : [];

  const todoItems = curatedTop5.filter((item) => {
    const habitId = item.habit.id;
    return lastDoneById[habitId] !== todayISO && !skippedTodayIds.has(habitId);
  });
  const completedToday = habits.filter((habit) => {
    const importance = Number(habit.importance);
    return importance > 0 && lastDoneById[habit.id] === todayISO;
  });
  const completedOneOffTasks = Array.isArray(oneOffTasks)
    ? oneOffTasks.filter((task) => task.completedOn === todayISO)
    : [];
  const todayAttributeGains = buildTodayAttributeGainSummary(
    [...completedToday, ...completedOneOffTasks],
    attributes
  );
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

  useEffect(() => {
    const nextDrafts = {};
    for (const metric of Array.isArray(trackingMetrics) ? trackingMetrics : []) {
      const entry = Array.isArray(trackingEntries)
        ? trackingEntries.find((item) => item.metricId === metric.id && item.entryDate === todayISO)
        : null;
      nextDrafts[metric.id] = entry ? String(entry.value) : "";
    }
    setMetricDrafts(nextDrafts);
  }, [todayISO, trackingEntries, trackingMetrics]);

  function formatUpcomingLabel(daysUntilDue) {
    if (daysUntilDue === 1) return "Due tomorrow";
    return `Due in ${daysUntilDue} days`;
  }

  function formatGain(value) {
    return Number(value).toFixed(2).replace(/\.00$/, "");
  }

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

  async function handleDoToday(habitId) {
    setPendingUpcomingHabitId(habitId);
    try {
      await onMarkDone(habitId);
    } finally {
      setPendingUpcomingHabitId("");
    }
  }

  async function handleAddOneOffTask(event) {
    event.preventDefault();
    setTaskFeedback("");
    setIsSavingTask(true);

    try {
      const result = await onAddOneOffTask({
        title: taskTitle,
        completedOn: todayISO,
        attributeLinks: taskAttributeLinks
      });

      if (!result?.ok) {
        setTaskFeedback(result?.error || "Could not save completed task.");
        return;
      }

      setTaskTitle("");
      setTaskAttributeLinks([]);
    } finally {
      setIsSavingTask(false);
    }
  }

  async function handleDeleteOneOffTask(taskId) {
    setPendingDeleteTaskId(taskId);

    try {
      await onDeleteOneOffTask(taskId);
    } finally {
      setPendingDeleteTaskId("");
    }
  }

  async function handleSaveMetric(metricId) {
    setMetricFeedback("");
    setPendingMetricId(metricId);

    try {
      const draftValue = metricDrafts[metricId];
      const result = await onSaveTrackingEntry({
        metricId,
        entryDate: todayISO,
        value: draftValue
      });

      if (!result?.ok) {
        setMetricFeedback(result?.error || "Could not save metric entry.");
      }
    } finally {
      setPendingMetricId("");
    }
  }

  async function handleClearMetric(metricId) {
    setMetricFeedback("");
    setPendingMetricId(metricId);

    try {
      const result = await onDeleteTrackingEntry(metricId, todayISO);
      if (!result?.ok) {
        setMetricFeedback(result?.error || "Could not clear metric entry.");
      }
    } finally {
      setPendingMetricId("");
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
      {isFocusViewEnabled &&
      (focusedDomains.length > 0 || focusedGoals.length > 0 || alignedPursuits.length > 0) ? (
        <section className="today__section today__section--focus card">
          <h2>Current Focus</h2>
          <div className="today__focus-grid">
            <article className="today__focus-card">
              <span>Domains</span>
              {focusedDomains.length > 0 ? (
                <div className="today__focus-chips">
                  {focusedDomains.map((domain) => (
                    <span key={domain.id} className="today__focus-chip">
                      {domain.name}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="today__empty">No focused domains selected.</p>
              )}
            </article>
            <article className="today__focus-card">
              <span>Goals</span>
              {focusedGoals.length > 0 ? (
                <ul className="today__focus-list">
                  {focusedGoals.map((goal) => (
                    <li key={goal.id}>{goal.title}</li>
                  ))}
                </ul>
              ) : (
                <p className="today__empty">No focus goals selected.</p>
              )}
            </article>
            <article className="today__focus-card">
              <span>Pursuits</span>
              {alignedPursuits.length > 0 ? (
                <ul className="today__focus-list">
                  {alignedPursuits.slice(0, 5).map((item) => (
                    <li key={item.id}>{item.title}</li>
                  ))}
                </ul>
              ) : (
                <p className="today__empty">No pursuits aligned yet.</p>
              )}
            </article>
          </div>
        </section>
      ) : null}

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
        <h2>Track Today</h2>
        {trackingMetrics.length === 0 ? (
          <p className="today__empty">
            No metrics set up yet. Add what you want to measure on the Tracking page.
          </p>
        ) : (
          <div className="today__tracking-list">
            {trackingMetrics.map((metric) => {
              const todayEntry = trackingEntries.find(
                (entry) => entry.metricId === metric.id && entry.entryDate === todayISO
              );
              const hasSavedValue = Boolean(todayEntry);

              return (
                <div key={metric.id} className="today__tracking-item">
                  <div className="today__tracking-copy">
                    <span>{metric.name}</span>
                    <small>
                      {metric.unit}
                      {metric.targetValue !== null && metric.targetValue !== undefined
                        ? ` · target ${metric.targetValue}`
                        : ""}
                    </small>
                  </div>

                  <div className="today__tracking-controls">
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={metricDrafts[metric.id] ?? ""}
                      onChange={(event) =>
                        setMetricDrafts((current) => ({
                          ...current,
                          [metric.id]: event.target.value
                        }))
                      }
                      disabled={isPersisting}
                    />
                    <button
                      type="button"
                      className="today__do-btn"
                      onClick={() => handleSaveMetric(metric.id)}
                      disabled={isPersisting || pendingMetricId === metric.id}
                    >
                      {pendingMetricId === metric.id ? "Saving..." : "Save"}
                    </button>
                    {hasSavedValue ? (
                      <button
                        type="button"
                        className="today__undo-btn"
                        onClick={() => handleClearMetric(metric.id)}
                        disabled={isPersisting || pendingMetricId === metric.id}
                      >
                        Clear
                      </button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {metricFeedback ? <p className="today__task-feedback">{metricFeedback}</p> : null}
      </section>

      <section className="today__section card">
        <h2>Log One-Off Task</h2>
        <form className="today__task-form" onSubmit={handleAddOneOffTask}>
          <div className="today__task-form-row">
            <input
              type="text"
              value={taskTitle}
              onChange={(event) => setTaskTitle(event.target.value)}
              placeholder="Task name"
              disabled={isPersisting || isSavingTask}
            />
            <button type="submit" className="today__do-btn" disabled={isPersisting || isSavingTask}>
              {isSavingTask ? "Saving..." : "Add completed task"}
            </button>
          </div>

          <div className="today__task-links">
            {taskAttributeLinks.map((link, index) => (
              <div key={`${link.attributeId}-${index}`} className="today__task-link-row">
                <select
                  value={link.attributeId}
                  onChange={(event) =>
                    updateTaskAttributeLink(index, { attributeId: event.target.value })
                  }
                  disabled={isPersisting || isSavingTask}
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
                  disabled={isPersisting || isSavingTask}
                />
                <button
                  type="button"
                  className="today__undo-btn"
                  onClick={() => removeTaskAttributeLink(index)}
                  disabled={isPersisting || isSavingTask}
                >
                  Remove
                </button>
              </div>
            ))}

            <button
              type="button"
              className="today__task-link-add"
              onClick={addTaskAttributeLink}
              disabled={isPersisting || isSavingTask}
            >
              Add attribute contribution
            </button>
          </div>

          {taskFeedback ? <p className="today__task-feedback">{taskFeedback}</p> : null}
        </form>
      </section>

      <section className="today__section card">
        <h2>Completed</h2>
        {todayAttributeGains.length > 0 ? (
          <div className="today__attribute-summary">
            <span className="today__attribute-summary-label">Attributes increased today</span>
            <div className="today__attribute-chips">
              {todayAttributeGains.map((gain) => (
                <span
                  key={gain.attributeId}
                  className={[
                    "today__attribute-chip",
                    focusAttributeIds.has(gain.attributeId) ? "today__attribute-chip--focus" : ""
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  {gain.attributeName} +{gain.weight.toFixed(2).replace(/\.00$/, "")}
                </span>
              ))}
            </div>
          </div>
        ) : null}
        {completedToday.length === 0 && completedOneOffTasks.length === 0 ? (
          <p className="today__empty">No tasks completed yet today.</p>
        ) : (
          <ul className="today__completed-list">
            {completedToday.map((habit) => {
              const attributeGains = getHabitAttributeGains(habit, attributes);

              return (
                <li key={habit.id} className="today__completed-item">
                  <div>
                    <span>{habit.name}</span>
                    <small>Done on {todayISO}</small>
                    {attributeGains.length > 0 ? (
                      <div className="today__completed-attributes">
                        {attributeGains.map((gain) => (
                          <span
                            key={gain.attributeId}
                            className={[
                              "today__attribute-chip",
                              "today__attribute-chip--inline",
                              focusAttributeIds.has(gain.attributeId)
                                ? "today__attribute-chip--focus"
                                : ""
                            ]
                              .filter(Boolean)
                              .join(" ")}
                          >
                            {gain.attributeName} +{formatGain(gain.weight)}
                          </span>
                        ))}
                      </div>
                    ) : null}
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
              );
            })}
            {completedOneOffTasks.map((task) => {
              const attributeGains = getAttributeGainsFromLinks(task.attributeLinks, attributes);

              return (
                <li key={task.id} className="today__completed-item today__completed-item--task">
                  <div>
                    <span>{task.title}</span>
                    <small>One-off task completed on {todayISO}</small>
                    {attributeGains.length > 0 ? (
                      <div className="today__completed-attributes">
                        {attributeGains.map((gain) => (
                          <span
                            key={gain.attributeId}
                            className={[
                              "today__attribute-chip",
                              "today__attribute-chip--inline",
                              focusAttributeIds.has(gain.attributeId)
                                ? "today__attribute-chip--focus"
                                : ""
                            ]
                              .filter(Boolean)
                              .join(" ")}
                          >
                            {gain.attributeName} +{formatGain(gain.weight)}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  <button
                    className="today__undo-btn"
                    type="button"
                    onClick={() => handleDeleteOneOffTask(task.id)}
                    disabled={isPersisting || isSavingTask}
                  >
                    {pendingDeleteTaskId === task.id ? "Saving..." : "Remove"}
                  </button>
                </li>
              );
            })}
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
                <button
                  className="today__do-btn"
                  type="button"
                  onClick={() => handleDoToday(habit.id)}
                  disabled={isPersisting}
                >
                  {pendingUpcomingHabitId === habit.id ? "Saving..." : "Do today"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
