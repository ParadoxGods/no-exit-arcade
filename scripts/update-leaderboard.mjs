import { writeFileSync } from "node:fs";
import {
  parseScoreIssue,
  sortLeaderboardEntries,
  toLeaderboardEntry,
  validateScoreIssue
} from "./leaderboard-core.mjs";

const API_BASE = process.env.GITHUB_API_URL || "https://api.github.com";
const REPOSITORY = process.env.GITHUB_REPOSITORY || "ParadoxGods/no-exit-arcade";
const TOKEN = process.env.GITHUB_TOKEN;

const [owner, repo] = REPOSITORY.split("/");
const headers = {
  Accept: "application/vnd.github+json",
  "User-Agent": "no-exit-arcade-leaderboard"
};

if (TOKEN) {
  headers.Authorization = `Bearer ${TOKEN}`;
}

async function fetchAllIssues() {
  const issues = [];

  for (let page = 1; page <= 10; page += 1) {
    const url = `${API_BASE}/repos/${owner}/${repo}/issues?state=open&per_page=100&page=${page}&sort=created&direction=desc`;
    const response = await fetch(url, { headers });
    if (!response.ok) {
      throw new Error(`GitHub issues request failed: ${response.status}`);
    }

    const batch = await response.json();
    if (!Array.isArray(batch) || batch.length === 0) {
      break;
    }

    issues.push(...batch);
    if (batch.length < 100) {
      break;
    }
  }

  return issues;
}

const issues = await fetchAllIssues();
const entries = sortLeaderboardEntries(
  issues
    .map(parseScoreIssue)
    .filter(Boolean)
    .filter((parsed) => validateScoreIssue(parsed).valid)
    .map(toLeaderboardEntry)
).slice(0, 25);

writeFileSync(
  "leaderboard.json",
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      entries
    },
    null,
    2
  ) + "\n"
);
