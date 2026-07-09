const { getGuestJWT, buildTxLineHeaders, TXLINE_CONFIG } = require('./src/lib/txline/auth.js');
async function test() {
  const jwt = process.env.TXLINE_DEV_JWT || await getGuestJWT();
  const apiToken = process.env.TXLINE_DEV_API_TOKEN || 'mock-api-token';
  const txLineHeaders = buildTxLineHeaders(jwt, apiToken);
  
  const res = await fetch(`${TXLINE_CONFIG.apiBase}/scores/snapshot?fixtureId=18187298`, { headers: txLineHeaders });
  const data = await res.json();
  console.log(JSON.stringify(data).substring(0, 500));
  if (data.lineups) console.log("Has lineups!", data.lineups.length);
  else console.log("No lineups");
}
test();
