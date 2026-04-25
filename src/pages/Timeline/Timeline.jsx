import React, { useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import {
  buildTimelineTicks,
  formatTimelineRange,
  formatTimelineTick,
  getBlockViewportStyle,
  getTimelineFrame,
  groupBlocksByLane,
  layoutTimelineLaneBlocks,
  TIMELINE_LANES,
  TIMELINE_VIEW_OPTIONS,
  toMonthInputValue
} from "../../lib/timeline.js";
import { startOfMonthISO } from "../../lib/date.js";
import "./Timeline.scss";

export default function Timeline() {
  const { todayISO, timelineBlocks, onAddTimelineBlock, onUpdateTimelineBlock, onDeleteTimelineBlock, isPersisting } =
    useOutletContext();
  const [viewKey, setViewKey] = useState("1y");
  const [title, setTitle] = useState("");
  const [lane, setLane] = useState(TIMELINE_LANES[0].value);
  const [startMonth, setStartMonth] = useState(toMonthInputValue(startOfMonthISO(todayISO)));
  const [endMonth, setEndMonth] = useState(toMonthInputValue(startOfMonthISO(todayISO)));
  const [feedback, setFeedback] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState("");
  const [editingBlockId, setEditingBlockId] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editLane, setEditLane] = useState(TIMELINE_LANES[0].value);
  const [editStartMonth, setEditStartMonth] = useState(toMonthInputValue(startOfMonthISO(todayISO)));
  const [editEndMonth, setEditEndMonth] = useState(toMonthInputValue(startOfMonthISO(todayISO)));
  const [isUpdating, setIsUpdating] = useState(false);

  const frame = useMemo(() => getTimelineFrame(todayISO, viewKey), [todayISO, viewKey]);
  const laneGroups = useMemo(() => groupBlocksByLane(timelineBlocks), [timelineBlocks]);
  const ticks = useMemo(() => buildTimelineTicks(frame.startISO, frame.view.months), [frame.startISO, frame.view.months]);
  const laneLayouts = useMemo(
    () =>
      laneGroups.map((group) => ({
        ...group,
        layout: layoutTimelineLaneBlocks(group.blocks, frame.startISO, frame.view.months)
      })),
    [frame.startISO, frame.view.months, laneGroups]
  );
  const editingBlock = useMemo(
    () => timelineBlocks.find((block) => block.id === editingBlockId) ?? null,
    [editingBlockId, timelineBlocks]
  );

  async function handleAddBlock(event) {
    event.preventDefault();
    setFeedback("");
    setIsSaving(true);

    try {
      const result = await onAddTimelineBlock({
        title,
        lane,
        startMonth: `${startMonth}-01`,
        endMonth: `${endMonth}-01`
      });

      if (!result?.ok) {
        setFeedback(result?.error || "Could not save timeline block.");
        return;
      }

      setTitle("");
      setLane(TIMELINE_LANES[0].value);
      setStartMonth(toMonthInputValue(startOfMonthISO(todayISO)));
      setEndMonth(toMonthInputValue(startOfMonthISO(todayISO)));
      setFeedback("Timeline block added.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteBlock(blockId) {
    setPendingDeleteId(blockId);

    try {
      const result = await onDeleteTimelineBlock(blockId);
      if (!result?.ok) {
        setFeedback(result?.error || "Could not delete timeline block.");
      }
      return result;
    } finally {
      setPendingDeleteId("");
    }
  }

  function openEditBlock(block) {
    setEditingBlockId(block.id);
    setEditTitle(block.title);
    setEditLane(block.lane);
    setEditStartMonth(toMonthInputValue(block.startMonth));
    setEditEndMonth(toMonthInputValue(block.endMonth));
    setFeedback("");
  }

  function closeEditBlock() {
    setEditingBlockId("");
    setEditTitle("");
    setEditLane(TIMELINE_LANES[0].value);
    setEditStartMonth(toMonthInputValue(startOfMonthISO(todayISO)));
    setEditEndMonth(toMonthInputValue(startOfMonthISO(todayISO)));
    setIsUpdating(false);
  }

  async function handleUpdateBlock(event) {
    event.preventDefault();
    if (!editingBlock) return;

    setFeedback("");
    setIsUpdating(true);

    try {
      const result = await onUpdateTimelineBlock(editingBlock.id, {
        title: editTitle,
        lane: editLane,
        startMonth: `${editStartMonth}-01`,
        endMonth: `${editEndMonth}-01`
      });

      if (!result?.ok) {
        setFeedback(result?.error || "Could not update timeline block.");
        return;
      }

      setFeedback("Timeline block updated.");
      closeEditBlock();
    } finally {
      setIsUpdating(false);
    }
  }

  async function handleDeleteEditingBlock() {
    if (!editingBlock) return;

    const result = await handleDeleteBlock(editingBlock.id);
    if (result?.ok) {
      setFeedback("Timeline block deleted.");
      closeEditBlock();
    }
    return result;
  }

  return (
    <div className="timelinepage">
      <section className="timelinepage__hero card">
        <div>
          <p className="timelinepage__eyebrow">Future map</p>
          <h2>Lay out the tracks of the life you can currently imagine</h2>
          <p className="timelinepage__intro">
            Each row is a life lane. Add simple month-based blocks to sketch how different parts of your
            future might unfold over time.
          </p>
        </div>
        <div className="timelinepage__hero-stats">
          <div className="timelinepage__stat">
            <span>Visible window</span>
            <strong>{frame.view.label}</strong>
          </div>
          <div className="timelinepage__stat">
            <span>Total lanes</span>
            <strong>{TIMELINE_LANES.length}</strong>
          </div>
        </div>
      </section>

      <section className="timelinepage__composer card">
        <div className="timelinepage__composer-head">
          <div>
            <h2>Add new</h2>
            <p>Keep it simple for v1: title, category, and month range.</p>
          </div>
          <div className="timelinepage__view-toggle" role="tablist" aria-label="Timeline view range">
            {TIMELINE_VIEW_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                className={viewKey === option.value ? "active" : ""}
                onClick={() => setViewKey(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <form className="timelinepage__form" onSubmit={handleAddBlock}>
          <input
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Live in Kyoto"
            disabled={isPersisting || isSaving}
            required
          />
          <select value={lane} onChange={(event) => setLane(event.target.value)} disabled={isPersisting || isSaving}>
            {TIMELINE_LANES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
          <input
            type="month"
            value={startMonth}
            min={toMonthInputValue(startOfMonthISO(todayISO))}
            onChange={(event) => setStartMonth(event.target.value)}
            disabled={isPersisting || isSaving}
            required
          />
          <input
            type="month"
            value={endMonth}
            min={startMonth}
            onChange={(event) => setEndMonth(event.target.value)}
            disabled={isPersisting || isSaving}
            required
          />
          <button type="submit" disabled={isPersisting || isSaving}>
            {isPersisting || isSaving ? "Saving..." : "Add block"}
          </button>
        </form>
        {feedback ? <p className="timelinepage__feedback">{feedback}</p> : null}
      </section>

      {editingBlock ? (
        <section className="timelinepage__details card">
          <div className="timelinepage__details-head">
            <div>
              <p className="timelinepage__eyebrow">Block details</p>
              <h2>Edit timeline block</h2>
              <p>Double-click a block to open its details, then update the title, lane, or timeframe.</p>
            </div>
            <button type="button" className="timelinepage__details-close" onClick={closeEditBlock}>
              Close
            </button>
          </div>

          <form className="timelinepage__form" onSubmit={handleUpdateBlock}>
            <input
              type="text"
              value={editTitle}
              onChange={(event) => setEditTitle(event.target.value)}
              placeholder="Live in Kyoto"
              disabled={isPersisting || isUpdating}
              required
            />
            <select
              value={editLane}
              onChange={(event) => setEditLane(event.target.value)}
              disabled={isPersisting || isUpdating}
            >
              {TIMELINE_LANES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
            <input
              type="month"
              value={editStartMonth}
              min={toMonthInputValue(startOfMonthISO(todayISO))}
              onChange={(event) => setEditStartMonth(event.target.value)}
              disabled={isPersisting || isUpdating}
              required
            />
            <input
              type="month"
              value={editEndMonth}
              min={editStartMonth}
              onChange={(event) => setEditEndMonth(event.target.value)}
              disabled={isPersisting || isUpdating}
              required
            />
            <div className="timelinepage__details-actions">
              <button type="submit" disabled={isPersisting || isUpdating}>
                {isPersisting || isUpdating ? "Saving..." : "Save changes"}
              </button>
              <button
                type="button"
                className="timelinepage__details-delete"
                onClick={handleDeleteEditingBlock}
                disabled={isPersisting || pendingDeleteId === editingBlock.id}
              >
                {pendingDeleteId === editingBlock.id ? "Deleting..." : "Delete block"}
              </button>
            </div>
          </form>
        </section>
      ) : null}

      <section className="timelinepage__canvas card">
        <div className="timelinepage__ticks">
          {ticks.map((tick) => {
            const style = getBlockViewportStyle(
              { startMonth: tick, endMonth: tick },
              frame.startISO,
              frame.view.months
            ) ?? { left: "0%", width: "0%" };

            return (
              <span key={tick} className="timelinepage__tick" style={{ left: style.left }}>
                {formatTimelineTick(tick, frame.view.months)}
              </span>
            );
          })}
        </div>

        <div className="timelinepage__rows">
          {laneLayouts.map(({ lane: laneMeta, layout }) => (
            <div key={laneMeta.value} className="timelinepage__row">
              <div className="timelinepage__lane-label">
                <strong>{laneMeta.label}</strong>
              </div>
              <div
                className="timelinepage__lane-track"
                style={{
                  "--timeline-row-count": layout.rowCount
                }}
              >
                <div className="timelinepage__lane-track-fill" />
                {layout.blocks.map((block) => {
                  const isTiny = block.widthPercent < 10;
                  const isCompact = block.widthPercent < 16;
                  const blockClassName = [
                    "timelinepage__block",
                    isCompact ? "timelinepage__block--compact" : "",
                    isTiny ? "timelinepage__block--tiny" : ""
                  ]
                    .filter(Boolean)
                    .join(" ");

                  return (
                    <article
                      key={block.id}
                      className={blockClassName}
                      style={{
                        ...block.style,
                        "--timeline-accent": laneMeta.accent,
                        "--timeline-row-index": block.rowIndex
                      }}
                      title={`${block.title} • ${formatTimelineRange(block)}`}
                      onDoubleClick={() => openEditBlock(block)}
                    >
                      <div className="timelinepage__block-copy">
                        <strong>{block.title}</strong>
                        {!isTiny ? <small>{formatTimelineRange(block)}</small> : null}
                      </div>
                      <button
                        type="button"
                        className="timelinepage__block-delete"
                        onClick={() => handleDeleteBlock(block.id)}
                        disabled={isPersisting || pendingDeleteId === block.id}
                      >
                        {pendingDeleteId === block.id ? "..." : "×"}
                      </button>
                    </article>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
