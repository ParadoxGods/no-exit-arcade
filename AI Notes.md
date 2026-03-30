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
- GitHub Actions runs `scripts/update-leaderboard.mjs` on score issue activity and rewrites `leaderboard.json`.
- The live page reads `leaderboard.json` and polls periodically so the board updates without exposing write credentials in the browser.

## Deployment Target
- GitHub repo: `ParadoxGods/no-exit-arcade`
- GitHub Pages URL: `https://paradoxgods.github.io/no-exit-arcade/`

## Important Files
- `index.html`: game, UI, settings, leaderboard client.
- `leaderboard.json`: public leaderboard feed served by Pages.
- `.github/workflows/update-leaderboard.yml`: issue-to-feed automation.
- `scripts/update-leaderboard.mjs`: leaderboard feed generator.

## Resume Checklist
1. Confirm GitHub Pages is still serving from `main` root.
2. Verify `leaderboard.json` is being updated by the action after a score issue is opened.
3. If the leaderboard looks stale, check the Actions tab for the `Update Leaderboard` workflow.
4. If gameplay changes add new score fields, update both `buildLeaderboardIssueUrl()` and `scripts/update-leaderboard.mjs`.
