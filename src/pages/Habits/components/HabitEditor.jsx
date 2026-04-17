import React from "react";
import { IMPORTANCE_LEVELS } from "../../../lib/importance.js";
import { HABIT_DISPLAY_MODES } from "../../../lib/habitDisplayMode.js";
import HabitFrequencyControls from "./HabitFrequencyControls.jsx";
import HabitAttributeLinksEditor from "./HabitAttributeLinksEditor.jsx";

export default function HabitEditor({
  title,
  name,
  onNameChange,
  habitDisplayMode,
  onHabitDisplayModeChange,
  frequencyMode,
  frequencyValue,
  frequencyUnit,
  onFrequencyModeChange,
  onFrequencyValueChange,
  onFrequencyUnitChange,
  importance,
  onImportanceChange,
  createdAt,
  onCreatedAtChange,
  attributes,
  attributeLinks,
  domains,
  domainIds,
  domainDraft,
  onDomainDraftChange,
  onAddDomain,
  onRemoveDomain,
  onAddAttributeLink,
  onRemoveAttributeLink,
  onAttributeLinkAttributeChange,
  onAttributeLinkWeightChange,
  todayISO,
  onSubmit,
  onCancel,
  isSaving,
  feedback
}) {
  return (
    <form className="habits__edit-form" onSubmit={onSubmit}>
      {title ? <h3>{title}</h3> : null}
      <label>
        Name
        <input type="text" value={name} onChange={onNameChange} disabled={isSaving} required />
      </label>
      <label>
        Today section
        <select value={habitDisplayMode} onChange={onHabitDisplayModeChange} disabled={isSaving} required>
          {HABIT_DISPLAY_MODES.map((mode) => (
            <option key={mode.value} value={mode.value}>
              {mode.label}
            </option>
          ))}
        </select>
      </label>
      {habitDisplayMode === "daily" ? (
        <label>
          Frequency
          <input type="text" value="Every 1 day" disabled />
        </label>
      ) : (
        <label>
          Frequency
          <HabitFrequencyControls
            mode={frequencyMode}
            value={frequencyValue}
            unit={frequencyUnit}
            disabled={isSaving}
            onModeChange={onFrequencyModeChange}
            onValueChange={onFrequencyValueChange}
            onUnitChange={onFrequencyUnitChange}
          />
        </label>
      )}
      {onCreatedAtChange ? (
        <label>
          Created at
          <input
            type="date"
            value={createdAt}
            onChange={onCreatedAtChange}
            max={todayISO}
            disabled={isSaving}
            required
          />
        </label>
      ) : null}
      <label>
        Priority
        <select value={importance} onChange={onImportanceChange} disabled={isSaving} required>
          {IMPORTANCE_LEVELS.map((level) => (
            <option key={level.key} value={level.value}>
              {level.label}
            </option>
          ))}
        </select>
      </label>
      <HabitAttributeLinksEditor
        attributes={attributes}
        links={attributeLinks}
        disabled={isSaving}
        onAddLink={onAddAttributeLink}
        onRemoveLink={onRemoveAttributeLink}
        onAttributeChange={onAttributeLinkAttributeChange}
        onWeightChange={onAttributeLinkWeightChange}
      />
      <div className="habits__domain-links">
        <div className="habits__domain-links-head">
          <h4>Domains</h4>
          <small>Connect this habit to the larger areas or branches it supports.</small>
        </div>
        {Array.isArray(domains) && domains.length > 0 ? (
          <>
            <div className="habits__domain-link-add-row">
              <select value={domainDraft} onChange={onDomainDraftChange} disabled={isSaving}>
                <option value="">Select domain</option>
                {domains
                  .filter((domain) => !domainIds.includes(domain.id))
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((domain) => (
                    <option key={domain.id} value={domain.id}>
                      {domain.name}
                    </option>
                  ))}
              </select>
              <button type="button" onClick={onAddDomain} disabled={isSaving || !domainDraft}>
                Add domain
              </button>
            </div>
            {domainIds.length > 0 ? (
              <div className="habits__domain-link-list">
                {domainIds.map((domainId) => {
                  const domain = domains.find((item) => item.id === domainId);
                  return (
                    <div key={domainId} className="habits__domain-link-pill">
                      <span>{domain ? domain.name : "Unknown domain"}</span>
                      <button type="button" onClick={() => onRemoveDomain(domainId)} disabled={isSaving}>
                        Remove
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : null}
          </>
        ) : (
          <p className="habits__attribute-links-empty">
            Create domains first on the Domains page before linking them here.
          </p>
        )}
      </div>
      <div className="habits__item-actions">
        <button type="submit" disabled={isSaving}>
          {isSaving ? "Saving..." : "Save"}
        </button>
        <button type="button" onClick={onCancel} disabled={isSaving}>
          Cancel
        </button>
      </div>
      {feedback ? <p className="habits__feedback">{feedback}</p> : null}
    </form>
  );
}
