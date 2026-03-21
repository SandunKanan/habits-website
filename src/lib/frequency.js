import { addDaysISO, addMonthsISO } from "./date.js";

export const FREQUENCY_MODES = [
  { value: "interval", label: "Every" },
  { value: "rate", label: "Times per" }
];

export const INTERVAL_UNITS = [
  { value: "day", label: "day" },
  { value: "week", label: "week" },
  { value: "month", label: "month" }
];

export const RATE_UNITS = [
  { value: "week", label: "week" },
  { value: "month", label: "month" }
];

export function getFrequencyUnitsForMode(mode) {
  return mode === "rate" ? RATE_UNITS : INTERVAL_UNITS;
}

export function normalizeFrequency(habit) {
  const mode = habit.frequencyMode === "quota" || habit.frequencyMode === "rate" ? "rate" : "interval";
  const allowedUnits = getFrequencyUnitsForMode(mode);
  const fallbackUnit = mode === "rate" ? "week" : "day";
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

  if (frequency.frequencyMode === "rate") {
    return `${frequency.frequencyValue} time${frequency.frequencyValue === 1 ? "" : "s"} per ${frequency.frequencyUnit}`;
  }

  return `Every ${frequency.frequencyValue} ${plural}`;
}

export function getApproximateIntervalDays(frequency) {
  if (frequency.frequencyUnit === "month") return frequency.frequencyValue * 30;
  if (frequency.frequencyUnit === "week") return frequency.frequencyValue * 7;
  return frequency.frequencyValue;
}

export function getFrequencyRatePerDay(frequency) {
  if (frequency.frequencyMode !== "rate") {
    return 1 / getApproximateIntervalDays(frequency);
  }

  if (frequency.frequencyUnit === "month") {
    return frequency.frequencyValue / 30;
  }

  return frequency.frequencyValue / 7;
}

export function getNextDueISO(lastDoneISO, frequency) {
  if (!lastDoneISO) return null;

  if (frequency.frequencyUnit === "month") {
    return addMonthsISO(lastDoneISO, frequency.frequencyValue);
  }

  const dayCount = frequency.frequencyUnit === "week" ? frequency.frequencyValue * 7 : frequency.frequencyValue;
  return addDaysISO(lastDoneISO, dayCount);
}
