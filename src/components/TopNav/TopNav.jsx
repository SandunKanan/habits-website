import React from "react";
import { NavLink, useLocation } from "react-router-dom";
import "./TopNav.scss";

export default function TopNav({ authUser, onSignOut }) {
  const location = useLocation();
  const isDirectionActive = ["/vision", "/focus", "/learnings"].includes(location.pathname);
  const isMoreActive = ["/history", "/settings", "/help"].includes(location.pathname);

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
            <NavLink to="/attributes" className={({ isActive }) => (isActive ? "active" : "")}>
              Attributes
            </NavLink>
            <details className={["topnav__menu", isDirectionActive ? "topnav__menu--active" : ""].join(" ")}>
              <summary>
                <span>Growth</span>
                <svg viewBox="0 0 20 20" aria-hidden="true">
                  <path
                    d="M5.5 7.5 10 12l4.5-4.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </summary>
              <div className="topnav__menu-panel">
                <NavLink to="/vision" className={({ isActive }) => (isActive ? "active" : "")}>
                  Vision
                </NavLink>
                <NavLink to="/focus" className={({ isActive }) => (isActive ? "active" : "")}>
                  Focus
                </NavLink>
                <NavLink to="/learnings" className={({ isActive }) => (isActive ? "active" : "")}>
                  Pursuits
                </NavLink>
              </div>
            </details>
            <details className={["topnav__menu", isMoreActive ? "topnav__menu--active" : ""].join(" ")}>
              <summary>
                <span>More</span>
                <svg viewBox="0 0 20 20" aria-hidden="true">
                  <path
                    d="M5.5 7.5 10 12l4.5-4.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </summary>
              <div className="topnav__menu-panel">
                <NavLink to="/history" className={({ isActive }) => (isActive ? "active" : "")}>
                  History
                </NavLink>
                <NavLink to="/settings" className={({ isActive }) => (isActive ? "active" : "")}>
                  Settings
                </NavLink>
                <NavLink to="/help" className={({ isActive }) => (isActive ? "active" : "")}>
                  Help
                </NavLink>
              </div>
            </details>
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
