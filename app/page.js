'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { QueryClient, QueryClientProvider, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import {
  Trophy, Lock, Calendar, MapPin, Flame, Target, Crown, Medal, Users,
  LogOut, Sparkles, ChevronRight, Globe2, Brain, Shield, RefreshCw, Edit3,
} from 'lucide-react';

const qc = new QueryClient({ defaultOptions: { queries: { staleTime: 60000, refetchOnWindowFocus: false } } });
const WC_START = new Date(Date.UTC(2026, 5, 11, 16, 0));
const fetchJSON = (url) => fetch(url).then((r) => r.json());

// ----------------- Hooks & helpers -----------------
function useUser() {
  const [user, setUser] = useState(null);
  useEffect(() => {
    const raw = typeof window !== 'undefined' ? localStorage.getItem('wc26_user') : null;
    if (raw) try { setUser(JSON.parse(raw)); } catch {}
  }, []);
  const login = async (username, country) => {
    const r = await fetch('/api/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, country }) });
    const j = await r.json();
    if (j.user) { localStorage.setItem('wc26_user', JSON.stringify(j.user)); setUser(j.user); return j.user; }
    throw new Error(j.error || 'Login failed');
  };
  const logout = () => { localStorage.removeItem('wc26_user'); setUser(null); };
  return { user, login, logout };
}

function calcPoints(p, g) {
  if (!p || !g.finished) return 0;
  const ph = +p.pred_home_score, pa = +p.pred_away_score;
  if (ph === g.homeScore && pa === g.awayScore) return 3;
  const pr = ph > pa ? 1 : ph < pa ? -1 : 0;
  const ar = g.homeScore > g.awayScore ? 1 : g.homeScore < g.awayScore ? -1 : 0;
  return pr === ar ? 1 : 0;
}

function Crest({ src, name, size = 32 }) {
  const [err, setErr] = useState(false);
  if (!src || err) {
    const initials = (name || '?').split(' ').map((s) => s[0]).join('').slice(0, 2).toUpperCase();
    return <div className="rounded-full bg-[#2B2B2B] flex items-center justify-center text-[10px] font-bold text-[#D7FF2F]" style={{ width: size, height: size }}>{initials}</div>;
  }
  return <img src={src} alt={name} onError={() => setErr(true)} className="rounded-full object-contain bg-[#0D0D0D] p-0.5" style={{ width: size, height: size }} />;
}

function Countdown() {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  const diff = Math.max(0, WC_START.getTime() - now);
  const d = Math.floor(diff / 86400000), h = Math.floor((diff / 3600000) % 24), m = Math.floor((diff / 60000) % 60), s = Math.floor((diff / 1000) % 60);
  return (
    <div className="grid grid-cols-4 gap-2 sm:gap-4 max-w-2xl mx-auto">
      {[{ l: 'Days', v: d }, { l: 'Hours', v: h }, { l: 'Minutes', v: m }, { l: 'Seconds', v: s }].map((b) => (
        <motion.div key={b.l} whileHover={{ y: -4 }} className="glass rounded-2xl p-3 sm:p-5 text-center">
          <div className="text-3xl sm:text-5xl font-black text-[#D7FF2F] tabular-nums">{String(b.v).padStart(2, '0')}</div>
          <div className="text-[10px] sm:text-xs uppercase tracking-widest text-[#A1A1AA] mt-1">{b.l}</div>
        </motion.div>
      ))}
    </div>
  );
}

// ----------------- AI Insight Dialog -----------------
function AIInsightDialog({ matchId, home, away, open, onOpenChange }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['insight', matchId],
    queryFn: () => fetchJSON(`/api/insights/${matchId}`),
    enabled: open && !!matchId,
    staleTime: 60 * 60 * 1000,
  });
  const ins = data?.insight;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#171717] border-[#2B2B2B] max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Brain className="w-5 h-5 text-[#D7FF2F]" />AI Match Insight</DialogTitle>
        </DialogHeader>
        <div className="flex items-center justify-between gap-3 py-2">
          <div className="flex flex-col items-center flex-1"><Crest src={home.crest || home.flag} name={home.name} size={44} /><div className="text-xs mt-1 text-center">{home.name}</div></div>
          <div className="text-[#A1A1AA] text-xs font-bold">VS</div>
          <div className="flex flex-col items-center flex-1"><Crest src={away.crest || away.flag} name={away.name} size={44} /><div className="text-xs mt-1 text-center">{away.name}</div></div>
        </div>
        {isLoading && <div className="text-center text-sm text-[#A1A1AA] py-8 flex flex-col items-center gap-2"><Sparkles className="w-6 h-6 text-[#D7FF2F] animate-pulse" />Analyzing matchup...</div>}
        {error && <div className="text-center text-sm text-red-400 py-4">Failed to load insight</div>}
        {ins && (
          <div className="space-y-4">
            <div className="space-y-2">
              <ProbBar label={home.name} value={ins.homeWin} color="#D7FF2F" />
              <ProbBar label="Draw" value={ins.draw} color="#A1A1AA" />
              <ProbBar label={away.name} value={ins.awayWin} color="#22C55E" />
            </div>
            <div className="border-t border-[#2B2B2B] pt-3">
              <div className="text-[10px] uppercase tracking-widest text-[#A1A1AA] mb-2">AI Analysis</div>
              <div className="text-sm leading-relaxed whitespace-pre-line">{ins.insight}</div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
function ProbBar({ label, value, color }) {
  return (
    <div>
      <div className="flex justify-between text-xs mb-1"><span className="truncate">{label}</span><span className="font-bold tabular-nums">{value}%</span></div>
      <div className="h-2 bg-[#2B2B2B] rounded-full overflow-hidden"><motion.div initial={{ width: 0 }} animate={{ width: `${value}%` }} transition={{ duration: 0.8 }} className="h-full rounded-full" style={{ background: color }} /></div>
    </div>
  );
}

// ----------------- Match Centre -----------------
function MatchCentre({ games }) {
  const completed = games.filter((g) => g.finished).slice(-12).reverse();
  const upcoming = games.filter((g) => !g.finished && g.stage === 'group').slice(0, 10);
  const goals = completed.reduce((s, g) => s + (g.homeScore || 0) + (g.awayScore || 0), 0);
  const lastWinner = completed[0]?.homeScore > completed[0]?.awayScore ? completed[0]?.home.name : completed[0]?.away.name;
  const [aiOpen, setAiOpen] = useState(null);

  return (
    <div className="space-y-8">
      <section className="text-center pt-6 pb-2">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Badge className="bg-[#D7FF2F] text-black font-bold mb-4">FIFA WORLD CUP 2026</Badge>
          <h1 className="text-4xl sm:text-6xl font-black tracking-tight mb-3">Predict the <span className="text-[#D7FF2F]">Glory</span></h1>
          <p className="text-[#A1A1AA] text-sm sm:text-base mb-8 max-w-xl mx-auto">48 teams. 104 matches. One champion. Make your call before kickoff.</p>
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
          <Card key={i} className="glass border-[#2B2B2B]"><CardContent className="p-4"><s.icon className="w-5 h-5 text-[#D7FF2F] mb-2" /><div className="text-xl sm:text-2xl font-bold truncate">{s.value}</div><div className="text-xs text-[#A1A1AA] uppercase tracking-wide">{s.label}</div></CardContent></Card>
        ))}
      </section>
      <section>
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2"><Trophy className="text-[#D7FF2F]" /> Latest Results</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">{completed.map((g) => <ResultCard key={g.id} g={g} />)}</div>
      </section>
      <section>
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2"><Calendar className="text-[#D7FF2F]" /> Upcoming Fixtures</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">{upcoming.map((g) => <UpcomingCard key={g.id} g={g} onInsight={() => setAiOpen(g)} />)}</div>
      </section>
      {aiOpen && <AIInsightDialog matchId={aiOpen.id} home={aiOpen.home} away={aiOpen.away} open={!!aiOpen} onOpenChange={(o) => !o && setAiOpen(null)} />}
    </div>
  );
}

function ResultCard({ g }) {
  return (
    <motion.div whileHover={{ y: -2 }} className="glass rounded-xl p-4">
      <div className="flex justify-between text-[10px] text-[#A1A1AA] mb-3 uppercase tracking-wide"><span>{g.stage === 'group' ? `Group ${g.group}` : g.stage.toUpperCase()}</span><span>FT</span></div>
      <div className="space-y-2">
        <TeamRow team={g.home} score={g.homeScore} winner={g.homeScore > g.awayScore} />
        <TeamRow team={g.away} score={g.awayScore} winner={g.awayScore > g.homeScore} />
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
function UpcomingCard({ g, onInsight }) {
  return (
    <motion.div whileHover={{ y: -2 }} className="glass rounded-xl p-4">
      <div className="flex justify-between text-[10px] text-[#A1A1AA] mb-3 uppercase tracking-wide"><span>{g.stage === 'group' ? `Group ${g.group}` : g.stage.toUpperCase()}</span><span>{g.kickoff}</span></div>
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-col items-center flex-1"><Crest src={g.home.crest || g.home.flag} name={g.home.name} size={40} /><div className="text-xs font-semibold text-center mt-1 truncate max-w-full">{g.home.name}</div></div>
        <div className="text-[#A1A1AA] text-xs font-bold">VS</div>
        <div className="flex flex-col items-center flex-1"><Crest src={g.away.crest || g.away.flag} name={g.away.name} size={40} /><div className="text-xs font-semibold text-center mt-1 truncate max-w-full">{g.away.name}</div></div>
      </div>
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#2B2B2B]">
        {g.venue && <div className="text-[10px] text-[#A1A1AA] flex items-center gap-1 truncate max-w-[60%]"><MapPin className="w-3 h-3" />{g.venue}</div>}
        <Button size="sm" variant="ghost" onClick={onInsight} className="h-7 text-xs text-[#D7FF2F] hover:bg-[#D7FF2F]/10 ml-auto"><Brain className="w-3 h-3 mr-1" />AI Insight</Button>
      </div>
    </motion.div>
  );
}

// ----------------- Predictions (Group + Knockout subtabs) -----------------
function PredictionsView({ user, games, predictions, koPredictions, refetchPreds }) {
  const [sub, setSub] = useState('group');
  return (
    <div className="space-y-4">
      <Tabs value={sub} onValueChange={setSub}>
        <TabsList className="bg-[#171717] border border-[#2B2B2B]">
          <TabsTrigger value="group" className="data-[state=active]:bg-[#D7FF2F] data-[state=active]:text-black">Group Stage</TabsTrigger>
          <TabsTrigger value="ko" className="data-[state=active]:bg-[#D7FF2F] data-[state=active]:text-black">Knockouts</TabsTrigger>
        </TabsList>
        <TabsContent value="group" className="mt-4"><GroupPredictions user={user} games={games} predictions={predictions} refetchPreds={refetchPreds} /></TabsContent>
        <TabsContent value="ko" className="mt-4"><KOPredictions user={user} games={games} koPredictions={koPredictions} refetchPreds={refetchPreds} /></TabsContent>
      </Tabs>
    </div>
  );
}

function GroupPredictions({ user, games, predictions, refetchPreds }) {
  const groupGames = games.filter((g) => g.stage === 'group');
  const matchdays = useMemo(() => { const m = {}; groupGames.forEach((g) => { (m[g.matchday] ||= []).push(g); }); return m; }, [groupGames]);
  const predMap = useMemo(() => Object.fromEntries((predictions || []).map((p) => [p.match_id, p])), [predictions]);
  const [selected, setSelected] = useState(Object.keys(matchdays).sort((a,b)=>+a-+b)[0] || '1');
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {Object.keys(matchdays).sort((a,b)=>+a-+b).map((md) => (
          <Button key={md} size="sm" onClick={() => setSelected(md)} className={selected === md ? 'bg-[#D7FF2F] text-black hover:bg-[#D7FF2F]' : 'bg-[#171717] border border-[#2B2B2B] hover:bg-[#2B2B2B]'}>Matchday {md}</Button>
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

function PredictionCard({ g, user, pred, onSaved, ko = false }) {
  const [home, setHome] = useState(pred?.pred_home_score ?? '');
  const [away, setAway] = useState(pred?.pred_away_score ?? '');
  const timeoutRef = useRef(null);
  useEffect(() => { setHome(pred?.pred_home_score ?? ''); setAway(pred?.pred_away_score ?? ''); }, [pred?.pred_home_score, pred?.pred_away_score]);
  const save = async (h, a) => {
    if (h === '' || a === '' || g.locked) return;
    if (ko && +h === +a) { toast.error('Knockout matches require a winner. Please select a winner.'); return; }
    const endpoint = ko ? '/api/ko-predictions' : '/api/predictions';
    const r = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: user.id, match_id: g.id, pred_home_score: +h, pred_away_score: +a }) });
    const j = await r.json();
    if (j.ok) { toast.success(`Saved ${g.home.name} ${h}-${a} ${g.away.name}`); onSaved?.(); } else toast.error(j.error || 'Save failed');
  };
  const onChange = (which, val) => {
    const v = val.replace(/[^0-9]/g, '').slice(0, 2);
    if (which === 'h') setHome(v); else setAway(v);
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => save(which === 'h' ? v : home, which === 'a' ? v : away), 600);
  };
  const isCorrect = pred && calcPoints(pred, g) > 0;
  const noTeam = !g.home.name || g.home.name.includes('Winner') || g.home.name.includes('Runner') || g.home.name.includes('3rd') || g.home.name.includes('Loser') || g.away.name?.includes('Winner') || g.away.name?.includes('Runner') || g.away.name?.includes('3rd') || g.away.name?.includes('Loser');
  return (
    <motion.div whileHover={{ scale: g.locked ? 1 : 1.01 }} className={`glass rounded-xl p-4 relative ${g.locked ? 'opacity-70' : ''}`}>
      {g.locked && <div className="absolute top-2 right-2 flex items-center gap-1 text-[10px] text-[#EF4444]"><Lock className="w-3 h-3" />{g.finished ? 'FT' : 'LOCKED'}</div>}
      <div className="text-[10px] uppercase tracking-wide text-[#A1A1AA] mb-3">{g.stage === 'group' ? `Group ${g.group}` : `M${g.id} • ${g.stage.toUpperCase()}`} • {g.kickoff}</div>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <div className="flex items-center gap-2 min-w-0"><Crest src={g.home.crest || g.home.flag} name={g.home.name} size={36} /><span className="font-semibold text-sm truncate">{g.home.name}</span></div>
        <div className="flex items-center gap-1">
          <Input value={home} onChange={(e) => onChange('h', e.target.value)} disabled={g.locked || noTeam} placeholder="0" className="no-spinner w-12 h-12 text-center text-2xl font-black bg-[#0D0D0D] border-[#2B2B2B] focus-visible:ring-[#D7FF2F]" />
          <span className="text-[#A1A1AA] text-xs font-bold">vs</span>
          <Input value={away} onChange={(e) => onChange('a', e.target.value)} disabled={g.locked || noTeam} placeholder="0" className="no-spinner w-12 h-12 text-center text-2xl font-black bg-[#0D0D0D] border-[#2B2B2B] focus-visible:ring-[#D7FF2F]" />
        </div>
        <div className="flex items-center gap-2 justify-end min-w-0"><span className="font-semibold text-sm truncate text-right">{g.away.name}</span><Crest src={g.away.crest || g.away.flag} name={g.away.name} size={36} /></div>
      </div>
      {noTeam && <div className="text-[10px] text-[#A1A1AA] mt-2 text-center italic">Teams to be decided</div>}
      {g.finished && (
        <div className="flex justify-between items-center mt-3 pt-3 border-t border-[#2B2B2B]">
          <span className="text-xs text-[#A1A1AA]">Actual: {g.homeScore}-{g.awayScore}</span>
          {pred && <Badge className={isCorrect ? 'bg-[#22C55E] text-black' : 'bg-[#EF4444] text-white'}>+{calcPoints(pred, g)} pts</Badge>}
        </div>
      )}
    </motion.div>
  );
}

function KOPredictions({ user, games, koPredictions, refetchPreds }) {
  const koMap = useMemo(() => Object.fromEntries((koPredictions || []).map((p) => [p.match_id, p])), [koPredictions]);
  const stages = ['r32', 'r16', 'qf', 'sf', 'third', 'final'];
  const [stage, setStage] = useState('r32');
  const stageGames = games.filter((g) => g.stage === stage).sort((a, b) => +a.id - +b.id);
  const stageLabel = { r32: 'Round of 32', r16: 'Round of 16', qf: 'Quarter-finals', sf: 'Semi-finals', third: '3rd Place', final: 'Final' };
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {stages.map((s) => (
          <Button key={s} size="sm" onClick={() => setStage(s)} className={stage === s ? 'bg-[#D7FF2F] text-black hover:bg-[#D7FF2F]' : 'bg-[#171717] border border-[#2B2B2B] hover:bg-[#2B2B2B]'}>{stageLabel[s]}</Button>
        ))}
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        {stageGames.map((g) => <PredictionCard key={g.id} g={g} user={user} pred={koMap[g.id]} onSaved={refetchPreds} ko />)}
      </div>
    </div>
  );
}

// ----------------- Bracket with auto-advance + confetti -----------------
function Bracket({ games, koPredictions, predictions }) {
  const [mine, setMine] = useState(false);
  const koMap = useMemo(() => Object.fromEntries((koPredictions || []).map((p) => [p.match_id, p])), [koPredictions]);

  // Build a virtual bracket using user picks, cascading winners forward
  const virtual = useMemo(() => buildVirtualBracket(games, koMap), [games, koMap]);
  const activeGames = mine ? virtual : games;

  const ko = activeGames.filter((g) => g.stage !== 'group');
  const byStage = {
    r32: ko.filter((g) => g.stage === 'r32').sort((a, b) => +a.id - +b.id),
    r16: ko.filter((g) => g.stage === 'r16').sort((a, b) => +a.id - +b.id),
    qf: ko.filter((g) => g.stage === 'qf').sort((a, b) => +a.id - +b.id),
    sf: ko.filter((g) => g.stage === 'sf').sort((a, b) => +a.id - +b.id),
    final: ko.filter((g) => g.stage === 'final'),
    third: ko.filter((g) => g.stage === 'third'),
  };
  // Determine champion
  const finalGame = byStage.final[0];
  let champion = null;
  if (mine && finalGame) {
    const pick = koMap[finalGame.id];
    if (pick && finalGame.home.id !== '0' && finalGame.away.id !== '0') {
      champion = +pick.pred_home_score > +pick.pred_away_score ? finalGame.home : +pick.pred_away_score > +pick.pred_home_score ? finalGame.away : null;
    }
  } else if (finalGame?.finished) {
    champion = finalGame.homeScore > finalGame.awayScore ? finalGame.home : finalGame.away;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between glass rounded-xl p-3">
        <div className="flex items-center gap-2 text-sm"><Trophy className="w-4 h-4 text-[#D7FF2F]" /><span className="font-semibold">2026 Pathways</span><Badge className="bg-[#171717] border border-[#2B2B2B] text-[#A1A1AA]">32 → Final</Badge></div>
        <div className="flex items-center gap-2 text-xs">
          <span className={mine ? 'text-[#A1A1AA]' : 'text-white font-semibold'}>Real</span>
          <Switch checked={mine} onCheckedChange={setMine} />
          <span className={mine ? 'text-[#D7FF2F] font-semibold' : 'text-[#A1A1AA]'}>My Predictions</span>
        </div>
      </div>
      {champion && <ChampionBanner champ={champion} mine={mine} />}
      <div className="bracket-scroll overflow-x-auto pb-4">
        <div className="flex gap-6 min-w-[1400px] py-4 px-2">
          <BracketColumn title="Round of 32" games={byStage.r32} mine={mine} koMap={koMap} />
          <BracketColumn title="Round of 16" games={byStage.r16} mine={mine} koMap={koMap} />
          <BracketColumn title="Quarter-finals" games={byStage.qf} mine={mine} koMap={koMap} />
          <BracketColumn title="Semi-finals" games={byStage.sf} mine={mine} koMap={koMap} />
          <div className="flex flex-col gap-4 flex-shrink-0 justify-center">
            <div className="text-xs uppercase tracking-widest text-[#D7FF2F] text-center font-bold">Final</div>
            {byStage.final.map((g) => <BracketCard key={g.id} g={g} mine={mine} pred={koMap[g.id]} highlight />)}
            <div className="text-xs uppercase tracking-widest text-[#A1A1AA] text-center font-bold mt-4">3rd Place</div>
            {byStage.third.map((g) => <BracketCard key={g.id} g={g} mine={mine} pred={koMap[g.id]} />)}
          </div>
        </div>
      </div>
    </div>
  );
}

// Auto-advance: build a virtual games list where, in "My Predictions" mode,
// each KO match's teams are resolved from user's prior picks where possible.
function buildVirtualBracket(realGames, koMap) {
  const games = realGames.map((g) => ({ ...g, home: { ...g.home }, away: { ...g.away } }));
  const byId = Object.fromEntries(games.map((g) => [g.id, g]));
  const stageOrder = { r32: 1, r16: 2, qf: 3, sf: 4, third: 5, final: 5 };
  const ko = games.filter((g) => g.stage !== 'group').sort((a, b) => (stageOrder[a.stage] || 0) - (stageOrder[b.stage] || 0) || +a.id - +b.id);

  // Determine winner of a KO match from user's prediction (or actual finish)
  const winnerOf = (g) => {
    if (g.finished && g.homeScore != null && g.awayScore != null) {
      return g.homeScore > g.awayScore ? g.home : g.away;
    }
    const p = koMap[g.id];
    if (!p) return null;
    if (+p.pred_home_score === +p.pred_away_score) return null;
    return +p.pred_home_score > +p.pred_away_score ? g.home : g.away;
  };
  const loserOf = (g) => {
    if (g.finished && g.homeScore != null && g.awayScore != null) {
      return g.homeScore > g.awayScore ? g.away : g.home;
    }
    const p = koMap[g.id];
    if (!p) return null;
    if (+p.pred_home_score === +p.pred_away_score) return null;
    return +p.pred_home_score > +p.pred_away_score ? g.away : g.home;
  };

  // Iterate stages in order; for each match, resolve "Winner Match X" / "Loser Match X" labels
  ko.forEach((g) => {
    ['home', 'away'].forEach((side) => {
      const team = g[side];
      if (team.id && team.id !== '0') return; // already resolved by API
      const m = team.name?.match(/Winner Match (\d+)/i);
      if (m) {
        const src = byId[m[1]];
        if (src) {
          const w = winnerOf(src);
          if (w) g[side] = { ...w };
        }
        return;
      }
      const lm = team.name?.match(/Loser Match (\d+)/i);
      if (lm) {
        const src = byId[lm[1]];
        if (src) {
          const l = loserOf(src);
          if (l) g[side] = { ...l };
        }
      }
    });
  });
  return games;
}

function BracketColumn({ title, games, mine, koMap }) {
  return (
    <div className="flex flex-col gap-3 flex-shrink-0 w-[240px]">
      <div className="text-xs uppercase tracking-widest text-[#A1A1AA] text-center font-bold">{title}</div>
      <div className="flex flex-col gap-3 justify-around flex-1">{games.map((g) => <BracketCard key={g.id} g={g} mine={mine} pred={koMap[g.id]} />)}</div>
    </div>
  );
}

function BracketCard({ g, highlight, mine, pred }) {
  // Winner highlighting
  let homeWin = g.finished && g.homeScore > g.awayScore;
  let awayWin = g.finished && g.awayScore > g.homeScore;
  if (mine && pred && !g.finished) {
    homeWin = +pred.pred_home_score > +pred.pred_away_score;
    awayWin = +pred.pred_away_score > +pred.pred_home_score;
  }
  const showScore = g.finished ? { h: g.homeScore, a: g.awayScore } : mine && pred ? { h: pred.pred_home_score, a: pred.pred_away_score } : { h: null, a: null };
  return (
    <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className={`rounded-lg p-2 border ${highlight ? 'bg-[#D7FF2F]/10 border-[#D7FF2F]' : 'bg-[#171717] border-[#2B2B2B]'} text-xs`}>
      <div className="text-[9px] text-[#A1A1AA] mb-1">M{g.id} • {g.stage.toUpperCase()}</div>
      <BracketTeam team={g.home} score={showScore.h} winner={homeWin} />
      <BracketTeam team={g.away} score={showScore.a} winner={awayWin} />
    </motion.div>
  );
}
function BracketTeam({ team, score, winner }) {
  return (
    <div className={`flex items-center gap-1.5 py-1 ${winner ? 'text-[#D7FF2F] font-bold' : 'text-white'}`}>
      <Crest src={team.crest || team.flag} name={team.name} size={20} />
      <span className="flex-1 truncate text-[11px]">{team.name}</span>
      {score != null && score !== '' && <span className="font-mono font-bold text-xs">{score}</span>}
    </div>
  );
}

function Confetti() {
  const pieces = Array.from({ length: 80 });
  const colors = ['#D7FF2F', '#22C55E', '#FFFFFF', '#EF4444'];
  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {pieces.map((_, i) => (
        <span key={i} className="confetti"
          style={{ left: `${Math.random() * 100}%`, top: `-${Math.random() * 20}vh`, background: colors[i % colors.length], animationDelay: `${Math.random() * 2}s`, animationDuration: `${2 + Math.random() * 3}s` }} />
      ))}
    </div>
  );
}

