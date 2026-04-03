export const ISSUE_PREFIX = "SCORE |";

export const SCORE_VALUES = {
  scout: 22,
  shooter: 34,
  splitter: 30,
  mini: 10,
  dasher: 35,
  orbiter: 42,
  brute: 70,
  boss: 540
};

export const UPGRADE_LIMITS = {
  multishot: 3,
  firerate: 4,
  thrust: 4,
  drones: 4,
  pulse: 3,
  chain: 3,
  pierce: 3,
  recovery: 3,
  luck: 3,
  chaos: 2,
  redline: 3
};

export const SKILL_LIMITS = {
  flow: 3,
  pursuit: 3,
  magnetics: 3,
  ignition: 3,
  bulwark: 3
};

export const SHIP_V4_BUDGET = 12;
export const SHIP_V4_STAT_LIMIT = 6;
export const SHIP_V4_WEAPON_COSTS = {
  pulse: 4,
  scatter: 3,
  carbine: 4,
  rail: 5
};

export const SHIP_V5_BUDGET = 500;
export const SHIP_V5_STAT_LIMIT = 10;
export const SHIP_V5_STAT_COST = 25;
export const SHIP_V5_MAX_MODULES = 2;
export const SHIP_V5_WEAPON_COSTS = {
  standard: 0,
  scatter: 90,
  carbine: 120,
  rail: 160
};
export const SHIP_V5_WEAPON_UNLOCKS = {
  standard: 1,
  scatter: 2,
  carbine: 3,
  rail: 5
};
export const SHIP_V5_MODULE_COSTS = {
  shield_projector: 80,
  dash_jets: 60,
  recovery_plating: 70,
  pierce_chamber: 85,
  drone_bay: 110,
  chain_relay: 95,
  overdrive_capacitor: 100
};
export const SHIP_V5_MODULE_UNLOCKS = {
  shield_projector: 2,
  dash_jets: 2,
  recovery_plating: 3,
  pierce_chamber: 3,
  drone_bay: 4,
  chain_relay: 4,
  overdrive_capacitor: 5
};

export function sanitizePlayerName(name) {
  const cleaned = String(name || "").replace(/[^a-z0-9 _-]/gi, "").trim().slice(0, 20);
  return cleaned || "Anonymous";
}

function parseLineFields(body) {
  const fields = {};
  for (const rawLine of String(body || "").split(/\r?\n/)) {
    const match = rawLine.match(/^([a-z_]+):\s*(.+)$/i);
    if (!match) continue;
    fields[match[1].toLowerCase()] = match[2].trim();
  }
  return fields;
}

function parseInteger(value) {
  if (value === undefined) return null;
  if (!/^-?\d+$/.test(String(value))) return Number.NaN;
  return Number(value);
}

function parseAssignmentMap(raw) {
  if (!raw) return null;
  const parsed = {};
  for (const chunk of String(raw).split(",")) {
    const [left, right] = chunk.split("=");
    if (!left || right === undefined) return null;
    const key = left.trim();
    const amount = parseInteger(right.trim());
    if (!key || !Number.isFinite(amount)) return null;
    parsed[key] = amount;
  }
  return parsed;
}

function parseShipDesign(raw) {
  if (!raw) return null;
  const parsed = {};
  for (const chunk of String(raw).split(",")) {
    const [left, right] = chunk.split("=");
    if (!left || right === undefined) return null;
    const key = left.trim();
    const value = right.trim();
    if (!key || !value) return null;
    if (key === "weapon") {
      parsed.weapon = value;
      continue;
    }
    if (key === "modules") {
      parsed.modules = value.toLowerCase() === "none" ? [] : value.split("+").map((entry) => entry.trim()).filter(Boolean);
      continue;
    }
    const amount = parseInteger(value);
    if (!Number.isFinite(amount)) return null;
    parsed[key] = amount;
  }
  return parsed;
}

function normalizeCountMap(source, knownKeys) {
  const normalized = {};
  for (const key of knownKeys) {
    normalized[key] = 0;
  }
  for (const [key, value] of Object.entries(source)) {
    if (!(key in normalized)) return null;
    normalized[key] = value;
  }
  return normalized;
}

export function expectedWaveScore(waves) {
  return 40 * waves * waves + 290 * waves;
}

