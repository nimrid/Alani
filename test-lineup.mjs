import pkg from '@next/env';
const { loadEnvConfig } = pkg;
loadEnvConfig(process.cwd());

const base = process.env.TXLINE_API_BASE || 'https://txline-dev.txodds.com/api';
const origin = process.env.TXLINE_API_ORIGIN || 'https://txline-dev.txodds.com';
let jwt = process.env.TXLINE_DEV_JWT;
let token = process.env.TXLINE_DEV_API_TOKEN || 'mock-api-token';

async function getGuestJWT() {
  const res = await fetch(`${origin}/auth/guest/start`, { method: 'POST' });
  const data = await res.json();
  return data.token;
}

async function check(url) {
  try {
    const res = await fetch(base + url, { headers: { 'Authorization': 'Bearer ' + jwt, 'X-Api-Token': token } });
    console.log(url, res.status);
    if(res.ok) {
       const d = await res.json();
       if (Array.isArray(d)) {
         const lineup = d.find(e => e.Action === 'lineups');
         if (lineup) {
           console.log("Found lineup in array!");
           console.log(JSON.stringify(lineup).slice(0, 100));
         } else {
           console.log("No lineup in array.");
         }
       } else {
         console.log(JSON.stringify(d).slice(0,200));
       }
    }
  } catch(e) {
    console.log(url, e.message);
  }
}

async function run() {
  if (!jwt) {
    console.log("Fetching guest JWT...");
    jwt = await getGuestJWT();
  }
  await check('/scores/snapshot/18213979');
  await check('/lineups/snapshot/18213979');
  await check('/fixtures/lineups/18213979');
  await check('/lineups/18213979');
}
run();
