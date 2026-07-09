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
    
    // According to the docs: `/api/odds/snapshot/${fixtureId}`
    // So upstream is `${TXLINE_CONFIG.apiBase}/odds/snapshot/${fixtureId}`
    const upstreamUrl = `${TXLINE_CONFIG.apiBase}/odds/snapshot/${fixtureId}`;
    
    const upstreamResponse = await fetch(upstreamUrl, {
      headers: { ...txLineHeaders },
    });

    if (!upstreamResponse.ok) {
      // It's possible some fixtures don't have odds on devnet yet, just return empty array
      return NextResponse.json([], { status: 200 });
    }

    const data = await upstreamResponse.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error(`Odds snapshot proxy error for fixture ${fixtureId}:`, error);
    // Return empty rather than 500 so home screen can still load
    return NextResponse.json([], { status: 200 });
  }
}