export function expectedScrap(score, waves, bosses, kills) {
  return Math.max(1, Math.floor(score / 1800) + waves * 2 + bosses * 5 + Math.floor(kills / 18));
}

export function computeMinKillScore(killBreakdown) {
  return Object.entries(killBreakdown).reduce((sum, [type, count]) => sum + SCORE_VALUES[type] * count, 0);
}

export function computeMaxKillScore(killBreakdown, longestCombo) {
  const bases = [];
  for (const [type, count] of Object.entries(killBreakdown)) {
    for (let i = 0; i < count; i += 1) {
      bases.push(SCORE_VALUES[type]);
    }
  }

  if (!bases.length) return 0;

  const comboCap = Math.max(1, Math.min(longestCombo, bases.length));
  const multipliers = [];
  let remaining = bases.length;
  while (remaining > 0) {
    const chain = Math.min(comboCap, remaining);
    for (let i = 0; i < chain; i += 1) {
      multipliers.push(1 + i * 0.05);
    }
    remaining -= chain;
  }

  bases.sort((a, b) => b - a);
  multipliers.sort((a, b) => b - a);

  return bases.reduce((sum, base, index) => sum + Math.round(base * multipliers[index]), 0);
}

export function parseScoreIssue(issue) {
  if (!issue || issue.pull_request) return null;
  if (!issue.title || !issue.title.startsWith(ISSUE_PREFIX)) return null;

  const titleMatch = issue.title.match(/^SCORE \|\s*(\d+)\s*\|\s*(.+)$/i);
  if (!titleMatch) {
    return {
      issue,
      validFormat: false,
      player: "Anonymous",
      score: Number.NaN
    };
  }

  const fields = parseLineFields(issue.body || "");
  const rawLoadout = parseAssignmentMap(fields.loadout);
  const rawSkills = parseAssignmentMap(fields.skills);
  const rawKillBreakdown = parseAssignmentMap(fields.kill_breakdown);
  const rawShipDesign = parseShipDesign(fields.ship_design);

  return {
    issue,
    validFormat: true,
    markerPresent: String(issue.body || "").includes("<!-- no-exit-arcade-score -->"),
    titleScore: Number(titleMatch[1]),
    titlePlayer: sanitizePlayerName(titleMatch[2]),
    version: parseInteger(fields.version),
    player: sanitizePlayerName(fields.player),
    score: parseInteger(fields.score),
    waves: parseInteger(fields.waves),
    kills: parseInteger(fields.kills),
    combo: parseInteger(fields.combo),
    bosses: parseInteger(fields.bosses),
    waveScore: parseInteger(fields.wave_score),
    killScore: parseInteger(fields.kill_score),
    runMs: parseInteger(fields.run_ms),
    scrap: parseInteger(fields.scrap),
    profileLevel: parseInteger(fields.profile_level),
    shipDesign: rawShipDesign,
    loadout: rawLoadout ? normalizeCountMap(rawLoadout, Object.keys(UPGRADE_LIMITS)) : null,
    skills: rawSkills ? normalizeCountMap(rawSkills, Object.keys(SKILL_LIMITS)) : normalizeCountMap({}, Object.keys(SKILL_LIMITS)),
    killBreakdown: rawKillBreakdown ? normalizeCountMap(rawKillBreakdown, Object.keys(SCORE_VALUES)) : null,
    build: String(fields.build || "Base").slice(0, 120),
    timestamp: fields.timestamp || "",
    createdAt: issue.created_at || "",
    url: issue.html_url || "",
    state: issue.state || "open"
  };
}

