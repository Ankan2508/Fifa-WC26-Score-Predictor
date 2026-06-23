'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { QueryClient, QueryClientProvider, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import {
  Trophy, Lock, Calendar, MapPin, Flame, Target, Crown, Medal, Users,
  TrendingUp, LogOut, Sparkles, ChevronRight, Globe2,
} from 'lucide-react';

const qc = new QueryClient({ defaultOptions: { queries: { staleTime: 60000, refetchOnWindowFocus: false } } });

const WC_START = new Date(Date.UTC(2026, 5, 11, 16, 0)); // June 11, 2026 16:00 UTC

// ---------- Helpers ----------
const fetchJSON = (url) => fetch(url).then((r) => r.json());

function useUser() {
  const [user, setUser] = useState(null);
  useEffect(() => {
    const raw = typeof window !== 'undefined' ? localStorage.getItem('wc26_user') : null;
    if (raw) try { setUser(JSON.parse(raw)); } catch {}
  }, []);
  const login = async (username, country) => {
    const res = await fetch('/api/auth', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, country }),
    });
    const j = await res.json();
    if (j.user) {
      localStorage.setItem('wc26_user', JSON.stringify(j.user));
      setUser(j.user);
      return j.user;
    }
    throw new Error(j.error || 'Login failed');
  };
  const logout = () => { localStorage.removeItem('wc26_user'); setUser(null); };
  return { user, login, logout };
}

function Crest({ src, name, size = 32 }) {
  const [err, setErr] = useState(false);
  if (!src || err) {
    const initials = (name || '?').split(' ').map((s) => s[0]).join('').slice(0, 2).toUpperCase();
    return (
      <div
        className="rounded-full bg-[#2B2B2B] flex items-center justify-center text-[10px] font-bold text-[#D7FF2F]"
        style={{ width: size, height: size }}
      >{initials}</div>
    );
  }
  return (
    <img src={src} alt={name} onError={() => setErr(true)}
      className="rounded-full object-contain bg-[#0D0D0D] p-0.5"
      style={{ width: size, height: size }} />
  );
}

function Countdown() {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  const diff = Math.max(0, WC_START.getTime() - now);
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff / 3600000) % 24);
  const m = Math.floor((diff / 60000) % 60);
  const s = Math.floor((diff / 1000) % 60);
  const blocks = [{ l: 'Days', v: d }, { l: 'Hours', v: h }, { l: 'Minutes', v: m }, { l: 'Seconds', v: s }];
  return (
    <div className="grid grid-cols-4 gap-2 sm:gap-4 max-w-2xl mx-auto">
      {blocks.map((b) => (
        <motion.div key={b.l} whileHover={{ y: -4 }}
          className="glass rounded-2xl p-3 sm:p-5 text-center">
          <div className="text-3xl sm:text-5xl font-black text-[#D7FF2F] tabular-nums">
            {String(b.v).padStart(2, '0')}
          </div>
          <div className="text-[10px] sm:text-xs uppercase tracking-widest text-[#A1A1AA] mt-1">{b.l}</div>
        </motion.div>
      ))}
    </div>
  );
}

