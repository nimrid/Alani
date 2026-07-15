import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

// Initialize the Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

export async function POST(req: NextRequest) {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return new Response("API key missing. Tactical analysis unavailable.", { status: 503 });
    }

    const body = await req.json();
    const { matchInfo, events } = body;

    // Build the match context
    let context = `Match: ${matchInfo.home} vs ${matchInfo.away}\n`;
    context += `Final Score: ${matchInfo.home} ${matchInfo.homeGoals} - ${matchInfo.awayGoals} ${matchInfo.away}\n`;
    context += `Competition: ${matchInfo.competition}\n\n`;
    context += `Timeline of Events:\n`;
    
    // Add all events
    events.forEach((ev: any) => {
      let desc = `Minute ${ev.minute}': ${ev.action.toUpperCase()}`;
      if (ev.data?.playerName) {
        desc += ` by ${ev.data.playerName}`;
      }
      context += `${desc}\n`;
    });

    const systemPrompt = `You are an elite, world-class football tactician and match analyst (think Gary Neville or Jamie Carragher). 
You are given the timeline of events for a completed football match.
Provide a concise, sharp tactical breakdown of the match. 
Explain the key turning points, the story of the game, and why the winning team won (or why it was a draw).
Do not just regurgitate the timeline line-by-line. Instead, identify patterns (e.g. "a late flurry of yellow cards showed growing frustration").
Keep your analysis punchy, intelligent, and fan-facing. 
Format your output using Markdown (headers, bullet points, bold text).`;

    const stream = await anthropic.messages.stream({
      model: 'claude-haiku-4-5',
      max_tokens: 1000,
      system: systemPrompt,
      messages: [
        { role: 'user', content: `Analyze this match based on the following timeline:\n\n${context}` }
      ],
    });

    const encoder = new TextEncoder();
    
    // Convert Anthropic stream to Web ReadableStream
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
              controller.enqueue(encoder.encode(chunk.delta.text));
            }
          }
          controller.close();
        } catch (err: any) {
          console.error('Anthropic stream error:', err);
          controller.enqueue(encoder.encode(`\n\n[Analysis stream interrupted: ${err?.message || String(err)}]`));
          controller.close();
        }
      }
    });

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
      },
    });

  } catch (error: any) {
    console.error('Analysis API error:', error);
    return new Response(JSON.stringify({ error: error?.message || 'Unknown error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
