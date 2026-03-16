import React, { useState } from "react";
import "./Help.scss";

const workflowSteps = [
  {
    title: "Add habits",
    description:
      "Create habits on the Habits page with a name, frequency, and importance level. Importance 0 keeps a habit stored without placing it into the daily schedule."
  },
  {
    title: "Review Today",
    description:
      "The Today page shows only habits that are currently due. Higher-importance habits rise in priority when they are overdue."
  },
  {
    title: "Log completions",
    description:
      "Mark a habit done for today, or add a past completion date if you are catching up on previous days. Completed items move into the Completed area."
  },
  {
    title: "Track history",
    description:
      "Use the Habits and History pages to review last completion dates, total completion counts, and recent logged activity."
  }
];

const toolCards = [
  {
    title: "Today planner",
    points: [
      "Splits the day into To Do and Completed sections",
      "Shows only due habits, not the full library",
      "Supports undo if you mark something done by mistake"
    ]
  },
  {
    title: "Habit manager",
    points: [
      "Create, edit, and delete habits",
      "View last completed date and total completion count",
      "Expand any habit to see the full list of completion dates"
    ]
  },
  {
    title: "Past completion logging",
    points: [
      "Add previous completion dates from the Today cards",
      "Useful when you forgot to log a habit on the correct day",
      "Prevents duplicate dates and blocks future dates"
    ]
  },
  {
    title: "History log",
    points: [
      "Shows recent completion records across your account",
      "Lets you confirm that actions are being stored correctly",
      "Works alongside per-habit completion detail on the Habits page"
    ]
  }
];

const priorityExamples = [
  "Importance 4 is treated as higher priority than importance 1 when habits are equally overdue.",
  "A habit with importance 0 stays in your account but is excluded from the daily schedule.",
  "A 7-day or 14-day habit does not show up again the day after you complete it."
];

export default function Help() {
  const [isToolsOpen, setIsToolsOpen] = useState(false);

  return (
    <div className="help">
      <section className="help__hero card">
        <p className="help__eyebrow">Guide</p>
        <h2>What this app does</h2>
        <p className="help__intro">
          Habit Ledger is a recurring-task planner. It keeps a library of habits, calculates which
          ones are due, and helps you log completion dates over time instead of treating everything
          like a one-time checklist.
        </p>
      </section>

      <section className="help__section help__section--split">
        <article className="help__panel card">
          <h3>How to use it</h3>
          <ol className="help__steps">
            {workflowSteps.map((step) => (
              <li key={step.title}>
                <strong>{step.title}</strong>
                <p>{step.description}</p>
              </li>
            ))}
          </ol>
        </article>

        <article className="help__panel card">
          <h3>Priority rules</h3>
          <ul className="help__list">
            {priorityExamples.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>
      </section>

      <section className="help__section">
        <div className="help__section-head">
          <div className="help__section-head-row">
            <h3>Available tools</h3>
            <button
              type="button"
              className="help__toggle"
              aria-expanded={isToolsOpen}
              onClick={() => setIsToolsOpen((current) => !current)}
            >
              <span>{isToolsOpen ? "Hide tools" : "Show tools"}</span>
              <svg
                className={`help__toggle-caret ${isToolsOpen ? "help__toggle-caret--up" : ""}`}
                viewBox="0 0 12 12"
                aria-hidden="true"
                focusable="false"
              >
                <path
                  d="M2.25 4.25 6 8l3.75-3.75"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
          <p>The app is built around a few focused workflows instead of a crowded dashboard.</p>
        </div>

        {isToolsOpen ? (
          <div className="help__grid">
            {toolCards.map((card) => (
              <article key={card.title} className="help__tool card">
                <h4>{card.title}</h4>
                <ul className="help__list">
                  {card.points.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        ) : null}
      </section>

    </div>
  );
}
