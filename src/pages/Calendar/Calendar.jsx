import React, { useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { addMonthsISO, parseISODate } from "../../lib/date.js";
import {
  buildMonthGrid,
  buildProjectedHabitEvents,
  buildUpcomingOneOffTaskEvents,
  CALENDAR_HORIZON_DAYS,
  groupEventsByDate
} from "../../lib/calendar.js";
import "./Calendar.scss";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function formatDayHeading(dateISO) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric"
  }).format(parseISODate(dateISO));
}

function formatMonthHeading(dateISO) {
  return new Intl.DateTimeFormat(undefined, {
    month: "long",
    year: "numeric"
  }).format(parseISODate(dateISO));
}

function formatEventMeta(event) {
  if (event.type === "task") {
    return "Single task";
  }

  return event.frequencyLabel || "Habit";
}

export default function Calendar() {
  const {
    todayISO,
    habits,
    oneOffTasks,
    onAddOneOffTask,
    onCompleteOneOffTask,
    onDeleteOneOffTask,
    isPersisting
  } = useOutletContext();
  const [viewMode, setViewMode] = useState("list");
  const [monthAnchorISO, setMonthAnchorISO] = useState(todayISO);
  const [selectedDateISO, setSelectedDateISO] = useState(todayISO);
  const [taskTitle, setTaskTitle] = useState("");
  const [scheduledFor, setScheduledFor] = useState(todayISO);
  const [feedback, setFeedback] = useState("");
  const [isSavingTask, setIsSavingTask] = useState(false);
  const [pendingTaskActionKey, setPendingTaskActionKey] = useState("");

  const projectedHabitEvents = useMemo(
    () => buildProjectedHabitEvents({ habits, todayISO, horizonDays: CALENDAR_HORIZON_DAYS }),
    [habits, todayISO]
  );
  const upcomingOneOffEvents = useMemo(
    () => buildUpcomingOneOffTaskEvents(oneOffTasks, todayISO),
    [oneOffTasks, todayISO]
  );
  const calendarEvents = useMemo(
    () => [...upcomingOneOffEvents, ...projectedHabitEvents].sort((a, b) => a.dateISO.localeCompare(b.dateISO)),
    [projectedHabitEvents, upcomingOneOffEvents]
  );
  const groupedAgenda = useMemo(() => groupEventsByDate(calendarEvents), [calendarEvents]);
  const eventsByDate = useMemo(() => {
    const mapped = new Map();

    for (const group of groupedAgenda) {
      mapped.set(group.dateISO, group.items);
    }

    return mapped;
  }, [groupedAgenda]);
  const monthGrid = useMemo(() => buildMonthGrid(monthAnchorISO), [monthAnchorISO]);
  const selectedItems = eventsByDate.get(selectedDateISO) ?? [];
  const habitsThisWindow = projectedHabitEvents.length;
  const tasksThisWindow = upcomingOneOffEvents.length;

  async function handleScheduleTask(event) {
    event.preventDefault();
    setFeedback("");
    setIsSavingTask(true);

    try {
      const result = await onAddOneOffTask({
        title: taskTitle,
        scheduledFor
      });

      if (!result?.ok) {
        setFeedback(result?.error || "Could not schedule task.");
        return;
      }

      setTaskTitle("");
      setScheduledFor(todayISO);
      setFeedback("Task scheduled.");
    } finally {
      setIsSavingTask(false);
    }
  }

  async function handleCompleteTask(taskId) {
    setPendingTaskActionKey(`complete:${taskId}`);

    try {
      await onCompleteOneOffTask(taskId, todayISO);
    } finally {
      setPendingTaskActionKey("");
    }
  }

  async function handleDeleteTask(taskId) {
    setPendingTaskActionKey(`delete:${taskId}`);

    try {
      await onDeleteOneOffTask(taskId);
    } finally {
      setPendingTaskActionKey("");
    }
  }

  function renderEventItem(event) {
    if (event.type === "task") {
      const isCompleting = pendingTaskActionKey === `complete:${event.taskId}`;
      const isDeleting = pendingTaskActionKey === `delete:${event.taskId}`;

      return (
        <article key={event.id} className="calendar__item calendar__item--task">
          <div className="calendar__item-main">
            <div className="calendar__pill calendar__pill--task">Task</div>
            <div>
              <h3>{event.title}</h3>
              <p>{formatEventMeta(event)}</p>
            </div>
          </div>
          <div className="calendar__item-actions">
            <button type="button" onClick={() => handleCompleteTask(event.taskId)} disabled={isPersisting || isCompleting}>
              {isCompleting ? "Saving..." : "Mark done today"}
            </button>
            <button
              type="button"
              className="calendar__ghost-btn"
              onClick={() => handleDeleteTask(event.taskId)}
              disabled={isPersisting || isDeleting}
            >
              {isDeleting ? "Removing..." : "Delete"}
            </button>
          </div>
        </article>
      );
    }

    return (
      <article key={event.id} className="calendar__item calendar__item--habit">
        <div className="calendar__item-main">
          <div className="calendar__pill calendar__pill--habit">Habit</div>
          <div>
            <h3>{event.title}</h3>
            <p>{formatEventMeta(event)}</p>
          </div>
        </div>
      </article>
    );
  }

  return (
    <div className="calendar">
      <section className="calendar__hero card">
        <div>
          <p className="calendar__eyebrow">Forecast Window</p>
          <h2>The next {CALENDAR_HORIZON_DAYS} days</h2>
          <p className="calendar__hero-copy">
            Recurring habits are projected forward assuming perfect adherence. One-off tasks appear on the
            dates you schedule them.
          </p>
        </div>
        <div className="calendar__hero-stats">
          <div className="calendar__stat">
            <span>Projected habits</span>
            <strong>{habitsThisWindow}</strong>
          </div>
          <div className="calendar__stat">
            <span>Scheduled tasks</span>
            <strong>{tasksThisWindow}</strong>
          </div>
        </div>
      </section>

      <section className="calendar__planner card">
        <div className="calendar__planner-head">
          <div>
            <h2>Schedule single task</h2>
            <p>Add a future one-off task so it appears alongside your projected habits.</p>
          </div>
          <div className="calendar__view-toggle" role="tablist" aria-label="Calendar views">
            <button
              type="button"
              className={viewMode === "list" ? "active" : ""}
              onClick={() => setViewMode("list")}
            >
              List
            </button>
            <button
              type="button"
              className={viewMode === "month" ? "active" : ""}
              onClick={() => setViewMode("month")}
            >
              Month
            </button>
          </div>
        </div>

        <form className="calendar__task-form" onSubmit={handleScheduleTask}>
          <input
            type="text"
            value={taskTitle}
            onChange={(event) => setTaskTitle(event.target.value)}
            placeholder="Prepare quarterly review"
            disabled={isPersisting || isSavingTask}
            required
          />
          <input
            type="date"
            value={scheduledFor}
            min={todayISO}
            onChange={(event) => setScheduledFor(event.target.value)}
            disabled={isPersisting || isSavingTask}
            required
          />
          <button type="submit" disabled={isPersisting || isSavingTask}>
            {isSavingTask ? "Saving..." : "Schedule task"}
          </button>
        </form>
        {feedback ? <p className="calendar__feedback">{feedback}</p> : null}
      </section>

      {viewMode === "list" ? (
        groupedAgenda.length === 0 ? (
          <section className="calendar__empty card">
            <h2>No upcoming items</h2>
            <p>As you add habits and schedule one-off tasks, they will show up here.</p>
          </section>
        ) : (
          <section className="calendar__agenda">
            {groupedAgenda.map((group) => (
              <section key={group.dateISO} className="calendar__day card">
                <div className="calendar__day-head">
                  <div>
                    <h2>{formatDayHeading(group.dateISO)}</h2>
                    <p>{group.dateISO}</p>
                  </div>
                  <span>
                    {group.items.length} item{group.items.length === 1 ? "" : "s"}
                  </span>
                </div>
                <div className="calendar__item-list">{group.items.map(renderEventItem)}</div>
              </section>
            ))}
          </section>
        )
      ) : (
        <section className="calendar__month-layout">
          <div className="calendar__month card">
            <div className="calendar__month-head">
              <button type="button" onClick={() => setMonthAnchorISO(addMonthsISO(monthAnchorISO, -1))}>
                Previous
              </button>
              <h2>{formatMonthHeading(monthGrid.monthStartISO)}</h2>
              <button type="button" onClick={() => setMonthAnchorISO(addMonthsISO(monthAnchorISO, 1))}>
                Next
              </button>
            </div>

            <div className="calendar__month-weekdays">
              {WEEKDAY_LABELS.map((label) => (
                <span key={label}>{label}</span>
              ))}
            </div>

            <div className="calendar__month-grid">
              {monthGrid.days.map((day) => {
                const items = eventsByDate.get(day.dateISO) ?? [];
                const taskCount = items.filter((item) => item.type === "task").length;
                const habitCount = items.length - taskCount;
                const isSelected = day.dateISO === selectedDateISO;

                return (
                  <button
                    key={day.dateISO}
                    type="button"
                    className={[
                      "calendar__day-cell",
                      day.inMonth ? "" : "calendar__day-cell--outside",
                      day.dateISO === todayISO ? "calendar__day-cell--today" : "",
                      isSelected ? "calendar__day-cell--selected" : ""
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    onClick={() => setSelectedDateISO(day.dateISO)}
                  >
                    <span className="calendar__day-number">{parseISODate(day.dateISO).getDate()}</span>
                    {items.length > 0 ? (
                      <div className="calendar__day-summary">
                        {taskCount > 0 ? <small>{taskCount} task{taskCount === 1 ? "" : "s"}</small> : null}
                        {habitCount > 0 ? <small>{habitCount} habit{habitCount === 1 ? "" : "s"}</small> : null}
                      </div>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>

          <aside className="calendar__selected card">
            <div className="calendar__selected-head">
              <h2>{formatDayHeading(selectedDateISO)}</h2>
              <p>{selectedDateISO}</p>
            </div>
            {selectedItems.length === 0 ? (
              <p className="calendar__selected-empty">Nothing is projected or scheduled for this day.</p>
            ) : (
              <div className="calendar__item-list">{selectedItems.map(renderEventItem)}</div>
            )}
          </aside>
        </section>
      )}
    </div>
  );
}
