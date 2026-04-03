import React, { useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import "./Learnings.scss";

const TYPE_OPTIONS = [
  { value: "learning", label: "Learning" },
  { value: "course", label: "Course" },
  { value: "project", label: "Project" }
];

const STATUS_OPTIONS = [
  { value: "idea", label: "Idea" },
  { value: "active", label: "Active" },
  { value: "paused", label: "Paused" },
  { value: "completed", label: "Completed" }
];

const STATUS_ORDER = {
  active: 0,
  idea: 1,
  paused: 2,
  completed: 3
};

function formatItemType(itemType) {
  return TYPE_OPTIONS.find((option) => option.value === itemType)?.label ?? "Learning";
}

function formatStatus(status) {
  return STATUS_OPTIONS.find((option) => option.value === status)?.label ?? "Idea";
}

export default function Learnings() {
  const { goals, learnings, onAddLearningItem, onUpdateLearningItem, onDeleteLearningItem, isPersisting } =
    useOutletContext();
  const [title, setTitle] = useState("");
  const [itemType, setItemType] = useState("learning");
  const [status, setStatus] = useState("idea");
  const [notes, setNotes] = useState("");
  const [pursuitTargets, setPursuitTargets] = useState([]);
  const [targetDraft, setTargetDraft] = useState("");
  const [feedback, setFeedback] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editItemType, setEditItemType] = useState("learning");
  const [editStatus, setEditStatus] = useState("idea");
  const [editNotes, setEditNotes] = useState("");
  const [editPursuitTargets, setEditPursuitTargets] = useState([]);
  const [editTargetDraft, setEditTargetDraft] = useState("");
  const [editFeedback, setEditFeedback] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState("");

  function buildTargetKey(target) {
    if (target.kind === "subgoal") {
      return `subgoal:${target.goalId}:${target.subgoalId}`;
    }

    return `goal:${target.goalId}`;
  }

  function parseTargetKey(targetKey) {
    const [kind, goalId, subgoalId] = String(targetKey ?? "").split(":");
    if (!goalId) return null;

    if (kind === "subgoal" && subgoalId) {
      return { kind: "subgoal", goalId, subgoalId };
    }

    if (kind === "goal") {
      return { kind: "goal", goalId, subgoalId: "" };
    }

    return null;
  }

  function describeTarget(target) {
    const goal = goals.find((item) => item.id === target.goalId);
    if (!goal) {
      return "Unknown target";
    }

    if (target.kind === "goal") {
      return goal.title;
    }

    const subgoal = Array.isArray(goal.subgoals)
      ? goal.subgoals.find((item) => item.id === target.subgoalId)
      : null;

    return subgoal ? `${goal.title} -> ${subgoal.title}` : goal.title;
  }

  const targetOptions = goals.flatMap((goal) => {
    const options = [
      {
        value: buildTargetKey({ kind: "goal", goalId: goal.id, subgoalId: "" }),
        label: goal.title,
        kindLabel: "Goal"
      }
    ];

    if (Array.isArray(goal.subgoals)) {
      goal.subgoals.forEach((subgoal) => {
        options.push({
          value: buildTargetKey({
            kind: "subgoal",
            goalId: goal.id,
            subgoalId: subgoal.id
          }),
          label: `${goal.title} -> ${subgoal.title}`,
          kindLabel: "Subgoal"
        });
      });
    }

    return options;
  });

  const sortedLearnings = useMemo(() => {
    return [...learnings].sort((a, b) => {
      const statusDifference = (STATUS_ORDER[a.status] ?? 99) - (STATUS_ORDER[b.status] ?? 99);
      if (statusDifference !== 0) {
        return statusDifference;
      }

      return String(a.createdAt ?? "").localeCompare(String(b.createdAt ?? ""));
    });
  }, [learnings]);

  const activeCount = sortedLearnings.filter((item) => item.status === "active").length;
  const projectCount = sortedLearnings.filter((item) => item.itemType === "project").length;

  async function handleAddItem(e) {
    e.preventDefault();
    setFeedback("");
    setIsSaving(true);

    const result = await onAddLearningItem({
      title,
      itemType,
      status,
      notes,
      pursuitTargets
    });

    if (result?.ok) {
      setTitle("");
      setItemType("learning");
      setStatus("idea");
      setNotes("");
      setPursuitTargets([]);
      setTargetDraft("");
      setFeedback("Item added.");
    } else {
      setFeedback(result?.error ?? "Could not add item.");
    }

    setIsSaving(false);
  }

  function startEdit(item) {
    setEditingId(item.id);
    setEditTitle(item.title);
    setEditItemType(item.itemType);
    setEditStatus(item.status);
    setEditNotes(item.notes ?? "");
    setEditPursuitTargets(Array.isArray(item.pursuitTargets) ? item.pursuitTargets : []);
    setEditTargetDraft("");
    setEditFeedback("");
  }

  function cancelEdit() {
    setEditingId("");
    setEditTitle("");
    setEditItemType("learning");
    setEditStatus("idea");
    setEditNotes("");
    setEditPursuitTargets([]);
    setEditTargetDraft("");
    setEditFeedback("");
  }

  async function handleSaveEdit(e) {
    e.preventDefault();
    if (!editingId) return;

    setIsSavingEdit(true);
    setEditFeedback("");

    const result = await onUpdateLearningItem(editingId, {
      title: editTitle,
      itemType: editItemType,
      status: editStatus,
      notes: editNotes,
      pursuitTargets: editPursuitTargets
    });

    if (result?.ok) {
      setEditingId("");
      setFeedback("Item updated.");
    } else {
      setEditFeedback(result?.error ?? "Could not update item.");
    }

    setIsSavingEdit(false);
  }

  function addTarget(currentTargets, targetKey) {
    const nextTarget = parseTargetKey(targetKey);
    if (!nextTarget) return currentTargets;
    const nextKey = buildTargetKey(nextTarget);

    return currentTargets.some((target) => buildTargetKey(target) === nextKey)
      ? currentTargets
      : [...currentTargets, nextTarget];
  }

  function removeTarget(currentTargets, targetKey) {
    return currentTargets.filter((target) => buildTargetKey(target) !== targetKey);
  }

  async function handleDeleteItem(item) {
    const confirmed = window.confirm(`Delete "${item.title}"?`);
    if (!confirmed) return;

    setFeedback("");
    setPendingDeleteId(item.id);
    const result = await onDeleteLearningItem(item.id);

    if (result?.ok) {
      if (editingId === item.id) {
        cancelEdit();
      }
      setFeedback("Item deleted.");
    } else {
      setFeedback(result?.error ?? "Could not delete item.");
    }

    setPendingDeleteId("");
  }

  const selectedTargetKeys = new Set(pursuitTargets.map(buildTargetKey));
  const selectedEditTargetKeys = new Set(editPursuitTargets.map(buildTargetKey));

  return (
    <div className="learningspage">
      <section className="learningspage__hero card">
        <p className="learningspage__eyebrow">Learning stack</p>
        <h2>Keep your learnings and projects in one place</h2>
        <p className="learningspage__intro">
          Use this page for courses you want to finish, topics you want to learn, and projects you
          want to build. The point is not to do everything at once. It is to keep what you are
          actively undertaking in one place, so it is easier to stay honest about what is actually
          on your plate right now.
        </p>
      </section>

      <section className="learningspage__section card">
        <form className="learningspage__form" onSubmit={handleAddItem}>
          <div className="learningspage__field">
            <label htmlFor="learning-title">Title</label>
            <p>Give the course, learning goal, or project a clear name.</p>
            <input
              id="learning-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isSaving || isPersisting}
              required
            />
          </div>

          <div className="learningspage__grid">
            <div className="learningspage__field">
              <label htmlFor="learning-type">Type</label>
              <select
                id="learning-type"
                value={itemType}
                onChange={(e) => setItemType(e.target.value)}
                disabled={isSaving || isPersisting}
              >
                {TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="learningspage__field">
              <label htmlFor="learning-status">Status</label>
              <select
                id="learning-status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                disabled={isSaving || isPersisting}
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="learningspage__field">
            <label htmlFor="learning-notes">Notes</label>
            <p>Add why it matters, what success looks like, or where to pick it back up.</p>
            <textarea
              id="learning-notes"
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={isSaving || isPersisting}
            />
          </div>

          <div className="learningspage__field">
            <label>Linked goals</label>
            <p>Link this pursuit to one or more goals or subgoals it supports.</p>
            <div className="learningspage__target-picker">
              <select
                value={targetDraft}
                onChange={(e) => setTargetDraft(e.target.value)}
                disabled={isSaving || isPersisting || goals.length === 0}
              >
                <option value="">Select a goal or subgoal</option>
                {targetOptions.map((option) => (
                  <option key={option.value} value={option.value} disabled={selectedTargetKeys.has(option.value)}>
                    {option.kindLabel}: {option.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => {
                  setPursuitTargets((current) => addTarget(current, targetDraft));
                  setTargetDraft("");
                }}
                disabled={isSaving || isPersisting || !targetDraft}
              >
                Add
              </button>
            </div>
            {pursuitTargets.length > 0 ? (
              <ul className="learningspage__target-list">
                {pursuitTargets.map((target) => {
                  const targetKey = buildTargetKey(target);
                  return (
                    <li key={targetKey}>
                      <span>{describeTarget(target)}</span>
                      <button
                        type="button"
                        onClick={() => setPursuitTargets((current) => removeTarget(current, targetKey))}
                        disabled={isSaving || isPersisting}
                      >
                        Remove
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </div>

          <div className="learningspage__actions">
            <button type="submit" disabled={isSaving || isPersisting}>
              {isSaving || isPersisting ? "Saving..." : "Add item"}
            </button>
            {feedback ? <p className="learningspage__feedback">{feedback}</p> : null}
          </div>
        </form>
      </section>

      <section className="learningspage__summary">
        <article className="learningspage__summary-card card">
          <span>Total items</span>
          <strong>{sortedLearnings.length}</strong>
        </article>
        <article className="learningspage__summary-card card">
          <span>Active now</span>
          <strong>{activeCount}</strong>
        </article>
        <article className="learningspage__summary-card card">
          <span>Projects</span>
          <strong>{projectCount}</strong>
        </article>
      </section>

      <section className="learningspage__list">
        {sortedLearnings.length === 0 ? (
          <article className="learningspage__empty card">
            <h3>Nothing here yet</h3>
            <p>
              Add the things you want to learn, complete, or build so they stop living in scattered
              notes and mental tabs.
            </p>
          </article>
        ) : (
          sortedLearnings.map((item) => {
            const isEditing = editingId === item.id;

            return (
              <article key={item.id} className="learningspage__item card">
                {isEditing ? (
                  <form className="learningspage__edit" onSubmit={handleSaveEdit}>
                    <div className="learningspage__field">
                      <label htmlFor={`edit-learning-title-${item.id}`}>Title</label>
                      <input
                        id={`edit-learning-title-${item.id}`}
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        disabled={isSavingEdit || isPersisting}
                        required
                      />
                    </div>

                    <div className="learningspage__grid">
                      <div className="learningspage__field">
                        <label htmlFor={`edit-learning-type-${item.id}`}>Type</label>
                        <select
                          id={`edit-learning-type-${item.id}`}
                          value={editItemType}
                          onChange={(e) => setEditItemType(e.target.value)}
                          disabled={isSavingEdit || isPersisting}
                        >
                          {TYPE_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="learningspage__field">
                        <label htmlFor={`edit-learning-status-${item.id}`}>Status</label>
                        <select
                          id={`edit-learning-status-${item.id}`}
                          value={editStatus}
                          onChange={(e) => setEditStatus(e.target.value)}
                          disabled={isSavingEdit || isPersisting}
                        >
                          {STATUS_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="learningspage__field">
                      <label htmlFor={`edit-learning-notes-${item.id}`}>Notes</label>
                      <textarea
                        id={`edit-learning-notes-${item.id}`}
                        rows={4}
                        value={editNotes}
                        onChange={(e) => setEditNotes(e.target.value)}
                        disabled={isSavingEdit || isPersisting}
                      />
                    </div>

                    <div className="learningspage__field">
                      <label>Linked goals</label>
                      <div className="learningspage__target-picker">
                        <select
                          value={editTargetDraft}
                          onChange={(e) => setEditTargetDraft(e.target.value)}
                          disabled={isSavingEdit || isPersisting || goals.length === 0}
                        >
                          <option value="">Select a goal or subgoal</option>
                          {targetOptions.map((option) => (
                            <option
                              key={option.value}
                              value={option.value}
                              disabled={selectedEditTargetKeys.has(option.value)}
                            >
                              {option.kindLabel}: {option.label}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => {
                            setEditPursuitTargets((current) => addTarget(current, editTargetDraft));
                            setEditTargetDraft("");
                          }}
                          disabled={isSavingEdit || isPersisting || !editTargetDraft}
                        >
                          Add
                        </button>
                      </div>
                      {editPursuitTargets.length > 0 ? (
                        <ul className="learningspage__target-list">
                          {editPursuitTargets.map((target) => {
                            const targetKey = buildTargetKey(target);
                            return (
                              <li key={targetKey}>
                                <span>{describeTarget(target)}</span>
                                <button
                                  type="button"
                                  onClick={() => setEditPursuitTargets((current) => removeTarget(current, targetKey))}
                                  disabled={isSavingEdit || isPersisting}
                                >
                                  Remove
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      ) : null}
                    </div>

                    <div className="learningspage__actions">
                      <button type="submit" disabled={isSavingEdit || isPersisting}>
                        {isSavingEdit || isPersisting ? "Saving..." : "Save"}
                      </button>
                      <button type="button" onClick={cancelEdit} disabled={isSavingEdit || isPersisting}>
                        Cancel
                      </button>
                      {editFeedback ? <p className="learningspage__feedback">{editFeedback}</p> : null}
                    </div>
                  </form>
                ) : (
                  <>
                    <div className="learningspage__item-head">
                      <div>
                        <div className="learningspage__badges">
                          <span className="learningspage__badge learningspage__badge--type">
                            {formatItemType(item.itemType)}
                          </span>
                          <span className={`learningspage__badge learningspage__badge--${item.status}`}>
                            {formatStatus(item.status)}
                          </span>
                        </div>
                        <h3>{item.title}</h3>
                      </div>
                      <div className="learningspage__item-actions">
                        <button type="button" onClick={() => startEdit(item)} disabled={isPersisting}>
                          Edit
                        </button>
                        <button
                          type="button"
                          className="learningspage__delete-btn"
                          onClick={() => handleDeleteItem(item)}
                          disabled={isPersisting}
                        >
                          {pendingDeleteId === item.id ? "Deleting..." : "Delete"}
                        </button>
                      </div>
                    </div>

                    {item.notes ? <p className="learningspage__notes">{item.notes}</p> : null}
                    {Array.isArray(item.pursuitTargets) && item.pursuitTargets.length > 0 ? (
                      <div className="learningspage__linked-goals">
                        <h4>Linked goals</h4>
                        <ul className="learningspage__target-list learningspage__target-list--read">
                          {item.pursuitTargets.map((target) => (
                            <li key={buildTargetKey(target)}>
                              <span>{describeTarget(target)}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}

                    <div className="learningspage__meta">
                      <span>Slug: {item.slug}</span>
                      <span>Updated: {item.updatedAt ? String(item.updatedAt).slice(0, 10) : "Unknown"}</span>
                    </div>
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
