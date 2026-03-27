import React from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import TopNav from "../TopNav/TopNav.jsx";
import "./Layout.scss";

export default function Layout({
  todayISO,
  habits,
  curatedTop5,
  lastDoneById,
  attributes,
  vision,
  onAddHabit,
  onUpdateHabit,
  onDeleteHabit,
  onAddAttribute,
  onUpdateAttribute,
  onDeleteAttribute,
  onSaveVision,
  onAddSubtask,
  onMarkSubtaskDoneToday,
  onUndoSubtaskDoneToday,
  onAddCompletionDate,
  onMarkDone,
  onUndoDoneToday,
  onSkipToday,
  onUndoSkipToday,
  completionLog,
  skippedTodayIds,
  isPersisting,
  authUser,
  isAdmin,
  session,
  onSignOut
}) {
  const location = useLocation();
  const activeTodayCount = curatedTop5.filter((item) => !skippedTodayIds.has(item.habit.id)).length;
  const pageMetaByPath = {
    "/today": {
      title: "Today",
      subtitle: todayISO,
      meta: (
        <>
          Curated list size: <b>{activeTodayCount}</b>
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
    "/attributes": {
      title: "Attributes",
      subtitle: "Areas your habits will strengthen",
      meta: (
        <>
          Total attributes: <b>{attributes.length}</b>
        </>
      )
    },
    "/vision": {
      title: "Vision",
      subtitle: "The life this system is meant to support",
      meta: (
        <>
          Current season: <b>{vision?.currentSeason || "Not set"}</b>
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
    },
    "/admin": {
      title: "Admin",
      subtitle: "Users and habits overview",
      meta: null
    }
  };
  const pageMeta = pageMetaByPath[location.pathname] ?? pageMetaByPath["/today"];
  const metaContent = pageMeta.meta ? <div className="layout__meta">{pageMeta.meta}</div> : null;

  return (
    <div className="layout">
      <TopNav authUser={authUser} onSignOut={onSignOut} />

      <main className="container layout__main">
        <header className="layout__header card">
          <div>
            <div className="layout__title">{pageMeta.title}</div>
            <div className="layout__subtitle">{pageMeta.subtitle}</div>
          </div>
          <div className="layout__meta-group">
            {isPersisting ? <div className="layout__saving">Saving...</div> : null}
            {metaContent}
          </div>
        </header>

        <section className="layout__section">
          <Outlet
            context={{
              todayISO,
              habits,
              curatedTop5,
              lastDoneById,
              attributes,
              vision,
              onAddHabit,
              onUpdateHabit,
              onDeleteHabit,
              onAddAttribute,
              onUpdateAttribute,
              onDeleteAttribute,
              onSaveVision,
              onAddSubtask,
              onMarkSubtaskDoneToday,
              onUndoSubtaskDoneToday,
              onAddCompletionDate,
              onMarkDone,
              onUndoDoneToday,
              onSkipToday,
              onUndoSkipToday,
              completionLog,
              skippedTodayIds,
              isPersisting,
              authUser,
              isAdmin,
              session
            }}
          />
        </section>
      </main>

      {isAdmin ? (
        <Link className="layout__admin-link" to="/admin">
          Admin
        </Link>
      ) : null}
    </div>
  );
}
