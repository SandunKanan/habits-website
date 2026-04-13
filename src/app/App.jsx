import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "../components/Layout/Layout.jsx";

import Today from "../pages/Today/Today.jsx";
import Calendar from "../pages/Calendar/Calendar.jsx";
import Habits from "../pages/Habits/Habits.jsx";
import Attributes from "../pages/Attributes/Attributes.jsx";
import Vision from "../pages/Vision/Vision.jsx";
import Focus from "../pages/Focus/Focus.jsx";
import Domains from "../pages/Domains/Domains.jsx";
import Goals from "../pages/Goals/Goals.jsx";
import Learnings from "../pages/Learnings/Learnings.jsx";
import Tracking from "../pages/Tracking/Tracking.jsx";
import Notes from "../pages/Notes/Notes.jsx";
import Journal from "../pages/Journal/Journal.jsx";
import Settings from "../pages/Settings/Settings.jsx";
import History from "../pages/History/History.jsx";
import Help from "../pages/Help/Help.jsx";
import Admin from "../pages/Admin/Admin.jsx";
import Auth from "../pages/Auth/Auth.jsx";

import { getDemoCredentials, isAuthEnabled } from "../lib/authClient.js";
import { startOfTodayLocalISO } from "../lib/date.js";
import { useAuthSession } from "./hooks/useAuthSession.js";
import { useUserRole } from "./hooks/useUserRole.js";
import { useHabitsStore } from "./hooks/useHabitsStore.js";
import { useAttributesStore } from "./hooks/useAttributesStore.js";
import { useVisionStore } from "./hooks/useVisionStore.js";
import { useFocusStore } from "./hooks/useFocusStore.js";
import { useGoalsStore } from "./hooks/useGoalsStore.js";
import { useDomainsStore } from "./hooks/useDomainsStore.js";
import { useLearningsStore } from "./hooks/useLearningsStore.js";
import { useOneOffTasksStore } from "./hooks/useOneOffTasksStore.js";
import { useTrackingStore } from "./hooks/useTrackingStore.js";
import { useNotesStore } from "./hooks/useNotesStore.js";
import { useJournalStore } from "./hooks/useJournalStore.js";
import { useSettingsStore } from "./hooks/useSettingsStore.js";
import "./App.scss";

