import React, { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import "./Settings.scss";

export default function Settings() {
  const { settings, onSaveSettings, isPersisting } = useOutletContext();
  const [highlightFocusAttributes, setHighlightFocusAttributes] = useState(true);
  const [useAttributeDecay, setUseAttributeDecay] = useState(true);
  const [feedback, setFeedback] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setHighlightFocusAttributes(Boolean(settings?.highlightFocusAttributes ?? true));
    setUseAttributeDecay(Boolean(settings?.useAttributeDecay ?? true));
  }, [settings]);

  async function handleSubmit(e) {
    e.preventDefault();
    setFeedback("");
    setIsSaving(true);

    const result = await onSaveSettings({
      ...settings,
      highlightFocusAttributes,
      useAttributeDecay
    });

    if (result?.ok) {
      setFeedback("Settings saved.");
    } else {
      setFeedback(result?.error ?? "Could not save settings.");
    }

    setIsSaving(false);
  }

  return (
    <div className="settingspage">
      <section className="settingspage__hero card">
        <p className="settingspage__eyebrow">Preferences</p>
        <h2>Settings</h2>
        <p className="settingspage__intro">
          Control how focus and attributes are displayed in the app. These settings change behavior
          and presentation without changing your underlying data.
        </p>
      </section>

      <section className="settingspage__section card">
        <form className="settingspage__form" onSubmit={handleSubmit}>
          <label className="settingspage__toggle">
            <div>
              <strong>Highlight focus attributes</strong>
              <p>Show current focus styling on the Attributes and Today pages.</p>
            </div>
            <span className="settingspage__switch">
              <input
                type="checkbox"
                checked={highlightFocusAttributes}
                onChange={(e) => setHighlightFocusAttributes(e.target.checked)}
                disabled={isSaving || isPersisting}
              />
              <span className="settingspage__switch-track" aria-hidden="true" />
            </span>
          </label>

          <label className="settingspage__toggle">
            <div>
              <strong>Use attribute decay</strong>
              <p>Apply decay when calculating attribute scores.</p>
            </div>
            <span className="settingspage__switch">
              <input
                type="checkbox"
                checked={useAttributeDecay}
                onChange={(e) => setUseAttributeDecay(e.target.checked)}
                disabled={isSaving || isPersisting}
              />
              <span className="settingspage__switch-track" aria-hidden="true" />
            </span>
          </label>

          <div className="settingspage__actions">
            <button type="submit" disabled={isSaving || isPersisting}>
              {isSaving || isPersisting ? "Saving..." : "Save settings"}
            </button>
            {feedback ? <p className="settingspage__feedback">{feedback}</p> : null}
          </div>
        </form>
      </section>
    </div>
  );
}
