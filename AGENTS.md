# AGENTS.md — Shay & Zay Game Development Rules

These instructions apply to every game, feature, refactor, bug fix, and release in this repository.

## Source of truth

Before writing code, read:

1. `docs/GAME_DEVELOPMENT_PLAYBOOK.md`
2. `.codex/skills/game-product-definition/SKILL.md`
3. `.codex/skills/child-first-game-ux/SKILL.md`
4. `.codex/skills/game-quality-release/SKILL.md`

The playbook is authoritative. Do not silently change agreed behaviour while implementing.

## Mandatory workflow

1. Define the game and acceptance criteria before building.
2. Resolve major UX decisions with a low-cost prototype before production code.
3. Build one complete playable vertical slice before adding breadth.
4. Separate game state, game rules, rendering, persistence, and audio.
5. Test on real target devices and screen sizes, not desktop alone.
6. Do not call a feature finished until all acceptance criteria and release gates pass.
7. Record new decisions and lessons in the relevant project documentation.

## Non-negotiable child-safety and usability rules

- No advertising, external links, purchases, chat, tracking, or account creation unless explicitly approved.
- No dark patterns, punishment loops, manipulative timers, or shame-based feedback.
- Primary actions must be obvious, large, and touch-friendly.
- Children must be able to recover from mistakes without losing meaningful progress.
- Text must be minimal, age-appropriate, and supported by visual cues where useful.
- Audio must never be required to understand or play the game.
- Saving and resuming must be reliable and understandable.

## Change control

When a request conflicts with an earlier requirement:

- identify the conflict;
- explain the consequence;
- update the written acceptance criteria;
- implement only after the revised behaviour is explicit.

Do not stack speculative changes onto a bug fix. Fix the defect with the smallest safe change, then evaluate enhancements separately.

## Definition of done

A change is done only when:

- the requested behaviour works;
- existing core flows still work;
- automated checks pass;
- responsive and touch behaviour are verified;
- loading, empty, error, restart, resume, and completion states are handled;
- no known blocker or high-severity defect remains;
- documentation reflects the delivered behaviour.
