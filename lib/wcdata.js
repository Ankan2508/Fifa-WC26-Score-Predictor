import crestsRaw from './crests.json';

// Crest name aliases - map World Cup API team names to crest CSV names
const NAME_ALIASES = {
  'United States': 'USA',
  'United States of America': 'USA',
  'South Korea': 'Korea Republic',
  'Korea Republic': 'Korea Republic',
  'Bosnia and Herzegovina': 'Bosnia-Herzegovina',
  'Cape Verde': 'Cape Verde Islands',
  'Czech Republic': 'Czech Republic',
  'Trinidad and Tobago': 'Trinidad & Tobago',
};

export function getCrest(teamName) {
  if (!teamName) return null;
  const alias = NAME_ALIASES[teamName] || teamName;
  if (crestsRaw[alias]) return crestsRaw[alias];
  // try case-insensitive match
  const lower = alias.toLowerCase();
  for (const k of Object.keys(crestsRaw)) {
    if (k.toLowerCase() === lower) return crestsRaw[k];
  }
  return null;
}

// In-memory 5-minute cache
const cache = { data: null, ts: 0 };
const TTL = 5 * 60 * 1000;

async function fetchEndpoint(path) {
  try {
    const r = await fetch(`https://worldcup26.ir/get/${path}`, { cache: 'no-store' });
    if (!r.ok) throw new Error('bad status');
    return await r.json();
  } catch (e) {
    console.error('Fetch error', path, e.message);
    return null;
  }
}

export async function getAllData() {
  const now = Date.now();
  if (cache.data && now - cache.ts < TTL) return cache.data;
  const [games, teams, groups, stadiums] = await Promise.all([
    fetchEndpoint('games'),
    fetchEndpoint('teams'),
    fetchEndpoint('groups'),
    fetchEndpoint('stadiums'),
  ]);
  const data = {
    games: games?.games || [],
    teams: teams?.teams || [],
    groups: groups?.groups || [],
    stadiums: stadiums?.stadiums || [],
  };
  cache.data = data;
  cache.ts = now;
  return data;
}

export function parseKickoff(localDate) {
  // "06/11/2026 13:00" -> Date (treat as UTC)
  if (!localDate) return null;
  const [d, t] = localDate.split(' ');
  const [mm, dd, yyyy] = d.split('/');
  const [hh, mi] = (t || '00:00').split(':');
  return new Date(Date.UTC(+yyyy, +mm - 1, +dd, +hh, +mi));
}

export function isLocked(game) {
  if (game.finished === 'TRUE') return true;
  const ko = parseKickoff(game.local_date);
  if (!ko) return false;
  return Date.now() >= ko.getTime() - 60 * 60 * 1000;
}

export function calcPoints(predHome, predAway, actualHome, actualAway) {
  if (predHome == null || predAway == null) return 0;
  if (actualHome == null || actualAway == null) return 0;
  const ph = +predHome, pa = +predAway, ah = +actualHome, aa = +actualAway;
  if (ph === ah && pa === aa) return 3;
  const predRes = ph > pa ? 1 : ph < pa ? -1 : 0;
  const actRes = ah > aa ? 1 : ah < aa ? -1 : 0;
  if (predRes === actRes) return 1;
  return 0;
}
