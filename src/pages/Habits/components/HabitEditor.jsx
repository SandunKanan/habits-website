import React from "react";
import { IMPORTANCE_LEVELS } from "../../../lib/importance.js";
import HabitFrequencyControls from "./HabitFrequencyControls.jsx";
import HabitAttributeLinksEditor from "./HabitAttributeLinksEditor.jsx";

export default function HabitEditor({
  title,
  name,
  onNameChange,
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