// ---------- Match Centre ----------
function MatchCentre({ games }) {
  const completed = games.filter((g) => g.finished).slice(-12).reverse();
  const upcoming = games.filter((g) => !g.finished && g.stage === 'group').slice(0, 10);
  const goals = completed.reduce((s, g) => s + (g.homeScore || 0) + (g.awayScore || 0), 0);
  const teamsRemaining = 48 - new Set(games.filter((g) => g.finished && g.stage === 'group').map((g) => g.homeId).concat(games.filter((g) => g.finished && g.stage === 'group').map((g) => g.awayId))).size; // crude
  const lastWinner = completed[0]?.homeScore > completed[0]?.awayScore ? completed[0]?.home.name : completed[0]?.away.name;

  return (
    <div className="space-y-8">
      <section className="text-center pt-6 pb-2">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <Badge className="bg-[#D7FF2F] text-black font-bold mb-4">FIFA WORLD CUP 2026</Badge>
          <h1 className="text-4xl sm:text-6xl font-black tracking-tight mb-3">
            Predict the <span className="text-[#D7FF2F]">Glory</span>
          </h1>
          <p className="text-[#A1A1AA] text-sm sm:text-base mb-8 max-w-xl mx-auto">
            48 teams. 104 matches. One champion. Make your call before kickoff.
          </p>
        </motion.div>
        <Countdown />
      </section>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { icon: Flame, label: 'Matches Played', value: completed.length },
          { icon: Target, label: 'Goals Scored', value: goals },
          { icon: Users, label: 'Teams', value: 48 },
          { icon: Crown, label: 'Latest Winner', value: lastWinner || '—' },
        ].map((s, i) => (
          <Card key={i} className="glass border-[#2B2B2B]">
            <CardContent className="p-4">
              <s.icon className="w-5 h-5 text-[#D7FF2F] mb-2" />
              <div className="text-xl sm:text-2xl font-bold truncate">{s.value}</div>
              <div className="text-xs text-[#A1A1AA] uppercase tracking-wide">{s.label}</div>
            </CardContent>
          </Card>
        ))}
      </section>

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold flex items-center gap-2"><Trophy className="text-[#D7FF2F]" /> Latest Results</h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {completed.map((g) => <ResultCard key={g.id} g={g} />)}
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2"><Calendar className="text-[#D7FF2F]" /> Upcoming Fixtures</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {upcoming.map((g) => <UpcomingCard key={g.id} g={g} />)}
        </div>
      </section>
    </div>
  );
}

function ResultCard({ g }) {
  const homeWin = g.homeScore > g.awayScore;
  const awayWin = g.awayScore > g.homeScore;
  return (
    <motion.div whileHover={{ y: -2 }} className="glass rounded-xl p-4">
      <div className="flex justify-between text-[10px] text-[#A1A1AA] mb-3 uppercase tracking-wide">
        <span>{g.stage === 'group' ? `Group ${g.group}` : g.stage.toUpperCase()}</span>
        <span>FT</span>
      </div>
      <div className="space-y-2">
        <TeamRow team={g.home} score={g.homeScore} winner={homeWin} />
        <TeamRow team={g.away} score={g.awayScore} winner={awayWin} />
      </div>
      {g.venue && <div className="text-[11px] text-[#A1A1AA] mt-3 flex items-center gap-1"><MapPin className="w-3 h-3" />{g.venue}</div>}
    </motion.div>
  );
}

function TeamRow({ team, score, winner }) {
  return (
    <div className={`flex items-center gap-3 ${winner ? '' : 'opacity-60'}`}>
      <Crest src={team.crest || team.flag} name={team.name} size={28} />
      <span className="flex-1 font-semibold text-sm truncate">{team.name}</span>
      <span className="text-2xl font-black tabular-nums">{score ?? '-'}</span>
    </div>
  );
}

function UpcomingCard({ g }) {
  const dt = g.kickoff;
  return (
    <motion.div whileHover={{ y: -2 }} className="glass rounded-xl p-4">
      <div className="flex justify-between text-[10px] text-[#A1A1AA] mb-3 uppercase tracking-wide">
        <span>{g.stage === 'group' ? `Group ${g.group}` : g.stage.toUpperCase()}</span>
        <span>{dt}</span>
      </div>
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-col items-center flex-1">
          <Crest src={g.home.crest || g.home.flag} name={g.home.name} size={40} />
          <div className="text-xs font-semibold text-center mt-1 truncate max-w-full">{g.home.name}</div>
        </div>
        <div className="text-[#A1A1AA] text-xs font-bold">VS</div>
        <div className="flex flex-col items-center flex-1">
          <Crest src={g.away.crest || g.away.flag} name={g.away.name} size={40} />
          <div className="text-xs font-semibold text-center mt-1 truncate max-w-full">{g.away.name}</div>
        </div>
      </div>
      {g.venue && <div className="text-[11px] text-[#A1A1AA] mt-3 flex items-center gap-1"><MapPin className="w-3 h-3" />{g.venue}</div>}
    </motion.div>
  );
}