export function validateScoreIssue(parsed) {
  const reasons = [];
  if (!parsed || !parsed.validFormat) {
    return { valid: false, reasons: ["Malformed score issue title."] };
  }

  if (parsed.state !== "open") {
    reasons.push("Score issue is not open.");
  }
  if (!parsed.markerPresent) {
    reasons.push("Missing score marker.");
  }
  if (parsed.version !== 2 && parsed.version !== 3 && parsed.version !== 4 && parsed.version !== 5) {
    reasons.push("Unsupported score payload version.");
  }

  for (const [label, value] of [
    ["score", parsed.score],
    ["waves", parsed.waves],
    ["kills", parsed.kills],
    ["combo", parsed.combo],
    ["bosses", parsed.bosses],
    ["wave_score", parsed.waveScore],
    ["kill_score", parsed.killScore],
    ["run_ms", parsed.runMs],
    ["scrap", parsed.scrap]
  ]) {
    if (!Number.isFinite(value) || value < 0 || !Number.isInteger(value)) {
      reasons.push(`Invalid ${label}.`);
    }
  }

  if (parsed.titleScore !== parsed.score) {
    reasons.push("Title score does not match payload score.");
  }
  if (parsed.titlePlayer !== parsed.player) {
    reasons.push("Title player does not match payload player.");
  }
  if (!parsed.loadout) {
    reasons.push("Loadout payload is invalid.");
  }
  if (!parsed.skills) {
    reasons.push("Skills payload is invalid.");
  }
  if (!parsed.killBreakdown) {
    reasons.push("Kill breakdown payload is invalid.");
  }
  if (parsed.version >= 4 && !parsed.shipDesign) {
    reasons.push("Ship design payload is invalid.");
  }

  if (reasons.length) {
    return { valid: false, reasons };
  }

  if (parsed.kills === 0 && parsed.combo !== 0) {
    reasons.push("Combo cannot be positive with zero kills.");
  }
  if (parsed.kills > 0 && (parsed.combo < 1 || parsed.combo > parsed.kills)) {
    reasons.push("Longest combo is outside the valid range.");
  }

  const minimumBosses = Math.floor(parsed.waves / 4);
  const maximumBosses = Math.floor((parsed.waves + 1) / 4);
  if (parsed.bosses < minimumBosses || parsed.bosses > maximumBosses) {
    reasons.push("Boss count is inconsistent with cleared waves.");
  }

  const killCountFromBreakdown = Object.values(parsed.killBreakdown).reduce((sum, value) => sum + value, 0);
  if (killCountFromBreakdown !== parsed.kills) {
    reasons.push("Kill breakdown total does not match kills.");
  }
  if (parsed.killBreakdown.boss !== parsed.bosses) {
    reasons.push("Boss kill count does not match boss total.");
  }

  for (const [upgradeId, limit] of Object.entries(UPGRADE_LIMITS)) {
    const level = parsed.loadout[upgradeId];
    if (!Number.isInteger(level) || level < 0 || level > limit) {
      reasons.push(`Loadout level is invalid for ${upgradeId}.`);
    }
  }

  for (const [skillId, limit] of Object.entries(SKILL_LIMITS)) {
    const level = parsed.skills[skillId];
    if (!Number.isInteger(level) || level < 0 || level > limit) {
      reasons.push(`Skill level is invalid for ${skillId}.`);
    }
  }

  if (parsed.profileLevel !== null && (!Number.isInteger(parsed.profileLevel) || parsed.profileLevel < 1)) {
    reasons.push("Profile level is invalid.");
  }

  if (parsed.version === 4) {
    const weapon = String(parsed.shipDesign.weapon || "").trim();
    const armor = parsed.shipDesign.armor;
    const speed = parsed.shipDesign.speed;
    if (!(weapon in SHIP_V4_WEAPON_COSTS)) {
      reasons.push("Ship weapon is invalid.");
    }
    if (!Number.isInteger(armor) || armor < 0 || armor > SHIP_V4_STAT_LIMIT) {
      reasons.push("Ship armor allocation is invalid.");
    }
    if (!Number.isInteger(speed) || speed < 0 || speed > SHIP_V4_STAT_LIMIT) {
      reasons.push("Ship speed allocation is invalid.");
    }
    if (
      weapon in SHIP_V4_WEAPON_COSTS &&
      Number.isInteger(armor) &&
      Number.isInteger(speed) &&
      SHIP_V4_WEAPON_COSTS[weapon] + armor + speed > SHIP_V4_BUDGET
    ) {
      reasons.push("Ship design exceeds the frame budget.");
    }
  }

  if (parsed.version === 5) {
    const weapon = String(parsed.shipDesign.weapon || "").trim();
    const armor = parsed.shipDesign.armor;
    const speed = parsed.shipDesign.speed;
    const damage = parsed.shipDesign.damage;
    const modules = Array.isArray(parsed.shipDesign.modules) ? parsed.shipDesign.modules : [];
    if (!(weapon in SHIP_V5_WEAPON_COSTS)) {
      reasons.push("Ship weapon is invalid.");
    }
    if (!Number.isInteger(armor) || armor < 0 || armor > SHIP_V5_STAT_LIMIT) {
      reasons.push("Ship armor allocation is invalid.");
    }
    if (!Number.isInteger(speed) || speed < 0 || speed > SHIP_V5_STAT_LIMIT) {
      reasons.push("Ship speed allocation is invalid.");
    }
    if (!Number.isInteger(damage) || damage < 0 || damage > SHIP_V5_STAT_LIMIT) {
      reasons.push("Ship damage allocation is invalid.");
    }
    if (!Number.isInteger(parsed.profileLevel) || parsed.profileLevel < 1) {
      reasons.push("Profile level is required for ship part validation.");
    }
    if (modules.length > SHIP_V5_MAX_MODULES) {
      reasons.push("Too many system parts are equipped.");
    }
    if (new Set(modules).size !== modules.length) {
      reasons.push("Duplicate system parts are not allowed.");
    }
    for (const moduleId of modules) {
      if (!(moduleId in SHIP_V5_MODULE_COSTS)) {
        reasons.push(`Ship module is invalid: ${moduleId}.`);
        continue;
      }
      if (Number.isInteger(parsed.profileLevel) && parsed.profileLevel < SHIP_V5_MODULE_UNLOCKS[moduleId]) {
        reasons.push(`Ship module is locked for the reported profile level: ${moduleId}.`);
      }
    }
    if (
      weapon in SHIP_V5_WEAPON_UNLOCKS &&
      Number.isInteger(parsed.profileLevel) &&
      parsed.profileLevel < SHIP_V5_WEAPON_UNLOCKS[weapon]
    ) {
      reasons.push("Ship weapon is locked for the reported profile level.");
    }
    if (
      weapon in SHIP_V5_WEAPON_COSTS &&
      Number.isInteger(armor) &&
      Number.isInteger(speed) &&
      Number.isInteger(damage)
    ) {
      const moduleCost = modules.reduce((sum, moduleId) => sum + (SHIP_V5_MODULE_COSTS[moduleId] || 0), 0);
      const buildCost =
        SHIP_V5_WEAPON_COSTS[weapon] +
        moduleCost +
        (armor + speed + damage) * SHIP_V5_STAT_COST;
      if (buildCost > SHIP_V5_BUDGET) {
        reasons.push("Ship design exceeds the base ship budget.");
      }
    }
  }

  const waveScore = expectedWaveScore(parsed.waves);
  if (parsed.waveScore !== waveScore) {
    reasons.push("Wave score does not match the game formula.");
  }

  const scrap = expectedScrap(parsed.score, parsed.waves, parsed.bosses, parsed.kills);
  if (parsed.scrap !== scrap) {
    reasons.push("Scrap total does not match the game formula.");
  }

  if (parsed.killScore + parsed.waveScore !== parsed.score) {
    reasons.push("Score total does not match kill plus wave score.");
  }

  const minKillScore = computeMinKillScore(parsed.killBreakdown);
  const maxKillScore = computeMaxKillScore(parsed.killBreakdown, parsed.combo);
  if (parsed.killScore < minKillScore) {
    reasons.push("Kill score is lower than the minimum possible total.");
  }
  if (parsed.killScore > maxKillScore) {
    reasons.push("Kill score is higher than the maximum possible total.");
  }

  if (parsed.runMs <= 0) {
    reasons.push("Run duration must be positive.");
  }

  return {
    valid: reasons.length === 0,
    reasons
  };
}

export function toLeaderboardEntry(parsed) {
  return {
    player: parsed.player,
    score: parsed.score,
    waves: parsed.waves,
    kills: parsed.kills,
    combo: parsed.combo,
    scrap: parsed.scrap,
    build: parsed.build,
    url: parsed.url,
    createdAt: parsed.createdAt
  };
}

export function sortLeaderboardEntries(entries) {
  return [...entries].sort((a, b) => b.score - a.score || b.waves - a.waves || b.combo - a.combo || new Date(b.createdAt) - new Date(a.createdAt));
}
