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
    const res = await fetch(`${base}/fixtures`, { headers: { 'Authorization': 'Bearer ' + jwt, 'X-Api-Token': token } });
    const data = await res.json();
    console.log("Total fixtures:", data.length);
    
    // Look at a few World Cup fixtures
    const wcFixtures = data.filter(f => f.Competition === 'FIFA World Cup' || f.CompetitionId === 17);
    console.log("World Cup fixtures:", wcFixtures.length);
    if(wcFixtures.length > 0) {
      console.log("Sample WC fixtures:");
      wcFixtures.slice(0, 10).forEach(f => {
         console.log(`[${f.FixtureId}] ${f.Participant1} vs ${f.Participant2} (Group: ${f.FixtureGroupId}, Start: ${new Date(f.StartTime).toISOString()})`);
      });
    }
  } catch(e) {
    console.log("Error:", e.message);
  }
}
run();
