import {
  addDaysISO,
  addMonthsISO,
  daysBetweenISO,
  startOfMonthISO,
  startOfWeekISO
} from "./date.js";

export const FREQUENCY_MODES = [
  { value: "interval", label: "Every" },
  { value: "quota", label: "Times per" }
];

export const INTERVAL_UNITS = [
  { value: "day", label: "day" },
  { value: "week", label: "week" },
  { value: "month", label: "month" }
];

export const QUOTA_UNITS = [
  { value: "week", label: "week" },
  { value: "month", label: "month" }
];

export function getFrequencyUnitsForMode(mode) {
  return mode === "quota" ? QUOTA_UNITS : INTERVAL_UNITS;
}

export function normalizeFrequency(habit) {
  const mode = habit.frequencyMode === "quota" ? "quota" : "interval";
  const allowedUnits = getFrequencyUnitsForMode(mode);
  const fallbackUnit = mode === "quota" ? "week" : "day";
  const unit = allowedUnits.some((item) => item.value === habit.frequencyUnit)
    ? habit.frequencyUnit
    : fallbackUnit;
  const value = Math.max(1, Math.floor(Number(habit.frequencyValue ?? habit.everyXDays) || 1));

  return {
    frequencyMode: mode,
    frequencyUnit: unit,
    frequencyValue: value
  };
}

export function formatFrequencyLabel(habit) {
  const frequency = normalizeFrequency(habit);
  const plural = frequency.frequencyValue === 1 ? frequency.frequencyUnit : `${frequency.frequencyUnit}s`;

  if (frequency.frequencyMode === "quota") {
    return `${frequency.frequencyValue} time${frequency.frequencyValue === 1 ? "" : "s"} per ${frequency.frequencyUnit}`;
  }

  return `Every ${frequency.frequencyValue} ${plural}`;
}

export function getApproximateIntervalDays(frequency) {
  if (frequency.frequencyUnit === "month") return frequency.frequencyValue * 30;
  if (frequency.frequencyUnit === "week") return frequency.frequencyValue * 7;
  return frequency.frequencyValue;
}

export function getNextDueISO(lastDoneISO, frequency) {
  if (!lastDoneISO) return null;

  if (frequency.frequencyUnit === "month") {
    return addMonthsISO(lastDoneISO, frequency.frequencyValue);
  }

  const dayCount = frequency.frequencyUnit === "week" ? frequency.frequencyValue * 7 : frequency.frequencyValue;
  return addDaysISO(lastDoneISO, dayCount);
}

export function getQuotaProgress(doneDates, frequency, todayISO) {
  const periodStartISO =
    frequency.frequencyUnit === "month" ? startOfMonthISO(todayISO) : startOfWeekISO(todayISO);
  const nextPeriodStartISO =
    frequency.frequencyUnit === "month" ? addMonthsISO(periodStartISO, 1) : addDaysISO(periodStartISO, 7);
  const completedCount = doneDates.filter(
    (dateISO) => dateISO >= periodStartISO && dateISO < nextPeriodStartISO
  ).length;
  const totalDays = Math.max(1, daysBetweenISO(periodStartISO, nextPeriodStartISO));
  const elapsedDays = Math.max(1, (daysBetweenISO(periodStartISO, todayISO) ?? 0) + 1);
  const targetByNow = Math.min(
    frequency.frequencyValue,
    Math.ceil((elapsedDays / totalDays) * frequency.frequencyValue)
  );

  return {
    completedCount,
    targetCount: frequency.frequencyValue,
    targetByNow
  };
}