function ChampionBanner({ champ, mine }) {
  const [showConfetti, setShowConfetti] = useState(true);
  useEffect(() => { const t = setTimeout(() => setShowConfetti(false), 6000); return () => clearTimeout(t); }, [champ?.name]);
  return (
    <>
      {showConfetti && <Confetti />}
      <motion.div initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring' }}
        className="relative overflow-hidden rounded-2xl p-8 text-center"
        style={{ background: 'linear-gradient(135deg, #D7FF2F22, #171717)', border: '1px solid #D7FF2F' }}>
        <Crown className="w-12 h-12 text-[#D7FF2F] mx-auto mb-3 animate-pulse" />
        <div className="text-xs uppercase tracking-widest text-[#A1A1AA] mb-2">{mine ? 'Your Predicted World Cup Winner' : 'World Cup Champion'}</div>
        <motion.div initial={{ y: 10 }} animate={{ y: 0 }} className="flex items-center justify-center gap-4">
          <Crest src={champ.crest || champ.flag} name={champ.name} size={72} />
          <div className="text-3xl sm:text-5xl font-black text-[#D7FF2F]">{champ.name}</div>
        </motion.div>
      </motion.div>
    </>
  );
}

// ----------------- Leaderboard -----------------
function Leaderboard({ user }) {
  const { data } = useQuery({ queryKey: ['leaderboard'], queryFn: () => fetchJSON('/api/leaderboard') });
  const board = data?.leaderboard || [];
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-[40px_1fr_70px_70px_70px_70px] gap-2 px-3 py-2 text-[10px] uppercase tracking-wider text-[#A1A1AA] border-b border-[#2B2B2B]">
        <div>Rank</div><div>User</div><div className="text-right">Pts</div><div className="text-right">Exact</div><div className="text-right">Correct</div><div className="text-right">Acc%</div>
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

// ----------------- Profile -----------------
function Profile({ user, predictions, games, logout }) {
  const gMap = Object.fromEntries(games.map((g) => [g.id, g]));
  const completed = (predictions || []).filter((p) => gMap[p.match_id]?.finished);
  const pts = completed.reduce((s, p) => s + calcPoints(p, gMap[p.match_id]), 0);
  const exact = completed.filter((p) => calcPoints(p, gMap[p.match_id]) === 3).length;
  return (
    <div className="space-y-6">
      <Card className="glass border-[#2B2B2B]"><CardContent className="p-6 flex items-center gap-4">
        <Avatar className="w-20 h-20 bg-[#2B2B2B]"><AvatarFallback className="bg-[#D7FF2F] text-black text-2xl font-black">{user.username.slice(0,2).toUpperCase()}</AvatarFallback></Avatar>
        <div className="flex-1"><div className="text-2xl font-black">{user.username}</div><div className="text-sm text-[#A1A1AA] flex items-center gap-1"><Globe2 className="w-3 h-3" />{user.country || 'World'}</div></div>
        <Button variant="outline" onClick={logout} className="border-[#2B2B2B] hover:bg-[#2B2B2B]"><LogOut className="w-4 h-4 mr-2" />Logout</Button>
      </CardContent></Card>
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
            const pp = calcPoints(p, g);
            return (
              <div key={p.match_id} className="glass rounded-xl px-4 py-3 flex items-center gap-3">
                <Crest src={g.home.crest || g.home.flag} name={g.home.name} size={24} />
                <span className="text-sm flex-1 truncate">{g.home.name} <span className="font-mono text-[#D7FF2F]">{p.pred_home_score}-{p.pred_away_score}</span> {g.away.name}</span>
                <Crest src={g.away.crest || g.away.flag} name={g.away.name} size={24} />
                {g.finished && <Badge className={pp ? 'bg-[#22C55E] text-black' : 'bg-[#EF4444] text-white'}>+{pp}</Badge>}
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
  return <Card className="glass border-[#2B2B2B]"><CardContent className="p-4"><Icon className="w-5 h-5 text-[#D7FF2F] mb-2" /><div className="text-2xl font-black">{value}</div><div className="text-xs text-[#A1A1AA] uppercase tracking-wide">{label}</div></CardContent></Card>;
}

// ----------------- Admin Panel (visible only when username === 'admin') -----------------
function AdminPanel({ games }) {
  const qcl = useQueryClient();
  const { data: ovData, refetch } = useQuery({ queryKey: ['overrides'], queryFn: () => fetchJSON('/api/admin/overrides') });
  const overrides = ovData?.overrides || [];
  const [matchId, setMatchId] = useState('');
  const [homeScore, setHomeScore] = useState('');
  const [awayScore, setAwayScore] = useState('');
  const [locked, setLocked] = useState(false);
  const sync = async () => {
    const r = await fetch('/api/admin/sync', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    const j = await r.json();
    if (j.ok) { toast.success('Data cache cleared, will refetch'); qcl.invalidateQueries(); } else toast.error('Sync failed');
  };
  const apply = async () => {
    if (!matchId) return toast.error('Enter match id');
    const r = await fetch('/api/admin/result', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ match_id: matchId, home_score: homeScore === '' ? null : +homeScore, away_score: awayScore === '' ? null : +awayScore, locked }) });
    const j = await r.json();
    if (j.ok) { toast.success('Override saved'); refetch(); qcl.invalidateQueries(); } else toast.error(j.error || 'Failed');
  };
  const clearOverride = async (mid) => {
    const r = await fetch('/api/admin/result', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ match_id: mid, clear: true }) });
    if ((await r.json()).ok) { toast.success('Override cleared'); refetch(); qcl.invalidateQueries(); }
  };
  const recalc = () => { qcl.invalidateQueries({ queryKey: ['leaderboard'] }); toast.success('Leaderboard recalculated'); };
  const lookupGame = games.find((g) => g.id === matchId);
  return (
    <div className="space-y-6">
      <div className="glass rounded-xl p-4 flex items-center gap-3"><Shield className="w-6 h-6 text-[#D7FF2F]" /><div><div className="font-bold">Admin Panel</div><div className="text-xs text-[#A1A1AA]">Sync data, recalculate scores, edit results, force lock</div></div></div>
      <div className="grid sm:grid-cols-2 gap-3">
        <Button onClick={sync} className="bg-[#171717] border border-[#2B2B2B] hover:bg-[#2B2B2B] h-auto py-4 justify-start"><RefreshCw className="w-4 h-4 mr-2 text-[#D7FF2F]" /><div className="text-left"><div className="font-bold">Sync APIs</div><div className="text-xs text-[#A1A1AA]">Clear cache, refetch worldcup26.ir</div></div></Button>
        <Button onClick={recalc} className="bg-[#171717] border border-[#2B2B2B] hover:bg-[#2B2B2B] h-auto py-4 justify-start"><Trophy className="w-4 h-4 mr-2 text-[#D7FF2F]" /><div className="text-left"><div className="font-bold">Recalculate Leaderboard</div><div className="text-xs text-[#A1A1AA]">Refresh ranking</div></div></Button>
      </div>
      <Card className="glass border-[#2B2B2B]"><CardContent className="p-5 space-y-3">
        <div className="flex items-center gap-2"><Edit3 className="w-4 h-4 text-[#D7FF2F]" /><h3 className="font-bold">Edit Match Result / Force Lock</h3></div>
        <div className="grid grid-cols-4 gap-2">
          <Input placeholder="Match ID (e.g. 46)" value={matchId} onChange={(e) => setMatchId(e.target.value)} className="bg-[#0D0D0D] border-[#2B2B2B] col-span-1" />
          <Input placeholder="Home" type="number" value={homeScore} onChange={(e) => setHomeScore(e.target.value)} className="bg-[#0D0D0D] border-[#2B2B2B]" />
          <Input placeholder="Away" type="number" value={awayScore} onChange={(e) => setAwayScore(e.target.value)} className="bg-[#0D0D0D] border-[#2B2B2B]" />
          <Button onClick={apply} className="bg-[#D7FF2F] text-black hover:bg-[#D7FF2F]/90 font-bold">Apply</Button>
        </div>
        {lookupGame && <div className="text-xs text-[#A1A1AA]">M{lookupGame.id}: {lookupGame.home.name} vs {lookupGame.away.name} ({lookupGame.stage})</div>}
        <label className="flex items-center gap-2 text-xs"><Switch checked={locked} onCheckedChange={setLocked} /><span>Force lock</span></label>
      </CardContent></Card>
      <div>
        <h3 className="font-bold mb-2 text-sm">Active Overrides ({overrides.length})</h3>
        <div className="space-y-2">
          {overrides.map((o) => {
            const g = games.find((x) => x.id === o.match_id);
            return (
              <div key={o.match_id} className="glass rounded-lg px-3 py-2 flex items-center justify-between text-sm">
                <div>M{o.match_id} {g && `• ${g.home.name} vs ${g.away.name}`} → <span className="font-mono text-[#D7FF2F]">{o.home_score ?? '-'} - {o.away_score ?? '-'}</span>{o.locked && <Badge className="ml-2 bg-[#EF4444] text-white">Locked</Badge>}</div>
                <Button size="sm" variant="ghost" onClick={() => clearOverride(o.match_id)} className="h-7 text-xs text-[#EF4444] hover:bg-[#EF4444]/10">Clear</Button>
              </div>
            );
          })}
          {!overrides.length && <div className="text-xs text-[#A1A1AA] italic">No active overrides</div>}
        </div>
      </div>
    </div>
  );
}

