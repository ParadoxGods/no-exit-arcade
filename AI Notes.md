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
- Persistent hangar upgrades stored in `state.meta.loadout`.
- Flat UI direction: square corners, no UI glow, no UI gradients.
- Audio is generated with the Web Audio API. Gunshot SFX are handled by `audio.shoot()` and `audio.heavyShot()`.

## Settings
- Stored in `localStorage` under `no-exit-arcade-settings-v1`.
- Includes quality preset, master/music/SFX volume, and SFX enable toggle.
- Public leaderboard player name is stored separately under `no-exit-arcade-player-v1`.

## Leaderboard Design
- Public score submissions are GitHub issues in `ParadoxGods/no-exit-arcade`.
- The results screen opens a prefilled issue composer with a score payload in the title/body.
- GitHub Actions runs `scripts/moderate-score-issues.mjs` first, then `scripts/update-leaderboard.mjs`.
- Score payloads now include versioned anti-cheat fields: bosses, wave score, kill score, run duration, loadout signature, and kill breakdown.
- Invalid score issues are deleted when possible; if the token cannot hard-delete them, the workflow closes them and excludes them from the feed.
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
