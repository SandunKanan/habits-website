import React from "react";
import { NavLink } from "react-router-dom";
import "./TopNav.scss";

export default function TopNav() {
  return (
    <nav className="topnav">
      <div className="container topnav__inner">
        <div className="topnav__brand">Habit Ledger</div>
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
        </div>
      </div>
    </nav>
  );
}
