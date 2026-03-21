import React from "react";
import { NavLink } from "react-router-dom";
import "./TopNav.scss";

export default function TopNav({ authUser, onSignOut }) {
  return (
    <nav className="topnav">
      <div className="container topnav__inner">
        <div className="topnav__brand">Habit Tracker</div>
        <div className="topnav__right">
          <div className="topnav__links">
            <NavLink to="/today" className={({ isActive }) => (isActive ? "active" : "")}>
              Today
            </NavLink>
            <NavLink to="/habits" className={({ isActive }) => (isActive ? "active" : "")}>
              Habits
            </NavLink>
            <NavLink to="/history" className={({ isActive }) => (isActive ? "active" : "")}>
              History
            </NavLink>
            <NavLink to="/help" className={({ isActive }) => (isActive ? "active" : "")}>
              Help
            </NavLink>
          </div>

          {authUser ? (
            <div className="topnav__account">
              <span>{authUser.email}</span>
              <button type="button" onClick={onSignOut}>
                Sign out
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </nav>
  );
}
