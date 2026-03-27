import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "../components/Layout/Layout.jsx";

import Today from "../pages/Today/Today.jsx";
import Habits from "../pages/Habits/Habits.jsx";
import Attributes from "../pages/Attributes/Attributes.jsx";
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

  async function handleSignIn(credentials) {
    const result = await auth.handleSignIn(credentials);
    if (result?.ok) {
      habitsStore.beginLoadingHabits();
      attributesStore.beginLoadingAttributes();
    }
    return result;
  }

  async function handleSignUp(credentials) {
    const result = await auth.handleSignUp(credentials);
    if (result?.ok && !result?.message) {
      habitsStore.beginLoadingHabits();
      attributesStore.beginLoadingAttributes();
    }
    return result;
  }

  async function handleDemoSignIn() {
    const result = await auth.handleDemoSignIn();
    if (result?.ok) {
      habitsStore.beginLoadingHabits();
      attributesStore.beginLoadingAttributes();
    }
    return result;
  }

  async function handleSignOut() {
    await auth.handleSignOut();
    role.resetRoleState();
    habitsStore.resetHabitsState();
    attributesStore.resetAttributesState();
  }

  if (authEnabled && !auth.isAuthReady) {
    return <div className="appstatus card">Checking session...</div>;
  }

  if (authEnabled && auth.session && !role.isRoleReady) {
    return <div className="appstatus card">Loading account access...</div>;
  }

  if (habitsStore.isLoading || attributesStore.isLoading) {
    return <div className="appstatus card">Loading habits...</div>;
  }

  if (habitsStore.loadError || attributesStore.loadError) {
    return <div className="appstatus card">{habitsStore.loadError || attributesStore.loadError}</div>;
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
            attributes={attributesStore.attributes}
            onAddHabit={habitsStore.addHabit}
            onUpdateHabit={habitsStore.updateHabit}
            onDeleteHabit={habitsStore.deleteHabit}
            onAddAttribute={attributesStore.addAttribute}
            onUpdateAttribute={attributesStore.updateAttribute}
            onDeleteAttribute={attributesStore.deleteAttribute}
            onAddSubtask={habitsStore.addSubtask}
            onMarkSubtaskDoneToday={habitsStore.markSubtaskDoneToday}
            onUndoSubtaskDoneToday={habitsStore.undoSubtaskDoneToday}
            onAddCompletionDate={habitsStore.addCompletionDate}
            onMarkDone={habitsStore.markDone}
            onUndoDoneToday={habitsStore.undoDoneToday}
            onSkipToday={habitsStore.skipToday}
            onUndoSkipToday={habitsStore.undoSkipToday}
            completionLog={habitsStore.completionLog}
            skippedTodayIds={habitsStore.skippedTodayIds}
            isPersisting={habitsStore.isPersisting || attributesStore.isPersisting}
            authUser={auth.authUser}
            isAdmin={role.isAdmin}
            session={auth.session}
            onSignOut={handleSignOut}
          />
        }
      >
        <Route index element={<Navigate to="/today" replace />} />
        <Route path="/today" element={<Today />} />
        <Route path="/habits" element={<Habits />} />
        <Route path="/attributes" element={<Attributes />} />
        <Route path="/history" element={<History />} />
        <Route path="/help" element={<Help />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="*" element={<Navigate to="/today" replace />} />
      </Route>
    </Routes>
  );
}
