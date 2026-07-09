const fs = require('fs');
fetch("http://localhost:3000/api/txline/scores-snapshot?fixtureId=18187298")
  .then(res => res.json())
  .then(data => {
    const lineupEvent = [...data].reverse().find(d => d.lineups);
    console.log("Found lineup event:", !!lineupEvent);
    if (lineupEvent) {
       console.log("Teams in lineups:", lineupEvent.lineups.length);
       console.log("Example lineup player:", lineupEvent.lineups[0].lineups[0].player.preferredName);
    }
    const latest = data[data.length - 1];
    console.log("Latest score:", latest.scoreSoccer);
    console.log("Latest minute:", latest.dataSoccer?.Minutes);
  });
