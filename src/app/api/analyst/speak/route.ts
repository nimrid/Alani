import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { text, eventType } = await request.json();

    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    const VOICE_ID = process.env.ELEVENLABS_VOICE_ID;
    const API_KEY = process.env.ELEVENLABS_API_KEY;
    const MODEL_ID = process.env.ELEVENLABS_MODEL_ID || 'eleven_flash_v2_5';

    if (!VOICE_ID || !API_KEY) {
      return NextResponse.json({ error: 'ElevenLabs credentials missing' }, { status: 500 });
    }

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}/stream`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: text,
          model_id: MODEL_ID,
          voice_settings: {
            stability: 0.4,
            similarity_boost: 0.8,
            style: 0.3,
            use_speaker_boost: true
          }
        })
      }
    );

    if (!response.ok) {
      const errorData = await response.text();
      console.error('ElevenLabs API Error:', errorData);
      return NextResponse.json({ error: 'TTS failed' }, { status: response.status });
    }

    // Return the response as a stream
    const headers = new Headers(response.headers);
    headers.set('Content-Type', 'audio/mpeg');
    headers.set('Transfer-Encoding', 'chunked');

    return new Response(response.body, {
      status: 200,
      headers
    });
  } catch (error) {
    console.error('Analyst speak route error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
