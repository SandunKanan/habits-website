import React, { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import {
  getCurrentFocusBlock,
  isFutureFocusBlock,
  isPastFocusBlock,
  sortFocusBlocksByStartDate
} from "../../lib/focusUtils.js";
import "./Focus.scss";

function buildEmptyDraft() {
  return {
    id: "",
    title: "",
    startDate: "",
    endDate: "",
    whyNow: "",
    endState: "",
    currentObstacles: "",
    focusDomainIds: [],
    focusTargets: []
  };
}

function buildTargetKey(target) {
  if (target.kind === "subgoal") {
    return `subgoal:${target.goalId}:${target.subgoalId}`;
  }

  return `goal:${target.goalId}`;
}

function parseTargetKey(targetKey) {
  const [kind, goalId, subgoalId] = String(targetKey ?? "").split(":");
  if (!goalId) return null;
  if (kind === "subgoal" && subgoalId) return { kind: "subgoal", goalId, subgoalId };
  if (kind === "goal") return { kind: "goal", goalId, subgoalId: "" };
  return null;
}

function describeTarget(target, goals) {
  const goal = goals.find((item) => item.id === target.goalId);
  if (!goal) return "Unknown target";
  if (target.kind === "goal") return goal.title;
  const subgoal = Array.isArray(goal.subgoals) ? goal.subgoals.find((item) => item.id === target.subgoalId) : null;
  return subgoal ? `${goal.title} -> ${subgoal.title}` : goal.title;
}

function describeDomain(domainId, domains) {
  const domain = domains.find((item) => item.id === domainId);
  return domain ? domain.name : "Unknown domain";
}

function formatDateRange(block) {
  const startDate = block?.startDate || "No start";
  const endDate = block?.endDate || "Open-ended";
  return `${startDate} -> ${endDate}`;
}

function FocusBlockEditor({
  title,
  draft,
  setDraft,
  goals,
  domains,
  isSaving,
  onSubmit,
  onCancel,
  feedback,
  submitLabel
}) {
  const selectedDomainIds = new Set(draft.focusDomainIds);
  const selectedTargetKeys = new Set(draft.focusTargets.map(buildTargetKey));
  const [domainDraft, setDomainDraft] = useState("");
  const [targetDraft, setTargetDraft] = useState("");

  useEffect(() => {
    setDomainDraft("");
    setTargetDraft("");
  }, [draft.id]);

  const domainOptions = [...domains].sort((a, b) => a.name.localeCompare(b.name));
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
          value: buildTargetKey({ kind: "subgoal", goalId: goal.id, subgoalId: subgoal.id }),
          label: `${goal.title} -> ${subgoal.title}`,
          kindLabel: "Subgoal"
        });
      });
    }

    return options;
  });

  function updateDraft(field, value) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function addDomainFromDraft() {
    const nextDomainId = String(domainDraft ?? "");
    if (!nextDomainId) return;
    updateDraft(
      "focusDomainIds",
      draft.focusDomainIds.includes(nextDomainId) ? draft.focusDomainIds : [...draft.focusDomainIds, nextDomainId]
    );
    setDomainDraft("");
  }

  function removeDomain(domainId) {
    updateDraft(
      "focusDomainIds",
      draft.focusDomainIds.filter((id) => id !== domainId)
    );
  }

  function addTargetFromDraft() {
    const nextTarget = parseTargetKey(targetDraft);
    if (!nextTarget) return;
    const targetKey = buildTargetKey(nextTarget);
    updateDraft(
      "focusTargets",
      draft.focusTargets.some((target) => buildTargetKey(target) === targetKey)
        ? draft.focusTargets
        : [...draft.focusTargets, nextTarget]
    );
    setTargetDraft("");
  }

  function removeTarget(targetKey) {
    updateDraft(
      "focusTargets",
      draft.focusTargets.filter((target) => buildTargetKey(target) !== targetKey)
    );
  }

  return (
    <form className="focuspage__form" onSubmit={onSubmit}>
      <div className="focuspage__form-head">
        <h3>{title}</h3>
      </div>

      <div className="focuspage__field">
        <label htmlFor={`${draft.id || "new"}-focus-title`}>Focus title</label>
        <input
          id={`${draft.id || "new"}-focus-title`}
          type="text"
          value={draft.title}
          onChange={(event) => updateDraft("title", event.target.value)}
          disabled={isSaving}
        />
      </div>

      <div className="focuspage__split">
        <div className="focuspage__field">
          <label htmlFor={`${draft.id || "new"}-focus-start-date`}>Start date</label>
          <input
            id={`${draft.id || "new"}-focus-start-date`}
            type="date"
            value={draft.startDate}
            onChange={(event) => updateDraft("startDate", event.target.value)}
            disabled={isSaving}
          />
        </div>
        <div className="focuspage__field">
          <label htmlFor={`${draft.id || "new"}-focus-end-date`}>End date</label>
          <input
            id={`${draft.id || "new"}-focus-end-date`}
            type="date"
            value={draft.endDate}
            onChange={(event) => updateDraft("endDate", event.target.value)}
            disabled={isSaving}
          />
        </div>
      </div>

      <div className="focuspage__field">
        <label htmlFor={`${draft.id || "new"}-focus-why-now`}>What is your main focus for this block?</label>
        <textarea
          id={`${draft.id || "new"}-focus-why-now`}
          value={draft.whyNow}
          onChange={(event) => updateDraft("whyNow", event.target.value)}
          rows={4}
          disabled={isSaving}
        />
      </div>

      <div className="focuspage__field">
        <label htmlFor={`${draft.id || "new"}-focus-end-state`}>Who do you want to be by the end of this block?</label>
        <textarea
          id={`${draft.id || "new"}-focus-end-state`}
          value={draft.endState}
          onChange={(event) => updateDraft("endState", event.target.value)}
          rows={4}
          disabled={isSaving}
        />
      </div>

      <div className="focuspage__field">
        <label htmlFor={`${draft.id || "new"}-focus-obstacles`}>What is getting in the way?</label>
        <textarea
          id={`${draft.id || "new"}-focus-obstacles`}
          value={draft.currentObstacles}
          onChange={(event) => updateDraft("currentObstacles", event.target.value)}
          rows={4}
          disabled={isSaving}
        />
      </div>

      <div className="focuspage__field">
        <label>Focus domains</label>
        <div className="focuspage__targets">
          {domains.length === 0 ? (
            <p className="focuspage__targets-empty">Add domains first if you want to connect this focus block to them.</p>
          ) : (
            <>
              <div className="focuspage__target-picker">
                <select value={domainDraft} onChange={(event) => setDomainDraft(event.target.value)} disabled={isSaving}>
                  <option value="">Select a domain</option>
                  {domainOptions.map((domain) => (
                    <option key={domain.id} value={domain.id} disabled={selectedDomainIds.has(domain.id)}>
                      {domain.name}
                    </option>
                  ))}
                </select>
                <button type="button" onClick={addDomainFromDraft} disabled={isSaving || !domainDraft}>
                  Add
                </button>
              </div>

              {draft.focusDomainIds.length > 0 ? (
                <ul className="focuspage__target-list">
                  {draft.focusDomainIds.map((domainId) => (
                    <li key={domainId}>
                      <span>{describeDomain(domainId, domains)}</span>
                      <button type="button" onClick={() => removeDomain(domainId)} disabled={isSaving}>
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </>
          )}
        </div>
      </div>

      <div className="focuspage__field">
        <label>Focus goals</label>
        <div className="focuspage__targets">
          {goals.length === 0 ? (
            <p className="focuspage__targets-empty">Add goals first if you want to connect this focus block to them.</p>
          ) : (
            <>
              <div className="focuspage__target-picker">
                <select value={targetDraft} onChange={(event) => setTargetDraft(event.target.value)} disabled={isSaving}>
                  <option value="">Select a goal or subgoal</option>
                  {targetOptions.map((option) => (
                    <option key={option.value} value={option.value} disabled={selectedTargetKeys.has(option.value)}>
                      {option.kindLabel}: {option.label}
                    </option>
                  ))}
                </select>
                <button type="button" onClick={addTargetFromDraft} disabled={isSaving || !targetDraft}>
                  Add
                </button>
              </div>

              {draft.focusTargets.length > 0 ? (
                <ul className="focuspage__target-list">
                  {draft.focusTargets.map((target) => {
                    const targetKey = buildTargetKey(target);
                    return (
                      <li key={targetKey}>
                        <span>{describeTarget(target, goals)}</span>
                        <button type="button" onClick={() => removeTarget(targetKey)} disabled={isSaving}>
                          Remove
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </>
          )}
        </div>
      </div>

      <div className="focuspage__actions">
        <button type="submit" disabled={isSaving}>
          {submitLabel}
        </button>
        {onCancel ? (
          <button type="button" className="focuspage__secondary-btn" onClick={onCancel} disabled={isSaving}>
            Cancel
          </button>
        ) : null}
        {feedback ? <p className="focuspage__feedback">{feedback}</p> : null}
      </div>
    </form>
  );
}

export default function Focus() {
  const { todayISO, focus, focusBlocks, goals, domains, onSaveFocus, onDeleteFocus, isPersisting } =
    useOutletContext();
  const [newDraft, setNewDraft] = useState(buildEmptyDraft());
  const [editingId, setEditingId] = useState("");
  const [editDraft, setEditDraft] = useState(buildEmptyDraft());
  const [feedback, setFeedback] = useState("");
  const [editFeedback, setEditFeedback] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("current");
  const [pastOpen, setPastOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState("");

  const currentFocus = useMemo(() => getCurrentFocusBlock(focusBlocks, todayISO) ?? focus ?? null, [focus, focusBlocks, todayISO]);
  const futureFocusBlocks = useMemo(
    () => sortFocusBlocksByStartDate(focusBlocks.filter((block) => isFutureFocusBlock(block, todayISO))),
    [focusBlocks, todayISO]
  );
  const pastFocusBlocks = useMemo(
    () => sortFocusBlocksByStartDate(focusBlocks.filter((block) => isPastFocusBlock(block, todayISO)), "desc"),
    [focusBlocks, todayISO]
  );

  useEffect(() => {
    if (!currentFocus && futureFocusBlocks.length === 0 && pastFocusBlocks.length === 0) {
      setIsEditorOpen(true);
    }
  }, [currentFocus, futureFocusBlocks.length, pastFocusBlocks.length]);

  function startEdit(block) {
    setEditingId(block.id);
    setEditDraft({
      id: block.id,
      title: block.title ?? "",
      startDate: block.startDate ?? "",
      endDate: block.endDate ?? "",
      whyNow: block.whyNow ?? "",
      endState: block.endState ?? "",
      currentObstacles: block.currentObstacles ?? "",
      focusDomainIds: Array.isArray(block.focusDomainIds) ? block.focusDomainIds : [],
      focusTargets: Array.isArray(block.focusTargets) ? block.focusTargets : []
    });
    setEditFeedback("");
  }

  function cancelEdit() {
    setEditingId("");
    setEditDraft(buildEmptyDraft());
    setEditFeedback("");
  }

  async function handleAddFocus(event) {
    event.preventDefault();
    setFeedback("");
    setIsSaving(true);

    const result = await onSaveFocus(newDraft);
    if (result?.ok) {
      setNewDraft(buildEmptyDraft());
      setFeedback("Focus block added.");
      setIsEditorOpen(false);
      setActiveTab(newDraft.startDate && newDraft.startDate > todayISO ? "future" : "current");
    } else {
      setFeedback(result?.error ?? "Could not save focus block.");
    }

    setIsSaving(false);
  }

  async function handleUpdateFocus(event) {
    event.preventDefault();
    setEditFeedback("");
    setIsSaving(true);

    const result = await onSaveFocus(editDraft);
    if (result?.ok) {
      setEditFeedback("Focus block updated.");
      setEditingId("");
    } else {
      setEditFeedback(result?.error ?? "Could not save focus block.");
    }

    setIsSaving(false);
  }

  async function handleDeleteFocus(block) {
    const confirmed = window.confirm(`Delete "${block.title || "this focus block"}"?`);
    if (!confirmed) return;

    setPendingDeleteId(block.id);
    const result = await onDeleteFocus(block.id);
    if (!result?.ok) {
      setFeedback(result?.error ?? "Could not delete focus block.");
    }
    setPendingDeleteId("");
  }

  function renderFocusCard(block, { tone = "current" } = {}) {
    const isEditing = editingId === block.id;
    const toneLabel = tone === "future" ? "Future block" : tone === "past" ? "Past block" : "Current block";

    if (isEditing) {
      return (
        <article key={block.id} className="focuspage__block card">
          <FocusBlockEditor
            title="Edit focus block"
            draft={editDraft}
            setDraft={setEditDraft}
            goals={goals}
            domains={domains}
            isSaving={isSaving || isPersisting}
            onSubmit={handleUpdateFocus}
            onCancel={cancelEdit}
            feedback={editFeedback}
            submitLabel={isSaving || isPersisting ? "Saving..." : "Save changes"}
          />
        </article>
      );
    }

    return (
      <article key={block.id} className={["focuspage__block card", `focuspage__block--${tone}`].join(" ")}>
        <div className="focuspage__block-head">
          <div>
            <span className="focuspage__block-kicker">{toneLabel}</span>
            <h3>{block.title || "Untitled focus block"}</h3>
            <p>{formatDateRange(block)}</p>
          </div>
          <div className="focuspage__block-actions">
            <button type="button" onClick={() => startEdit(block)} disabled={isPersisting}>
              Edit
            </button>
            <button
              type="button"
              className="focuspage__delete-btn"
              onClick={() => handleDeleteFocus(block)}
              disabled={isPersisting || pendingDeleteId === block.id}
            >
              {pendingDeleteId === block.id ? "Deleting..." : "Delete"}
            </button>
          </div>
        </div>

        <div className="focuspage__block-grid">
          <div>
            <span>Why now</span>
            <p>{block.whyNow || "Not set yet."}</p>
          </div>
          <div>
            <span>End state</span>
            <p>{block.endState || "Not set yet."}</p>
          </div>
          <div>
            <span>Obstacles</span>
            <p>{block.currentObstacles || "None noted yet."}</p>
          </div>
        </div>

        <div className="focuspage__linked-grid">
          <div className="focuspage__linked-card">
            <span>Domains</span>
            {block.focusDomainIds?.length ? (
              <ul>
                {block.focusDomainIds.map((domainId) => (
                  <li key={domainId}>{describeDomain(domainId, domains)}</li>
                ))}
              </ul>
            ) : (
              <p>None linked.</p>
            )}
          </div>
          <div className="focuspage__linked-card">
            <span>Goals</span>
            {block.focusTargets?.length ? (
              <ul>
                {block.focusTargets.map((target) => (
                  <li key={buildTargetKey(target)}>{describeTarget(target, goals)}</li>
                ))}
              </ul>
            ) : (
              <p>None linked.</p>
            )}
          </div>
        </div>
      </article>
    );
  }

  return (
    <div className="focuspage">
      <section className="focuspage__hero card">
        <p className="focuspage__eyebrow">Focus Blocks</p>
        <h2>Shape your time in deliberate blocks</h2>
        <p className="focuspage__intro">
          Create focus blocks for the current period, plan future blocks ahead of time, and keep a record of past ones.
        </p>
      </section>

      <section className="focuspage__section card">
        <details className="focuspage__editor" open={isEditorOpen} onToggle={(event) => setIsEditorOpen(event.currentTarget.open)}>
          <summary className="focuspage__editor-summary">
            <div>
              <h3>Add new focus</h3>
              <p>Create a new current or future focus block.</p>
            </div>
          </summary>

          <FocusBlockEditor
            title="New focus block"
            draft={newDraft}
            setDraft={setNewDraft}
            goals={goals}
            domains={domains}
            isSaving={isSaving || isPersisting}
            onSubmit={handleAddFocus}
            feedback={feedback}
            submitLabel={isSaving || isPersisting ? "Saving..." : "Add focus block"}
          />
        </details>
      </section>

      <section className="focuspage__section card">
        <div className="focuspage__tabs" role="tablist" aria-label="Focus block views">
          <button
            type="button"
            className={activeTab === "current" ? "active" : ""}
            onClick={() => setActiveTab("current")}
          >
            Current focus
          </button>
          <button
            type="button"
            className={activeTab === "future" ? "active" : ""}
            onClick={() => setActiveTab("future")}
          >
            Future focus blocks
          </button>
        </div>

        {activeTab === "current" ? (
          currentFocus ? (
            renderFocusCard(currentFocus, { tone: "current" })
          ) : (
            <div className="focuspage__empty-state">
              <h3>No current focus block</h3>
              <p>Nothing currently spans {todayISO}. You can add one above or plan a future block.</p>
            </div>
          )
        ) : futureFocusBlocks.length > 0 ? (
          <div className="focuspage__block-list">
            {futureFocusBlocks.map((block) => renderFocusCard(block, { tone: "future" }))}
          </div>
        ) : (
          <div className="focuspage__empty-state">
            <h3>No future focus blocks</h3>
            <p>Add a block with a future start date and it will appear here.</p>
          </div>
        )}
      </section>

      <section className="focuspage__section card">
        <details className="focuspage__history" open={pastOpen} onToggle={(event) => setPastOpen(event.currentTarget.open)}>
          <summary className="focuspage__history-summary">
            <div>
              <h3>Past focus blocks</h3>
              <p>{pastFocusBlocks.length} saved block{pastFocusBlocks.length === 1 ? "" : "s"}</p>
            </div>
          </summary>

          {pastFocusBlocks.length > 0 ? (
            <div className="focuspage__block-list">
              {pastFocusBlocks.map((block) => renderFocusCard(block, { tone: "past" }))}
            </div>
          ) : (
            <p className="focuspage__targets-empty">No past focus blocks yet.</p>
          )}
        </details>
      </section>
    </div>
  );
}
