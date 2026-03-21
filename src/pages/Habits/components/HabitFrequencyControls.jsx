import React from "react";
import { FREQUENCY_MODES, getFrequencyUnitsForMode } from "../../../lib/frequency.js";

export default function HabitFrequencyControls({
  mode,
  value,
  unit,
  disabled,
  onModeChange,
  onValueChange,
  onUnitChange
}) {
  const numericValue = Math.max(1, Number(value) || 1);

  if (mode === "rate") {
    return (
      <div className="habits__frequency-row">
        <input
          type="number"
          min="1"
          step="1"
          value={value}
          onChange={onValueChange}
          title="Frequency value"
          disabled={disabled}
          required
        />
        <select value={mode} onChange={onModeChange} title="Frequency type" disabled={disabled}>
          {FREQUENCY_MODES.map((frequencyMode) => (
            <option key={frequencyMode.value} value={frequencyMode.value}>
              {frequencyMode.label}
            </option>
          ))}
        </select>
        <select value={unit} onChange={onUnitChange} title="Frequency unit" disabled={disabled}>
          {getFrequencyUnitsForMode(mode).map((frequencyUnit) => (
            <option key={frequencyUnit.value} value={frequencyUnit.value}>
              {frequencyUnit.label}
            </option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <div className="habits__frequency-row">
      <select value={mode} onChange={onModeChange} title="Frequency type" disabled={disabled}>
        {FREQUENCY_MODES.map((frequencyMode) => (
          <option key={frequencyMode.value} value={frequencyMode.value}>
            {frequencyMode.label}
          </option>
        ))}
      </select>
      <input
        type="number"
        min="1"
        step="1"
        value={value}
        onChange={onValueChange}
        title="Frequency value"
        disabled={disabled}
        required
      />
      <select value={unit} onChange={onUnitChange} title="Frequency unit" disabled={disabled}>
        {getFrequencyUnitsForMode(mode).map((frequencyUnit) => (
          <option key={frequencyUnit.value} value={frequencyUnit.value}>
            {numericValue === 1 ? frequencyUnit.label : `${frequencyUnit.label}s`}
          </option>
        ))}
      </select>
    </div>
  );
}