// ---------- Predictions ----------
function PredictionsView({ user, games, predictions, refetchPreds }) {
  const groupGames = games.filter((g) => g.stage === 'group');
  const matchdays = useMemo(() => {
    const m = {};
    groupGames.forEach((g) => { (m[g.matchday] ||= []).push(g); });
    return m;
  }, [groupGames]);
  const predMap = useMemo(() => Object.fromEntries((predictions || []).map((p) => [p.match_id, p])), [predictions]);
  const [selected, setSelected] = useState(Object.keys(matchdays)[0] || '1');

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {Object.keys(matchdays).sort((a,b)=>+a-+b).map((md) => (
          <Button key={md} size="sm"
            onClick={() => setSelected(md)}
            className={selected === md ? 'bg-[#D7FF2F] text-black hover:bg-[#D7FF2F]' : 'bg-[#171717] border border-[#2B2B2B] hover:bg-[#2B2B2B]'}>
            Matchday {md}
          </Button>
        ))}
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        {(matchdays[selected] || []).map((g) => (
          <PredictionCard key={g.id} g={g} user={user} pred={predMap[g.id]} onSaved={refetchPreds} />
        ))}
      </div>
    </div>
  );
}

function PredictionCard({ g, user, pred, onSaved }) {
  const [home, setHome] = useState(pred?.pred_home_score ?? '');
  const [away, setAway] = useState(pred?.pred_away_score ?? '');
  const [saving, setSaving] = useState(false);
  const timeoutRef = useRef(null);

  useEffect(() => { setHome(pred?.pred_home_score ?? ''); setAway(pred?.pred_away_score ?? ''); }, [pred?.pred_home_score, pred?.pred_away_score]);

  const save = async (h, a) => {
    if (h === '' || a === '' || g.locked) return;
    setSaving(true);
    try {
      const r = await fetch('/api/predictions', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id, match_id: g.id, pred_home_score: +h, pred_away_score: +a }),
      });
      const j = await r.json();
      if (j.ok) { toast.success(`Saved ${g.home.name} ${h}-${a} ${g.away.name}`); onSaved?.(); }
      else toast.error(j.error || 'Save failed');
    } finally { setSaving(false); }
  };

  const onChange = (which, val) => {
    const v = val.replace(/[^0-9]/g, '').slice(0, 2);
    if (which === 'h') setHome(v); else setAway(v);
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => save(which === 'h' ? v : home, which === 'a' ? v : away), 600);
  };

  const points = pred?.points_awarded;
  const isCorrect = points > 0;

  return (
    <motion.div whileHover={{ scale: g.locked ? 1 : 1.01 }}
      className={`glass rounded-xl p-4 relative ${g.locked ? 'opacity-70' : ''}`}>
      {g.locked && (
        <div className="absolute top-2 right-2 flex items-center gap-1 text-[10px] text-[#EF4444]">
          <Lock className="w-3 h-3" /> {g.finished ? 'FT' : 'LOCKED'}
        </div>
      )}
      <div className="text-[10px] uppercase tracking-wide text-[#A1A1AA] mb-3">
        {g.stage === 'group' ? `Group ${g.group}` : g.stage.toUpperCase()} • {g.kickoff}
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Crest src={g.home.crest || g.home.flag} name={g.home.name} size={36} />
          <span className="font-semibold text-sm truncate">{g.home.name}</span>
        </div>
        <div className="flex items-center gap-1">
          <Input value={home} onChange={(e) => onChange('h', e.target.value)} disabled={g.locked}
            className="no-spinner w-12 h-12 text-center text-2xl font-black bg-[#0D0D0D] border-[#2B2B2B] focus-visible:ring-[#D7FF2F]" />
          <span className="text-[#A1A1AA] text-xs font-bold">vs</span>
          <Input value={away} onChange={(e) => onChange('a', e.target.value)} disabled={g.locked}
            className="no-spinner w-12 h-12 text-center text-2xl font-black bg-[#0D0D0D] border-[#2B2B2B] focus-visible:ring-[#D7FF2F]" />
        </div>
        <div className="flex items-center gap-2 justify-end min-w-0">
          <span className="font-semibold text-sm truncate text-right">{g.away.name}</span>
          <Crest src={g.away.crest || g.away.flag} name={g.away.name} size={36} />
        </div>
      </div>
      {g.finished && (
        <div className="flex justify-between items-center mt-3 pt-3 border-t border-[#2B2B2B]">
          <span className="text-xs text-[#A1A1AA]">Actual: {g.homeScore}-{g.awayScore}</span>
          {pred && (
            <Badge className={isCorrect ? 'bg-[#22C55E] text-black' : 'bg-[#EF4444] text-white'}>
              +{calcDisplayPoints(pred, g)} pts
            </Badge>
          )}
        </div>
      )}
    </motion.div>
  );
}