export default function App() {
  const todayISO = startOfTodayLocalISO();
  const authEnabled = isAuthEnabled();
  const isDemoEnabled = Boolean(getDemoCredentials());

  const auth = useAuthSession({ authEnabled });
  const role = useUserRole({
    authEnabled,
    isAuthReady: auth.isAuthReady,
    session: auth.session,
    authUser: auth.authUser
  });
  const habitsStore = useHabitsStore({
    authEnabled,
    isAuthReady: auth.isAuthReady,
    session: auth.session,
    authUser: auth.authUser,
    todayISO
  });
  const attributesStore = useAttributesStore({
    authEnabled,
    isAuthReady: auth.isAuthReady,
    session: auth.session,
    authUser: auth.authUser
  });
  const visionStore = useVisionStore({
    authEnabled,
    isAuthReady: auth.isAuthReady,
    session: auth.session,
    authUser: auth.authUser
  });
  const focusStore = useFocusStore({
    authEnabled,
    isAuthReady: auth.isAuthReady,
    session: auth.session,
    authUser: auth.authUser
  });
  const goalsStore = useGoalsStore({
    authEnabled,
    isAuthReady: auth.isAuthReady,
    session: auth.session,
    authUser: auth.authUser
  });
  const domainsStore = useDomainsStore({
    authEnabled,
    isAuthReady: auth.isAuthReady,
    session: auth.session,
    authUser: auth.authUser
  });
  const learningsStore = useLearningsStore({
    authEnabled,
    isAuthReady: auth.isAuthReady,
    session: auth.session,
    authUser: auth.authUser
  });
  const oneOffTasksStore = useOneOffTasksStore({
    authEnabled,
    isAuthReady: auth.isAuthReady,
    session: auth.session,
    authUser: auth.authUser
  });
  const trackingStore = useTrackingStore({
    authEnabled,
    isAuthReady: auth.isAuthReady,
    session: auth.session,
    authUser: auth.authUser
  });
  const notesStore = useNotesStore({
    authEnabled,
    isAuthReady: auth.isAuthReady,
    session: auth.session,
    authUser: auth.authUser
  });
  const journalStore = useJournalStore({
    authEnabled,
    isAuthReady: auth.isAuthReady,
    session: auth.session,
    authUser: auth.authUser
  });
  const settingsStore = useSettingsStore({
    authEnabled,
    isAuthReady: auth.isAuthReady,
    session: auth.session,
    authUser: auth.authUser
  });

  async function handleSignIn(credentials) {
    const result = await auth.handleSignIn(credentials);
    if (result?.ok) {
      habitsStore.beginLoadingHabits();
      attributesStore.beginLoadingAttributes();
      visionStore.beginLoadingVision();
      focusStore.beginLoadingFocus();
      domainsStore.beginLoadingDomains();
      goalsStore.beginLoadingGoals();
      learningsStore.beginLoadingLearnings();
      oneOffTasksStore.beginLoadingOneOffTasks();
      trackingStore.beginLoadingTracking();
      notesStore.beginLoadingNotes();
      journalStore.beginLoadingJournal();
      settingsStore.beginLoadingSettings();
    }
    return result;
  }

  async function handleSignUp(credentials) {
    const result = await auth.handleSignUp(credentials);
    if (result?.ok && !result?.message) {
      habitsStore.beginLoadingHabits();
      attributesStore.beginLoadingAttributes();
      visionStore.beginLoadingVision();
      focusStore.beginLoadingFocus();
      domainsStore.beginLoadingDomains();
      goalsStore.beginLoadingGoals();
      learningsStore.beginLoadingLearnings();
      oneOffTasksStore.beginLoadingOneOffTasks();
      trackingStore.beginLoadingTracking();
      notesStore.beginLoadingNotes();
      journalStore.beginLoadingJournal();
      settingsStore.beginLoadingSettings();
    }
    return result;
  }

  async function handleDemoSignIn() {
    const result = await auth.handleDemoSignIn();
    if (result?.ok) {
      habitsStore.beginLoadingHabits();
      attributesStore.beginLoadingAttributes();
      visionStore.beginLoadingVision();
      focusStore.beginLoadingFocus();
      domainsStore.beginLoadingDomains();
      goalsStore.beginLoadingGoals();
      learningsStore.beginLoadingLearnings();
      oneOffTasksStore.beginLoadingOneOffTasks();
      trackingStore.beginLoadingTracking();
      notesStore.beginLoadingNotes();
      journalStore.beginLoadingJournal();
      settingsStore.beginLoadingSettings();
    }
    return result;
  }

  async function handleSignOut() {
    await auth.handleSignOut();
    role.resetRoleState();
    habitsStore.resetHabitsState();
    attributesStore.resetAttributesState();
    visionStore.resetVisionState();
    focusStore.resetFocusState();
    domainsStore.resetDomainsState();
    goalsStore.resetGoalsState();
    learningsStore.resetLearningsState();
    oneOffTasksStore.resetOneOffTasksState();
    trackingStore.resetTrackingState();
    notesStore.resetNotesState();
    journalStore.resetJournalState();
    settingsStore.resetSettingsState();
  }

  if (authEnabled && !auth.isAuthReady) {
    return <div className="appstatus card">Checking session...</div>;
  }

  if (authEnabled && auth.session && !role.isRoleReady) {
    return <div className="appstatus card">Loading account access...</div>;
  }

  if (
    habitsStore.isLoading ||
    attributesStore.isLoading ||
    visionStore.isLoading ||
    focusStore.isLoading ||
    domainsStore.isLoading ||
    goalsStore.isLoading ||
    learningsStore.isLoading ||
    oneOffTasksStore.isLoading ||
    trackingStore.isLoading ||
    notesStore.isLoading ||
    journalStore.isLoading ||
    settingsStore.isLoading
  ) {
    return <div className="appstatus card">Loading habits...</div>;
  }

  if (
    habitsStore.loadError ||
    attributesStore.loadError ||
    visionStore.loadError ||
    focusStore.loadError ||
    domainsStore.loadError ||
    goalsStore.loadError ||
    learningsStore.loadError ||
    oneOffTasksStore.loadError ||
    trackingStore.loadError ||
    notesStore.loadError ||
    journalStore.loadError ||
    settingsStore.loadError
  ) {
    return (
      <div className="appstatus card">
        {habitsStore.loadError ||
          attributesStore.loadError ||
          visionStore.loadError ||
          focusStore.loadError ||
          domainsStore.loadError ||
          goalsStore.loadError ||
          learningsStore.loadError ||
          oneOffTasksStore.loadError ||
          trackingStore.loadError ||
          notesStore.loadError ||
          journalStore.loadError ||
          settingsStore.loadError}
      </div>
    );
  }

  if (authEnabled && !auth.session) {
    return (
      <Auth
        onSignIn={handleSignIn}
        onDemoSignIn={handleDemoSignIn}
        onSignUp={handleSignUp}
        isLoading={auth.isAuthWorking}
        isDemoEnabled={isDemoEnabled}
      />
    );
  }

  return (
    <Routes>
      <Route
        element={
          <Layout
            todayISO={todayISO}
            habits={habitsStore.habits}
            curatedTop5={habitsStore.curatedTop5}
            lastDoneById={habitsStore.lastDoneById}
            lastProgressById={habitsStore.lastProgressById}
            attributes={attributesStore.attributes}
            vision={visionStore.vision}
            focus={focusStore.focus}
            domains={domainsStore.domains}
            goals={goalsStore.goals}
            learnings={learningsStore.learnings}
            oneOffTasks={oneOffTasksStore.oneOffTasks}
            trackingMetrics={trackingStore.trackingMetrics}
            trackingEntries={trackingStore.trackingEntries}
            notes={notesStore.notes}
            journalEntries={journalStore.journalEntries}
            settings={settingsStore.settings}
            onAddHabit={habitsStore.addHabit}
            onUpdateHabit={habitsStore.updateHabit}
            onDeleteHabit={habitsStore.deleteHabit}
            onAddAttribute={attributesStore.addAttribute}
            onUpdateAttribute={attributesStore.updateAttribute}
            onDeleteAttribute={attributesStore.deleteAttribute}
            onSaveVision={visionStore.saveVision}
            onSaveFocus={focusStore.saveFocus}
            onAddDomain={domainsStore.addDomain}
            onUpdateDomain={domainsStore.updateDomain}
            onDeleteDomain={domainsStore.deleteDomain}
            onAddGoal={goalsStore.addGoal}
            onUpdateGoal={goalsStore.updateGoal}
            onDeleteGoal={goalsStore.deleteGoal}
            onAddLearningItem={learningsStore.addLearningItem}
            onUpdateLearningItem={learningsStore.updateLearningItem}
            onDeleteLearningItem={learningsStore.deleteLearningItem}
            onAddOneOffTask={oneOffTasksStore.addOneOffTask}
            onCompleteOneOffTask={oneOffTasksStore.completeOneOffTask}
            onReopenOneOffTask={oneOffTasksStore.reopenOneOffTask}
            onDeleteOneOffTask={oneOffTasksStore.deleteOneOffTask}
            onAddTrackingMetric={trackingStore.addTrackingMetric}
            onUpdateTrackingMetric={trackingStore.updateTrackingMetric}
            onDeleteTrackingMetric={trackingStore.deleteTrackingMetric}
            onSaveTrackingEntry={trackingStore.saveTrackingEntry}
            onDeleteTrackingEntry={trackingStore.deleteTrackingEntry}
            onAddTrackingStructuredEntry={trackingStore.addTrackingStructuredEntry}
            onDeleteTrackingStructuredEntry={trackingStore.deleteTrackingStructuredEntry}
            onAddNote={notesStore.addNote}
            onUpdateNote={notesStore.updateNote}
            onArchiveNote={notesStore.archiveNote}
            onUnarchiveNote={notesStore.unarchiveNote}
            onDeleteNote={notesStore.deleteNote}
            onAddJournalEntry={journalStore.addJournalEntry}
            onUpdateJournalEntry={journalStore.updateJournalEntry}
            onDeleteJournalEntry={journalStore.deleteJournalEntry}
            onSaveSettings={settingsStore.saveSettings}
            onAddSubtask={habitsStore.addSubtask}
            onMarkSubtaskDoneToday={habitsStore.markSubtaskDoneToday}
            onUndoSubtaskDoneToday={habitsStore.undoSubtaskDoneToday}
            onAddCompletionDate={habitsStore.addCompletionDate}
            onMarkDone={habitsStore.markDone}
            onUndoDoneToday={habitsStore.undoDoneToday}
            onSkipToday={habitsStore.skipToday}
            onSkipCycle={habitsStore.skipCycle}
            onUndoSkipToday={habitsStore.undoSkipToday}
            onUndoSkipCycleToday={habitsStore.undoSkipCycleToday}
            completionLog={habitsStore.completionLog}
            skippedTodayIds={habitsStore.skippedTodayIds}
            cycleSkippedTodayIds={habitsStore.cycleSkippedTodayIds}
            isPersisting={
              habitsStore.isPersisting ||
              attributesStore.isPersisting ||
              visionStore.isPersisting ||
              focusStore.isPersisting ||
              domainsStore.isPersisting ||
              goalsStore.isPersisting ||
              learningsStore.isPersisting ||
              oneOffTasksStore.isPersisting ||
              trackingStore.isPersisting ||
              notesStore.isPersisting ||
              journalStore.isPersisting ||
              settingsStore.isPersisting
            }
            authUser={auth.authUser}
            isAdmin={role.isAdmin}
            session={auth.session}
            onSignOut={handleSignOut}
          />
        }
      >
        <Route index element={<Navigate to="/today" replace />} />
        <Route path="/today" element={<Today />} />
        <Route path="/calendar" element={<Calendar />} />
        <Route path="/habits" element={<Habits />} />
        <Route path="/attributes" element={<Attributes />} />
        <Route path="/vision" element={<Vision />} />
        <Route path="/focus" element={<Focus />} />
        <Route path="/domains" element={<Domains />} />
        <Route path="/goals" element={<Goals />} />
        <Route path="/learnings" element={<Learnings />} />
        <Route path="/tracking" element={<Tracking />} />
        <Route path="/notes" element={<Notes />} />
        <Route path="/journal" element={<Journal />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/history" element={<History />} />
        <Route path="/help" element={<Help />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="*" element={<Navigate to="/today" replace />} />
      </Route>
    </Routes>
  );
}
