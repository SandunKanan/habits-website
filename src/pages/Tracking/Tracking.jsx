import React, { useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import "./Tracking.scss";

export default function Tracking() {
  const {
    trackingMetrics,
    onAddTrackingMetric,
    onUpdateTrackingMetric,
    onDeleteTrackingMetric,
    isPersisting
  } = useOutletContext();

  const [name, setName] = useState("");
  const [unit, setUnit] = useState("");
  const [targetValue, setTargetValue] = useState("");
  const [feedback, setFeedback] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState("");
  const [editName, setEditName] = useState("");
  const [editUnit, setEditUnit] = useState("");
  const [editTargetValue, setEditTargetValue] = useState("");
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

    const result = await onAddTrackingMetric({ name, unit, targetValue });
    if (result?.ok) {
      setName("");
      setUnit("");
      setTargetValue("");
      setFeedback("Metric added.");
    } else {
      setFeedback(result?.error ?? "Could not add metric.");
    }

    setIsSaving(false);
  }

  function startEdit(metric) {
    setEditingId(metric.id);
    setEditName(metric.name);
    setEditUnit(metric.unit);
    setEditTargetValue(
      metric.targetValue === null || metric.targetValue === undefined ? "" : String(metric.targetValue)
    );
    setEditFeedback("");
  }

  function cancelEdit() {
    setEditingId("");
    setEditName("");
    setEditUnit("");
    setEditTargetValue("");
    setEditFeedback("");
  }

  async function handleSaveEdit(event) {
    event.preventDefault();
    if (!editingId) return;

    setIsSavingEdit(true);
    setEditFeedback("");

    const result = await onUpdateTrackingMetric(editingId, {
      name: editName,
      unit: editUnit,
      targetValue: editTargetValue
    });
    if (result?.ok) {
      setEditingId("");
      setFeedback("Metric updated.");
    } else {
      setEditFeedback(result?.error ?? "Could not update metric.");
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
      setFeedback("Metric deleted.");
    } else {
      setFeedback(result?.error ?? "Could not delete metric.");
    }
    setPendingDeleteId("");
  }

  return (
    <div className="trackingpage">
      <section className="trackingpage__hero card">
        <p className="trackingpage__eyebrow">Daily numbers</p>
        <h2>Set up what you want to track</h2>
        <p className="trackingpage__intro">
          Use tracking for things that are better measured than checked off: calories, protein,
          water, exercise time, or anything else you want to log for a given day.
        </p>
      </section>

      <section className="trackingpage__section card">
        <form className="trackingpage__form" onSubmit={handleAddMetric}>
          <div className="trackingpage__grid">
            <div className="trackingpage__field">
              <label htmlFor="tracking-name">Metric</label>
              <p>What are you tracking?</p>
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

          <div className="trackingpage__actions">
            <button type="submit" disabled={isSaving || isPersisting}>
              {isSaving || isPersisting ? "Saving..." : "Add metric"}
            </button>
            {feedback ? <p className="trackingpage__feedback">{feedback}</p> : null}
          </div>
        </form>
      </section>

      <section className="trackingpage__list">
        {sortedMetrics.length === 0 ? (
          <article className="trackingpage__empty card">
            <h3>No metrics yet</h3>
            <p>Add a few things you want to measure, then log their values from Today.</p>
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
                        <label htmlFor={`edit-metric-name-${metric.id}`}>Metric</label>
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
                        <p>{metric.unit}</p>
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
                        <dt>Unit</dt>
                        <dd>{metric.unit}</dd>
                      </div>
                      <div>
                        <dt>Target</dt>
                        <dd>{metric.targetValue === null ? "Off" : metric.targetValue}</dd>
                      </div>
                      <div>
                        <dt>Created at</dt>
                        <dd>{metric.createdAt ? String(metric.createdAt).slice(0, 10) : "Unknown"}</dd>
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
