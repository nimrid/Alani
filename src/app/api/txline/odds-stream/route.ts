import { NextRequest } from 'next/server';
import { getGuestJWT, buildTxLineHeaders, TXLINE_CONFIG } from '@/lib/txline/auth';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const fixtureId = searchParams.get('fixtureId');

  if (!fixtureId) {
    return new Response('Missing fixtureId', { status: 400 });
  }

  try {
    const jwt = process.env.TXLINE_DEV_JWT || await getGuestJWT();
    const apiToken = process.env.TXLINE_DEV_API_TOKEN || 'mock-api-token';
    const txLineHeaders = buildTxLineHeaders(jwt, apiToken);
    
    const upstreamUrl = `${TXLINE_CONFIG.apiBase}/odds/stream?fixtureId=${fixtureId}`;
    
    const headers: Record<string, string> = { ...txLineHeaders };
    const lastEventId = request.headers.get('Last-Event-ID');
    if (lastEventId) {
      headers['Last-Event-ID'] = lastEventId;
    }

    const upstreamResponse = await fetch(upstreamUrl, { headers });

    if (!upstreamResponse.ok) {
      return new Response(`TxLINE Error: ${upstreamResponse.statusText}`, { status: upstreamResponse.status });
    }

    return new Response(upstreamResponse.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Odds stream proxy error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
