import React from "react";
import { formatFrequencyLabel } from "../../../lib/frequency.js";
import { getImportanceLabel } from "../../../lib/importance.js";
import { getHabitSlug, getSortedDoneDates } from "../../../lib/habitUtils.js";
import { scoreHabitForToday } from "../../../lib/scoring.js";
import HabitEditor from "./HabitEditor.jsx";
import HabitSubtasks from "./HabitSubtasks.jsx";

export default function HabitListItem({
  habit,
  todayISO,
  isPersisting,
  isEditing,
  editState,
  editFeedback,
  isSavingEdit,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onDeleteHabit,
  isDetailsExpanded,
  onToggleDetails,
  isDatesExpanded,
  onToggleDates,
  isPastOpen,
  onTogglePastCompletionForm,
  pastDateISO,
  onPastDateChange,
  completionFeedback,
  isSavingCompletion,
  onAddPastCompletion,
  pendingHabitActionKey,
  pendingSubtaskActionKey,
  subtaskName,
  onSubtaskNameChange,
  subtaskFeedback,
  isSavingSubtask,
  onAddSubtask,
  onMarkSubtaskDoneToday,
  onUndoSubtaskDoneToday,
  onMarkDone,
  onUndoDoneToday,
  formatLastCompleted,
  attributes
}) {
  const sortedDoneDates = getSortedDoneDates(habit);
  const lastCompleted = formatLastCompleted(sortedDoneDates[0]);
  const isDoneToday = sortedDoneDates[0] === todayISO;
  const isDeleting = pendingHabitActionKey === `delete:${habit.id}`;
  const score = scoreHabitForToday({
    habit,
    lastDoneISO: sortedDoneDates[0] ?? habit.initialLastDone ?? null,
    todayISO
  });

  if (isEditing) {
    return (
      <article className="habits__item card">
        <HabitEditor
          title={`Editing: ${getHabitSlug(habit)}`}
          name={editState.name}
          onNameChange={editState.onNameChange}
          frequencyMode={editState.frequencyMode}
          frequencyValue={editState.frequencyValue}
          frequencyUnit={editState.frequencyUnit}
          onFrequencyModeChange={editState.onFrequencyModeChange}
          onFrequencyValueChange={editState.onFrequencyValueChange}
          onFrequencyUnitChange={editState.onFrequencyUnitChange}
          importance={editState.importance}
          onImportanceChange={editState.onImportanceChange}
          createdAt={editState.createdAt}
          onCreatedAtChange={editState.onCreatedAtChange}
          attributes={attributes}
          attributeLinks={editState.attributeLinks}
          onAddAttributeLink={editState.onAddAttributeLink}
          onRemoveAttributeLink={editState.onRemoveAttributeLink}
          onAttributeLinkAttributeChange={editState.onAttributeLinkAttributeChange}
          onAttributeLinkWeightChange={editState.onAttributeLinkWeightChange}
          todayISO={todayISO}
          onSubmit={onSaveEdit}
          onCancel={onCancelEdit}
          isSaving={isSavingEdit || isPersisting}
          feedback={editFeedback}
        />
      </article>
    );
  }

  return (
    <article className="habits__item card">
      <div className="habits__item-head">
        <h3>{habit.name}</h3>
        <div className="habits__item-head-actions">
          <button
            type="button"
            className="habits__toggle"
            aria-expanded={isDetailsExpanded}
            onClick={() => onToggleDetails(habit.id)}
            disabled={isPersisting}
          >
            <span>{isDetailsExpanded ? "Hide details" : "Show details"}</span>
            <svg
              className={`habits__toggle-caret ${isDetailsExpanded ? "habits__toggle-caret--up" : ""}`}
              viewBox="0 0 12 12"
              aria-hidden="true"
              focusable="false"
            >
              <path
                d="M2.25 4.25 6 8l3.75-3.75"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <button type="button" onClick={() => onStartEdit(habit)} disabled={isPersisting}>
            Edit
          </button>
          <button
            type="button"
            className="habits__delete-btn"
            aria-label={`Delete ${habit.name}`}
            title={isDeleting ? "Deleting habit" : "Delete habit"}
            onClick={() => onDeleteHabit(habit)}
            disabled={isPersisting}
            aria-busy={isDeleting}
          >
            {isDeleting ? (
              <span className="habits__delete-spinner" aria-hidden="true" />
            ) : (
              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path
                  d="M9 3h6l1 2h4v2H4V5h4l1-2zm1 6h2v9h-2V9zm4 0h2v9h-2V9zM7 9h2v9H7V9z"
                  fill="currentColor"
                />
              </svg>
            )}
          </button>
        </div>
      </div>

      <dl className="habits__details">
        <div>
          <dt>Frequency</dt>
          <dd>{formatFrequencyLabel(habit)}</dd>
        </div>
        <div>
          <dt>Priority</dt>
          <dd>{getImportanceLabel(habit.importance)}</dd>
        </div>
        <div>
          <dt>Last completed</dt>
          <dd>{lastCompleted}</dd>
        </div>
      </dl>

      {isDetailsExpanded ? (
        <>
          <dl className="habits__details habits__details--expanded">
            <div>
              <dt>Created at</dt>
              <dd>{habit.createdAt ? String(habit.createdAt).slice(0, 10) : "Unknown"}</dd>
            </div>
            <div>
              <dt>Times completed</dt>
              <dd>{sortedDoneDates.length}</dd>
            </div>
            <div>
              <dt>Tracking score</dt>
              <dd>{score.trackingScore.toFixed(2)}</dd>
            </div>
            <div>
              <dt>Priority score</dt>
              <dd>{score.priorityScore.toFixed(2)}</dd>
            </div>
            <div>
              <dt>Attributes</dt>
              <dd>
                {Array.isArray(habit.attributeLinks) && habit.attributeLinks.length > 0
                  ? habit.attributeLinks.length
                  : "None"}
              </dd>
            </div>
          </dl>

          <div className="habits__completion-actions">
            {isDoneToday ? (
              <button type="button" onClick={() => onUndoDoneToday(habit.id)} disabled={isPersisting}>
                {pendingHabitActionKey === `undo-done:${habit.id}` ? "Saving..." : "Undo today"}
              </button>
            ) : (
              <button type="button" onClick={() => onMarkDone(habit.id)} disabled={isPersisting}>
                {pendingHabitActionKey === `mark-done:${habit.id}` ? "Saving..." : "Mark done today"}
              </button>
            )}
            <button type="button" onClick={() => onTogglePastCompletionForm(habit.id)} disabled={isPersisting}>
              {isPastOpen ? "Cancel past date" : "Add past completion"}
            </button>
          </div>

          {isPastOpen ? (
            <div className="habits__past-form">
              <input
                type="date"
                value={pastDateISO}
                max={todayISO}
                onChange={onPastDateChange}
                disabled={isSavingCompletion || isPersisting}
              />
              <button type="button" onClick={() => onAddPastCompletion(habit.id)} disabled={isSavingCompletion || isPersisting}>
                {isSavingCompletion || isPersisting ? "Saving..." : "Save past date"}
              </button>
            </div>
          ) : null}

          {completionFeedback ? <p className="habits__feedback habits__feedback--inline">{completionFeedback}</p> : null}

          <HabitSubtasks
            habitId={habit.id}
            todayISO={todayISO}
            subtasks={habit.subtasks}
            subtaskName={subtaskName}
            onSubtaskNameChange={onSubtaskNameChange}
            subtaskFeedback={subtaskFeedback}
            isSavingSubtask={isSavingSubtask}
            isPersisting={isPersisting}
            pendingSubtaskActionKey={pendingSubtaskActionKey}
            formatLastCompleted={formatLastCompleted}
            onAddSubtask={onAddSubtask}
            onMarkSubtaskDoneToday={onMarkSubtaskDoneToday}
            onUndoSubtaskDoneToday={onUndoSubtaskDoneToday}
          />

          <div className="habits__dates">
            <button
              type="button"
              onClick={() => onToggleDates(habit.id)}
              disabled={sortedDoneDates.length === 0 || isPersisting}
            >
              {isDatesExpanded ? "Hide completion dates" : "View completion dates"}
            </button>

            {isDatesExpanded && sortedDoneDates.length > 0 ? (
              <ul>
                {sortedDoneDates.map((dateISO) => (
                  <li key={dateISO}>{dateISO}</li>
                ))}
              </ul>
            ) : null}
          </div>
        </>
      ) : null}
    </article>
  );
}
