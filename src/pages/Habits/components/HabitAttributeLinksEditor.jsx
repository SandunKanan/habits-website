import React from "react";

export default function HabitAttributeLinksEditor({
  attributes,
  links,
  disabled,
  onAddLink,
  onRemoveLink,
  onAttributeChange,
  onWeightChange
}) {
  return (
    <div className="habits__attribute-links">
      <div className="habits__attribute-links-head">
        <h4>Attributes</h4>
        <small>Connect this habit to the areas it helps build.</small>
      </div>

      {attributes.length === 0 ? (
        <p className="habits__attribute-links-empty">
          Create attributes first on the Attributes page before linking them here.
        </p>
      ) : (
        <>
          <div className="habits__attribute-link-list">
            {links.map((link, index) => (
              <div key={link.id} className="habits__attribute-link-row">
                <select
                  value={link.attributeId}
                  onChange={(e) => onAttributeChange(index, e.target.value)}
                  disabled={disabled}
                >
                  <option value="">Select attribute</option>
                  {attributes.map((attribute) => (
                    <option key={attribute.id} value={attribute.id}>
                      {attribute.name}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={link.weight}
                  onChange={(e) => onWeightChange(index, e.target.value)}
                  disabled={disabled}
                  placeholder="Weight"
                />
                <button type="button" onClick={() => onRemoveLink(index)} disabled={disabled}>
                  Remove
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            className="habits__attribute-link-add"
            onClick={onAddLink}
            disabled={disabled}
          >
            Add attribute link
          </button>
        </>
      )}
    </div>
  );
}
