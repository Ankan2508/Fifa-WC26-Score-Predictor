import { NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';
import { v4 as uuidv4 } from 'uuid';
import { getAllData, getCrest, isLocked, calcPoints, parseKickoff } from '@/lib/wcdata';

let client;
async function db() {
  if (!client) {
    client = new MongoClient(process.env.MONGO_URL);
    await client.connect();
  }
  return client.db(process.env.DB_NAME || 'wc26');
}

function enrichGame(g, teamMap, stadiumMap) {
  const ho = teamMap[g.home_team_id];
  const aw = teamMap[g.away_team_id];
  const stad = stadiumMap[g.stadium_id];
  const homeName = g.home_team_name_en || ho?.name_en || g.home_team_label || 'TBD';
  const awayName = g.away_team_name_en || aw?.name_en || g.away_team_label || 'TBD';
  return {
    id: g.id,
    stage: g.type,
    group: g.group,
    matchday: g.matchday,
    kickoff: g.local_date,
    finished: g.finished === 'TRUE',
    status: g.time_elapsed,
    locked: isLocked(g),
    homeId: g.home_team_id,
    awayId: g.away_team_id,
    home: { id: g.home_team_id, name: homeName, code: ho?.fifa_code, flag: ho?.flag, crest: getCrest(homeName) },
    away: { id: g.away_team_id, name: awayName, code: aw?.fifa_code, flag: aw?.flag, crest: getCrest(awayName) },
    homeScore: g.finished === 'TRUE' && g.home_score != null && g.home_score !== 'null' ? +g.home_score : null,
    awayScore: g.finished === 'TRUE' && g.away_score != null && g.away_score !== 'null' ? +g.away_score : null,
    venue: stad ? `${stad.fifa_name || stad.name_en}, ${stad.city_en}` : null,
  };
}

async function getEnrichedGames() {
  const data = await getAllData();
  const teamMap = Object.fromEntries(data.teams.map((t) => [t.id, t]));
  const stadiumMap = Object.fromEntries(data.stadiums.map((s) => [s.id, s]));
  return { games: data.games.map((g) => enrichGame(g, teamMap, stadiumMap)), data, teamMap, stadiumMap };
}

export async function GET(request, ctx) {
  try {
    const params = await ctx.params;
    const path = (params?.path || []).join('/');
    const url = new URL(request.url);

    if (path === 'matches' || path === '' || path === 'matches/all') {
      const { games } = await getEnrichedGames();
      return NextResponse.json({ games });
    }
    if (path === 'data') {
      const data = await getAllData();
      return NextResponse.json(data);
    }
    if (path === 'predictions') {
      const userId = url.searchParams.get('userId');
      if (!userId) return NextResponse.json({ predictions: [] });
      const d = await db();
      const preds = await d.collection('predictions').find({ user_id: userId }).toArray();
      const ko = await d.collection('ko_predictions').find({ user_id: userId }).toArray();
      preds.forEach((p) => delete p._id);
      ko.forEach((p) => delete p._id);
      return NextResponse.json({ predictions: preds, koPredictions: ko });
    }
    if (path === 'leaderboard') {
      const { games } = await getEnrichedGames();
      const gameMap = Object.fromEntries(games.map((g) => [g.id, g]));
      const d = await db();
      const users = await d.collection('users').find({}).toArray();
      const allPreds = await d.collection('predictions').find({}).toArray();
      const byUser = {};
      allPreds.forEach((p) => {
        const g = gameMap[p.match_id];
        if (!g || !g.finished) return;
        const pts = calcPoints(p.pred_home_score, p.pred_away_score, g.homeScore, g.awayScore);
        const exact = pts === 3 ? 1 : 0;
        const correct = pts === 1 ? 1 : 0;
        if (!byUser[p.user_id]) byUser[p.user_id] = { points: 0, exact: 0, correct: 0, total: 0 };
        byUser[p.user_id].points += pts;
        byUser[p.user_id].exact += exact;
        byUser[p.user_id].correct += correct;
        byUser[p.user_id].total += 1;
      });
      const board = users.map((u) => {
        const s = byUser[u.id] || { points: 0, exact: 0, correct: 0, total: 0 };
        return {
          userId: u.id,
          username: u.username,
          country: u.country || '',
          avatar: u.avatar || null,
          points: s.points,
          exact: s.exact,
          correct: s.correct,
          predictions: s.total,
          accuracy: s.total ? Math.round(((s.exact + s.correct) / s.total) * 100) : 0,
        };
      });
      board.sort((a, b) => b.points - a.points || b.exact - a.exact || b.correct - a.correct);
      board.forEach((b, i) => (b.rank = i + 1));
      return NextResponse.json({ leaderboard: board });
    }
    if (path === 'health') return NextResponse.json({ ok: true });
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(request, ctx) {
  try {
    const params = await ctx.params;
    const path = (params?.path || []).join('/');
    const body = await request.json();
    const d = await db();

    if (path === 'auth') {
      const username = (body.username || '').trim();
      if (!username) return NextResponse.json({ error: 'username required' }, { status: 400 });
      let user = await d.collection('users').findOne({ username_lower: username.toLowerCase() });
      if (!user) {
        user = {
          id: uuidv4(),
          username,
          username_lower: username.toLowerCase(),
          country: body.country || '',
          avatar: body.avatar || null,
          created_at: new Date(),
        };
        await d.collection('users').insertOne(user);
      }
      delete user._id;
      return NextResponse.json({ user });
    }

    if (path === 'predictions') {
      const { user_id, match_id, pred_home_score, pred_away_score } = body;
      if (!user_id || !match_id) return NextResponse.json({ error: 'missing' }, { status: 400 });
      const { games } = await getEnrichedGames();
      const g = games.find((x) => x.id === String(match_id));
      if (!g) return NextResponse.json({ error: 'match not found' }, { status: 404 });
      if (g.locked) return NextResponse.json({ error: 'locked' }, { status: 400 });
      const update = {
        user_id,
        match_id: String(match_id),
        pred_home_score: +pred_home_score,
        pred_away_score: +pred_away_score,
        updated_at: new Date(),
      };
      await d.collection('predictions').updateOne(
        { user_id, match_id: String(match_id) },
        { $set: update, $setOnInsert: { id: uuidv4(), created_at: new Date() } },
        { upsert: true }
      );
      return NextResponse.json({ ok: true });
    }

    if (path === 'ko-predictions') {
      const { user_id, match_id, winner_team_id, pred_home_score, pred_away_score } = body;
      if (!user_id || !match_id) return NextResponse.json({ error: 'missing' }, { status: 400 });
      if (+pred_home_score === +pred_away_score) {
        return NextResponse.json({ error: 'Knockout matches require a winner. Please select a winner.' }, { status: 400 });
      }
      await d.collection('ko_predictions').updateOne(
        { user_id, match_id: String(match_id) },
        {
          $set: {
            user_id,
            match_id: String(match_id),
            winner_team_id: winner_team_id || null,
            pred_home_score: +pred_home_score,
            pred_away_score: +pred_away_score,
            updated_at: new Date(),
          },
          $setOnInsert: { id: uuidv4() },
        },
        { upsert: true }
      );
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'not found' }, { status: 404 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE() {
  return NextResponse.json({ ok: true });
}
