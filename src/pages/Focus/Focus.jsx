import React, { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import "./Focus.scss";

export default function Focus() {
  const { focus, goals, domains, learnings, onSaveFocus, isPersisting } = useOutletContext();
  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [whyNow, setWhyNow] = useState("");
  const [endState, setEndState] = useState("");
  const [currentObstacles, setCurrentObstacles] = useState("");
  const [focusDomainIds, setFocusDomainIds] = useState([]);
  const [domainDraft, setDomainDraft] = useState("");
  const [focusTargets, setFocusTargets] = useState([]);
  const [targetDraft, setTargetDraft] = useState("");
  const [feedback, setFeedback] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  function buildTargetKey(target) {
    if (target.kind === "subgoal") {
      return `subgoal:${target.goalId}:${target.subgoalId}`;
    }

    return `goal:${target.goalId}`;
  }

  useEffect(() => {
    setTitle(focus?.title ?? "");
    setStartDate(focus?.startDate ?? "");
    setEndDate(focus?.endDate ?? "");
    setWhyNow(focus?.whyNow ?? "");
    setEndState(focus?.endState ?? "");
    setCurrentObstacles(focus?.currentObstacles ?? "");
    setFocusDomainIds(Array.isArray(focus?.focusDomainIds) ? focus.focusDomainIds : []);
    setDomainDraft("");
    setFocusTargets(Array.isArray(focus?.focusTargets) ? focus.focusTargets : []);
    setTargetDraft("");
  }, [focus]);

  const selectedDomainIds = new Set(focusDomainIds);
  const selectedTargetKeys = new Set(focusTargets.map(buildTargetKey));
  const domainOptions = [...domains].sort((a, b) => a.name.localeCompare(b.name));
  const targetOptions = goals.flatMap((goal) => {
    const options = [
      {
        value: buildTargetKey({ kind: "goal", goalId: goal.id, subgoalId: "" }),
        label: goal.title,
        kindLabel: "Goal"
      }
    ];

    if (Array.isArray(goal.subgoals)) {
      goal.subgoals.forEach((subgoal) => {
        options.push({
          value: buildTargetKey({
            kind: "subgoal",
            goalId: goal.id,
            subgoalId: subgoal.id
          }),
          label: `${goal.title} -> ${subgoal.title}`,
          kindLabel: "Subgoal"
        });
      });
    }

    return options;
  });
  const focusedDomains = domains.filter((domain) => selectedDomainIds.has(domain.id));
  const alignedGoalIds = new Set(focusTargets.map((target) => target.goalId));
  const alignedGoals = goals.filter((goal) => alignedGoalIds.has(goal.id));
  const alignedPursuits = learnings.filter((item) => {
    const matchesDomain =
      Array.isArray(item.domainIds) && item.domainIds.some((domainId) => selectedDomainIds.has(domainId));
    const matchesGoal =
      Array.isArray(item.pursuitTargets) &&
      item.pursuitTargets.some((target) => alignedGoalIds.has(target.goalId));
    return matchesDomain || matchesGoal;
  });

  function parseTargetKey(targetKey) {
    const [kind, goalId, subgoalId] = String(targetKey ?? "").split(":");
    if (!goalId) return null;

    if (kind === "subgoal" && subgoalId) {
      return { kind: "subgoal", goalId, subgoalId };
    }

    if (kind === "goal") {
      return { kind: "goal", goalId, subgoalId: "" };
    }

    return null;
  }

  function addTargetFromDraft() {
    const nextTarget = parseTargetKey(targetDraft);
    if (!nextTarget) return;

    const targetKey = buildTargetKey(nextTarget);
    setFocusTargets((current) =>
      current.some((target) => buildTargetKey(target) === targetKey) ? current : [...current, nextTarget]
    );
    setTargetDraft("");
  }

  function addDomainFromDraft() {
    const nextDomainId = String(domainDraft ?? "");
    if (!nextDomainId) return;

    setFocusDomainIds((current) =>
      current.includes(nextDomainId) ? current : [...current, nextDomainId]
    );
    setDomainDraft("");
  }

  function removeDomain(domainId) {
    setFocusDomainIds((current) => current.filter((id) => id !== domainId));
  }

  function describeDomain(domainId) {
    const domain = domains.find((item) => item.id === domainId);
    return domain ? domain.name : "Unknown domain";
  }

  function removeTarget(targetKey) {
    setFocusTargets((current) => current.filter((target) => buildTargetKey(target) !== targetKey));
  }

  function describeTarget(target) {
    const goal = goals.find((item) => item.id === target.goalId);
    if (!goal) {
      return "Unknown target";
    }

    if (target.kind === "goal") {
      return goal.title;
    }

    const subgoal = Array.isArray(goal.subgoals)
      ? goal.subgoals.find((item) => item.id === target.subgoalId)
      : null;

    return subgoal ? `${goal.title} -> ${subgoal.title}` : goal.title;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFeedback("");
    setIsSaving(true);

    const result = await onSaveFocus({
      ...focus,
      title,
      startDate,
      endDate,
      whyNow,
      endState,
      currentObstacles,
      focusDomainIds,
      focusTargets
    });

    if (result?.ok) {
      setFeedback("Focus saved.");
    } else {
      setFeedback(result?.error ?? "Could not save focus.");
    }

    setIsSaving(false);
  }

  return (
    <div className="focuspage">
      <section className="focuspage__section card">
        <form className="focuspage__form" onSubmit={handleSubmit}>
          <div className="focuspage__field">
            <label htmlFor="focus-title">Focus title</label>
            <p>Give this block a short name.</p>
            <input
              id="focus-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isSaving || isPersisting}
            />
          </div>

          <div className="focuspage__split">
            <div className="focuspage__field">
              <label htmlFor="focus-start-date">Start date</label>
              <input
                id="focus-start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                disabled={isSaving || isPersisting}
              />
            </div>

            <div className="focuspage__field">
              <label htmlFor="focus-end-date">End date</label>
              <input
                id="focus-end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                disabled={isSaving || isPersisting}
              />
            </div>
          </div>

          <div className="focuspage__field">
            <label htmlFor="focus-why-now">What is your main focus for this block?</label>
            <p>What is this block really about?</p>
            <textarea
              id="focus-why-now"
              value={whyNow}
              onChange={(e) => setWhyNow(e.target.value)}
              rows={5}
              disabled={isSaving || isPersisting}
            />
          </div>

          <div className="focuspage__field">
            <label htmlFor="focus-end-state">Who do you want to be by the end of this block?</label>
            <p>Describe how you want to see yourself after this.</p>
            <textarea
              id="focus-end-state"
              value={endState}
              onChange={(e) => setEndState(e.target.value)}
              rows={5}
              disabled={isSaving || isPersisting}
            />
          </div>

          <div className="focuspage__field">
            <label htmlFor="focus-obstacles">What is getting in the way, or likely to get in the way?</label>
            <p>Name the obstacles clearly so this block stays realistic.</p>
            <textarea
              id="focus-obstacles"
              value={currentObstacles}
              onChange={(e) => setCurrentObstacles(e.target.value)}
              rows={5}
              disabled={isSaving || isPersisting}
            />
          </div>

          <div className="focuspage__field">
            <label>What domains matter most during this block?</label>
            <p>Select the larger areas or branches you want this block to support.</p>
            <div className="focuspage__targets">
              {domains.length === 0 ? (
                <p className="focuspage__targets-empty">
                  Add domains first if you want to connect this focus block to them.
                </p>
              ) : (
                <>
                  <div className="focuspage__target-picker">
                    <select
                      value={domainDraft}
                      onChange={(e) => setDomainDraft(e.target.value)}
                      disabled={isSaving || isPersisting}
                    >
                      <option value="">Select a domain</option>
                      {domainOptions.map((domain) => (
                        <option key={domain.id} value={domain.id} disabled={selectedDomainIds.has(domain.id)}>
                          {domain.name}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={addDomainFromDraft}
                      disabled={isSaving || isPersisting || !domainDraft}
                    >
                      Add
                    </button>
                  </div>

                  {focusDomainIds.length > 0 ? (
                    <ul className="focuspage__target-list">
                      {focusDomainIds.map((domainId) => (
                        <li key={domainId}>
                          <span>{describeDomain(domainId)}</span>
                          <button
                            type="button"
                            onClick={() => removeDomain(domainId)}
                            disabled={isSaving || isPersisting}
                          >
                            Remove
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </>
              )}
            </div>
          </div>

          <div className="focuspage__field">
            <label>What are you focusing on within your goals?</label>
            <p>Select whole goals, specific subgoals, or both.</p>
            <div className="focuspage__targets">
              {goals.length === 0 ? (
                <p className="focuspage__targets-empty">
                  Add goals first if you want to connect this focus period to them.
                </p>
              ) : (
                <>
                  <div className="focuspage__target-picker">
                    <select
                      value={targetDraft}
                      onChange={(e) => setTargetDraft(e.target.value)}
                      disabled={isSaving || isPersisting}
                    >
                      <option value="">Select a goal or subgoal</option>
                      {targetOptions.map((option) => (
                        <option
                          key={option.value}
                          value={option.value}
                          disabled={selectedTargetKeys.has(option.value)}
                        >
                          {option.kindLabel}: {option.label}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={addTargetFromDraft}
                      disabled={isSaving || isPersisting || !targetDraft}
                    >
                      Add
                    </button>
                  </div>

                  {focusTargets.length > 0 ? (
                    <ul className="focuspage__target-list">
                      {focusTargets.map((target) => {
                        const targetKey = buildTargetKey(target);
                        return (
                          <li key={targetKey}>
                            <span>{describeTarget(target)}</span>
                            <button
                              type="button"
                              onClick={() => removeTarget(targetKey)}
                              disabled={isSaving || isPersisting}
                            >
                              Remove
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  ) : null}
                </>
              )}
            </div>
          </div>

          <div className="focuspage__actions">
            <button type="submit" disabled={isSaving || isPersisting}>
              {isSaving || isPersisting ? "Saving..." : "Save focus"}
            </button>
            {feedback ? <p className="focuspage__feedback">{feedback}</p> : null}
          </div>
        </form>
      </section>

      <section className="focuspage__section card">
        <div className="focuspage__overview-head">
          <h3>Currently aligned</h3>
          <p>What this block is pointing at right now.</p>
        </div>

        <div className="focuspage__overview">
          <article className="focuspage__overview-card">
            <span>Domains</span>
            {focusedDomains.length === 0 ? (
              <p>None selected yet.</p>
            ) : (
              <ul>
                {focusedDomains.map((domain) => (
                  <li key={domain.id}>{domain.name}</li>
                ))}
              </ul>
            )}
          </article>

          <article className="focuspage__overview-card">
            <span>Goals</span>
            {alignedGoals.length === 0 ? (
              <p>None selected yet.</p>
            ) : (
              <ul>
                {alignedGoals.map((goal) => (
                  <li key={goal.id}>{goal.title}</li>
                ))}
              </ul>
            )}
          </article>

          <article className="focuspage__overview-card">
            <span>Pursuits</span>
            {alignedPursuits.length === 0 ? (
              <p>No linked pursuits yet.</p>
            ) : (
              <ul>
                {alignedPursuits.map((item) => (
                  <li key={item.id}>{item.title}</li>
                ))}
              </ul>
            )}
          </article>
        </div>
      </section>
    </div>
  );
}
