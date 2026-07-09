const fs = require('fs');

async function test() {
  const url = `http://localhost:3000/api/txline/fixtures`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    if (Array.isArray(data)) {
        const statuses = data.map(f => ({
            id: f.FixtureId,
            gameState: f.GameState,
            statusId: f.StatusId,
            time: f.StartTime
        }));
        fs.writeFileSync('/tmp/fixtures.json', JSON.stringify(statuses, null, 2));
        console.log("Wrote /tmp/fixtures.json");
    } else {
        console.log("Not an array:", data);
    }
  } catch (err) {
    console.error(err);
  }
}
test();
