import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

export async function POST(req: NextRequest) {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return new Response("API key missing. Tactical analysis unavailable.", { status: 503 });
    }

    const body = await req.json();
    const { question, matchInfo, events } = body;

    // Build the match context up to the provided events
    let context = `Match: ${matchInfo.home} vs ${matchInfo.away}\n`;
    context += `Competition: ${matchInfo.competition}\n\n`;
    context += `Timeline of Events (up to this exact moment in the replay):\n`;
    
    events.forEach((ev: any) => {
      let desc = `Minute ${ev.minute}': ${ev.action.toUpperCase()}`;
      if (ev.data?.playerName) {
        desc += ` by ${ev.data.playerName}`;
      }
      context += `${desc}\n`;
    });

    const systemPrompt = `You are a knowledgeable, tactically astute football fan analyzing a match with a friend at the pub.
You are watching a match replay and the timeline pauses at the exact moment given in the context.
Your goal is to answer the user's question about what just happened or the overall tactical flow up to this point.

CRITICAL RULES for your tone and output:
- Do NOT sound like a Wikipedia article or a robotic pundit.
- Sound like a smart friend explaining the "aha!" moment.
- Keep it extremely conversational, sharp, and concise.
- Use tactical jargon but make sure the *reasoning* is clear ("Mbappe found space because Walkup held his defensive line too high...").
- Do NOT reference events that haven't happened yet in the provided timeline.
- Don't start with "Hey mate" or overly forced pub slang. Just be direct, knowledgeable, and insightful.`;

    const stream = await anthropic.messages.stream({
      model: 'claude-haiku-4-5',
      max_tokens: 400, // Short, punchy answers
      system: systemPrompt,
      messages: [
        { role: 'user', content: `Context:\n${context}\n\nQuestion: ${question}` }
      ],
    });

    const encoder = new TextEncoder();
    
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
    console.error('Ask Analyst API error:', error);
    return new Response(JSON.stringify({ error: error?.message || 'Unknown error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
