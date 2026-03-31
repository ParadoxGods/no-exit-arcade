import {
  parseScoreIssue,
  validateScoreIssue
} from "./leaderboard-core.mjs";

const API_BASE = process.env.GITHUB_API_URL || "https://api.github.com";
const REPOSITORY = process.env.GITHUB_REPOSITORY || "ParadoxGods/no-exit-arcade";
const TOKEN = process.env.GITHUB_TOKEN;

if (!TOKEN) {
  throw new Error("GITHUB_TOKEN is required for score moderation.");
}

const [owner, repo] = REPOSITORY.split("/");
const headers = {
  Accept: "application/vnd.github+json",
  Authorization: `Bearer ${TOKEN}`,
  "Content-Type": "application/json",
  "User-Agent": "no-exit-arcade-moderator"
};

async function fetchAllScoreIssues() {
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

async function deleteIssue(issue) {
  const response = await fetch(`${API_BASE}/graphql`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      query: `
        mutation DeleteIssue($issueId: ID!) {
          deleteIssue(input: { issueId: $issueId }) {
            clientMutationId
          }
        }
      `,
      variables: {
        issueId: issue.node_id
      }
    })
  });

  const payload = await response.json();
  if (!response.ok || payload.errors) {
    throw new Error(payload.errors ? payload.errors.map((entry) => entry.message).join("; ") : `Delete failed with ${response.status}`);
  }
}

async function closeIssue(issue, reason) {
  await fetch(`${API_BASE}/repos/${owner}/${repo}/issues/${issue.number}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({
      state: "closed",
      state_reason: "not_planned"
    })
  });

  await fetch(`${API_BASE}/repos/${owner}/${repo}/issues/${issue.number}/comments`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      body: `Score removed from the leaderboard pipeline.\n\nValidation failed:\n- ${reason.join("\n- ")}`
    })
  });
}

const issues = await fetchAllScoreIssues();

for (const issue of issues) {
  const parsed = parseScoreIssue(issue);
  if (!parsed) continue;

  const validation = validateScoreIssue(parsed);
  if (validation.valid) continue;

  console.log(`Rejecting score issue #${issue.number}: ${validation.reasons.join(" | ")}`);
  try {
    await deleteIssue(issue);
    console.log(`Deleted issue #${issue.number}.`);
  } catch (error) {
    console.log(`Delete failed for #${issue.number}, closing instead: ${error.message}`);
    await closeIssue(issue, validation.reasons);
  }
}
