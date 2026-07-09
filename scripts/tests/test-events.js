const fs = require('fs');

async function test() {
  try {
    const res = await fetch('http://localhost:3000/api/txline/scores-snapshot?fixtureId=18192996');
    const data = await res.json();
    fs.writeFileSync('/tmp/scores-snapshot.json', JSON.stringify(data, null, 2));
    console.log("Wrote /tmp/scores-snapshot.json");
  } catch (err) {
    console.error(err);
  }
}
test();
