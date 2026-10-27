# Browser Game Growth — Codex Skill

A focused, reusable game design and implementation skill for **progression**, **new gameplay features**, and **player retention** in browser-playable games.

The skill is engine-agnostic and adapts to the actual project. It supports browser JavaScript/TypeScript games and Godot projects exported to the web.

## Install for a project (recommended)

Extract this ZIP so the folder structure looks like:

```text
YOUR_GAME/
  .agents/
    skills/
      browser-game-growth/
        SKILL.md
        README.md
        references/
        templates/
        scripts/
```

Then restart/reload the Codex session if it does not detect the skill immediately. You can also install it at `~/.agents/skills/browser-game-growth/` to use it across projects.

In Codex, invoke **`$browser-game-growth`** explicitly, or ask for a progression/retention task and allow skill discovery.

## Try these prompts

- `$browser-game-growth Audit my current browser game and design a progression system that makes the first 15 minutes rewarding without introducing grind. Inspect the repository first. Design only, no code.`
- `$browser-game-growth Propose 8 new gameplay features, rank them by player value/retention, implementation cost and dependency risk. Recommend one MVP feature.`
- `$browser-game-growth Plan a 7-day player journey with meaningful unlocks, visible goals and healthy stopping points. Use estimates only, and tell me what to playtest.`
- `$browser-game-growth Implement the next approved quest/progression slice using existing game state and saving patterns; add tests, instrumentation, and run the relevant checks.`
- `$browser-game-growth Audit retention instrumentation and identify the top three drop-off hypotheses using the metrics actually available in this codebase.`

## What's included

- `SKILL.md` — routing, design principles and execution workflow
- `references/progression-and-pacing.md` — pacing, mastery, vertical/horizontal progression, unlock dependencies
- `references/feature-design-and-prioritization.md` — feature idea generation, scoring, production and validation
- `references/retention-and-experiments.md` — onboarding, voluntary return motives, instrumentation and cohorts
- `references/economy-and-balance.md` — currencies, sinks/faucets, fairness, economy failure modes
- `templates/feature-brief.md` — build-ready feature specification
- `templates/progression-map.md` — progression planning worksheet
- `templates/retention-experiment.md` — measurable experiment brief
- `scripts/progression_audit.py` — no-dependency mechanical progression checks
- `scripts/sample_progression.json` — fictional demo configuration for the audit

No accounts or external analytics services are required to use the skill. The example data is intentionally illustrative, not a retention benchmark.

## Reference background

- [OpenAI — Skills](https://developers.openai.com/api/docs/guides/tools-skills)
- [OpenAI — Using skills in repositories](https://developers.openai.com/blog/skills-agents-sdk)
- [Roblox Creator Hub — Onboarding](https://create.roblox.com/docs/production/game-design/onboarding)

This skill was independently written for a browser-game creator, not copied from a third-party skill.
