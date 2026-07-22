# Game Development Playbook

## Purpose

This playbook is the standard process for creating any new Shay & Zay game. It exists to reduce avoidable revisions by making product decisions, game rules, interaction behaviour, testing, and release standards explicit before they become expensive to change.

The process is intentionally front-loaded: clarify first, prototype uncertain interactions second, then build and test in controlled stages.

---

## 1. Start with a one-page game brief

Do not start production code from a loose idea or visual reference.

The brief must define:

### Player and platform

- Intended age range.
- Primary devices and orientations.
- Expected session length.
- Whether reading, sound, precision dragging, or adult help is required.

### Player promise

Complete this sentence:

> In this game, the child will ________, and it will feel ________.

### Core loop

Describe the repeated action from goal to feedback to progress to completion.

### Complete game rules

Define:

- valid actions;
- incorrect actions;
- success and completion;
- retry and replay;
- pause and exit;
- restart;
- saving and resuming;
- interruptions and edge cases.

### Scope

Divide ideas into:

- **Release 1 — must have**
- **Later — only after the core game is proven**
- **Not included**

A first release should normally contain one highly polished mechanic, not several partly polished modes.

### Acceptance criteria

Write observable Given/When/Then statements for every critical behaviour. These become the contract used by development and testing.

---

## 2. Create a decision record before visual design

Maintain a short table in the game brief:

| Decision | Chosen behaviour | Reason | Status |
|---|---|---|---|
| Progress saving | Automatic after every meaningful action | Prevent lost progress | Approved |

Record choices that are likely to cause later disagreement, including:

- navigation;
- visual style;
- board layout;
- feedback and animation;
- difficulty progression;
- progress model;
- content management;
- device support.

When a decision changes, update the record rather than relying on conversation history.

---

## 3. Prototype the risky parts first

Build disposable prototypes for interactions that are difficult to judge in words or static mock-ups.

Typical risks include:

- drag and drop;
- snapping and placement tolerance;
- jigsaw geometry;
- drawing or pixel input;
- board scaling;
- orientation changes;
- overlapping pieces;
- touch scrolling conflicts;
- animation timing.

A prototype should answer one specific question. Do not polish it or treat it as production code by default.

### Prototype approval gate

Before continuing, verify:

- the interaction feels natural on a real touch device;
- correct actions update visibly and immediately;
- mistakes are easy to recover from;
- the board remains usable at the smallest supported size;
- no second action is needed to reveal the previous state change.

---

## 4. Design the full state model

List all meaningful states before building screens.

Example:

- home;
- game selection;
- loading;
- active play;
- paused;
- completed;
- empty content;
- recoverable error;
- unrecoverable save data;
- first-time help.

For each state define:

- what data exists;
- what is visible;
- what actions are allowed;
- what transitions are possible;
- what is saved.

### Architecture rule

Keep these concerns separate:

1. **Game rules:** pure logic and state transitions.
2. **Game state:** current board, progress, score, selections, and status.
3. **Rendering:** what the user sees.
4. **Input:** pointer, touch, mouse, and keyboard handling.
5. **Persistence:** storage, schema version, migration, and recovery.
6. **Audio and effects:** reactions to committed state changes.

This prevents rendering bugs from being hidden behind unrelated input or state updates.

---

## 5. Build one vertical slice

A vertical slice is one small but complete path that proves the entire system.

It should include:

- launch;
- one content item or level;
- the real core interaction;
- correct and incorrect feedback;
- progress saving;
- completion;
- replay or return home;
- responsive layout.

Do not add large content libraries, extra modes, complex settings, or decorative polish until the vertical slice passes its acceptance criteria on target devices.

---

## 6. Use child-first interaction standards

### Clarity

- One dominant action per screen.
- The next action should be obvious within three seconds.
- Use minimal age-appropriate text.
- Support text with visual cues where useful.

### Touch

- Use large, well-spaced controls.
- Never require hover.
- Prevent page scrolling and text selection during game gestures.
- Handle pointer cancel, off-board release, and orientation changes.

### Feedback

- Every action produces immediate visual feedback.
- A correct action commits and renders during that action.
- Animation explains committed state; it must not substitute for it.
- Sound is optional and never the only feedback.

### Forgiveness

