import { writeFileSync } from "node:fs";

const ISSUE_PREFIX = "SCORE |";
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

function sanitizePlayerName(name) {
  const cleaned = String(name || "").replace(/[^a-z0-9 _-]/gi, "").trim().slice(0, 20);
  return cleaned || "Anonymous";
}

function parseIssue(issue) {
  if (!issue || issue.pull_request) return null;
  if (!issue.title || !issue.title.startsWith(ISSUE_PREFIX)) return null;

  const titleMatch = issue.title.match(/^SCORE \|\s*(\d+)\s*\|\s*(.+)$/i);
  const body = issue.body || "";
  const line = (label) => {
    const match = body.match(new RegExp(`^${label}:\\s*(.+)$`, "im"));
    return match ? match[1].trim() : "";
  };

  const score = titleMatch ? Number(titleMatch[1]) : Number(line("score"));
  if (!Number.isFinite(score)) return null;

  return {
    player: sanitizePlayerName(titleMatch ? titleMatch[2] : line("player")),
    score,
    waves: Number(line("waves")) || 0,
    kills: Number(line("kills")) || 0,
    combo: Number(line("combo")) || 0,
    scrap: Number(line("scrap")) || 0,
    build: String(line("build") || "Base").slice(0, 120),
    url: issue.html_url,
    createdAt: issue.created_at
  };
}

async function fetchAllIssues() {
  const issues = [];

  for (let page = 1; page <= 10; page += 1) {
    const url = `${API_BASE}/repos/${owner}/${repo}/issues?state=all&per_page=100&page=${page}&sort=created&direction=desc`;
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
const entries = issues
  .map(parseIssue)
  .filter(Boolean)
  .sort((a, b) => b.score - a.score || b.waves - a.waves || b.combo - a.combo || new Date(b.createdAt) - new Date(a.createdAt))
  .slice(0, 25);

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
