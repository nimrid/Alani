import pkg from '@next/env';
const { loadEnvConfig } = pkg;
loadEnvConfig(process.cwd());

const base = process.env.TXLINE_API_BASE || 'https://txline-dev.txodds.com/api';
const origin = process.env.TXLINE_API_ORIGIN || 'https://txline-dev.txodds.com';
let jwt = process.env.TXLINE_DEV_JWT;
let token = process.env.TXLINE_DEV_API_TOKEN;

async function getGuestJWT() {
  const res = await fetch(`${origin}/auth/guest/start`, { method: 'POST' });
  const data = await res.json();
  return data.token;
}

async function run() {
  if (!jwt) {
    jwt = await getGuestJWT();
  }
  try {
    const res = await fetch(`${base}/fixtures/snapshot?startEpochDay=20600`, { headers: { 'Authorization': 'Bearer ' + jwt, 'X-Api-Token': token } });
    const data = await res.json();
    
    // Find all groups in the World Cup
    const wcFixtures = data.filter(f => f.Competition === 'FIFA World Cup' || f.CompetitionId === 17);
    const groups = new Set();
    wcFixtures.forEach(f => groups.add(f.FixtureGroupId));
    console.log("WC Groups:", Array.from(groups).join(', '));
    
    const ROUND_IDS = [10115574, 10115675, 10115573, 10115572];
    const knockoutFixtures = wcFixtures.filter(f => ROUND_IDS.includes(f.FixtureGroupId));
    
    console.log("Found knockout fixtures:", knockoutFixtures.length);
    for (const f of knockoutFixtures) {
       console.log(`[Grp: ${f.FixtureGroupId}] ${f.Participant1 || 'TBD'} vs ${f.Participant2 || 'TBD'}`);
       
       const sRes = await fetch(`${base}/scores/snapshot/${f.FixtureId}`, { headers: { 'Authorization': 'Bearer ' + jwt, 'X-Api-Token': token } });
       const sData = await sRes.json();
       const withScore = sData.filter(d => d.Score).sort((a,b) => b.Ts - a.Ts);
       if (withScore.length > 0) {
           const bestScore = withScore[0].Score;
           console.log(`  -> Score: ${bestScore?.Participant1?.Total?.Goals ?? 0} - ${bestScore?.Participant2?.Total?.Goals ?? 0}`);
       } else {
           console.log(`  -> NO SCORE FOUND`);
       }
    }

  } catch(e) {
    console.log("Error:", e.message);
  }
}
run();
