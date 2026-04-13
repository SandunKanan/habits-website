import { addDaysISO, parseISODate, startOfMonthISO, startOfWeekISO, toISODate } from "./date.js";
import { getMostRecentProgressISO, getProgressDates, getSkippedDates } from "./habitUtils.js";
import { scoreHabitForToday } from "./scoring.js";

export const CALENDAR_HORIZON_DAYS = 90;

export function buildProjectedHabitEvents({ habits, todayISO, horizonDays = CALENDAR_HORIZON_DAYS }) {
  const events = [];
  const safeHabits = Array.isArray(habits) ? habits : [];

  for (const habit of safeHabits) {
    if (Number(habit?.importance) <= 0) {
      continue;
    }

    const skippedDates = new Set(getSkippedDates(habit).filter((dateISO) => dateISO >= todayISO));
    const actualProgressDates = getProgressDates(habit).filter((dateISO) => dateISO <= todayISO);
    const actualDoneDates = (Array.isArray(habit.doneDates) ? habit.doneDates : []).filter((dateISO) => dateISO <= todayISO);
    const actualCycleSkipDates = (Array.isArray(habit.cycleSkipDates) ? habit.cycleSkipDates : []).filter(
      (dateISO) => dateISO <= todayISO
    );
    const simulatedDoneDates = [...actualDoneDates];
    let simulatedLastProgressISO = actualProgressDates.length > 0 ? actualProgressDates.at(-1) : getMostRecentProgressISO(habit);

    for (let offset = 0; offset < horizonDays; offset += 1) {
      const dateISO = addDaysISO(todayISO, offset);
      if (skippedDates.has(dateISO)) {
        continue;
      }

      const score = scoreHabitForToday({
        habit: {
          ...habit,
          doneDates: simulatedDoneDates,
          cycleSkipDates: actualCycleSkipDates
        },
        lastDoneISO: simulatedLastProgressISO,
        todayISO: dateISO
      });

      if (!score.due) {
        continue;
      }

      events.push({
        id: `habit:${habit.id}:${dateISO}`,
        dateISO,
        type: "habit",
        title: habit.name,
        habitId: habit.id,
        habit,
        frequencyLabel: score.frequencyLabel,
        statusLabel: score.statusLabel,
        priorityScore: score.priorityScore
      });
      simulatedDoneDates.push(dateISO);
      simulatedLastProgressISO = dateISO;
    }
  }

  return events.sort((a, b) => {
    return a.dateISO.localeCompare(b.dateISO) || b.priorityScore - a.priorityScore || a.title.localeCompare(b.title);
  });
}

export function buildUpcomingOneOffTaskEvents(oneOffTasks, todayISO) {
  return (Array.isArray(oneOffTasks) ? oneOffTasks : [])
    .filter((task) => task.scheduledFor && !task.completedOn && task.scheduledFor >= todayISO)
    .map((task) => ({
      id: `task:${task.id}`,
      dateISO: task.scheduledFor,
      type: "task",
      title: task.title,
      taskId: task.id,
      task,
      priorityScore: 0
    }))
    .sort((a, b) => a.dateISO.localeCompare(b.dateISO) || a.title.localeCompare(b.title));
}

export function groupEventsByDate(events) {
  const grouped = new Map();

  for (const event of Array.isArray(events) ? events : []) {
    const items = grouped.get(event.dateISO) ?? [];
    items.push(event);
    grouped.set(event.dateISO, items);
  }

  return [...grouped.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dateISO, items]) => ({
      dateISO,
      items: [...items].sort((a, b) => {
        if (a.type !== b.type) {
          return a.type === "task" ? -1 : 1;
        }

        return b.priorityScore - a.priorityScore || a.title.localeCompare(b.title);
      })
    }));
}

export function buildMonthGrid(dateISO) {
  const monthStartISO = startOfMonthISO(dateISO);
  const monthStartDate = parseISODate(monthStartISO);
  const gridStartISO = startOfWeekISO(monthStartISO);
  const lastDayOfMonth = new Date(monthStartDate.getFullYear(), monthStartDate.getMonth() + 1, 0);
  const monthEndISO = toISODate(lastDayOfMonth);
  const monthEndDate = parseISODate(monthEndISO);
  const gridEndDate = new Date(monthEndDate);
  gridEndDate.setDate(gridEndDate.getDate() + (6 - gridEndDate.getDay()));

  const days = [];
  for (let currentISO = gridStartISO; currentISO <= toISODate(gridEndDate); currentISO = addDaysISO(currentISO, 1)) {
    days.push({
      dateISO: currentISO,
      inMonth: currentISO.startsWith(monthStartISO.slice(0, 7))
    });
  }

  return {
    monthStartISO,
    days
  };
}
