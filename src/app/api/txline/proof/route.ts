import { NextRequest, NextResponse } from 'next/server';
import { getGuestJWT, buildTxLineHeaders, TXLINE_CONFIG } from '@/lib/txline/auth';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const fixtureId = searchParams.get('fixtureId');
  const epochDay = searchParams.get('epochDay');
  const ts = searchParams.get('ts');

  if (!fixtureId || !epochDay || !ts) {
    return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
  }

  try {
    const jwt = process.env.TXLINE_DEV_JWT || await getGuestJWT();
    const apiToken = process.env.TXLINE_DEV_API_TOKEN || 'mock-api-token';
    const txLineHeaders = buildTxLineHeaders(jwt, apiToken);
    
    const upstreamUrl = `${TXLINE_CONFIG.apiBase}/scores/proof/${fixtureId}?epochDay=${epochDay}&ts=${ts}`;
    
    const upstreamResponse = await fetch(upstreamUrl, {
      headers: { ...txLineHeaders },
    });

    if (!upstreamResponse.ok) {
      return NextResponse.json({ error: 'Failed to fetch proof' }, { status: upstreamResponse.status });
    }

    const data = await upstreamResponse.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error(`Proof proxy error for fixture ${fixtureId}:`, error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
