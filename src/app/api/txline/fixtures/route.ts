import { NextRequest, NextResponse } from 'next/server';
import { getGuestJWT, buildTxLineHeaders, TXLINE_CONFIG } from '@/lib/txline/auth';

export async function GET(request: NextRequest) {
  console.log("HIT FIXTURES API ROUTE");
  try {
    const jwt = process.env.TXLINE_DEV_JWT || await getGuestJWT();
    const apiToken = process.env.TXLINE_DEV_API_TOKEN || 'mock-api-token';
    const txLineHeaders = buildTxLineHeaders(jwt, apiToken);
    
    const upstreamUrl = `${TXLINE_CONFIG.apiBase}/fixtures/snapshot`;
    
    const upstreamResponse = await fetch(upstreamUrl, {
      headers: { ...txLineHeaders },
    });

    if (!upstreamResponse.ok) {
      return NextResponse.json({ error: `TxLINE Error: ${upstreamResponse.statusText}` }, { status: upstreamResponse.status });
    }

    const data = await upstreamResponse.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Fixtures proxy error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
