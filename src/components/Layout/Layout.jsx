import React from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import TopNav from "../TopNav/TopNav.jsx";
import "./Layout.scss";

export default function Layout({
  todayISO,
  habits,
  curatedTop5,
  lastDoneById,
  lastProgressById,
  attributes,
  vision,
  focus,
  focusBlocks,
  domains,
  goals,
  learnings,
  oneOffTasks,
  trackingMetrics,
  trackingEntries,
  notes,
  lists,
  timelineBlocks,
  journalEntries,
  settings,
  todayUiState,
  onAddHabit,
  onUpdateHabit,
  onDeleteHabit,
  onAddAttribute,
  onUpdateAttribute,
  onDeleteAttribute,
  onSaveVision,
  onSaveFocus,
  onDeleteFocus,
  onAddDomain,
  onUpdateDomain,
  onDeleteDomain,
  onAddGoal,
  onUpdateGoal,
  onDeleteGoal,
  onAddLearningItem,
  onUpdateLearningItem,
  onDeleteLearningItem,
  onAddOneOffTask,
  onCompleteOneOffTask,
  onReopenOneOffTask,
  onDeleteOneOffTask,
  onAddTrackingMetric,
  onUpdateTrackingMetric,
  onDeleteTrackingMetric,
  onSaveTrackingEntry,
  onDeleteTrackingEntry,
  onAddTrackingStructuredEntry,
  onDeleteTrackingStructuredEntry,
  onAddNote,
  onUpdateNote,
  onArchiveNote,
  onUnarchiveNote,
  onDeleteNote,
  onAddList,
  onUpdateList,
  onDeleteList,
  onAddListItem,
  onToggleListItem,
  onDeleteListItem,
  onAddTimelineBlock,
  onUpdateTimelineBlock,
  onDeleteTimelineBlock,
  onAddJournalEntry,
  onUpdateJournalEntry,
  onDeleteJournalEntry,
  onSaveSettings,
  onSetTodayMantraChecked,
  onAddSubtask,
  onMarkSubtaskDoneToday,
  onUndoSubtaskDoneToday,
  onAddCompletionDate,
  onMarkDone,
  onUndoDoneToday,
  onSkipToday,
  onSkipCycle,
  onUndoSkipToday,
  onUndoSkipCycleToday,
  completionLog,
  skippedTodayIds,
  cycleSkippedTodayIds,
  isPersisting,
  authUser,
  isAdmin,
  session,
  onSignOut
}) {
  const location = useLocation();
  const activeTodayCount = curatedTop5.filter((item) => !skippedTodayIds.has(item.habit.id)).length;
  const completedOneOffTaskCount = oneOffTasks.filter((task) => Boolean(task.completedOn)).length;
  const upcomingOneOffTaskCount = oneOffTasks.filter((task) => task.scheduledFor && !task.completedOn).length;
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
    "/calendar": {
      title: "Calendar",
      subtitle: "Projected habits and scheduled one-off tasks",
      meta: (
        <>
          Upcoming one-off tasks: <b>{upcomingOneOffTaskCount}</b>
        </>
      )
    },
    "/history": {
      title: "History",
      subtitle: "Recent completion records",
          meta: (
        <>
          Logged entries: <b>{completionLog.length + completedOneOffTaskCount + trackingEntries.length}</b>
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
          Focus attributes: <b>{Array.isArray(vision?.focusAttributeIds) ? vision.focusAttributeIds.length : 0}</b>
        </>
      )
    },
    "/focus": {
      title: "Focus",
      subtitle: "The current period you are shaping",
      meta: (
        <>
          Active focus: <b>{focus?.title || "Not set"}</b>
        </>
      )
    },
    "/domains": {
      title: "Domains",
      subtitle: "The larger areas and branches that shape your life",
      meta: (
        <>
          Total nodes: <b>{domains.length}</b>
        </>
      )
    },
    "/goals": {
      title: "Goals",
      subtitle: "The outcomes your system is moving toward",
      meta: (
        <>
          Total goals: <b>{goals.length}</b>
        </>
      )
    },
    "/learnings": {
      title: "Pursuits",
      subtitle: "Courses, projects, and things you want to work on",
      meta: (
        <>
          Active items: <b>{learnings.filter((item) => item.status === "active").length}</b>
        </>
      )
    },
    "/tracking": {
      title: "Tracking",
      subtitle: "Metrics you want to measure day to day",
      meta: (
        <>
          Total metrics: <b>{trackingMetrics.length}</b>
        </>
      )
    },
    "/notes": {
      title: "Notes",
      subtitle: "Timestamped thoughts, observations, and writing",
      meta: (
        <>
          Total notes: <b>{notes.length}</b>
        </>
      )
    },
    "/lists": {
      title: "Lists",
      subtitle: "Persistent lists you can keep reusing",
      meta: (
        <>
          Total lists: <b>{lists.length}</b>
        </>
      )
    },
    "/timeline": {
      title: "Timeline",
      subtitle: "Map how you currently imagine the rest of life unfolding",
      meta: (
        <>
          Planned blocks: <b>{timelineBlocks.length}</b>
        </>
      )
    },
    "/journal": {
      title: "Journal",
      subtitle: "Longer reflections and timestamped entries",
      meta: (
        <>
          Total entries: <b>{journalEntries.length}</b>
        </>
      )
    },
    "/settings": {
      title: "Settings",
      subtitle: "Display and behavior preferences",
      meta: (
        <>
          Focus highlight: <b>{settings?.highlightFocusAttributes ? "On" : "Off"}</b>
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
              lastProgressById,
              attributes,
              vision,
              focus,
              focusBlocks,
              domains,
              goals,
              learnings,
              oneOffTasks,
              trackingMetrics,
              trackingEntries,
              notes,
              lists,
              timelineBlocks,
              journalEntries,
              settings,
              todayUiState,
              onAddHabit,
              onUpdateHabit,
              onDeleteHabit,
              onAddAttribute,
              onUpdateAttribute,
              onDeleteAttribute,
              onSaveVision,
              onSaveFocus,
              onDeleteFocus,
              onAddDomain,
              onUpdateDomain,
              onDeleteDomain,
              onAddGoal,
              onUpdateGoal,
              onDeleteGoal,
              onAddLearningItem,
              onUpdateLearningItem,
              onDeleteLearningItem,
              onAddOneOffTask,
              onCompleteOneOffTask,
              onReopenOneOffTask,
              onDeleteOneOffTask,
              onAddTrackingMetric,
              onUpdateTrackingMetric,
              onDeleteTrackingMetric,
              onSaveTrackingEntry,
              onDeleteTrackingEntry,
              onAddTrackingStructuredEntry,
              onDeleteTrackingStructuredEntry,
              onAddNote,
              onUpdateNote,
              onArchiveNote,
              onUnarchiveNote,
              onDeleteNote,
              onAddList,
              onUpdateList,
              onDeleteList,
              onAddListItem,
              onToggleListItem,
              onDeleteListItem,
              onAddTimelineBlock,
              onUpdateTimelineBlock,
              onDeleteTimelineBlock,
              onAddJournalEntry,
              onUpdateJournalEntry,
              onDeleteJournalEntry,
              onSaveSettings,
              onSetTodayMantraChecked,
              onAddSubtask,
              onMarkSubtaskDoneToday,
              onUndoSubtaskDoneToday,
              onAddCompletionDate,
              onMarkDone,
              onUndoDoneToday,
              onSkipToday,
              onSkipCycle,
              onUndoSkipToday,
              onUndoSkipCycleToday,
              completionLog,
              skippedTodayIds,
              cycleSkippedTodayIds,
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
