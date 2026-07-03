import type { RobotsGroup, RobotsInfo } from '../types.js';

/** Minimal robots.txt parser — enough to evaluate crawler policy for the site root. */
export function parseRobots(content: string, exists: boolean): RobotsInfo {
  const groups: RobotsGroup[] = [];
  const sitemaps: string[] = [];
  let current: RobotsGroup | null = null;
  let lastWasAgent = false;

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, '').trim();
    if (!line) continue;
    const sep = line.indexOf(':');
    if (sep === -1) continue;
    const field = line.slice(0, sep).trim().toLowerCase();
    const value = line.slice(sep + 1).trim();

    if (field === 'sitemap') {
      if (value) sitemaps.push(value);
      continue;
    }
    if (field === 'user-agent') {
      if (!lastWasAgent || !current) {
        current = { agents: [], disallow: [], allow: [] };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
      lastWasAgent = true;
      continue;
    }
    lastWasAgent = false;
    if (!current) continue;
    if (field === 'disallow') current.disallow.push(value);
    if (field === 'allow') current.allow.push(value);
  }

  return { exists, content, groups, sitemaps };
}

function groupFor(groups: RobotsGroup[], userAgent: string): RobotsGroup | undefined {
  const ua = userAgent.toLowerCase();
  let starGroup: RobotsGroup | undefined;
  let best: RobotsGroup | undefined;
  let bestLen = -1;
  for (const group of groups) {
    for (const agent of group.agents) {
      if (agent === '*') {
        starGroup ??= group;
        continue;
      }
      if (ua.includes(agent) && agent.length > bestLen) {
        best = group;
        bestLen = agent.length;
      }
    }
  }
  return best ?? starGroup;
}

/**
 * Is the site root crawlable for this user agent?
 * Simplified longest-match semantics; empty Disallow means allowed.
 */
export function isAllowed(robots: RobotsInfo, userAgent: string, path = '/'): boolean {
  if (!robots.exists) return true;
  const group = groupFor(robots.groups, userAgent);
  if (!group) return true;

  let verdict = true;
  let matchLen = -1;
  for (const pattern of group.disallow) {
    if (pattern && pathMatches(path, pattern) && pattern.length > matchLen) {
      verdict = false;
      matchLen = pattern.length;
    }
  }
  for (const pattern of group.allow) {
    if (pattern && pathMatches(path, pattern) && pattern.length >= matchLen) {
      verdict = true;
      matchLen = pattern.length;
    }
  }
  return verdict;
}

function pathMatches(path: string, pattern: string): boolean {
  // Support trailing wildcard semantics: prefix match with * treated greedily.
  const escaped = pattern
    .split('*')
    .map((part) => part.replace(/[.+?^${}()|[\]\\]/g, '\\$&'))
    .join('.*');
  const anchored = escaped.endsWith('\\$') ? `^${escaped.slice(0, -2)}$` : `^${escaped}`;
  return new RegExp(anchored).test(path);
}
