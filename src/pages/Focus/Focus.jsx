import React, { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import "./Focus.scss";

export default function Focus() {
  const { focus, onSaveFocus, isPersisting } = useOutletContext();
  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [whyNow, setWhyNow] = useState("");
  const [endState, setEndState] = useState("");
  const [currentObstacles, setCurrentObstacles] = useState("");
  const [feedback, setFeedback] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setTitle(focus?.title ?? "");
    setStartDate(focus?.startDate ?? "");
    setEndDate(focus?.endDate ?? "");
    setWhyNow(focus?.whyNow ?? "");
    setEndState(focus?.endState ?? "");
    setCurrentObstacles(focus?.currentObstacles ?? "");
  }, [focus]);

  async function handleSubmit(e) {
    e.preventDefault();
    setFeedback("");
    setIsSaving(true);

    const result = await onSaveFocus({
      ...focus,
      title,
      startDate,
      endDate,
      whyNow,
      endState,
      currentObstacles
    });

    if (result?.ok) {
      setFeedback("Focus saved.");
    } else {
      setFeedback(result?.error ?? "Could not save focus.");
    }

    setIsSaving(false);
  }

  return (
    <div className="focuspage">
      <section className="focuspage__hero card">
        <p className="focuspage__eyebrow">Current period</p>
        <h2>Current Focus</h2>
        <p className="focuspage__intro">
          This page is for the block you are in right now. Keep it simple: define what this block
          is about, who you want to be by the end of it, and what is most likely to get in the way.
        </p>
      </section>

      <section className="focuspage__section card">
        <form className="focuspage__form" onSubmit={handleSubmit}>
          <div className="focuspage__field">
            <label htmlFor="focus-title">Focus title</label>
            <p>Give this block a short name.</p>
            <input
              id="focus-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Example: Rebuild energy"
              disabled={isSaving || isPersisting}
            />
          </div>

          <div className="focuspage__split">
            <div className="focuspage__field">
              <label htmlFor="focus-start-date">Start date</label>
              <input
                id="focus-start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                disabled={isSaving || isPersisting}
              />
            </div>

            <div className="focuspage__field">
              <label htmlFor="focus-end-date">End date</label>
              <input
                id="focus-end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                disabled={isSaving || isPersisting}
              />
            </div>
          </div>

          <div className="focuspage__field">
            <label htmlFor="focus-why-now">What is your main focus for this block?</label>
            <p>What is this block really about?</p>
            <textarea
              id="focus-why-now"
              value={whyNow}
              onChange={(e) => setWhyNow(e.target.value)}
              rows={5}
              disabled={isSaving || isPersisting}
            />
          </div>

          <div className="focuspage__field">
            <label htmlFor="focus-end-state">Who do you want to be by the end of this block?</label>
            <p>Describe how you want to see yourself after this.</p>
            <textarea
              id="focus-end-state"
              value={endState}
              onChange={(e) => setEndState(e.target.value)}
              rows={5}
              disabled={isSaving || isPersisting}
            />
          </div>

          <div className="focuspage__field">
            <label htmlFor="focus-obstacles">What is getting in the way, or likely to get in the way?</label>
            <p>Name the obstacles clearly so this block stays realistic.</p>
            <textarea
              id="focus-obstacles"
              value={currentObstacles}
              onChange={(e) => setCurrentObstacles(e.target.value)}
              rows={5}
              disabled={isSaving || isPersisting}
            />
          </div>

          <div className="focuspage__actions">
            <button type="submit" disabled={isSaving || isPersisting}>
              {isSaving || isPersisting ? "Saving..." : "Save focus"}
            </button>
            {feedback ? <p className="focuspage__feedback">{feedback}</p> : null}
          </div>
        </form>
      </section>
    </div>
  );
}
