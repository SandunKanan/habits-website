import { useEffect, useState } from "react";
import {
  loadTrackingForSession,
  saveTrackingEntriesForSession,
  saveTrackingMetricsForSession
} from "../../lib/trackingClient.js";

function buildSlug(name, existingSlugs) {
  const base =
    String(name ?? "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "metric";

  let candidate = base;
  let n = 2;
  while (existingSlugs.has(candidate)) {
    candidate = `${base}-${n}`;
    n += 1;
  }

  return candidate;
}

function buildFieldKey(label, existingKeys) {
  const base =
    String(label ?? "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "") || "field";

  let candidate = base;
  let n = 2;
  while (existingKeys.has(candidate)) {
    candidate = `${base}_${n}`;
    n += 1;
  }

  return candidate;
}

function normalizeFields(fields) {
  if (!Array.isArray(fields)) return [];

  const usedKeys = new Set();
  return fields
    .map((field) => {
      const label = String(field?.label ?? "").trim();
      if (!label) return null;
      const key = buildFieldKey(field?.key ?? label, usedKeys);
      usedKeys.add(key);

      return {
        id: String(field?.id ?? crypto.randomUUID()),
        key,
        label,
        inputType: field?.inputType === "number" ? "number" : "text",
        unit: field?.inputType === "number" ? String(field?.unit ?? "").trim() : ""
      };
    })
    .filter(Boolean);
}

function normalizeStructuredValueJson(metric, valueJson) {
  const fields = Array.isArray(metric?.fields) ? metric.fields : [];
  const result = {};

  for (const field of fields) {
    const rawValue = valueJson?.[field.key];
    if (field.inputType === "number") {
      const parsed = rawValue === "" || rawValue === null || rawValue === undefined ? null : Number(rawValue);
      if (parsed === null || !Number.isFinite(parsed) || parsed < 0) {
        return { ok: false, error: `${field.label} must be zero or greater.` };
      }
      result[field.key] = parsed;
      continue;
    }

    const normalizedText = String(rawValue ?? "").trim();
    if (!normalizedText) {
      return { ok: false, error: `${field.label} is required.` };
    }
    result[field.key] = normalizedText;
  }

  return { ok: true, valueJson: result };
}

export function useTrackingStore({ authEnabled, isAuthReady, session, authUser }) {
  const [metrics, setMetrics] = useState([]);
  const [entries, setEntries] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPersisting, setIsPersisting] = useState(false);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let ignore = false;

    async function loadTracking() {
      if (!isAuthReady) return;
      if (authEnabled && !session?.access_token) {
        if (!ignore) {
          setMetrics([]);
          setEntries([]);
          setIsLoading(false);
          setLoadError("");
        }
        return;
      }

      try {
        if (!ignore) {
          setIsLoading(true);
        }
        setLoadError("");
        const data = await loadTrackingForSession(session?.access_token, authUser?.id);
        if (!ignore) {
          setMetrics(Array.isArray(data?.metrics) ? data.metrics : []);
          setEntries(Array.isArray(data?.entries) ? data.entries : []);
        }
      } catch (error) {
        if (!ignore) {
          console.error("Failed to load tracking", error);
          setLoadError("Could not load tracking.");
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    void loadTracking();

    return () => {
      ignore = true;
    };
  }, [authEnabled, authUser?.id, isAuthReady, session?.access_token]);

  async function persistMetrics(nextMetrics) {
    try {
      setIsPersisting(true);
      const data = await saveTrackingMetricsForSession(session?.access_token, authUser?.id, nextMetrics);
      if (Array.isArray(data)) {
        setMetrics(data);
      }

      return { ok: true, metrics: Array.isArray(data) ? data : nextMetrics };
    } catch (error) {
      console.error("Failed to persist tracking metrics", error);
      return { ok: false };
    } finally {
      setIsPersisting(false);
    }
  }

  async function persistEntries(nextEntries) {
    try {
      setIsPersisting(true);
      const data = await saveTrackingEntriesForSession(session?.access_token, authUser?.id, nextEntries);
      if (Array.isArray(data)) {
        setEntries(data);
      }

      return { ok: true, entries: Array.isArray(data) ? data : nextEntries };
    } catch (error) {
      console.error("Failed to persist tracking entries", error);
      return { ok: false };
    } finally {
      setIsPersisting(false);
    }
  }

  async function addMetric({ name, unit, targetValue, mode, fields }) {
    const trimmedName = String(name ?? "").trim();
    const normalizedMode = mode === "structured_log" ? "structured_log" : "single_value";
    const trimmedUnit = normalizedMode === "single_value" ? String(unit ?? "").trim() : "";
    const normalizedFields = normalizedMode === "structured_log" ? normalizeFields(fields) : [];
    if (!trimmedName) {
      return { ok: false, error: "Tracking name is required." };
    }
    if (normalizedMode === "single_value" && !trimmedUnit) {
      return { ok: false, error: "Unit is required for a simple metric." };
    }
    if (normalizedMode === "structured_log" && normalizedFields.length === 0) {
      return { ok: false, error: "Add at least one field for a structured log." };
    }

    const parsedTarget =
      normalizedMode === "structured_log" || targetValue === "" || targetValue === null || targetValue === undefined
        ? null
        : Number(targetValue);
    if (parsedTarget !== null && (!Number.isFinite(parsedTarget) || parsedTarget < 0)) {
      return { ok: false, error: "Target must be a positive number." };
    }

    const now = new Date().toISOString();
    const newMetric = {
      id: crypto.randomUUID(),
      slug: buildSlug(trimmedName, new Set(metrics.map((item) => item.slug ?? item.id))),
      name: trimmedName,
      unit: trimmedUnit,
      targetValue: parsedTarget,
      mode: normalizedMode,
      fields: normalizedFields,
      createdAt: now,
      updatedAt: now
    };

    const persisted = await persistMetrics([...metrics, newMetric]);
    if (!persisted.ok) {
      return { ok: false, error: "Could not save tracking type." };
    }

    return { ok: true, id: newMetric.id };
  }

  async function updateMetric(metricId, updates) {
    const existingMetric = metrics.find((metric) => metric.id === metricId);
    if (!existingMetric) {
      return { ok: false, error: "Tracking type not found." };
    }

    const trimmedName = String(updates?.name ?? existingMetric.name ?? "").trim();
    const normalizedMode = (updates?.mode ?? existingMetric.mode) === "structured_log" ? "structured_log" : "single_value";
    const trimmedUnit = normalizedMode === "single_value" ? String(updates?.unit ?? existingMetric.unit ?? "").trim() : "";
    const normalizedFields = normalizedMode === "structured_log"
      ? normalizeFields(updates?.fields ?? existingMetric.fields)
      : [];
    if (!trimmedName) {
      return { ok: false, error: "Tracking name is required." };
    }
    if (normalizedMode === "single_value" && !trimmedUnit) {
      return { ok: false, error: "Unit is required for a simple metric." };
    }
    if (normalizedMode === "structured_log" && normalizedFields.length === 0) {
      return { ok: false, error: "Add at least one field for a structured log." };
    }

    const parsedTarget =
      normalizedMode === "structured_log" || updates?.targetValue === "" || updates?.targetValue === null || updates?.targetValue === undefined
        ? null
        : Number(updates.targetValue);
    if (parsedTarget !== null && (!Number.isFinite(parsedTarget) || parsedTarget < 0)) {
      return { ok: false, error: "Target must be a positive number." };
    }

    const nextMetrics = metrics.map((metric) =>
      metric.id !== metricId
        ? metric
        : {
            ...metric,
            name: trimmedName,
            unit: trimmedUnit,
            targetValue: parsedTarget,
            mode: normalizedMode,
            fields: normalizedFields,
            updatedAt: new Date().toISOString()
          }
    );

    const persisted = await persistMetrics(nextMetrics);
    if (!persisted.ok) {
      return { ok: false, error: "Could not save tracking type." };
    }

    return { ok: true };
  }

  async function deleteMetric(metricId) {
    const existingMetric = metrics.find((metric) => metric.id === metricId);
    if (!existingMetric) {
      return { ok: false, error: "Tracking type not found." };
    }

    const nextMetrics = metrics.filter((metric) => metric.id !== metricId);
    const nextEntries = entries.filter((entry) => entry.metricId !== metricId);
    const metricsResult = await persistMetrics(nextMetrics);
    if (!metricsResult.ok) {
      return { ok: false, error: "Could not save tracking type." };
    }

    const entriesResult = await persistEntries(nextEntries);
    if (!entriesResult.ok) {
      return { ok: false, error: "Could not save tracking entries." };
    }

    return { ok: true };
  }

  async function saveMetricEntry({ metricId, entryDate, value }) {
    const existingMetric = metrics.find((metric) => metric.id === metricId);
    if (!existingMetric) {
      return { ok: false, error: "Tracking type not found." };
    }
    if (existingMetric.mode !== "single_value") {
      return { ok: false, error: "This tracking type uses structured entries." };
    }

    const parsedValue = Number(value);
    if (!Number.isFinite(parsedValue) || parsedValue < 0) {
      return { ok: false, error: "Value must be zero or greater." };
    }

    const normalizedDate = String(entryDate ?? "").slice(0, 10);
    if (!normalizedDate) {
      return { ok: false, error: "Entry date is required." };
    }

    const matchingEntries = entries.filter(
      (entry) => entry.metricId === metricId && entry.entryDate === normalizedDate
    );
    const existingEntry = matchingEntries[0] ?? null;
    const now = new Date().toISOString();
    const filteredEntries = entries.filter(
      (entry) => !(entry.metricId === metricId && entry.entryDate === normalizedDate && entry.id !== existingEntry?.id)
    );
    const nextEntries = existingEntry
      ? filteredEntries.map((entry) =>
          entry.id !== existingEntry.id
            ? entry
            : {
                ...entry,
                value: parsedValue,
                valueJson: { value: parsedValue },
                updatedAt: now
              }
        )
      : [
          ...filteredEntries,
          {
            id: crypto.randomUUID(),
            metricId,
            entryDate: normalizedDate,
            value: parsedValue,
            valueJson: { value: parsedValue },
            createdAt: now,
            updatedAt: now
          }
        ];

    const persisted = await persistEntries(nextEntries);
    if (!persisted.ok) {
      return { ok: false, error: "Could not save metric entry." };
    }

    return { ok: true };
  }

  async function addStructuredEntry({ metricId, entryDate, valueJson }) {
    const existingMetric = metrics.find((metric) => metric.id === metricId);
    if (!existingMetric) {
      return { ok: false, error: "Tracking type not found." };
    }
    if (existingMetric.mode !== "structured_log") {
      return { ok: false, error: "This tracking type uses a single numeric value." };
    }

    const normalizedDate = String(entryDate ?? "").slice(0, 10);
    if (!normalizedDate) {
      return { ok: false, error: "Entry date is required." };
    }

    const normalizedValue = normalizeStructuredValueJson(existingMetric, valueJson);
    if (!normalizedValue.ok) {
      return normalizedValue;
    }

    const now = new Date().toISOString();
    const nextEntries = [
      ...entries,
      {
        id: crypto.randomUUID(),
        metricId,
        entryDate: normalizedDate,
        value: null,
        valueJson: normalizedValue.valueJson,
        createdAt: now,
        updatedAt: now
      }
    ];

    const persisted = await persistEntries(nextEntries);
    if (!persisted.ok) {
      return { ok: false, error: "Could not save structured entry." };
    }

    return { ok: true };
  }

  async function deleteMetricEntry(metricId, entryDate) {
    const normalizedDate = String(entryDate ?? "").slice(0, 10);
    const existingEntry = entries.find(
      (entry) => entry.metricId === metricId && entry.entryDate === normalizedDate
    );
    if (!existingEntry) {
      return { ok: false, error: "Entry not found." };
    }

    const persisted = await persistEntries(entries.filter((entry) => entry.id !== existingEntry.id));
    if (!persisted.ok) {
      return { ok: false, error: "Could not save metric entry." };
    }

    return { ok: true };
  }

  async function deleteStructuredEntry(entryId) {
    const existingEntry = entries.find((entry) => entry.id === entryId);
    if (!existingEntry) {
      return { ok: false, error: "Entry not found." };
    }

    const persisted = await persistEntries(entries.filter((entry) => entry.id !== entryId));
    if (!persisted.ok) {
      return { ok: false, error: "Could not delete structured entry." };
    }

    return { ok: true };
  }

  function beginLoadingTracking() {
    setIsLoading(true);
  }

  function resetTrackingState() {
    setMetrics([]);
    setEntries([]);
    setIsLoading(false);
    setLoadError("");
    setIsPersisting(false);
  }

  return {
    trackingMetrics: metrics,
    trackingEntries: entries,
    isLoading,
    isPersisting,
    loadError,
    addTrackingMetric: addMetric,
    updateTrackingMetric: updateMetric,
    deleteTrackingMetric: deleteMetric,
    saveTrackingEntry: saveMetricEntry,
    addTrackingStructuredEntry: addStructuredEntry,
    deleteTrackingEntry: deleteMetricEntry,
    deleteTrackingStructuredEntry: deleteStructuredEntry,
    beginLoadingTracking,
    resetTrackingState
  };
}