function calcDisplayPoints(p, g) {
  if (!p || !g.finished) return 0;
  const ph = +p.pred_home_score, pa = +p.pred_away_score;
  if (ph === g.homeScore && pa === g.awayScore) return 3;
  const pr = ph > pa ? 1 : ph < pa ? -1 : 0;
  const ar = g.homeScore > g.awayScore ? 1 : g.homeScore < g.awayScore ? -1 : 0;
  return pr === ar ? 1 : 0;
}

// ---------- Bracket ----------
function Bracket({ games }) {
  const [mine, setMine] = useState(false);
  const knockout = games.filter((g) => g.stage !== 'group');
  const byStage = {
    r32: knockout.filter((g) => g.stage === 'r32').sort((a, b) => +a.id - +b.id),
    r16: knockout.filter((g) => g.stage === 'r16').sort((a, b) => +a.id - +b.id),
    qf: knockout.filter((g) => g.stage === 'qf').sort((a, b) => +a.id - +b.id),
    sf: knockout.filter((g) => g.stage === 'sf').sort((a, b) => +a.id - +b.id),
    final: knockout.filter((g) => g.stage === 'final'),
    third: knockout.filter((g) => g.stage === 'third'),
  };
  const champion = byStage.final[0] && byStage.final[0].finished
    ? (byStage.final[0].homeScore > byStage.final[0].awayScore ? byStage.final[0].home : byStage.final[0].away)
    : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between glass rounded-xl p-3">
        <div className="flex items-center gap-2 text-sm">
          <Trophy className="w-4 h-4 text-[#D7FF2F]" />
          <span className="font-semibold">2026 Pathways</span>
          <Badge className="bg-[#171717] border border-[#2B2B2B] text-[#A1A1AA]">32 → Final</Badge>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className={mine ? 'text-[#A1A1AA]' : 'text-white font-semibold'}>Real</span>
          <Switch checked={mine} onCheckedChange={setMine} />
          <span className={mine ? 'text-[#D7FF2F] font-semibold' : 'text-[#A1A1AA]'}>My Predictions</span>
        </div>
      </div>

      {champion && (
        <ChampionBanner champ={champion} />
      )}

      <div className="bracket-scroll overflow-x-auto pb-4">
        <div className="flex gap-6 min-w-[1400px] py-4 px-2">
          <BracketColumn title="Round of 32" games={byStage.r32} />
          <BracketColumn title="Round of 16" games={byStage.r16} />
          <BracketColumn title="Quarter-finals" games={byStage.qf} />
          <BracketColumn title="Semi-finals" games={byStage.sf} />
          <div className="flex flex-col gap-4 flex-shrink-0 justify-center">
            <div className="text-xs uppercase tracking-widest text-[#D7FF2F] text-center font-bold">Final</div>
            {byStage.final.map((g) => <BracketCard key={g.id} g={g} highlight />)}
            <div className="text-xs uppercase tracking-widest text-[#A1A1AA] text-center font-bold mt-4">3rd Place</div>
            {byStage.third.map((g) => <BracketCard key={g.id} g={g} />)}
          </div>
        </div>
      </div>
    </div>
  );
}

function BracketColumn({ title, games }) {
  return (
    <div className="flex flex-col gap-3 flex-shrink-0 w-[230px]">
      <div className="text-xs uppercase tracking-widest text-[#A1A1AA] text-center font-bold">{title}</div>
      <div className="flex flex-col gap-3 justify-around flex-1">
        {games.map((g) => <BracketCard key={g.id} g={g} />)}
      </div>
    </div>
  );
}

