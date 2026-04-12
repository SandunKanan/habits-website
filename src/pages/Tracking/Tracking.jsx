import React, { useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import "./Tracking.scss";

const MODE_OPTIONS = [
  { value: "single_value", label: "Simple metric" },
  { value: "structured_log", label: "Structured log" }
];

function makeEmptyField() {
  return {
    id: crypto.randomUUID(),
    label: "",
    inputType: "text",
    unit: ""
  };
}

function formatMode(mode) {
  return mode === "structured_log" ? "Structured log" : "Simple metric";
}

export default function Tracking() {
  const {
    trackingMetrics,
    onAddTrackingMetric,
    onUpdateTrackingMetric,
    onDeleteTrackingMetric,
    isPersisting
  } = useOutletContext();

  const [name, setName] = useState("");
  const [mode, setMode] = useState("single_value");
  const [unit, setUnit] = useState("");
  const [targetValue, setTargetValue] = useState("");
  const [fields, setFields] = useState([]);
  const [feedback, setFeedback] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState("");
  const [editName, setEditName] = useState("");
  const [editMode, setEditMode] = useState("single_value");
  const [editUnit, setEditUnit] = useState("");
  const [editTargetValue, setEditTargetValue] = useState("");
  const [editFields, setEditFields] = useState([]);
  const [editFeedback, setEditFeedback] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState("");

  const sortedMetrics = useMemo(
    () => [...trackingMetrics].sort((a, b) => String(a.createdAt ?? "").localeCompare(String(b.createdAt ?? ""))),
    [trackingMetrics]
  );

  async function handleAddMetric(event) {
    event.preventDefault();
    setFeedback("");
    setIsSaving(true);

    const result = await onAddTrackingMetric({ name, unit, targetValue, mode, fields });
    if (result?.ok) {
      setName("");
      setMode("single_value");
      setUnit("");
      setTargetValue("");
      setFields([]);
      setFeedback("Tracking type added.");
    } else {
      setFeedback(result?.error ?? "Could not add tracking type.");
    }

    setIsSaving(false);
  }

  function startEdit(metric) {
    setEditingId(metric.id);
    setEditName(metric.name);
    setEditMode(metric.mode ?? "single_value");
    setEditUnit(metric.unit ?? "");
    setEditTargetValue(
      metric.targetValue === null || metric.targetValue === undefined ? "" : String(metric.targetValue)
    );
    setEditFields(Array.isArray(metric.fields) ? metric.fields.map((field) => ({ ...field })) : []);
    setEditFeedback("");
  }

  function cancelEdit() {
    setEditingId("");
    setEditName("");
    setEditMode("single_value");
    setEditUnit("");
    setEditTargetValue("");
    setEditFields([]);
    setEditFeedback("");
  }

  async function handleSaveEdit(event) {
    event.preventDefault();
    if (!editingId) return;

    setIsSavingEdit(true);
    setEditFeedback("");

    const result = await onUpdateTrackingMetric(editingId, {
      name: editName,
      mode: editMode,
      unit: editUnit,
      targetValue: editTargetValue,
      fields: editFields
    });
    if (result?.ok) {
      setEditingId("");
      setFeedback("Tracking type updated.");
    } else {
      setEditFeedback(result?.error ?? "Could not update tracking type.");
    }

    setIsSavingEdit(false);
  }

  async function handleDeleteMetric(metric) {
    const confirmed = window.confirm(`Delete "${metric.name}" and its logged entries?`);
    if (!confirmed) return;

    setFeedback("");
    setPendingDeleteId(metric.id);
    const result = await onDeleteTrackingMetric(metric.id);
    if (result?.ok) {
      if (editingId === metric.id) {
        cancelEdit();
      }
      setFeedback("Tracking type deleted.");
    } else {
      setFeedback(result?.error ?? "Could not delete tracking type.");
    }
    setPendingDeleteId("");
  }

  function addField(currentFields, setFieldState) {
    setFieldState([...currentFields, makeEmptyField()]);
  }

  function updateField(currentFields, setFieldState, fieldId, updates) {
    setFieldState(currentFields.map((field) => (field.id === fieldId ? { ...field, ...updates } : field)));
  }

  function removeField(currentFields, setFieldState, fieldId) {
    setFieldState(currentFields.filter((field) => field.id !== fieldId));
  }

  return (
    <div className="trackingpage">
      <section className="trackingpage__section card">
        <form className="trackingpage__form" onSubmit={handleAddMetric}>
          <div className="trackingpage__grid">
            <div className="trackingpage__field">
              <label htmlFor="tracking-name">Tracking type</label>
              <p>What do you want to log?</p>
              <input
                id="tracking-name"
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                disabled={isSaving || isPersisting}
                required
              />
            </div>
            <div className="trackingpage__field">
              <label htmlFor="tracking-mode">Mode</label>
              <p>Choose one number per day or a structured entry.</p>
              <select
                id="tracking-mode"
                value={mode}
                onChange={(event) => setMode(event.target.value)}
                disabled={isSaving || isPersisting}
              >
                {MODE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {mode === "single_value" ? (
            <>
              <div className="trackingpage__grid">
                <div className="trackingpage__field">
                  <label htmlFor="tracking-unit">Unit</label>
                  <p>Examples: g, L, min, kcal.</p>
                  <input
                    id="tracking-unit"
                    type="text"
                    value={unit}
                    onChange={(event) => setUnit(event.target.value)}
                    disabled={isSaving || isPersisting}
                    required
                  />
                </div>
                <div className="trackingpage__field">
                  <label htmlFor="tracking-target">Target</label>
                  <p>Optional. Leave blank if you only want to log values.</p>
                  <input
                    id="tracking-target"
                    type="number"
                    min="0"
                    step="0.1"
                    value={targetValue}
                    onChange={(event) => setTargetValue(event.target.value)}
                    disabled={isSaving || isPersisting}
                  />
                </div>
              </div>
            </>
          ) : (
            <div className="trackingpage__field-builder">
              <div className="trackingpage__field-builder-head">
                <div>
                  <label>Fields</label>
                  <p>Define the fields this log should capture. Meals can use name, calories, protein, and fibre.</p>
                </div>
                <button type="button" onClick={() => addField(fields, setFields)} disabled={isSaving || isPersisting}>
                  Add field
                </button>
              </div>
              {fields.length === 0 ? (
                <p className="trackingpage__empty-copy">No fields yet.</p>
              ) : (
                <div className="trackingpage__field-list">
                  {fields.map((field) => (
                    <div key={field.id} className="trackingpage__field-row">
                      <input
                        type="text"
                        value={field.label}
                        onChange={(event) => updateField(fields, setFields, field.id, { label: event.target.value })}
                        placeholder="Field label"
                        disabled={isSaving || isPersisting}
                      />
                      <select
                        value={field.inputType}
                        onChange={(event) =>
                          updateField(fields, setFields, field.id, {
                            inputType: event.target.value,
                            unit: event.target.value === "number" ? field.unit ?? "" : ""
                          })
                        }
                        disabled={isSaving || isPersisting}
                      >
                        <option value="text">Text</option>
                        <option value="number">Number</option>
                      </select>
                      {field.inputType === "number" ? (
                        <input
                          type="text"
                          value={field.unit ?? ""}
                          onChange={(event) =>
                            updateField(fields, setFields, field.id, { unit: event.target.value })
                          }
                          placeholder="Unit"
                          disabled={isSaving || isPersisting}
                        />
                      ) : (
                        <div className="trackingpage__field-spacer" aria-hidden="true" />
                      )}
                      <button
                        type="button"
                        onClick={() => removeField(fields, setFields, field.id)}
                        disabled={isSaving || isPersisting}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="trackingpage__actions">
            <button type="submit" disabled={isSaving || isPersisting}>
              {isSaving || isPersisting ? "Saving..." : "Add tracking type"}
            </button>
            {feedback ? <p className="trackingpage__feedback">{feedback}</p> : null}
          </div>
        </form>
      </section>

      <section className="trackingpage__list">
        {sortedMetrics.length === 0 ? (
          <article className="trackingpage__empty card">
            <h3>No tracking types yet</h3>
            <p>Add a metric or structured log, then use Today to log entries.</p>
          </article>
        ) : (
          sortedMetrics.map((metric) => {
            const isEditing = editingId === metric.id;

            return (
              <article key={metric.id} className="trackingpage__item card">
                {isEditing ? (
                  <form className="trackingpage__edit" onSubmit={handleSaveEdit}>
                    <div className="trackingpage__grid">
                      <div className="trackingpage__field">
                        <label htmlFor={`edit-metric-name-${metric.id}`}>Tracking type</label>
                        <input
                          id={`edit-metric-name-${metric.id}`}
                          type="text"
                          value={editName}
                          onChange={(event) => setEditName(event.target.value)}
                          disabled={isSavingEdit || isPersisting}
                          required
                        />
                      </div>
                      <div className="trackingpage__field">
                        <label htmlFor={`edit-metric-mode-${metric.id}`}>Mode</label>
                        <select
                          id={`edit-metric-mode-${metric.id}`}
                          value={editMode}
                          onChange={(event) => setEditMode(event.target.value)}
                          disabled={isSavingEdit || isPersisting}
                        >
                          {MODE_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {editMode === "single_value" ? (
                      <div className="trackingpage__grid">
                        <div className="trackingpage__field">
                          <label htmlFor={`edit-metric-unit-${metric.id}`}>Unit</label>
                          <input
                            id={`edit-metric-unit-${metric.id}`}
                            type="text"
                            value={editUnit}
                            onChange={(event) => setEditUnit(event.target.value)}
                            disabled={isSavingEdit || isPersisting}
                            required
                          />
                        </div>
                        <div className="trackingpage__field">
                          <label htmlFor={`edit-metric-target-${metric.id}`}>Target</label>
                          <input
                            id={`edit-metric-target-${metric.id}`}
                            type="number"
                            min="0"
                            step="0.1"
                            value={editTargetValue}
                            onChange={(event) => setEditTargetValue(event.target.value)}
                            disabled={isSavingEdit || isPersisting}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="trackingpage__field-builder">
                        <div className="trackingpage__field-builder-head">
                          <div>
                            <label>Fields</label>
                            <p>Keep the fields stable so past entries stay understandable.</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => addField(editFields, setEditFields)}
                            disabled={isSavingEdit || isPersisting}
                          >
                            Add field
                          </button>
                        </div>
                        {editFields.length === 0 ? (
                          <p className="trackingpage__empty-copy">No fields yet.</p>
                        ) : (
                          <div className="trackingpage__field-list">
                            {editFields.map((field) => (
                              <div key={field.id} className="trackingpage__field-row">
                                <input
                                  type="text"
                                  value={field.label}
                                  onChange={(event) =>
                                    updateField(editFields, setEditFields, field.id, { label: event.target.value })
                                  }
                                  disabled={isSavingEdit || isPersisting}
                                />
                                <select
                                  value={field.inputType}
                                  onChange={(event) =>
                                    updateField(editFields, setEditFields, field.id, {
                                      inputType: event.target.value,
                                      unit: event.target.value === "number" ? field.unit ?? "" : ""
                                    })
                                  }
                                  disabled={isSavingEdit || isPersisting}
                                >
                                  <option value="text">Text</option>
                                  <option value="number">Number</option>
                                </select>
                                {field.inputType === "number" ? (
                                  <input
                                    type="text"
                                    value={field.unit ?? ""}
                                    onChange={(event) =>
                                      updateField(editFields, setEditFields, field.id, { unit: event.target.value })
                                    }
                                    placeholder="Unit"
                                    disabled={isSavingEdit || isPersisting}
                                  />
                                ) : (
                                  <div className="trackingpage__field-spacer" aria-hidden="true" />
                                )}
                                <button
                                  type="button"
                                  onClick={() => removeField(editFields, setEditFields, field.id)}
                                  disabled={isSavingEdit || isPersisting}
                                >
                                  Remove
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    <div className="trackingpage__actions">
                      <button type="submit" disabled={isSavingEdit || isPersisting}>
                        {isSavingEdit || isPersisting ? "Saving..." : "Save"}
                      </button>
                      <button type="button" onClick={cancelEdit} disabled={isSavingEdit || isPersisting}>
                        Cancel
                      </button>
                      {editFeedback ? <p className="trackingpage__feedback">{editFeedback}</p> : null}
                    </div>
                  </form>
                ) : (
                  <>
                    <div className="trackingpage__item-head">
                      <div>
                        <h3>{metric.name}</h3>
                        <p>{formatMode(metric.mode)}</p>
                      </div>
                      <div className="trackingpage__item-actions">
                        <button type="button" onClick={() => startEdit(metric)} disabled={isPersisting}>
                          Edit
                        </button>
                        <button
                          type="button"
                          className="trackingpage__delete-btn"
                          onClick={() => handleDeleteMetric(metric)}
                          disabled={isPersisting}
                        >
                          {pendingDeleteId === metric.id ? "Deleting..." : "Delete"}
                        </button>
                      </div>
                    </div>

                    <dl className="trackingpage__details">
                      <div>
                        <dt>Mode</dt>
                        <dd>{formatMode(metric.mode)}</dd>
                      </div>
                      <div>
                        <dt>{metric.mode === "single_value" ? "Unit" : "Fields"}</dt>
                        <dd>
                          {metric.mode === "single_value"
                            ? metric.unit
                            : Array.isArray(metric.fields) && metric.fields.length > 0
                              ? metric.fields
                                  .map((field) =>
                                    field.inputType === "number" && field.unit
                                      ? `${field.label} (${field.unit})`
                                      : field.label
                                  )
                                  .join(", ")
                              : "None"}
                        </dd>
                      </div>
                      <div>
                        <dt>{metric.mode === "single_value" ? "Target" : "Created at"}</dt>
                        <dd>
                          {metric.mode === "single_value"
                            ? metric.targetValue === null
                              ? "Off"
                              : metric.targetValue
                            : metric.createdAt
                              ? String(metric.createdAt).slice(0, 10)
                              : "Unknown"}
                        </dd>
                      </div>
                    </dl>
                  </>
                )}
              </article>
            );
          })
        )}
      </section>
    </div>
  );
}
