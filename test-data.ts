import { loadEnvConfig } from '@next/env';
import { getGuestJWT, buildTxLineHeaders, TXLINE_CONFIG } from './src/lib/txline/auth.ts';

loadEnvConfig(process.cwd());

async function run() {
  try {
    const jwt = process.env.TXLINE_DEV_JWT || await getGuestJWT();
    const apiToken = process.env.TXLINE_DEV_API_TOKEN || 'mock-api-token';
    const txLineHeaders = buildTxLineHeaders(jwt, apiToken);
    
    const epochDay = Math.floor(Date.now() / 86400000);
    const upstreamUrl = `${TXLINE_CONFIG.apiBase}/fixtures/snapshot?startEpochDay=${epochDay - 14}`;
    
    console.log("Fetching from", upstreamUrl);
    const res = await fetch(upstreamUrl, { headers: txLineHeaders });
    const data = await res.json();
    
    console.log("Total fixtures:", data.length);
    
    const sample = data.slice(0, 5);
    sample.forEach(f => {
      console.log(`Competition: ${f.Competition} (ID: ${f.CompetitionId})`);
      console.log(`Group ID: ${f.FixtureGroupId}`);
    });

    const groups = new Set();
    const comps = new Set();
    data.forEach(f => {
      groups.add(f.FixtureGroupId);
      comps.add(f.Competition);
    });

    console.log("All Competitions:", Array.from(comps).join(', '));
    console.log("All Group IDs:", Array.from(groups).join(', '));

  } catch(e) {
    console.log("Error:", e);
  }
}

run();
