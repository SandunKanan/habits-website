export const IMPORTANCE_LEVELS = [
  { value: 10, key: "core", label: "Core" },
  { value: 8, key: "very-important", label: "Very important" },
  { value: 7, key: "important", label: "Important" },
  { value: 6, key: "optional", label: "Optional" },
  { value: 5, key: "low-priority", label: "Low priority" },
  { value: 0, key: "inactive", label: "Inactive" }
];

export const DEFAULT_IMPORTANCE_VALUE = 0;

const LEGACY_IMPORTANCE_MAP = new Map([
  [0, 0],
  [1, 5],
  [2, 6],
  [3, 7],
  [4, 8]
]);

function clampImportance(value) {
  return Math.max(0, Math.min(10, value));
}

export function normalizeImportanceValue(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return DEFAULT_IMPORTANCE_VALUE;
  }

  const rounded = Math.round(parsed);
  if (LEGACY_IMPORTANCE_MAP.has(rounded) && rounded <= 4) {
    return LEGACY_IMPORTANCE_MAP.get(rounded);
  }

  const clamped = clampImportance(rounded);
  return IMPORTANCE_LEVELS.reduce((closest, level) => {
    const closestDistance = Math.abs(closest - clamped);
    const levelDistance = Math.abs(level.value - clamped);
    return levelDistance < closestDistance ? level.value : closest;
  }, IMPORTANCE_LEVELS[0].value);
}

export function getImportanceLevel(value) {
  const normalized = normalizeImportanceValue(value);
  return (
    IMPORTANCE_LEVELS.find((level) => level.value === normalized) ?? IMPORTANCE_LEVELS.at(-1)
  );
}

export function getImportanceLabel(value) {
  return getImportanceLevel(value).label;
}
