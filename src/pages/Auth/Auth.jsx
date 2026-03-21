import React, { useState } from "react";
import "./Auth.scss";

export default function Auth({ onSignIn, onDemoSignIn, onSignUp, isLoading, isDemoEnabled }) {
  const [mode, setMode] = useState("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage("");

    const action = mode === "sign-in" ? onSignIn : onSignUp;
    const result = await action({ email, password });

    if (!result?.ok) {
      setMessage(result?.error ?? "Authentication failed.");
      return;
    }

    if (result.message) {
      setMessage(result.message);
    }
  }

  async function handleDemoClick() {
    if (!onDemoSignIn) return;
    setMessage("");
    const result = await onDemoSignIn();

    if (!result?.ok) {
      setMessage(result?.error ?? "Could not sign in to the demo account.");
    }
  }

  return (
    <div className="auth">
      <div className="auth__panel card">
        <div className="auth__eyebrow">Habit Ledger</div>
        <h1 className="auth__title">Private habits, one account at a time.</h1>
        <p className="auth__subtitle">
          Sign in to reach your own schedule, history, and completions. Each account keeps a
          separate habit workspace.
        </p>

        <div className="auth__toggle">
          <button
            type="button"
            className={mode === "sign-in" ? "active" : ""}
            onClick={() => setMode("sign-in")}
          >
            Sign in
          </button>
          <button
            type="button"
            className={mode === "sign-up" ? "active" : ""}
            onClick={() => setMode("sign-up")}
          >
            Create account
          </button>
        </div>

        <form className="auth__form" onSubmit={handleSubmit}>
          <label>
            Email
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </label>
          <button className="auth__submit" type="submit" disabled={isLoading}>
            {isLoading
              ? "Working..."
              : mode === "sign-in"
                ? "Sign in"
                : "Create account"}
          </button>
        </form>

        {mode === "sign-in" && isDemoEnabled ? (
          <div className="auth__demo">
            <div className="auth__demo-divider" aria-hidden="true">
              <span />
              <small>or</small>
              <span />
            </div>
            <button className="auth__demo-btn" type="button" onClick={handleDemoClick} disabled={isLoading}>
              {isLoading ? "Working..." : "Try demo account"}
            </button>
          </div>
        ) : null}

        {message ? <p className="auth__message">{message}</p> : null}
      </div>
    </div>
  );
}
