import { daysBetweenISO } from "./date.js";

export function getDoneDates(habit) {
  return Array.isArray(habit.doneDates) ? habit.doneDates : [];
}

export function getCycleSkippedDates(habit) {
  return Array.isArray(habit.cycleSkipDates) ? habit.cycleSkipDates : [];
}

export function getHabitSlug(habit) {
  return String(habit?.slug ?? habit?.id ?? "");
}

export function getSkippedDates(habit) {
  return Array.isArray(habit.skippedDates) ? habit.skippedDates : [];
}

export function getSubtasks(habit) {
  return Array.isArray(habit.subtasks) ? habit.subtasks : [];
}

export function getProgressDates(habit) {
  return [...new Set([...getDoneDates(habit), ...getCycleSkippedDates(habit)])].sort((a, b) =>
    a.localeCompare(b)
  );
}

export function getSortedDoneDates(habit) {
  return [...getDoneDates(habit)].sort((a, b) => b.localeCompare(a));
}

export function getSortedProgressDates(habit) {
  return [...getProgressDates(habit)].sort((a, b) => b.localeCompare(a));
}

export function getMostRecentDoneISO(habit) {
  const sortedDoneDates = getSortedDoneDates(habit);
  if (sortedDoneDates.length > 0) {
    return sortedDoneDates[0];
  }

  return habit.initialLastDone ?? null;
}

export function getMostRecentProgressISO(habit) {
  const sortedProgressDates = getSortedProgressDates(habit);
  if (sortedProgressDates.length > 0) {
    return sortedProgressDates[0];
  }

  return habit.initialLastDone ?? null;
}

export function formatRecentDateLabel(dateISO, todayISO, casing = "title") {
  if (!dateISO) {
    return casing === "lower" ? "never" : "Never";
  }

  const daysAgo = daysBetweenISO(dateISO, todayISO);
  if (daysAgo !== null && daysAgo >= 0 && daysAgo <= 7) {
    if (daysAgo === 0) {
      return casing === "lower" ? "today" : "Today";
    }

    if (daysAgo === 1) {
      return "1 day ago";
    }

    return `${daysAgo} days ago`;
  }

  return dateISO;
}

function getMostRecentSubtaskDoneISO(subtask) {
  if (!Array.isArray(subtask?.doneDates)) {
    return "";
  }

  return [...subtask.doneDates].sort((a, b) => b.localeCompare(a))[0] ?? "";
}

export function sortSubtasksByLastCompletion(subtasks) {
  return [...(Array.isArray(subtasks) ? subtasks : [])].sort((a, b) => {
    const aLast = getMostRecentSubtaskDoneISO(a);
    const bLast = getMostRecentSubtaskDoneISO(b);
    return aLast.localeCompare(bLast) || a.name.localeCompare(b.name);
  });
}
