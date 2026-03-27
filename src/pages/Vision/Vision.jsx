import React, { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import "./Vision.scss";

export default function Vision() {
  const { vision, attributes, onSaveVision, isPersisting } = useOutletContext();
  const [idealSelf, setIdealSelf] = useState("");
  const [idealLife, setIdealLife] = useState("");
  const [currentFocus, setCurrentFocus] = useState("");
  const [focusIntention, setFocusIntention] = useState("");
  const [focusAttributeIds, setFocusAttributeIds] = useState([]);
  const [feedback, setFeedback] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setIdealSelf(vision?.idealSelf ?? "");
    setIdealLife(vision?.idealLife ?? "");
    setCurrentFocus(vision?.currentFocus ?? "");
    setFocusIntention(vision?.focusIntention ?? "");
    setFocusAttributeIds(Array.isArray(vision?.focusAttributeIds) ? vision.focusAttributeIds : []);
  }, [vision]);

  function toggleFocusAttribute(attributeId) {
    setFocusAttributeIds((current) =>
      current.includes(attributeId)
        ? current.filter((id) => id !== attributeId)
        : [...current, attributeId]
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFeedback("");
    setIsSaving(true);

    const result = await onSaveVision({
      ...vision,
      idealSelf,
      idealLife,
      currentFocus,
      focusIntention,
      focusAttributeIds
    });

    if (result?.ok) {
      setFeedback("Vision saved.");
    } else {
      setFeedback(result?.error ?? "Could not save vision.");
    }

    setIsSaving(false);
  }

  return (
    <div className="vision">
      <section className="vision__hero card">
        <p className="vision__eyebrow">Direction</p>
        <h2>Define where this is all pointing</h2>
        <p className="vision__intro">
          This page is the top layer of the system. Habits shape attributes, and attributes help
          build the kind of person and life you want. For now, use this page to describe that
          direction in your own words.
        </p>
      </section>

      <section className="vision__section card">
        <form className="vision__form" onSubmit={handleSubmit}>
          <div className="vision__field">
            <label htmlFor="vision-ideal-self">Ideal self</label>
            <p>Who are you trying to become?</p>
            <textarea
              id="vision-ideal-self"
              value={idealSelf}
              onChange={(e) => setIdealSelf(e.target.value)}
              rows={6}
              disabled={isSaving || isPersisting}
            />
          </div>

          <div className="vision__field">
            <label htmlFor="vision-ideal-life">Ideal life</label>
            <p>What does a good life look and feel like for you?</p>
            <textarea
              id="vision-ideal-life"
              value={idealLife}
              onChange={(e) => setIdealLife(e.target.value)}
              rows={6}
              disabled={isSaving || isPersisting}
            />
          </div>

          <div className="vision__split">
            <div className="vision__field">
              <label htmlFor="vision-current-focus">Current focus</label>
              <p>What are you most focused on right now?</p>
              <input
                id="vision-current-focus"
                type="text"
                value={currentFocus}
                onChange={(e) => setCurrentFocus(e.target.value)}
                placeholder="Example: Rebuilding energy"
                disabled={isSaving || isPersisting}
              />
            </div>

            <div className="vision__field">
              <label htmlFor="vision-focus-intention">What matters most right now</label>
              <p>What are you trying to prioritize at the moment?</p>
              <textarea
                id="vision-focus-intention"
                value={focusIntention}
                onChange={(e) => setFocusIntention(e.target.value)}
                rows={4}
                disabled={isSaving || isPersisting}
              />
            </div>
          </div>

          <div className="vision__field">
            <label>Focus attributes</label>
            <p>Choose the attributes you want this period of life to emphasize.</p>
            {attributes.length === 0 ? (
              <div className="vision__empty-note">
                Create attributes first on the Attributes page before selecting focus attributes here.
              </div>
            ) : (
              <div className="vision__attribute-picks">
                {attributes.map((attribute) => {
                  const isSelected = focusAttributeIds.includes(attribute.id);

                  return (
                    <button
                      key={attribute.id}
                      type="button"
                      className={[
                        "vision__attribute-pick",
                        isSelected ? "vision__attribute-pick--selected" : ""
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      onClick={() => toggleFocusAttribute(attribute.id)}
                      disabled={isSaving || isPersisting}
                      aria-pressed={isSelected}
                    >
                      {attribute.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="vision__actions">
            <button type="submit" disabled={isSaving || isPersisting}>
              {isSaving || isPersisting ? "Saving..." : "Save vision"}
            </button>
            {feedback ? <p className="vision__feedback">{feedback}</p> : null}
          </div>
        </form>
      </section>
    </div>
  );
}