- Mistakes do not destroy unrelated progress.
- Retry is clear and quick.
- Destructive resets require confirmation.
- Avoid shame, punishment loops, manipulative timers, and dark patterns.

### Safety and privacy

No ads, chat, purchases, tracking, account creation, or external links unless explicitly approved and safely designed.

---

## 7. Plan tests before feature completion

Every acceptance criterion should map to a test or explicit manual verification.

### Automated tests

Prioritise pure rules and regressions:

- move validity;
- completion detection;
- progress counting;
- repeated inputs;
- reset;
- saving and migration;
- known defects.

### Interaction tests

Test the full gesture and visible result, not merely internal state.

For drag-and-drop, verify:

- drag begins from the expected point;
- the item tracks correctly;
- valid targets are recognised;
- release commits immediately;
- the item becomes fixed when appropriate;
- progress updates exactly once;
- an invalid release restores a usable state.

### Full journeys

At minimum test:

1. First launch to first success.
2. Start to completion.
3. Pause/leave/reload/resume.
4. Restart.
5. Replay.
6. Missing or invalid content.
7. Corrupted or old saved progress.

### Device matrix

For each supported device class verify:

- portrait and landscape where applicable;
- touch target reach and spacing;
- clipping and overflow;
- board scale;
- browser scroll conflicts;
- performance;
- orientation changes;
- audio and mute behaviour.

Actual target-device testing is mandatory for touch games.

---

## 8. Control changes and revisions

### Separate defects from enhancements

A defect means delivered behaviour does not match the agreed contract. An enhancement changes or expands the contract.

Fix defects with the smallest complete change. Do not combine them with speculative redesigns.

### Use a change-impact check

Before accepting a new request, state whether it affects:

- core rules;
- saved data;
- navigation;
- responsive layout;
- existing content;
- tests;
- release scope.

Update the game brief and acceptance criteria before coding any material behaviour change.

### Avoid patch chains

Repeated local patches often signal an incorrect state model or unclear requirement. Stop and repair the underlying model when:

- one fix causes another interaction to fail;
- forced rerenders or arbitrary delays are proposed;
- the same state is stored in multiple places;
- input handlers and rendering disagree;
- acceptance criteria cannot explain the desired result.

---

## 9. Use formal review gates

### Gate A — Concept ready

- Player promise is clear.
- Core loop is complete.
- Release 1 scope is small.
- Non-goals are explicit.

### Gate B — Specification ready

- Screens, states, rules, and edge cases are defined.
- Acceptance criteria are testable.
- Important decisions are approved.

### Gate C — Interaction ready

- Risky interactions are prototyped.
- Real-device touch testing passes.
- Responsive approach is proven.

### Gate D — Vertical slice ready

- One complete session works.
- State, rendering, input, and persistence are correctly separated.
- Core tests pass.

### Gate E — Content complete

- Remaining content uses the proven system.
- No new unapproved mechanics were introduced.
- Full journeys pass.

### Gate F — Release ready

- Build and tests pass.
- No blocker or high-severity defects remain.
- Save compatibility is safe.
- Target-device checks pass.
- Deployment and rollback are prepared.

### Gate G — Live verified

- Deployed URL loads in a clean session.
- Core play, save, reload, resume, completion, and replay work live.
- Mobile layout and asset paths are correct.

---

## 10. Standard project documents

Every new game should contain:

```text
docs/games/<game-name>/
  GAME_BRIEF.md
  DECISIONS.md
  ACCEPTANCE_CRITERIA.md
  TEST_PLAN.md
  RELEASE_NOTES.md
```

Keep them short and current. One accurate page is more valuable than a long outdated specification.

### Recommended build sequence

```text
Idea
→ Game brief
→ Decisions and acceptance criteria
→ Interaction prototype
→ Vertical slice
→ Device testing
→ Content expansion
→ Regression and journey testing
→ Release candidate
→ Live smoke test
```

---

## Final definition of done

A game is complete only when:

- children can understand and start it without unnecessary adult help;
- the core interaction is responsive and truthful;
- all agreed rules and edge cases are implemented;
- progress is safely stored and resumed as promised;
- target devices and orientations work;
- automated checks and full player journeys pass;
- no blocker or high defect is known;
- the live deployment has been verified;
- documentation matches the released behaviour.
