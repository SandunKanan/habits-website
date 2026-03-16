import React from "react";
import { Outlet, useLocation } from "react-router-dom";
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
  completionLog,
  authUser,
  onSignOut
}) {
  const location = useLocation();
  const pageMetaByPath = {
    "/today": {
      title: "Today",
      subtitle: todayISO,
      meta: (
        <>
          Curated list size: <b>{curatedTop5.length}</b>
        </>
      )
    },
    "/habits": {
      title: "Habits",
      subtitle: "Build your recurring system",
      meta: (
        <>
          Total habits: <b>{habits.length}</b>
        </>
      )
    },
    "/history": {
      title: "History",
      subtitle: "Recent completion records",
      meta: (
        <>
          Logged completions: <b>{completionLog.length}</b>
        </>
      )
    },
    "/help": {
      title: "Help",
      subtitle: "How the app works",
      meta: (
        <>
          Core tools: <b>4</b>
        </>
      )
    }
  };
  const pageMeta = pageMetaByPath[location.pathname] ?? pageMetaByPath["/today"];

  return (
    <div className="layout">
      <TopNav authUser={authUser} onSignOut={onSignOut} />

      <main className="container layout__main">
        <header className="layout__header card">
          <div>
            <div className="layout__title">{pageMeta.title}</div>
            <div className="layout__subtitle">{pageMeta.subtitle}</div>
          </div>
          <div className="layout__meta">{pageMeta.meta}</div>
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
