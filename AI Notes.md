# AI Notes

## Project
`No Exit Arcade` is a single-file browser arena shooter in `index.html`. The brief was to make a genuinely fun self-contained game for a trapped-room scenario, then refine it into a cleaner multi-scene experience.

## Scene Flow
- `menu`: intro scene with quick start or hangar entry.
- `hangar`: between-run upgrade shop that spends persistent scrap.
- `running`: uninterrupted combat run with the HUD pared down to core combat info.
- `gameover`: results scene with run stats and score submission.

## Core Systems
- Pointer aim + keyboard movement, dash, and overdrive.
- Waves with bosses every fourth round.
- Marked bounty targets appear during runs. Killing them triggers `Reactor Rush`, a short buff to movement, fire rate, pickup magnetism, and overdrive gain.
- Persistent profile data is stored in `state.meta` and now includes `scrap`, `xp`, `level`, `skillPoints`, `loadout`, `skills`, ship `design`, and simple run `records`.
- `state.meta.design` stores the shipyard build: a base ship with point allocations for `armor`, `speed`, and `damage`, plus a selected primary weapon part and optional system parts.
- The shipyard now uses a fixed `500` point build budget. Stats cost `25` each, and the player can mount up to `2` system parts.
- Weapon parts currently ship as `Base Cannon`, `Scatter Array`, `Needle Carbine`, and `Rail Lance`.
- System parts currently ship as `Shield Projector`, `Dash Jets`, `Recovery Plating`, `Pierce Chamber`, `Drone Bay`, `Chain Relay`, and `Overdrive Capacitor`.
- Hangar upgrades are level-gated, and pilot skills are unlocked and purchased separately with skill points earned from leveling.
- Flat UI direction: square corners, no UI glow, no UI gradients.
- Audio is generated with the Web Audio API. Gunshot SFX are handled by `audio.shoot()` and `audio.heavyShot()`.

## Settings
- Stored in `localStorage` under `no-exit-arcade-settings-v1`.
- Includes quality preset, master/music/SFX volume, and SFX enable toggle.
- Public leaderboard player name is stored separately under `no-exit-arcade-player-v1`.
- The persistent progression profile is stored under `no-exit-arcade-profile-v1`.

## Leaderboard Design
- Public score submissions are GitHub issues in `ParadoxGods/no-exit-arcade`.
- The results screen opens a prefilled issue composer with a score payload in the title/body.
- GitHub Actions runs `scripts/moderate-score-issues.mjs` first, then `scripts/update-leaderboard.mjs`.
- Score payloads now include versioned anti-cheat fields: bosses, wave score, kill score, run duration, loadout signature, skill signature, and kill breakdown.
- Shipyard builds are now included in the score payload as `ship_design`, and the validator rejects submissions whose budget, part slots, or level-gated parts do not match the live rules.
- Invalid score issues are deleted with `SCORE_MOD_TOKEN` when that repo secret is present; otherwise the workflow closes them and excludes them from the feed.
- The live page reads `leaderboard.json` and polls periodically so the board updates without exposing write credentials in the browser.

## Deployment Target
- GitHub repo: `ParadoxGods/no-exit-arcade`
- GitHub Pages URL: `https://paradoxgods.github.io/no-exit-arcade/`

## Important Files
- `index.html`: game, UI, settings, leaderboard client.
- `leaderboard.json`: public leaderboard feed served by Pages.
- `scripts/leaderboard-core.mjs`: shared parsing and validation logic for score issues.
- `.github/workflows/update-leaderboard.yml`: issue-to-feed automation.
- `scripts/moderate-score-issues.mjs`: anti-cheat enforcement for submitted scores.
- `scripts/update-leaderboard.mjs`: leaderboard feed generator that only includes validated scores.

## Resume Checklist
1. Confirm GitHub Pages is still serving from `main` root.
2. Verify `leaderboard.json` is being updated by the action after a score issue is opened.
3. If a score disappears unexpectedly, check the Actions tab and the moderation script logic in `scripts/leaderboard-core.mjs`.
4. If gameplay changes add new score fields, update both `buildLeaderboardIssueUrl()` and the validators in `scripts/leaderboard-core.mjs`.
5. Skill and level progression do not change the scoreboard formula, but if the skill roster or caps change, update both `buildLeaderboardIssueUrl()` and `scripts/leaderboard-core.mjs`.
6. If shipyard costs, caps, or weapon ids change, update both `index.html` and `scripts/leaderboard-core.mjs` so anti-cheat stays aligned with the live build.
