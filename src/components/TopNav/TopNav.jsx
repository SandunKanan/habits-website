import React, { useEffect, useRef, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import "./TopNav.scss";

export default function TopNav({ authUser, onSignOut }) {
  const location = useLocation();
  const [isHoverCapable, setIsHoverCapable] = useState(false);
  const [openMenu, setOpenMenu] = useState("");
  const navRef = useRef(null);
  const isDirectionActive = ["/vision", "/focus", "/domains", "/goals", "/learnings"].includes(
    location.pathname
  );
  const isMoreActive = ["/history", "/tracking", "/notes", "/settings", "/help"].includes(location.pathname);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return undefined;
    }

    const mediaQuery = window.matchMedia("(hover: hover) and (pointer: fine)");
    const updateHoverCapability = () => setIsHoverCapable(mediaQuery.matches);

    updateHoverCapability();

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", updateHoverCapability);
      return () => mediaQuery.removeEventListener("change", updateHoverCapability);
    }

    mediaQuery.addListener(updateHoverCapability);
    return () => mediaQuery.removeListener(updateHoverCapability);
  }, []);

  useEffect(() => {
    setOpenMenu("");
  }, [location.pathname]);

  useEffect(() => {
    function handlePointerDown(event) {
      if (!navRef.current?.contains(event.target)) {
        setOpenMenu("");
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  function handleMenuToggle(menuKey) {
    setOpenMenu((current) => (current === menuKey ? "" : menuKey));
  }

  function handleMenuMouseLeave(menuKey) {
    if (!isHoverCapable || openMenu !== menuKey) return;
    setOpenMenu("");
  }

  function closeMenu() {
    setOpenMenu("");
  }

  return (
    <nav className="topnav" ref={navRef}>
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
            <div
              className={[
                "topnav__menu",
                isDirectionActive ? "topnav__menu--active" : "",
                openMenu === "growth" ? "topnav__menu--open" : ""
              ].join(" ")}
              onMouseLeave={() => handleMenuMouseLeave("growth")}
            >
              <button
                type="button"
                className="topnav__menu-trigger"
                onClick={() => handleMenuToggle("growth")}
                aria-haspopup="menu"
                aria-expanded={openMenu === "growth"}
              >
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
              </button>
              <div className="topnav__menu-panel">
                <NavLink to="/vision" className={({ isActive }) => (isActive ? "active" : "")} onClick={closeMenu}>
                  Vision
                </NavLink>
                <NavLink to="/focus" className={({ isActive }) => (isActive ? "active" : "")} onClick={closeMenu}>
                  Focus
                </NavLink>
                <NavLink to="/domains" className={({ isActive }) => (isActive ? "active" : "")} onClick={closeMenu}>
                  Domains
                </NavLink>
                <NavLink to="/goals" className={({ isActive }) => (isActive ? "active" : "")} onClick={closeMenu}>
                  Goals
                </NavLink>
                <NavLink to="/learnings" className={({ isActive }) => (isActive ? "active" : "")} onClick={closeMenu}>
                  Pursuits
                </NavLink>
              </div>
            </div>
            <div
              className={[
                "topnav__menu",
                isMoreActive ? "topnav__menu--active" : "",
                openMenu === "more" ? "topnav__menu--open" : ""
              ].join(" ")}
              onMouseLeave={() => handleMenuMouseLeave("more")}
            >
              <button
                type="button"
                className="topnav__menu-trigger"
                onClick={() => handleMenuToggle("more")}
                aria-haspopup="menu"
                aria-expanded={openMenu === "more"}
              >
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
              </button>
              <div className="topnav__menu-panel">
                <NavLink to="/history" className={({ isActive }) => (isActive ? "active" : "")} onClick={closeMenu}>
                  History
                </NavLink>
                <NavLink to="/tracking" className={({ isActive }) => (isActive ? "active" : "")} onClick={closeMenu}>
                  Tracking
                </NavLink>
                <NavLink to="/notes" className={({ isActive }) => (isActive ? "active" : "")} onClick={closeMenu}>
                  Notes
                </NavLink>
                <NavLink to="/settings" className={({ isActive }) => (isActive ? "active" : "")} onClick={closeMenu}>
                  Settings
                </NavLink>
                <NavLink to="/help" className={({ isActive }) => (isActive ? "active" : "")} onClick={closeMenu}>
                  Help
                </NavLink>
              </div>
            </div>
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
