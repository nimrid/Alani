import { loadEnvConfig } from '@next/env';
import { getGuestJWT, buildTxLineHeaders, TXLINE_CONFIG } from './src/lib/txline/auth';

loadEnvConfig(process.cwd());

async function run() {
  try {
    const jwt = process.env.TXLINE_DEV_JWT || await getGuestJWT();
    const apiToken = process.env.TXLINE_DEV_API_TOKEN || 'mock-api-token';
    const txLineHeaders = buildTxLineHeaders(jwt, apiToken);
    
    // fetch all
    const upstreamUrl = `${TXLINE_CONFIG.apiBase}/fixtures/snapshot?startEpochDay=20600`;
    const res = await fetch(upstreamUrl, { headers: txLineHeaders });
    const data = await res.json();
    
    const ROUND_IDS = [10115574, 10115675, 10115573, 10115572];
    const knockoutFixtures = data.filter((f: any) => ROUND_IDS.includes(f.FixtureGroupId));
    
    console.log("Found knockout fixtures:", knockoutFixtures.length);
    
    knockoutFixtures.forEach((f: any) => {
       console.log(`[Grp: ${f.FixtureGroupId}] ${f.Participant1} vs ${f.Participant2} | Start: ${new Date(f.StartTime).toISOString()}`);
    });

  } catch(e: any) {
    console.log("Error:", e);
  }
}

run();
