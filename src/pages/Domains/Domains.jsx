import React, { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import "./Domains.scss";

function buildTree(domains, parentId = "") {
  return domains
    .filter((domain) => String(domain.parentId ?? "") === String(parentId))
    .sort((a, b) => Number(a.sortOrder ?? 0) - Number(b.sortOrder ?? 0) || a.name.localeCompare(b.name))
    .map((domain) => ({
      ...domain,
      children: buildTree(domains, domain.id)
    }));
}

function getAncestorIds(domains, domainId) {
  const ancestors = [];
  let currentId = String(domainId ?? "");

  while (currentId) {
    const currentDomain = domains.find((domain) => domain.id === currentId);
    if (!currentDomain) break;
    ancestors.push(currentDomain.id);
    currentId = String(currentDomain.parentId ?? "");
  }

  return ancestors;
}

function buildDomainPathMap(domains) {
  const pathById = new Map();

  function getPath(domainId) {
    if (pathById.has(domainId)) {
      return pathById.get(domainId);
    }

    const domain = domains.find((item) => item.id === domainId);
    if (!domain) {
      return "";
    }

    const parentPath = domain.parentId ? getPath(domain.parentId) : "";
    const path = parentPath ? `${parentPath} / ${domain.name}` : domain.name;
    pathById.set(domainId, path);
    return path;
  }

  for (const domain of domains) {
    getPath(domain.id);
  }

  return pathById;
}

export default function Domains() {
  const {
    domains,
    focus,
    goals,
    learnings,
    habits,
    settings,
    onAddDomain,
    onUpdateDomain,
    onDeleteDomain,
    isPersisting
  } = useOutletContext();
  const [name, setName] = useState("");
  const [parentId, setParentId] = useState("");
  const [notes, setNotes] = useState("");
  const [scoreOutOfTen, setScoreOutOfTen] = useState("");
  const [feedback, setFeedback] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState("");
  const [editName, setEditName] = useState("");
  const [editParentId, setEditParentId] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editScoreOutOfTen, setEditScoreOutOfTen] = useState("");
  const [editFeedback, setEditFeedback] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState("");
  const [expandedIds, setExpandedIds] = useState(() => new Set());
  const [inlineParentId, setInlineParentId] = useState("");
  const [inlineChildName, setInlineChildName] = useState("");
  const [inlineChildNotes, setInlineChildNotes] = useState("");
  const [inlineChildScoreOutOfTen, setInlineChildScoreOutOfTen] = useState("");
  const [inlineFeedback, setInlineFeedback] = useState("");
  const [isSavingInline, setIsSavingInline] = useState(false);
  const [scoreDraft, setScoreDraft] = useState({ domainId: "", value: null });
  const [savingScoreId, setSavingScoreId] = useState("");

  const tree = useMemo(() => buildTree(domains), [domains]);
  const domainPathMap = useMemo(() => buildDomainPathMap(domains), [domains]);
  const rootCount = domains.filter((domain) => !domain.parentId).length;
  const focusDomainIds = new Set(Array.isArray(focus?.focusDomainIds) ? focus.focusDomainIds : []);
  const focusedCount = domains.filter((domain) => focusDomainIds.has(domain.id)).length;
  const useDecimalDomainScores = Boolean(settings?.useDecimalDomainScores ?? false);
  const scoreStep = useDecimalDomainScores ? "0.1" : "1";
  const scoreInputMode = useDecimalDomainScores ? "decimal" : "numeric";

  useEffect(() => {
    if (domains.length === 0) return;
    setExpandedIds((current) => {
      if (current.size > 0) {
        return current;
      }
      return new Set(domains.filter((domain) => !domain.parentId).map((domain) => domain.id));
    });
  }, [domains]);

  function expandDomainPath(domainId) {
    if (!domainId) return;
    const idsToExpand = getAncestorIds(domains, domainId);
    setExpandedIds((current) => new Set([...current, ...idsToExpand]));
  }

  function toggleExpanded(domainId) {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(domainId)) {
        next.delete(domainId);
      } else {
        next.add(domainId);
      }
      return next;
    });
  }

  function openInlineChildForm(domainId) {
    setInlineParentId(domainId);
    setInlineChildName("");
    setInlineChildNotes("");
    setInlineChildScoreOutOfTen("");
    setInlineFeedback("");
    expandDomainPath(domainId);
  }

  function closeInlineChildForm() {
    setInlineParentId("");
    setInlineChildName("");
    setInlineChildNotes("");
    setInlineChildScoreOutOfTen("");
    setInlineFeedback("");
  }

  async function handleAddDomain(event) {
    event.preventDefault();
    setFeedback("");
    setIsSaving(true);

    const result = await onAddDomain({ name, parentId, notes, scoreOutOfTen });
    if (result?.ok) {
      setName("");
      setParentId("");
      setNotes("");
      setScoreOutOfTen("");
      setFeedback("Domain added.");
      if (parentId) {
        expandDomainPath(parentId);
      }
    } else {
      setFeedback(result?.error ?? "Could not add domain.");
    }

    setIsSaving(false);
  }

  async function handleAddInlineChild(event, parentDomainId) {
    event.preventDefault();
    setInlineFeedback("");
    setIsSavingInline(true);

    const result = await onAddDomain({
      name: inlineChildName,
      parentId: parentDomainId,
      notes: inlineChildNotes,
      scoreOutOfTen: inlineChildScoreOutOfTen
    });
    if (result?.ok) {
      closeInlineChildForm();
      setFeedback("Child domain added.");
      expandDomainPath(parentDomainId);
    } else {
      setInlineFeedback(result?.error ?? "Could not add child domain.");
    }

    setIsSavingInline(false);
  }

  function startEdit(domain) {
    setEditingId(domain.id);
    setEditName(domain.name);
    setEditParentId(domain.parentId ?? "");
    setEditNotes(domain.notes ?? "");
    setEditScoreOutOfTen(
      domain.scoreOutOfTen === null || domain.scoreOutOfTen === undefined
        ? ""
        : formatDomainScore(domain.scoreOutOfTen, useDecimalDomainScores)
    );
    setEditFeedback("");
  }

  function cancelEdit() {
    setEditingId("");
    setEditName("");
    setEditParentId("");
    setEditNotes("");
    setEditScoreOutOfTen("");
    setEditFeedback("");
  }

  async function handleSaveEdit(event) {
    event.preventDefault();
    if (!editingId) return;

    setIsSavingEdit(true);
    setEditFeedback("");

    const result = await onUpdateDomain(editingId, {
      name: editName,
      parentId: editParentId,
      notes: editNotes,
      scoreOutOfTen: editScoreOutOfTen
    });

    if (result?.ok) {
      setEditingId("");
      setFeedback("Domain updated.");
      if (editParentId) {
        expandDomainPath(editParentId);
      }
    } else {
      setEditFeedback(result?.error ?? "Could not update domain.");
    }

    setIsSavingEdit(false);
  }

  async function handleDeleteDomain(domain) {
    const confirmed = window.confirm(
      `Delete "${domain.name}"? Any nested child domains under it will be removed too.`
    );
    if (!confirmed) return;

    setFeedback("");
    setPendingDeleteId(domain.id);
    const result = await onDeleteDomain(domain.id);

    if (result?.ok) {
      if (editingId === domain.id) {
        cancelEdit();
      }
      setFeedback("Domain deleted.");
    } else {
      setFeedback(result?.error ?? "Could not delete domain.");
    }

    setPendingDeleteId("");
  }

  function getVisibleScore(domain) {
    const baseValue =
      scoreDraft.domainId === domain.id && scoreDraft.value !== null ? scoreDraft.value : domain.scoreOutOfTen;

    if (baseValue === null || baseValue === undefined) {
      return null;
    }

    if (!useDecimalDomainScores) {
      return Math.round(Number(baseValue));
    }

    if (scoreDraft.domainId === domain.id && scoreDraft.value !== null) {
      return scoreDraft.value;
    }

    return domain.scoreOutOfTen;
  }

  function handleScoreChange(domainId, nextValue) {
    const numericValue = Number(nextValue);
    setScoreDraft({
      domainId,
      value: useDecimalDomainScores ? numericValue : Math.round(numericValue)
    });
  }

  async function commitScoreDraft(domain) {
    if (savingScoreId === domain.id) {
      return;
    }

    const nextScore = scoreDraft.domainId === domain.id ? scoreDraft.value : domain.scoreOutOfTen;
    if (nextScore === null || nextScore === undefined) {
      return;
    }

    if (Number(nextScore) === Number(domain.scoreOutOfTen)) {
      if (scoreDraft.domainId === domain.id) {
        setScoreDraft({ domainId: "", value: null });
      }
      return;
    }

    setSavingScoreId(domain.id);
    const result = await onUpdateDomain(domain.id, {
      name: domain.name,
      parentId: domain.parentId,
      notes: domain.notes,
      scoreOutOfTen: nextScore
    });

    if (result?.ok) {
      setFeedback("Domain score updated.");
    } else {
      setFeedback(result?.error ?? "Could not update domain score.");
    }

    setScoreDraft((current) => (current.domainId === domain.id ? { domainId: "", value: null } : current));
    setSavingScoreId("");
  }

  function renderDomainNode(domain, depth = 0) {
    const isEditing = editingId === domain.id;
    const hasChildren = domain.children.length > 0;
    const isExpanded = expandedIds.has(domain.id);
    const unavailableParentIds = new Set([domain.id]);

    function collectChildrenIds(node) {
      for (const child of node.children) {
        unavailableParentIds.add(child.id);
        collectChildrenIds(child);
      }
    }

    collectChildrenIds(domain);
    const linkedGoals = goals.filter((goal) => Array.isArray(goal.domainIds) && goal.domainIds.includes(domain.id));
    const linkedPursuits = learnings.filter(
      (item) => Array.isArray(item.domainIds) && item.domainIds.includes(domain.id)
    );
    const linkedHabits = habits.filter(
      (habit) => Array.isArray(habit.domainIds) && habit.domainIds.includes(domain.id)
    );
    const visibleScore = getVisibleScore(domain);

    return (
      <li key={domain.id} className="domainspage__node">
        <article
          className={[
            "domainspage__item",
            "card",
            depth > 0 ? "domainspage__item--child" : "domainspage__item--root"
          ].join(" ")}
          style={{ "--domain-depth": depth }}
        >
          {isEditing ? (
            <form className="domainspage__edit" onSubmit={handleSaveEdit}>
              <div className="domainspage__field">
                <label htmlFor={`domain-edit-name-${domain.id}`}>Name</label>
                <input
                  id={`domain-edit-name-${domain.id}`}
                  type="text"
                  value={editName}
                  onChange={(event) => setEditName(event.target.value)}
                  disabled={isSavingEdit || isPersisting}
                  required
                />
              </div>

              <div className="domainspage__field">
                <label htmlFor={`domain-edit-parent-${domain.id}`}>Parent</label>
                <select
                  id={`domain-edit-parent-${domain.id}`}
                  value={editParentId}
                  onChange={(event) => setEditParentId(event.target.value)}
                  disabled={isSavingEdit || isPersisting}
                >
                  <option value="">No parent</option>
                  {domains
                    .filter((item) => !unavailableParentIds.has(item.id))
                    .map((item) => (
                      <option key={item.id} value={item.id}>
                        {domainPathMap.get(item.id) ?? item.name}
                      </option>
                    ))}
                </select>
              </div>

              <div className="domainspage__field">
                <label htmlFor={`domain-edit-notes-${domain.id}`}>Notes</label>
                <textarea
                  id={`domain-edit-notes-${domain.id}`}
                  rows={3}
                  value={editNotes}
                  onChange={(event) => setEditNotes(event.target.value)}
                  disabled={isSavingEdit || isPersisting}
                />
              </div>

              <div className="domainspage__field">
                <label htmlFor={`domain-edit-score-${domain.id}`}>Score out of 10</label>
                <input
                  id={`domain-edit-score-${domain.id}`}
                  type="number"
                  min="0"
                  max="10"
                  step={scoreStep}
                  inputMode={scoreInputMode}
                  value={editScoreOutOfTen}
                  onChange={(event) => setEditScoreOutOfTen(event.target.value)}
                  disabled={isSavingEdit || isPersisting}
                />
              </div>

              <div className="domainspage__actions">
                <button type="submit" disabled={isSavingEdit || isPersisting}>
                  {isSavingEdit || isPersisting ? "Saving..." : "Save"}
                </button>
                <button type="button" onClick={cancelEdit} disabled={isSavingEdit || isPersisting}>
                  Cancel
                </button>
                {editFeedback ? <p className="domainspage__feedback">{editFeedback}</p> : null}
              </div>
            </form>
          ) : (
            <>
              <div className="domainspage__item-head">
                <div>
                  <div className="domainspage__badges">
                    {focusDomainIds.has(domain.id) ? (
                      <span className="domainspage__badge domainspage__badge--focus">Focus</span>
                    ) : null}
                    {linkedGoals.length > 0 ? (
                      <span className="domainspage__badge domainspage__badge--linked">
                        {linkedGoals.length} goal{linkedGoals.length === 1 ? "" : "s"}
                      </span>
                    ) : null}
                    {linkedPursuits.length > 0 ? (
                      <span className="domainspage__badge domainspage__badge--linked-pursuit">
                        {linkedPursuits.length} pursuit{linkedPursuits.length === 1 ? "" : "s"}
                      </span>
                    ) : null}
                    {linkedHabits.length > 0 ? (
                      <span className="domainspage__badge domainspage__badge--linked-habit">
                        {linkedHabits.length} habit{linkedHabits.length === 1 ? "" : "s"}
                      </span>
                    ) : null}
                  </div>
                  <div className="domainspage__title-row">
                    <h3
                      className={depth > 0 ? "domainspage__title domainspage__title--child" : "domainspage__title"}
                    >
                      {domain.name}
                    </h3>
                    {domain.scoreOutOfTen !== null && domain.scoreOutOfTen !== undefined ? (
                      <div
                        className="domainspage__score"
                        aria-label={`Score ${formatDomainScore(visibleScore, useDecimalDomainScores)} out of 10`}
                      >
                        <span
                          className={[
                            "domainspage__score-value",
                            getDomainScoreColorClass(visibleScore)
                          ].join(" ")}
                        >
                          {formatDomainScore(visibleScore, useDecimalDomainScores)}/10
                        </span>
                        <input
                          className="domainspage__score-track"
                          type="range"
                          min="0"
                          max="10"
                          step={scoreStep}
                          value={visibleScore}
                          onChange={(event) => handleScoreChange(domain.id, event.target.value)}
                          onPointerUp={() => void commitScoreDraft(domain)}
                          onBlur={() => void commitScoreDraft(domain)}
                          disabled={isPersisting || savingScoreId === domain.id}
                          aria-label={`Adjust score for ${domain.name}`}
                        />
                      </div>
                    ) : null}
                    {hasChildren ? (
                      <button
                        type="button"
                        className="domainspage__toggle"
                        onClick={() => toggleExpanded(domain.id)}
                        aria-expanded={isExpanded}
                      >
                        <svg
                          className={[
                            "domainspage__toggle-caret",
                            depth > 0 ? "domainspage__toggle-caret--child" : "",
                            isExpanded ? "domainspage__toggle-caret--expanded" : ""
                          ].join(" ")}
                          viewBox="0 0 12 12"
                          aria-hidden="true"
                          focusable="false"
                        >
                          <path
                            d="M2.25 4.25 6 8l3.75-3.75"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.75"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </button>
                    ) : null}
                  </div>
                  {domain.notes ? <p className="domainspage__notes">{domain.notes}</p> : null}
                  {linkedGoals.length > 0 ? (
                    <div className="domainspage__linked">
                      <h4>Linked goals</h4>
                      <ul className="domainspage__linked-list">
                        {linkedGoals.slice(0, 3).map((goal) => (
                          <li key={goal.id}>{goal.title}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {linkedPursuits.length > 0 ? (
                    <div className="domainspage__linked">
                      <h4>Linked pursuits</h4>
                      <ul className="domainspage__linked-list">
                        {linkedPursuits.slice(0, 3).map((item) => (
                          <li key={item.id}>{item.title}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {linkedHabits.length > 0 ? (
                    <div className="domainspage__linked">
                      <h4>Linked habits</h4>
                      <ul className="domainspage__linked-list">
                        {linkedHabits.slice(0, 3).map((habit) => (
                          <li key={habit.id}>{habit.name}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
                <div className="domainspage__item-actions">
                  <button
                    type="button"
                    onClick={() => openInlineChildForm(domain.id)}
                    disabled={isPersisting}
                  >
                    Add child
                  </button>
                  <button type="button" onClick={() => startEdit(domain)} disabled={isPersisting}>
                    Edit
                  </button>
                  <button
                    type="button"
                    className="domainspage__delete-btn"
                    onClick={() => handleDeleteDomain(domain)}
                    disabled={isPersisting}
                  >
                    {pendingDeleteId === domain.id ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </div>
            </>
          )}
        </article>

        {inlineParentId === domain.id ? (
          <form className="domainspage__inline-form card" onSubmit={(event) => handleAddInlineChild(event, domain.id)}>
            <div className="domainspage__field">
              <label htmlFor={`inline-child-name-${domain.id}`}>Child domain</label>
              <input
                id={`inline-child-name-${domain.id}`}
                type="text"
                value={inlineChildName}
                onChange={(event) => setInlineChildName(event.target.value)}
                disabled={isSavingInline || isPersisting}
                required
              />
            </div>
            <div className="domainspage__field">
              <label htmlFor={`inline-child-notes-${domain.id}`}>Notes</label>
              <textarea
                id={`inline-child-notes-${domain.id}`}
                rows={3}
                value={inlineChildNotes}
                onChange={(event) => setInlineChildNotes(event.target.value)}
                disabled={isSavingInline || isPersisting}
              />
            </div>
            <div className="domainspage__field">
              <label htmlFor={`inline-child-score-${domain.id}`}>Score out of 10</label>
              <input
                id={`inline-child-score-${domain.id}`}
                  type="number"
                  min="0"
                  max="10"
                  step={scoreStep}
                  inputMode={scoreInputMode}
                  value={inlineChildScoreOutOfTen}
                  onChange={(event) => setInlineChildScoreOutOfTen(event.target.value)}
                  disabled={isSavingInline || isPersisting}
              />
            </div>
            <div className="domainspage__actions">
              <button type="submit" disabled={isSavingInline || isPersisting}>
                {isSavingInline || isPersisting ? "Saving..." : "Add child"}
              </button>
              <button type="button" onClick={closeInlineChildForm} disabled={isSavingInline || isPersisting}>
                Cancel
              </button>
              {inlineFeedback ? <p className="domainspage__feedback">{inlineFeedback}</p> : null}
            </div>
          </form>
        ) : null}

        {hasChildren && isExpanded ? (
          <ul className="domainspage__tree">{domain.children.map((child) => renderDomainNode(child, depth + 1))}</ul>
        ) : null}
      </li>
    );
  }

  return (
    <div className="domainspage">
      <section className="domainspage__hero card">
        <p className="domainspage__eyebrow">Life structure</p>
        <h2>Map your domains</h2>
        <p className="domainspage__intro">
          Use domains to capture the larger areas of your life and work, then break them into
          branches and smaller components. Think in roots, branches, and sub-branches rather than
          flat lists.
        </p>
      </section>

      <section className="domainspage__section card">
        <form className="domainspage__form" onSubmit={handleAddDomain}>
          <div className="domainspage__grid">
            <div className="domainspage__field">
              <label htmlFor="domain-name">Domain</label>
              <p>Add a root area or a more specific branch.</p>
              <input
                id="domain-name"
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                disabled={isSaving || isPersisting}
                required
              />
            </div>

            <div className="domainspage__field">
              <label htmlFor="domain-parent">Parent</label>
              <p>Leave blank to create a root node.</p>
              <select
                id="domain-parent"
                value={parentId}
                onChange={(event) => setParentId(event.target.value)}
                disabled={isSaving || isPersisting}
              >
                <option value="">No parent</option>
                {domains.map((domain) => (
                  <option key={domain.id} value={domain.id}>
                    {domainPathMap.get(domain.id) ?? domain.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="domainspage__field">
            <label htmlFor="domain-notes">Notes</label>
            <p>Optional context about what this area includes or why it matters.</p>
            <textarea
              id="domain-notes"
              rows={3}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              disabled={isSaving || isPersisting}
            />
          </div>

          <div className="domainspage__field">
            <label htmlFor="domain-score">Score out of 10</label>
            <p>Optional. Use this if you want to rate how this domain is going right now.</p>
            <input
              id="domain-score"
              type="number"
              min="0"
              max="10"
              step={scoreStep}
              inputMode={scoreInputMode}
              value={scoreOutOfTen}
              onChange={(event) => setScoreOutOfTen(event.target.value)}
              disabled={isSaving || isPersisting}
            />
          </div>

          <div className="domainspage__actions">
            <button type="submit" disabled={isSaving || isPersisting}>
              {isSaving || isPersisting ? "Saving..." : "Add domain"}
            </button>
            {feedback ? <p className="domainspage__feedback">{feedback}</p> : null}
          </div>
        </form>
      </section>

      <section className="domainspage__summary">
        <article className="domainspage__summary-card card">
          <span>Total nodes</span>
          <strong>{domains.length}</strong>
        </article>
        <article className="domainspage__summary-card card">
          <span>Root domains</span>
          <strong>{rootCount}</strong>
        </article>
        <article className="domainspage__summary-card card">
          <span>Focused now</span>
          <strong>{focusedCount}</strong>
        </article>
      </section>

      <section className="domainspage__list">
        {tree.length === 0 ? (
          <article className="domainspage__empty card">
            <h3>No domains yet</h3>
            <p>
              Start with the big areas, like Martial Arts, Starcraft, or Business, then keep
              breaking them down.
            </p>
          </article>
        ) : (
          <ul className="domainspage__tree">{tree.map((domain) => renderDomainNode(domain))}</ul>
        )}
      </section>
    </div>
  );
}

function formatDomainScore(value, useDecimalDomainScores = false) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return "";
  }

  if (useDecimalDomainScores) {
    return Number.isInteger(numericValue) ? String(numericValue) : numericValue.toFixed(1);
  }

  return String(Math.round(numericValue));
}

function getDomainScoreColorClass(value) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return "";
  }

  if (numericValue >= 8) {
    return "domainspage__score-value--high";
  }

  if (numericValue >= 4) {
    return "domainspage__score-value--mid";
  }

  return "domainspage__score-value--low";
}