// ----------------- Login Modal -----------------
function LoginModal({ onLogin }) {
  const [username, setUsername] = useState(''), [country, setCountry] = useState(''), [loading, setLoading] = useState(false);
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
        <Input placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()} className="bg-[#0D0D0D] border-[#2B2B2B] focus-visible:ring-[#D7FF2F]" />
        <Input placeholder="Country (optional)" value={country} onChange={(e) => setCountry(e.target.value)} className="bg-[#0D0D0D] border-[#2B2B2B] focus-visible:ring-[#D7FF2F]" />
        <Button onClick={submit} disabled={loading} className="bg-[#D7FF2F] text-black hover:bg-[#D7FF2F]/90 font-bold">{loading ? 'Loading...' : 'Enter Tournament'}</Button>
        <p className="text-[10px] text-[#A1A1AA] text-center">Tip: log in as <span className="text-[#D7FF2F] font-bold">admin</span> to access the admin panel.</p>
      </DialogContent>
    </Dialog>
  );
}

// ----------------- Main App -----------------
function App() {
  const { user, login, logout } = useUser();
  const [tab, setTab] = useState('centre');
  const queryClient = useQueryClient();
  const { data: gamesData } = useQuery({ queryKey: ['games'], queryFn: () => fetchJSON('/api/matches'), refetchInterval: 5 * 60 * 1000 });
  const { data: predData, refetch: refetchPreds } = useQuery({ queryKey: ['predictions', user?.id], enabled: !!user?.id, queryFn: () => fetchJSON(`/api/predictions?userId=${user.id}`) });
  const games = gamesData?.games || [];
  const predictions = predData?.predictions || [];
  const koPredictions = predData?.koPredictions || [];
  const refetchAll = () => { refetchPreds(); queryClient.invalidateQueries({ queryKey: ['leaderboard'] }); queryClient.invalidateQueries({ queryKey: ['games'] }); };
  const isAdmin = user?.username?.toLowerCase() === 'admin';

  if (!user) return <LoginModal onLogin={login} />;
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-[#0D0D0D]/80 border-b border-[#2B2B2B]">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="WC26" className="w-10 h-10 rounded-lg" />
            <div className="hidden sm:block"><div className="font-black text-sm leading-tight">WC26 Predictor</div><div className="text-[10px] text-[#A1A1AA] uppercase tracking-widest">FIFA World Cup 2026</div></div>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && <Badge className="bg-[#D7FF2F] text-black"><Shield className="w-3 h-3 mr-1" />Admin</Badge>}
            <Avatar className="w-8 h-8"><AvatarFallback className="bg-[#D7FF2F] text-black text-xs font-bold">{user.username.slice(0,2).toUpperCase()}</AvatarFallback></Avatar>
            <span className="hidden sm:inline text-sm font-semibold">{user.username}</span>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 py-6">
        {!games.length && <div className="text-center py-20 text-[#A1A1AA]">Loading World Cup data...</div>}
        {games.length > 0 && (
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className={`bg-[#171717] border border-[#2B2B2B] mb-6 grid w-full ${isAdmin ? 'grid-cols-6' : 'grid-cols-5'}`}>
              <TabsTrigger value="centre" className="data-[state=active]:bg-[#D7FF2F] data-[state=active]:text-black">Match Centre</TabsTrigger>
              <TabsTrigger value="predict" className="data-[state=active]:bg-[#D7FF2F] data-[state=active]:text-black">Predictions</TabsTrigger>
              <TabsTrigger value="bracket" className="data-[state=active]:bg-[#D7FF2F] data-[state=active]:text-black">Bracket</TabsTrigger>
              <TabsTrigger value="board" className="data-[state=active]:bg-[#D7FF2F] data-[state=active]:text-black">Leaderboard</TabsTrigger>
              <TabsTrigger value="profile" className="data-[state=active]:bg-[#D7FF2F] data-[state=active]:text-black">Profile</TabsTrigger>
              {isAdmin && <TabsTrigger value="admin" className="data-[state=active]:bg-[#D7FF2F] data-[state=active]:text-black">Admin</TabsTrigger>}
            </TabsList>
            <TabsContent value="centre"><MatchCentre games={games} /></TabsContent>
            <TabsContent value="predict"><PredictionsView user={user} games={games} predictions={predictions} koPredictions={koPredictions} refetchPreds={refetchAll} /></TabsContent>
            <TabsContent value="bracket"><Bracket games={games} koPredictions={koPredictions} predictions={predictions} /></TabsContent>
            <TabsContent value="board"><Leaderboard user={user} /></TabsContent>
            <TabsContent value="profile"><Profile user={user} predictions={predictions} games={games} logout={logout} /></TabsContent>
            {isAdmin && <TabsContent value="admin"><AdminPanel games={games} /></TabsContent>}
          </Tabs>
        )}
      </main>
    </div>
  );
}

export default function Page() {
  return <QueryClientProvider client={qc}><App /></QueryClientProvider>;
}
