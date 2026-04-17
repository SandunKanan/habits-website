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
