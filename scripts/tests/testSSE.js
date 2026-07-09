const http = require('http');
http.get('http://localhost:3000/api/txline/scores-stream?fixtureId=18187298', (res) => {
  res.on('data', chunk => {
    const lines = chunk.toString().split('\n');
    lines.forEach(line => {
      if (line.startsWith('data:')) {
        const payload = JSON.parse(line.substring(5));
        console.log("Stream Keys:", Object.keys(payload));
        process.exit(0);
      }
    });
  });
});
