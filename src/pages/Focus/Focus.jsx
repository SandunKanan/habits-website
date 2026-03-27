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
        <h2>Define your current focus</h2>
        <p className="focuspage__intro">
          This page is about the stretch of life you are in right now. Use it to define what this
          focus period is, why it matters, what you want to be true by the end, and what is likely
          to get in the way.
        </p>
      </section>

      <section className="focuspage__section card">
        <form className="focuspage__form" onSubmit={handleSubmit}>
          <div className="focuspage__field">
            <label htmlFor="focus-title">Focus title</label>
            <p>Give this period a short name.</p>
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
            <label htmlFor="focus-why-now">Why this matters now</label>
            <p>Why is this the right thing to focus on at the moment?</p>
            <textarea
              id="focus-why-now"
              value={whyNow}
              onChange={(e) => setWhyNow(e.target.value)}
              rows={5}
              disabled={isSaving || isPersisting}
            />
          </div>

          <div className="focuspage__field">
            <label htmlFor="focus-end-state">How you want to be by the end</label>
            <p>Describe the version of yourself you want to reach by the end of this focus period.</p>
            <textarea
              id="focus-end-state"
              value={endState}
              onChange={(e) => setEndState(e.target.value)}
              rows={5}
              disabled={isSaving || isPersisting}
            />
          </div>

          <div className="focuspage__field">
            <label htmlFor="focus-obstacles">Current obstacles</label>
            <p>What is most likely to get in the way right now?</p>
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
