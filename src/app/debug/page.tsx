'use client';

import { useState, useEffect, useRef } from 'react';

export default function DebugPage() {
  const [jwt, setJwt] = useState<string | null>(null);
  const [fixtures, setFixtures] = useState<any[]>([]);
  const [selectedFixture, setSelectedFixture] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const scoresSource = useRef<EventSource | null>(null);
  const oddsSource = useRef<EventSource | null>(null);

  useEffect(() => {
    async function init() {
      try {
        const res = await fetch('/api/txline/fixtures');
        if (!res.ok) throw new Error('Failed to fetch fixtures');
        const data = await res.json();
        setFixtures(data || []);
        setJwt('Valid (proxied)');
      } catch (err: any) {
        setError(err.message);
        setJwt('Error');
      }
    }
    init();

    return () => {
      scoresSource.current?.close();
      oddsSource.current?.close();
    };
  }, []);

  const connectToStream = (fixtureId: string) => {
    setSelectedFixture(fixtureId);
    setLogs((prev) => [`[SYSTEM] Connecting to fixture ${fixtureId}...`, ...prev]);

    scoresSource.current?.close();
    oddsSource.current?.close();

    const sseScores = new EventSource(`/api/txline/scores-stream?fixtureId=${fixtureId}`);
    sseScores.onmessage = (event) => {
      setLogs((prev) => [`[SCORES] ${event.data}`, ...prev].slice(0, 100));
    };
    sseScores.onerror = (err) => {
      setLogs((prev) => [`[SCORES ERROR] Connection lost or failed`, ...prev]);
    };
    scoresSource.current = sseScores;

    const sseOdds = new EventSource(`/api/txline/odds-stream?fixtureId=${fixtureId}`);
    sseOdds.onmessage = (event) => {
      setLogs((prev) => [`[ODDS] ${event.data}`, ...prev].slice(0, 100));
    };
    sseOdds.onerror = (err) => {
      setLogs((prev) => [`[ODDS ERROR] Connection lost or failed`, ...prev]);
    };
    oddsSource.current = sseOdds;
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-8">
        <h1 className="text-3xl font-bold">Alani - Stage 1 Debug</h1>
        
        <section className="bg-gray-800 p-6 rounded-lg border border-gray-700">
          <h2 className="font-bold text-xl mb-4 text-gray-300">Auth Status</h2>
          <p className="font-mono text-green-400">JWT: {jwt || 'Loading...'}</p>
          {error && <p className="text-red-400 mt-2">Error: {error}</p>}
        </section>

        <section>
          <h2 className="font-bold text-xl mb-4 text-gray-300">Fixtures Snapshot</h2>
          {fixtures.length === 0 && !error ? (
            <p className="text-gray-400">Loading fixtures...</p>
          ) : (
            <div className="grid gap-4">
              {fixtures.slice(0, 10).map((f: any) => (
                <div key={f.FixtureId} className="bg-gray-800 border border-gray-700 p-4 rounded-lg flex justify-between items-center">
                  <div>
                    <p className="font-bold text-lg">{f.Participant1} vs {f.Participant2}</p>
                    <p className="text-gray-400 text-sm mt-1">ID: {f.FixtureId} | Start: {new Date(f.StartTime).toLocaleString()}</p>
                  </div>
                  <button 
                    onClick={() => connectToStream(f.FixtureId)}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded font-semibold transition-colors"
                  >
                    Connect Streams
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {selectedFixture && (
          <section>
            <h2 className="font-bold text-xl mb-4 text-gray-300">Live Event Logs (Fixture {selectedFixture})</h2>
            <div className="bg-black border border-gray-700 p-4 rounded-lg h-[500px] overflow-y-auto font-mono text-xs">
              {logs.length === 0 && <p className="text-gray-500">Waiting for events...</p>}
              {logs.map((log, i) => (
                <div key={i} className={`mb-2 pb-2 border-b border-gray-800 break-all ${log.includes('ERROR') ? 'text-red-400' : log.includes('SCORES') ? 'text-green-400' : log.includes('ODDS') ? 'text-yellow-400' : 'text-blue-400'}`}>
                  {log}
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
