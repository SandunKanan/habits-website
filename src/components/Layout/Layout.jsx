import React from "react";
import { Outlet } from "react-router-dom";
import TopNav from "../TopNav/TopNav.jsx";
import "./Layout.scss";

export default function Layout({
  todayISO,
  habits,
  curatedTop5,
  lastDoneById,
  onAddHabit,
  onUpdateHabit,
  onDeleteHabit,
  onAddCompletionDate,
  onMarkDone,
  onUndoDoneToday,
  completionLog
}) {
  return (
    <div className="layout">
      <TopNav />

      <main className="container layout__main">
        <header className="layout__header card">
          <div>
            <div className="layout__title">Today</div>
            <div className="layout__subtitle">{todayISO}</div>
          </div>
          <div className="layout__meta">
            Curated list size: <b>{curatedTop5.length}</b>
          </div>
        </header>

        <section className="layout__section">
          <Outlet
            context={{
              todayISO,
              habits,
              curatedTop5,
              lastDoneById,
              onAddHabit,
              onUpdateHabit,
              onDeleteHabit,
              onAddCompletionDate,
              onMarkDone,
              onUndoDoneToday,
              completionLog
            }}
          />
        </section>
      </main>
    </div>
  );
}
