import { NextRequest, NextResponse } from 'next/server';
import { getGuestJWT, buildTxLineHeaders, TXLINE_CONFIG } from '@/lib/txline/auth';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const fixtureId = searchParams.get('fixtureId');

  if (!fixtureId) {
    return NextResponse.json({ error: 'Missing fixtureId' }, { status: 400 });
  }

  try {
    const jwt = process.env.TXLINE_DEV_JWT || await getGuestJWT();
    const apiToken = process.env.TXLINE_DEV_API_TOKEN || 'mock-api-token';
    const txLineHeaders = buildTxLineHeaders(jwt, apiToken);
    
    const upstreamUrl = `${TXLINE_CONFIG.apiBase}/scores/snapshot/${fixtureId}`;
    
    const res = await fetch(upstreamUrl, { headers: txLineHeaders });

    if (!res.ok) {
      return NextResponse.json({ error: `TxLINE Error: ${res.statusText}` }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Scores snapshot proxy error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
