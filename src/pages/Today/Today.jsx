import React from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import HabitCard from "../../components/HabitCard/HabitCard.jsx";
import "./Today.scss";

export default function Today() {
  const navigate = useNavigate();
  const {
    todayISO,
    habits,
    curatedTop5,
    lastDoneById,
    onMarkDone,
    onAddCompletionDate,
    onUndoDoneToday
  } = useOutletContext();

  const todoItems = curatedTop5.filter((item) => lastDoneById[item.habit.id] !== todayISO);
  const completedToday = habits.filter((habit) => {
    const importance = Number(habit.importance);
    return importance > 0 && lastDoneById[habit.id] === todayISO;
  });

  if (habits.length === 0) {
    return (
      <section className="today__welcome card">
        <p className="today__eyebrow">New account</p>
        <h2>Start with your first habit.</h2>
        <p className="today__welcome-copy">
          Your daily list will appear here once you add habits. Set a frequency and priority level,
          then this page will decide what is due today.
        </p>
        <div className="today__welcome-actions">
          <button type="button" onClick={() => navigate("/habits")}>
            Create first habit
          </button>
        </div>
      </section>
    );
  }

  return (
    <div className="today">
      <section className="today__section card">
        <h2>To Do</h2>
        {todoItems.length === 0 ? (
          <p className="today__empty">No tasks left for today.</p>
        ) : (
          <div className="today__grid">
            {todoItems.map((item) => (
              <HabitCard
                key={item.habit.id}
                item={item}
                lastDoneISO={lastDoneById[item.habit.id]}
                todayISO={todayISO}
                onMarkDone={onMarkDone}
                onAddCompletionDate={onAddCompletionDate}
              />
            ))}
          </div>
        )}
      </section>

      <section className="today__section card">
        <h2>Completed</h2>
        {completedToday.length === 0 ? (
          <p className="today__empty">No tasks completed yet today.</p>
        ) : (
          <ul className="today__completed-list">
            {completedToday.map((habit) => (
              <li key={habit.id} className="today__completed-item">
                <div>
                  <span>{habit.name}</span>
                  <small>Done on {todayISO}</small>
                </div>
                <button
                  className="today__undo-btn"
                  type="button"
                  onClick={() => onUndoDoneToday(habit.id)}
                >
                  Undo
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
