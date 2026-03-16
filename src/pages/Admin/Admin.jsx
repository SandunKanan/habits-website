import React, { useEffect, useState } from "react";
import { Navigate, useOutletContext } from "react-router-dom";
import { formatFrequencyLabel } from "../../lib/frequency.js";
import { getImportanceLabel } from "../../lib/importance.js";
import "./Admin.scss";

export default function Admin() {
  const { authUser, isAdmin, session } = useOutletContext();
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedUserId, setExpandedUserId] = useState(null);
  const [isSavingRole, setIsSavingRole] = useState("");

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

  async function updateAdminAccess(userId, nextIsAdmin) {
    setIsSavingRole(userId);
    setError("");

    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ userId, isAdmin: nextIsAdmin })
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || `Admin update failed with status ${res.status}`);
      }

      setUsers((currentUsers) =>
        currentUsers.map((user) =>
          user.id === userId ? { ...user, is_admin: nextIsAdmin } : user
        )
      );
    } catch (nextError) {
      setError(nextError.message || "Could not update admin access.");
    } finally {
      setIsSavingRole("");
    }
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
                <span>{user.is_admin ? "Admin" : "User"}</span>
                <span>{user.habit_count} habits</span>
                <span>{user.completion_count} completions</span>
              </div>
            </div>

            <div className="admin__actions">
              <button
                type="button"
                className="admin__detail-btn"
                onClick={() =>
                  setExpandedUserId((current) => (current === user.id ? null : user.id))
                }
              >
                {expandedUserId === user.id ? "Hide details" : "View details"}
              </button>
              <button
                type="button"
                className={user.is_admin ? "admin__role-btn admin__role-btn--remove" : "admin__role-btn admin__role-btn--add"}
                onClick={() => updateAdminAccess(user.id, !user.is_admin)}
                disabled={isSavingRole === user.id || authUser?.id === user.id}
              >
                {isSavingRole === user.id
                  ? "Saving..."
                  : user.is_admin
                    ? authUser?.id === user.id
                      ? "Current admin"
                      : "Demote admin"
                    : "Promote to admin"}
              </button>
            </div>

            {expandedUserId === user.id ? (
              <div className="admin__details">
                <div className="admin__detail-grid">
                  <div>
                    <dt>User ID</dt>
                    <dd>{user.id}</dd>
                  </div>
                  <div>
                    <dt>Last sign in</dt>
                    <dd>{user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : "Never"}</dd>
                  </div>
                  <div>
                    <dt>Role</dt>
                    <dd>{user.is_admin ? "Admin" : "Standard user"}</dd>
                  </div>
                  <div>
                    <dt>Total completions</dt>
                    <dd>{user.completion_count}</dd>
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
                        <div className="admin__habit-dates">
                          {habit.done_dates.length > 0
                            ? `Completion dates: ${habit.done_dates.join(", ")}`
                            : "No completion history."}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : null}
          </article>
        ))}
      </div>
    </div>
  );
}
