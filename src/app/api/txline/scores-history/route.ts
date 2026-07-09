import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const fixtureId = searchParams.get('fixtureId');
  const epochDay = searchParams.get('epochDay');
  const hour = searchParams.get('hour');
  const minute = searchParams.get('minute');

  if (!fixtureId || !epochDay || !hour || !minute) {
    return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
  }

  const jwt = process.env.TXLINE_DEV_JWT;
  const apiToken = process.env.TXLINE_DEV_API_TOKEN;
  const apiOrigin = process.env.TXLINE_API_ORIGIN || 'https://txline-dev.txodds.com';

  if (!jwt || !apiToken) {
    return NextResponse.json({ error: 'Server missing TxLINE credentials' }, { status: 500 });
  }

  const txlineUrl = `${apiOrigin}/api/scores/history/${fixtureId}?epochDay=${epochDay}&hour=${hour}&minute=${minute}`;

  try {
    const res = await fetch(txlineUrl, {
      headers: {
        'Authorization': `Bearer ${jwt}`,
        'X-Api-Token': apiToken
      }
    });

    if (!res.ok) {
      throw new Error(`TxLINE responded with ${res.status}`);
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('History proxy error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
