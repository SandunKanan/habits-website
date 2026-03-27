import React, { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import "./Vision.scss";

export default function Vision() {
  const { vision, onSaveVision, isPersisting } = useOutletContext();
  const [idealSelf, setIdealSelf] = useState("");
  const [idealLife, setIdealLife] = useState("");
  const [currentSeason, setCurrentSeason] = useState("");
  const [seasonIntention, setSeasonIntention] = useState("");
  const [feedback, setFeedback] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setIdealSelf(vision?.idealSelf ?? "");
    setIdealLife(vision?.idealLife ?? "");
    setCurrentSeason(vision?.currentSeason ?? "");
    setSeasonIntention(vision?.seasonIntention ?? "");
  }, [vision]);

  async function handleSubmit(e) {
    e.preventDefault();
    setFeedback("");
    setIsSaving(true);

    const result = await onSaveVision({
      ...vision,
      idealSelf,
      idealLife,
      currentSeason,
      seasonIntention
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
              <label htmlFor="vision-current-season">Current season</label>
              <p>What season are you in right now?</p>
              <input
                id="vision-current-season"
                type="text"
                value={currentSeason}
                onChange={(e) => setCurrentSeason(e.target.value)}
                placeholder="Example: Rebuilding energy"
                disabled={isSaving || isPersisting}
              />
            </div>

            <div className="vision__field">
              <label htmlFor="vision-season-intention">What matters most right now</label>
              <p>What are you trying to prioritize in this season?</p>
              <textarea
                id="vision-season-intention"
                value={seasonIntention}
                onChange={(e) => setSeasonIntention(e.target.value)}
                rows={4}
                disabled={isSaving || isPersisting}
              />
            </div>
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
