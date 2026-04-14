export function isCurrentFocusBlock(block, todayISO) {
  const startDate = String(block?.startDate ?? "");
  const endDate = String(block?.endDate ?? "");

  if (!startDate && !endDate) return true;
  if (startDate && startDate > todayISO) return false;
  if (endDate && endDate < todayISO) return false;
  return true;
}

export function isFutureFocusBlock(block, todayISO) {
  const startDate = String(block?.startDate ?? "");
  return Boolean(startDate && startDate > todayISO);
}

export function isPastFocusBlock(block, todayISO) {
  const endDate = String(block?.endDate ?? "");
  if (endDate) {
    return endDate < todayISO;
  }

  const startDate = String(block?.startDate ?? "");
  return Boolean(startDate && startDate < todayISO && !isCurrentFocusBlock(block, todayISO));
}

export function sortFocusBlocksByStartDate(blocks, direction = "asc") {
  const multiplier = direction === "desc" ? -1 : 1;

  return [...(Array.isArray(blocks) ? blocks : [])].sort((a, b) => {
    const aStart = String(a?.startDate ?? "");
    const bStart = String(b?.startDate ?? "");
    if (aStart !== bStart) {
      if (!aStart) return 1 * multiplier;
      if (!bStart) return -1 * multiplier;
      return aStart.localeCompare(bStart) * multiplier;
    }

    const aCreated = String(a?.createdAt ?? "");
    const bCreated = String(b?.createdAt ?? "");
    return aCreated.localeCompare(bCreated) * multiplier;
  });
}

export function getCurrentFocusBlock(blocks, todayISO) {
  return sortFocusBlocksByStartDate(
    (Array.isArray(blocks) ? blocks : []).filter((block) => isCurrentFocusBlock(block, todayISO)),
    "desc"
  )[0] ?? null;
}
