export const HABIT_DISPLAY_MODES = [
  { value: "daily", label: "Daily" },
  { value: "scheduled", label: "Every x days" },
  { value: "optional", label: "Optional" }
];

export function normalizeHabitDisplayMode(value) {
  return HABIT_DISPLAY_MODES.some((mode) => mode.value === value) ? value : "scheduled";
}

export function getHabitDisplayModeLabel(value) {
  return HABIT_DISPLAY_MODES.find((mode) => mode.value === normalizeHabitDisplayMode(value))?.label ?? "Every x days";
}

export function resolveHabitDisplayMode(habit) {
  const normalized = normalizeHabitDisplayMode(habit?.habitDisplayMode ?? habit?.habit_display_mode);

  if (normalized === "daily" || normalized === "optional") {
    return normalized;
  }

  if (
    String(habit?.frequencyMode ?? habit?.frequency_mode ?? "") === "interval" &&
    String(habit?.frequencyUnit ?? habit?.frequency_unit ?? "") === "day" &&
    Number(habit?.frequencyValue ?? habit?.frequency_value ?? 0) === 1
  ) {
    return "daily";
  }

  return normalized;
}
