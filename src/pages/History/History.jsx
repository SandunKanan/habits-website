import React from "react";
import { useOutletContext } from "react-router-dom";
import "./History.scss";

export default function History() {
  const { completionLog } = useOutletContext();

  return (
    <div className="history card">
      <h2>History (MVP)</h2>
      {completionLog.length === 0 ? (
        <p>No completions yet. Mark something done on Today.</p>
      ) : (
        <ul>
          {completionLog.slice(0, 25).map((e, idx) => (
            <li key={idx}>
              <b>{e.dateISO}</b> — {e.habitId}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
