I’m building a personal operating system / self-development web app.

Current product idea:
The app started as a habits app, but it is evolving into a broader system for shaping a person’s life from daily actions up to long-term direction.

Core conceptual layers:
1. Habits
- recurring actions
- the app decides what is due today based on frequency and priority

2. Attributes
- qualities/capacities habits build
- habits can contribute to one or more attributes with numeric weights
- attributes can optionally have linear daily decay
- some attributes can be marked as current focus attributes

3. Vision
- long-term identity layer
- reflective page about the user’s ideal self
- current prompts are about:
  - what the ideal self looks like
  - how life feels in that state
  - what patterns block it
  - what new patterns would move the user closer

4. Focus
- current block / current period layer
- shorter-term than Vision
- includes:
  - focus title
  - start date
  - end date
  - what this block is about
  - who the user wants to be by the end
  - current obstacles
- users can also select:
  - focus domains
  - focus goals / subgoals

5. Domains
- tree structure / mindmap-like hierarchy of larger life areas
- examples:
  - Martial Arts
    - Kicking
      - Balance
      - Kick height
  - Business
    - Networking
    - Social media
- domains are a structural layer, not a daily action layer
- domains can currently link to:
  - goals
  - pursuits
  - habits
- focus can highlight certain domains

6. Goals
- list of outcomes the user wants
- examples:
  - Hit 70kg lean mass
  - Build a business with 1 million revenue
  - Hit Diamond in Starcraft
- goals can be:
  - long term
  - fixed time frame
- goals can also have subgoals
- goals can link to domains
- focus can select goals or subgoals for the current block

7. Pursuits
- a page for learnings / projects / things the user is actively undertaking
- intended to hold courses, projects, work streams, etc in one place
- pursuits can link to:
  - goals / subgoals
  - domains

8. One-off tasks
- on Today, user can log a one-off completed task that is not a recurring habit
- examples:
  - Jogging
  - Deep work session
- these can also contribute to attributes
- they appear in Today completed section and in History

9. Tracking
- separate from habits
- for daily quantitative metrics rather than done/not-done actions
- examples:
  - Calories
  - Protein
  - Fibre
  - Water
  - Exercise time
- user defines metrics on a Tracking page
- logs values on Today
- sees entries in History

10. Settings
- app-level preferences
- currently includes things like:
  - highlight focus attributes
  - use attribute decay

Current pages:
- Today
- Habits
- Attributes
- Growth dropdown:
  - Vision
  - Focus
  - Domains
  - Goals
  - Pursuits
- More dropdown:
  - History
  - Tracking
  - Settings
  - Help

How pages are currently connected:
- Habits -> Attributes
  - habits can strengthen attributes with weighted links

- Habits -> Domains
  - habits can link to domains they support

- Vision -> Focus Attributes
  - vision includes selected focus attributes

- Focus -> Domains
  - focus period can select domains that matter right now

- Focus -> Goals / Subgoals
  - focus period can select goals or subgoals for the current block

- Goals -> Domains
  - goals can link to one or more domains

- Pursuits -> Goals / Subgoals
  - pursuits can contribute to goals or subgoals

- Pursuits -> Domains
  - pursuits can link to one or more domains

- Domains page
  - currently shows linked goals, linked pursuits, and linked habits for each node

- Today page
  - shows daily due habits
  - shows tracked metrics
  - allows logging one-off tasks
  - has a compact current focus panel showing focused domains, selected goals, and aligned pursuits

- History page
  - shows habit completions
  - one-off tasks
  - tracking entries
  - also allows logging past one-off tasks

Current navigation philosophy:
- keep the daily/core pages visible
- group reflective/planning pages under Growth
- group utility pages under More
- avoid overwhelming the header

Current product direction:
The app is meant to grow with the user.
A beginner can use it as a habits app.
A more engaged user can use it as a broader life-design system:
Vision -> Focus -> Domains -> Goals / Pursuits -> Habits / Tracking -> Today

Important design principle:
I do not want the app to become bloated or overcomplicated.
The deeper layers should feel optional and additive, not required for basic use.

What I want help thinking about:
- higher-level product direction
- what abstractions belong where
- whether the app structure is coherent
- what features are natural next steps
- how to keep the app powerful without overwhelming the user