function BracketCard({ g, highlight }) {
  const homeWin = g.finished && g.homeScore > g.awayScore;
  const awayWin = g.finished && g.awayScore > g.homeScore;
  return (
    <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
      className={`rounded-lg p-2 border ${highlight ? 'bg-[#D7FF2F]/10 border-[#D7FF2F]' : 'bg-[#171717] border-[#2B2B2B]'} text-xs`}>
      <div className="text-[9px] text-[#A1A1AA] mb-1">M{g.id} • {g.stage.toUpperCase()}</div>
      <BracketTeam team={g.home} score={g.homeScore} winner={homeWin} />
      <BracketTeam team={g.away} score={g.awayScore} winner={awayWin} />
    </motion.div>
  );
}

function BracketTeam({ team, score, winner }) {
  return (
    <div className={`flex items-center gap-1.5 py-1 ${winner ? 'text-[#D7FF2F] font-bold' : 'text-white'}`}>
      <Crest src={team.crest || team.flag} name={team.name} size={20} />
      <span className="flex-1 truncate text-[11px]">{team.name}</span>
      {score != null && <span className="font-mono font-bold text-xs">{score}</span>}
    </div>
  );
}

function ChampionBanner({ champ }) {
  return (
    <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
      className="relative overflow-hidden rounded-2xl p-8 text-center"
      style={{ background: 'linear-gradient(135deg, #D7FF2F22, #171717)', border: '1px solid #D7FF2F' }}>
      <Crown className="w-10 h-10 text-[#D7FF2F] mx-auto mb-3" />
      <div className="text-xs uppercase tracking-widest text-[#A1A1AA] mb-2">Your World Cup Winner</div>
      <div className="flex items-center justify-center gap-4">
        <Crest src={champ.crest || champ.flag} name={champ.name} size={64} />
        <div className="text-3xl sm:text-5xl font-black text-[#D7FF2F]">{champ.name}</div>
      </div>
    </motion.div>
  );
}

