import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

// Initialize the Anthropic client (requires ANTHROPIC_API_KEY in .env)
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

export async function POST(req: NextRequest) {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return fallbackResponse("API key missing. Narration unavailable.");
    }

    const body = await req.json();
    const {
      eventType,
      minute,
      team1Name,
      team2Name,
      scoreBefore,
      scoreAfter,
      playerName,
      playerTeam,
      playerInName,
      playerOutName,
      goalType,
      winPctBefore,
      winPctAfter,
      varDecision
    } = body;

    // Build rich context for the AI
    let eventContext = `Minute: ${minute}'\nEvent: ${eventType}\nHome Team: ${team1Name}\nAway Team: ${team2Name}\n`;
    if (playerName) eventContext += `Player involved: ${playerName}${playerTeam ? ` (${playerTeam})` : ''}\n`;
    if (playerInName && playerOutName) eventContext += `Substitution: ${playerInName} comes on for ${playerOutName}\n`;
    if (scoreBefore && scoreAfter) eventContext += `Score changed from ${scoreBefore} to ${scoreAfter}\n`;
    if (goalType) eventContext += `Goal Type: ${goalType}\n`;
    if (winPctBefore && winPctAfter) {
      const diff = winPctAfter - winPctBefore;
      const direction = diff > 0 ? 'increased' : 'decreased';
      eventContext += `Home Team (${team1Name}) win probability ${direction} by ${Math.abs(diff).toFixed(1)}% (from ${winPctBefore.toFixed(1)}% to ${winPctAfter.toFixed(1)}%)\n`;
    }
    if (varDecision) eventContext += `VAR Decision: ${varDecision}\n`;

    const systemPrompt = `You are a sharp, knowledgeable football commentator writing for a second-screen companion app. Write ONE sentence — max 25 words — that captures what just happened and why it matters. Be specific, be vivid, never generic. Use the player's real name and the actual team name if provided. No filler phrases like 'what a moment' or 'incredible scenes'. Tone: intelligent, immediate, fan-facing.`;

    const stream = await anthropic.messages.stream({
      model: 'claude-haiku-4-5',
      max_tokens: 60,
      system: systemPrompt,
      messages: [
        { role: 'user', content: `Narrate this event:\n${eventContext}` }
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
        } catch (err) {
          console.error('Anthropic stream error:', err);
          controller.enqueue(encoder.encode(' [Stream interrupted]'));
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

  } catch (error) {
    console.error('Narration API error:', error);
    return fallbackResponse("Event occurred, awaiting details.");
  }
}

function fallbackResponse(text: string) {
  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(text));
      controller.close();
    }
  });
  return new Response(readable, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
