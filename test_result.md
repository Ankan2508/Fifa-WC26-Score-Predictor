# WC26 Predictor — Test Result

## Testing Protocol
- Always test backend first using `deep_testing_backend_nextjs`.
- Never invoke frontend testing without explicit user permission.
- Update this file before each test run.
- Never modify the Testing Protocol section.

## User Problem Statement
Build a FIFA World Cup 2026 prediction platform with match centre, predictions (autosave + 1hr lock), bracket auto-advance, leaderboard, AI insights, and admin panel.

## Current Status — v2 Complete
### v1 (already done)
- ✅ Login (username + country, MongoDB)
- ✅ Match Centre (countdown, stats, results, upcoming)
- ✅ Group predictions (matchday tabs, autosave, lock)
- ✅ Bracket (R32 → Final + 3rd place)
- ✅ Leaderboard (3pts exact / 1pt correct)
- ✅ Profile
- ✅ Logo as favicon + navbar

### v2 (this iteration)
- ✅ **AI Match Insights** — GPT-4o-mini via Emergent universal key. Win probability bars + 2-sentence tactical analysis. Cached per match in `ai_insights` collection.
- ✅ **Knockout Predictions UI** — sub-tab in Predictions with stage selector (R32/R16/QF/SF/3rd/Final). Validates non-draw (`Knockout matches require a winner`).
- ✅ **Bracket auto-advance** — "My Predictions" toggle cascades `Winner Match X` / `Loser Match X` labels through all 32 KO matches based on user's KO picks.
- ✅ **Champion banner + confetti** — animated reveal when final has a predicted/real winner.
- ✅ **Admin panel** — visible only for username `admin`. Sync APIs (cache bust), recalculate leaderboard, edit/override match result, force lock toggle, view+clear active overrides.

## API Endpoints
- `POST /api/auth` — username/country → user
- `GET /api/matches` — 104 enriched games
- `GET /api/predictions?userId=` — user's group + KO predictions
- `POST /api/predictions` — group prediction upsert (locked match rejected)
- `POST /api/ko-predictions` — KO prediction upsert (draw rejected)
- `GET /api/leaderboard` — ranked board
- `GET /api/insights/:matchId` — AI insight (cached)
- `GET /api/admin/overrides` — list active overrides
- `POST /api/admin/result` — set/clear override `{match_id, home_score, away_score, locked, clear}`
- `POST /api/admin/sync` — bust 5-min in-memory cache

## Verified working (browser screenshots, all five v2 flows)
- AI insight dialog renders with probability bars + analysis text
- KO predictions tab shows all stages with proper labels
- Bracket toggle switches Real / My Predictions
- Admin panel accessible only for `admin` username
- Overrides apply to leaderboard scoring via `getEnrichedGames`

## Pending (future)
- Google OAuth / Supabase migration if user requests full auth
- Group standings simulator that fills R32 team slots from user predicted group results (currently uses real API resolution + KO-stage label cascading only)
- AI insight regeneration button
