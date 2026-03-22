import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json();

    if (!text) {
      return NextResponse.json({ error: 'No text provided' }, { status: 400 });
    }

    // Truncate if too long (TTS has limits)
    const truncatedText = text.slice(0, 4000);

    const response = await openai.audio.speech.create({
      model: 'gpt-4o-mini-tts',
      voice: 'shimmer',
      input: truncatedText,
      instructions: 'Speak with confidence and wit. Sharp, clever, like a smart friend who always has a quick comeback.',
    });

    // Get audio as buffer
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': buffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('TTS error:', error);
    return NextResponse.json({ error: 'TTS failed' }, { status: 500 });
  }
}
