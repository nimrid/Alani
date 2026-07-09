const fs = require('fs');

async function test() {
  const txLineHeaders = {
    // Assuming the devnet doesn't strictly need real auth if we pass dummy or if we can just hit our local next.js proxy
  };
  const fixtureId = "18187298";
  const scoresUrl = `http://localhost:3000/api/txline/scores-snapshot?fixtureId=${fixtureId}`;
  const oddsUrl = `http://localhost:3000/api/txline/odds-snapshot?fixtureId=${fixtureId}`;

  try {
    const scoresRes = await fetch(scoresUrl);
    const scores = await scoresRes.json();
    fs.writeFileSync('/tmp/scores.json', JSON.stringify(scores.slice(0, 50), null, 2));

    const oddsRes = await fetch(oddsUrl);
    const odds = await oddsRes.json();
    fs.writeFileSync('/tmp/odds.json', JSON.stringify(odds.slice(0, 50), null, 2));
    
    console.log("Wrote to /tmp/scores.json and /tmp/odds.json");
  } catch (err) {
    console.error(err);
  }
}
test();
