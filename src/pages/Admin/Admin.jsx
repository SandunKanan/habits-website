import React, { useEffect, useState } from "react";
import { Navigate, useOutletContext } from "react-router-dom";
import { formatFrequencyLabel } from "../../lib/frequency.js";
import { getImportanceLabel } from "../../lib/importance.js";
import "./Admin.scss";

export default function Admin() {
  const { isAdmin, session } = useOutletContext();
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false;

    async function loadAdmin() {
      if (!isAdmin || !session?.access_token) {
        if (!ignore) {
          setIsLoading(false);
          setError("");
        }
        return;
      }

      try {
        if (!ignore) {
          setIsLoading(true);
          setError("");
        }

        const res = await fetch("/api/admin", {
          headers: {
            Authorization: `Bearer ${session.access_token}`
          }
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data?.error || `Admin load failed with status ${res.status}`);
        }

        const data = await res.json();
        if (!ignore) {
          setUsers(Array.isArray(data.users) ? data.users : []);
        }
      } catch (nextError) {
        if (!ignore) {
          setError(nextError.message || "Could not load admin data.");
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    void loadAdmin();

    return () => {
      ignore = true;
    };
  }, [isAdmin, session?.access_token]);

  if (!isAdmin) {
    return <Navigate to="/today" replace />;
  }

  if (isLoading) {
    return <div className="admin card">Loading admin data...</div>;
  }

  if (error) {
    return <div className="admin card">{error}</div>;
  }

  return (
    <div className="admin">
      <section className="admin__summary card">
        <h2>Admin Overview</h2>
        <p>
          Total users: <b>{users.length}</b>
        </p>
      </section>

      <div className="admin__list">
        {users.map((user) => (
          <article key={user.id} className="admin__user card">
            <div className="admin__user-head">
              <div>
                <h3>{user.email || "Unknown email"}</h3>
                <p>Created: {user.created_at ? new Date(user.created_at).toLocaleString() : "N/A"}</p>
              </div>
              <div className="admin__stats">
                <span>{user.habit_count} habits</span>
                <span>{user.completion_count} completions</span>
              </div>
            </div>

            {user.habits.length === 0 ? (
              <p className="admin__empty">No habits yet.</p>
            ) : (
              <div className="admin__habits">
                {user.habits.map((habit) => (
                  <div key={habit.id} className="admin__habit">
                    <div className="admin__habit-head">
                      <strong>{habit.name}</strong>
                      <span>{habit.slug}</span>
                    </div>
                    <div className="admin__habit-meta">
                      {formatFrequencyLabel({
                        frequencyMode: habit.frequency_mode,
                        frequencyValue: habit.frequency_value,
                        frequencyUnit: habit.frequency_unit
                      })}{" "}
                      · {getImportanceLabel(habit.importance)} · {habit.completion_count} completions
                    </div>
                    {habit.done_dates.length > 0 ? (
                      <div className="admin__habit-dates">
                        Last: {habit.done_dates.slice(0, 5).join(", ")}
                      </div>
                    ) : (
                      <div className="admin__habit-dates">No completion history.</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
