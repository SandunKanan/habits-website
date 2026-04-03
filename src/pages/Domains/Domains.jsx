import React, { useMemo, useState } from "react";
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

function buildDepthLabel(depth) {
  if (depth === 0) return "Root";
  return `Level ${depth + 1}`;
}

export default function Domains() {
  const { domains, focus, onAddDomain, onUpdateDomain, onDeleteDomain, isPersisting } =
    useOutletContext();
  const [name, setName] = useState("");
  const [parentId, setParentId] = useState("");
  const [notes, setNotes] = useState("");
  const [feedback, setFeedback] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState("");
  const [editName, setEditName] = useState("");
  const [editParentId, setEditParentId] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editFeedback, setEditFeedback] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState("");
  const [expandedIds, setExpandedIds] = useState(() => new Set());

  const tree = useMemo(() => buildTree(domains), [domains]);
  const rootCount = domains.filter((domain) => !domain.parentId).length;
  const focusDomainIds = new Set(Array.isArray(focus?.focusDomainIds) ? focus.focusDomainIds : []);
  const focusedCount = domains.filter((domain) => focusDomainIds.has(domain.id)).length;

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

  async function handleAddDomain(event) {
    event.preventDefault();
    setFeedback("");
    setIsSaving(true);

    const result = await onAddDomain({ name, parentId, notes });
    if (result?.ok) {
      setName("");
      setParentId("");
      setNotes("");
      setFeedback("Domain added.");
      if (parentId) {
        setExpandedIds((current) => new Set([...current, parentId]));
      }
    } else {
      setFeedback(result?.error ?? "Could not add domain.");
    }

    setIsSaving(false);
  }

  function startEdit(domain) {
    setEditingId(domain.id);
    setEditName(domain.name);
    setEditParentId(domain.parentId ?? "");
    setEditNotes(domain.notes ?? "");
    setEditFeedback("");
  }

  function cancelEdit() {
    setEditingId("");
    setEditName("");
    setEditParentId("");
    setEditNotes("");
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
      notes: editNotes
    });

    if (result?.ok) {
      setEditingId("");
      setFeedback("Domain updated.");
      if (editParentId) {
        setExpandedIds((current) => new Set([...current, editParentId]));
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

  function renderDomainNode(domain, depth = 0) {
    const isEditing = editingId === domain.id;
    const hasChildren = domain.children.length > 0;
    const isExpanded = expandedIds.has(domain.id) || depth === 0;
    const unavailableParentIds = new Set([domain.id]);

    function collectChildrenIds(node) {
      for (const child of node.children) {
        unavailableParentIds.add(child.id);
        collectChildrenIds(child);
      }
    }

    collectChildrenIds(domain);

    return (
      <li key={domain.id} className="domainspage__node">
        <article className="domainspage__item card" style={{ "--domain-depth": depth }}>
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
                        {item.name}
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
                    <span className="domainspage__badge">{buildDepthLabel(depth)}</span>
                    {focusDomainIds.has(domain.id) ? (
                      <span className="domainspage__badge domainspage__badge--focus">Focus</span>
                    ) : null}
                    {hasChildren ? (
                      <button
                        type="button"
                        className="domainspage__toggle"
                        onClick={() => toggleExpanded(domain.id)}
                      >
                        {isExpanded ? "Collapse" : `Expand (${domain.children.length})`}
                      </button>
                    ) : null}
                  </div>
                  <h3>{domain.name}</h3>
                  {domain.notes ? <p className="domainspage__notes">{domain.notes}</p> : null}
                </div>
                <div className="domainspage__item-actions">
                  <button
                    type="button"
                    onClick={() => {
                      setParentId(domain.id);
                      setName("");
                      setNotes("");
                    }}
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
                    {domain.name}
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
