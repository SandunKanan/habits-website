import React from "react";
import "./Help.scss";

const workflowSteps = [
  {
    title: "Set up habits honestly",
    body:
      "Choose frequencies you actually want to maintain. Use intervals for gap-based habits, and rates for things you want to do a certain number of times each week or month."
  },
  {
    title: "Work from Today",
    body:
      "Use the Today page as your live working list. Mark habits done there, skip only when you mean just for today, and use past completions if you are catching up."
  },
  {
    title: "Adjust until it feels useful",
    body:
      "If habits feel too noisy or too quiet, change the frequency, created date, or priority. The app works best when the list matches real life."
  }
];

const quickChecks = [
  "Score looks wrong: check the created date first.",
  "Too many habits showing up: lower some priorities or reduce some frequencies.",
  "A broad habit feels vague: use subtasks to track the parts you actually rotate through.",
  "Attributes are most useful as directional feedback, not exact measurements."
];

export default function Help() {
  return (
    <div className="help">
      <section className="help__section">
        <article className="help__panel card">
          <h3>The basic workflow</h3>
          <ol className="help__steps">
            {workflowSteps.map((step) => (
              <li key={step.title}>
                <strong>{step.title}</strong>
                <p>{step.body}</p>
              </li>
            ))}
          </ol>
        </article>

        <article className="help__panel card">
          <h3>Quick checks</h3>
          <ul className="help__list">
            {quickChecks.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>
      </section>
    </div>
  );
}
