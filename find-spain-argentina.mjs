const jwt = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJFUzI1NiJ9.eyJleHAiOjE3ODU4MTcyNTIsInNlc3Npb25JZCI6IjI5NzgzMmFlLWNjODctNDcxOC04YmEwLWI2MmJkMWY5NmRkYiIsInJvbGUiOiJndWVzdCIsIm1heWJlQ2xpZW50SXAiOiIzLjE3Mi41LjEwNSJ9.ra0pwvC2f8OW5ZHzKWDRrJpP-TeZK00vREotHdUCozh98XnZwzVEnaaC-Bmpf7Ymnir3BYo7pMd7HfAp_tz2vg';
const apiToken = 'txoracle_api_c7b53de76fe64c7c93a76c46fe8003e7';

async function run() {
  try {
    const upstreamUrl = `https://txline-dev.txodds.com/api/fixtures/snapshot?startEpochDay=20600`;
    
    const res = await fetch(upstreamUrl, { 
      headers: { 
        'Authorization': `Bearer ${jwt}`,
        'X-Api-Token': apiToken
      } 
    });
    
    const data = await res.json();
    console.log("Total fixtures fetched:", data.length);
    
    // Find Spain vs Argentina
    const theMatch = data.find(f => 
      (f.Participant1 === 'Spain' && f.Participant2 === 'Argentina') ||
      (f.Participant1 === 'Argentina' && f.Participant2 === 'Spain')
    );
    
    if (theMatch) {
      console.log("FOUND SPAIN VS ARGENTINA:", theMatch);
      console.log("FixtureGroupId:", theMatch.FixtureGroupId);
      console.log("Competition:", theMatch.Competition);
    } else {
      console.log("Spain vs Argentina NOT FOUND in startEpochDay=20600.");
      // Find ANY Spain match to see
      const spainMatches = data.filter(f => f.Participant1 === 'Spain' || f.Participant2 === 'Spain');
      console.log("Spain matches:", spainMatches.map(m => `${m.Participant1} vs ${m.Participant2} (Grp: ${m.FixtureGroupId}, Start: ${new Date(m.StartTime).toISOString()})`));
    }

  } catch(e) {
    console.log("Error:", e.message);
  }
}

run();
