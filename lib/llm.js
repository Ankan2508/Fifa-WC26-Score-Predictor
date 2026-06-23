// LLM client for Emergent universal key
const ENDPOINT = 'https://integrations.emergentagent.com/llm/chat/completions';
const MODEL = process.env.EMERGENT_LLM_MODEL || 'gpt-4o-mini';

export async function generateMatchInsight({ home, away, group, stage, recentHome, recentAway }) {
  const key = process.env.EMERGENT_LLM_KEY;
  if (!key) throw new Error('LLM key not configured');

  const recentText = (recent) => {
    if (!recent || !recent.length) return 'No recent matches';
    return recent.map((m) => {
      const us = m.usHome ? m.home : m.away;
      const them = m.usHome ? m.away : m.home;
      const usScore = m.usHome ? m.homeScore : m.awayScore;
      const themScore = m.usHome ? m.awayScore : m.homeScore;
      const res = usScore > themScore ? 'W' : usScore < themScore ? 'L' : 'D';
      return `${res} ${usScore}-${themScore} vs ${them}`;
    }).join('; ');
  };

  const prompt = `You are a football analyst. Predict win probabilities and write a 2-sentence tactical insight for this FIFA World Cup 2026 match.

Match: ${home} vs ${away}
Stage: ${stage}${group ? ` (Group ${group})` : ''}
${home} recent form: ${recentText(recentHome)}
${away} recent form: ${recentText(recentAway)}

Return ONLY valid JSON in this exact shape (no markdown, no commentary):
{"homeWin": 0.45, "draw": 0.25, "awayWin": 0.30, "insight": "First sentence about ${home}'s strengths or weaknesses.\\nSecond sentence about ${away} and the likely tactical battle."}

Probabilities must sum to 1.0. Insight must be exactly 2 sentences separated by a single newline.`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 250,
        temperature: 0.5,
        response_format: { type: 'json_object' },
      }),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`LLM ${res.status}`);
    const data = await res.json();
    const text = data.choices?.[0]?.message?.content || '';
    const jStart = text.indexOf('{');
    const jEnd = text.lastIndexOf('}');
    if (jStart < 0 || jEnd < 0) throw new Error('No JSON found');
    const parsed = JSON.parse(text.slice(jStart, jEnd + 1));
    // Normalize probabilities
    let { homeWin, draw, awayWin } = parsed;
    homeWin = +homeWin || 0.33;
    draw = +draw || 0.33;
    awayWin = +awayWin || 0.34;
    const sum = homeWin + draw + awayWin;
    if (sum > 0) { homeWin /= sum; draw /= sum; awayWin /= sum; }
    return {
      homeWin: Math.round(homeWin * 100),
      draw: Math.round(draw * 100),
      awayWin: Math.round(awayWin * 100),
      insight: String(parsed.insight || '').trim(),
    };
  } finally {
    clearTimeout(timeout);
  }
}