// ---------- Leaderboard ----------
function Leaderboard({ user }) {
  const { data } = useQuery({ queryKey: ['leaderboard'], queryFn: () => fetchJSON('/api/leaderboard') });
  const board = data?.leaderboard || [];
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-[40px_1fr_70px_70px_70px_70px] gap-2 px-3 py-2 text-[10px] uppercase tracking-wider text-[#A1A1AA] border-b border-[#2B2B2B]">
        <div>Rank</div><div>User</div>
        <div className="text-right">Pts</div>
        <div className="text-right">Exact</div>
        <div className="text-right">Correct</div>
        <div className="text-right">Acc%</div>
      </div>
      <AnimatePresence>
        {board.map((u) => (
          <motion.div key={u.userId} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className={`grid grid-cols-[40px_1fr_70px_70px_70px_70px] gap-2 px-3 py-3 rounded-xl items-center text-sm ${u.userId === user?.id ? 'bg-[#D7FF2F]/10 border border-[#D7FF2F]' : 'glass'}`}>
            <div className="flex items-center gap-1">
              {u.rank === 1 ? <Crown className="w-4 h-4 text-[#D7FF2F]" /> : u.rank === 2 ? <Medal className="w-4 h-4 text-[#A1A1AA]" /> : u.rank === 3 ? <Medal className="w-4 h-4 text-orange-400" /> : <span className="text-xs text-[#A1A1AA] font-bold">#{u.rank}</span>}
            </div>
            <div className="flex items-center gap-2 min-w-0">
              <Avatar className="w-7 h-7 bg-[#2B2B2B]"><AvatarFallback className="bg-[#2B2B2B] text-[#D7FF2F] text-[10px]">{u.username.slice(0,2).toUpperCase()}</AvatarFallback></Avatar>
              <span className="font-semibold truncate">{u.username}</span>
            </div>
            <div className="text-right font-black text-[#D7FF2F]">{u.points}</div>
            <div className="text-right tabular-nums">{u.exact}</div>
            <div className="text-right tabular-nums">{u.correct}</div>
            <div className="text-right tabular-nums text-[#A1A1AA]">{u.accuracy}%</div>
          </motion.div>
        ))}
      </AnimatePresence>
      {!board.length && <div className="text-center text-[#A1A1AA] py-12 text-sm">No predictions yet — be the first!</div>}
    </div>
  );
}

// ---------- Profile ----------
function Profile({ user, predictions, games, logout }) {
  const gMap = Object.fromEntries(games.map((g) => [g.id, g]));
  const completed = (predictions || []).filter((p) => gMap[p.match_id]?.finished);
  const pts = completed.reduce((s, p) => s + calcDisplayPoints(p, gMap[p.match_id]), 0);
  const exact = completed.filter((p) => calcDisplayPoints(p, gMap[p.match_id]) === 3).length;
  return (
    <div className="space-y-6">
      <Card className="glass border-[#2B2B2B]">
        <CardContent className="p-6 flex items-center gap-4">
          <Avatar className="w-20 h-20 bg-[#2B2B2B]"><AvatarFallback className="bg-[#D7FF2F] text-black text-2xl font-black">{user.username.slice(0,2).toUpperCase()}</AvatarFallback></Avatar>
          <div className="flex-1">
            <div className="text-2xl font-black">{user.username}</div>
            <div className="text-sm text-[#A1A1AA] flex items-center gap-1"><Globe2 className="w-3 h-3" />{user.country || 'World'}</div>
          </div>
          <Button variant="outline" onClick={logout} className="border-[#2B2B2B] hover:bg-[#2B2B2B]"><LogOut className="w-4 h-4 mr-2" />Logout</Button>
        </CardContent>
      </Card>
      <div className="grid grid-cols-3 gap-3">
        <StatCard icon={Trophy} label="Total Points" value={pts} />
        <StatCard icon={Target} label="Predictions" value={predictions?.length || 0} />
        <StatCard icon={Sparkles} label="Exact Scores" value={exact} />
      </div>
      <div>
        <h3 className="text-lg font-bold mb-3">Recent Predictions</h3>
        <div className="space-y-2">
          {(predictions || []).slice(-10).reverse().map((p) => {
            const g = gMap[p.match_id]; if (!g) return null;
            const pts = calcDisplayPoints(p, g);
            return (
              <div key={p.match_id} className="glass rounded-xl px-4 py-3 flex items-center gap-3">
                <Crest src={g.home.crest || g.home.flag} name={g.home.name} size={24} />
                <span className="text-sm flex-1 truncate">{g.home.name} <span className="font-mono text-[#D7FF2F]">{p.pred_home_score}-{p.pred_away_score}</span> {g.away.name}</span>
                <Crest src={g.away.crest || g.away.flag} name={g.away.name} size={24} />
                {g.finished && <Badge className={pts ? 'bg-[#22C55E] text-black' : 'bg-[#EF4444] text-white'}>+{pts}</Badge>}
                {!g.finished && <ChevronRight className="w-4 h-4 text-[#A1A1AA]" />}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
function StatCard({ icon: Icon, label, value }) {
  return (
    <Card className="glass border-[#2B2B2B]">
      <CardContent className="p-4">
        <Icon className="w-5 h-5 text-[#D7FF2F] mb-2" />
        <div className="text-2xl font-black">{value}</div>
        <div className="text-xs text-[#A1A1AA] uppercase tracking-wide">{label}</div>
      </CardContent>
    </Card>
  );
}

// ---------- Login ----------
function LoginModal({ onLogin }) {
  const [username, setUsername] = useState('');
  const [country, setCountry] = useState('');
  const [loading, setLoading] = useState(false);
  const submit = async () => {
    if (!username.trim()) return;
    setLoading(true);
    try { await onLogin(username, country); toast.success(`Welcome, ${username}!`); }
    catch (e) { toast.error(e.message); }
    finally { setLoading(false); }
  };
  return (
    <Dialog open>
      <DialogContent className="bg-[#171717] border-[#2B2B2B] max-w-sm">
        <DialogHeader>
          <div className="flex justify-center mb-2"><img src="/logo.png" alt="WC26" className="w-20 h-20 rounded-xl" /></div>
          <DialogTitle className="text-center text-2xl font-black">WC26 Predictor</DialogTitle>
        </DialogHeader>
        <p className="text-center text-sm text-[#A1A1AA]">Pick a username to start predicting</p>
        <Input placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          className="bg-[#0D0D0D] border-[#2B2B2B] focus-visible:ring-[#D7FF2F]" />
        <Input placeholder="Country (optional)" value={country} onChange={(e) => setCountry(e.target.value)}
          className="bg-[#0D0D0D] border-[#2B2B2B] focus-visible:ring-[#D7FF2F]" />
        <Button onClick={submit} disabled={loading} className="bg-[#D7FF2F] text-black hover:bg-[#D7FF2F]/90 font-bold">
          {loading ? 'Loading...' : 'Enter Tournament'}
        </Button>
      </DialogContent>
    </Dialog>
  );
}

// ---------- Main App ----------
function App() {
  const { user, login, logout } = useUser();
  const [tab, setTab] = useState('centre');
  const queryClient = useQueryClient();
  const { data: gamesData } = useQuery({ queryKey: ['games'], queryFn: () => fetchJSON('/api/matches'), refetchInterval: 5 * 60 * 1000 });
  const { data: predData, refetch: refetchPreds } = useQuery({
    queryKey: ['predictions', user?.id], enabled: !!user?.id,
    queryFn: () => fetchJSON(`/api/predictions?userId=${user.id}`),
  });
  const games = gamesData?.games || [];
  const predictions = predData?.predictions || [];
  const refetchAll = () => { refetchPreds(); queryClient.invalidateQueries({ queryKey: ['leaderboard'] }); };

  if (!user) return <LoginModal onLogin={login} />;
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-[#0D0D0D]/80 border-b border-[#2B2B2B]">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="WC26" className="w-10 h-10 rounded-lg" />
            <div className="hidden sm:block">
              <div className="font-black text-sm leading-tight">WC26 Predictor</div>
              <div className="text-[10px] text-[#A1A1AA] uppercase tracking-widest">FIFA World Cup 2026</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Avatar className="w-8 h-8"><AvatarFallback className="bg-[#D7FF2F] text-black text-xs font-bold">{user.username.slice(0,2).toUpperCase()}</AvatarFallback></Avatar>
            <span className="hidden sm:inline text-sm font-semibold">{user.username}</span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {!games.length && <div className="text-center py-20 text-[#A1A1AA]">Loading World Cup data...</div>}
        {games.length > 0 && (
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="bg-[#171717] border border-[#2B2B2B] mb-6 grid grid-cols-5 w-full sm:w-auto">
              <TabsTrigger value="centre" className="data-[state=active]:bg-[#D7FF2F] data-[state=active]:text-black">Match Centre</TabsTrigger>
              <TabsTrigger value="predict" className="data-[state=active]:bg-[#D7FF2F] data-[state=active]:text-black">Predictions</TabsTrigger>
              <TabsTrigger value="bracket" className="data-[state=active]:bg-[#D7FF2F] data-[state=active]:text-black">Bracket</TabsTrigger>
              <TabsTrigger value="board" className="data-[state=active]:bg-[#D7FF2F] data-[state=active]:text-black">Leaderboard</TabsTrigger>
              <TabsTrigger value="profile" className="data-[state=active]:bg-[#D7FF2F] data-[state=active]:text-black">Profile</TabsTrigger>
            </TabsList>
            <TabsContent value="centre"><MatchCentre games={games} /></TabsContent>
            <TabsContent value="predict"><PredictionsView user={user} games={games} predictions={predictions} refetchPreds={refetchAll} /></TabsContent>
            <TabsContent value="bracket"><Bracket games={games} /></TabsContent>
            <TabsContent value="board"><Leaderboard user={user} /></TabsContent>
            <TabsContent value="profile"><Profile user={user} predictions={predictions} games={games} logout={logout} /></TabsContent>
          </Tabs>
        )}
      </main>
    </div>
  );
}

export default function Page() {
  return (
    <QueryClientProvider client={qc}>
      <App />
    </QueryClientProvider>
  );
}
