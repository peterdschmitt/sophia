import { NextRequest, NextResponse } from 'next/server';

const GATEWAY_URL = process.env.GATEWAY_URL || 'https://peters-mac-mini.tail382f8f.ts.net';
const GATEWAY_TOKEN = process.env.GATEWAY_TOKEN;
const VAPI_API_KEY = process.env.VAPI_API_KEY;
const VAPI_ASSISTANT_ID = '82df8575-232a-4751-9346-7b6cccc8bc25';

// OpenAI TTS voices
export const OPENAI_VOICES = [
  { id: 'alloy', name: 'Alloy', description: 'Neutral, balanced' },
  { id: 'ash', name: 'Ash', description: 'Soft, gentle' },
  { id: 'coral', name: 'Coral', description: 'Warm, conversational' },
  { id: 'echo', name: 'Echo', description: 'Smooth, calm' },
  { id: 'fable', name: 'Fable', description: 'Expressive, dynamic' },
  { id: 'nova', name: 'Nova', description: 'Friendly, upbeat' },
  { id: 'onyx', name: 'Onyx', description: 'Deep, authoritative' },
  { id: 'sage', name: 'Sage', description: 'Warm, wise' },
  { id: 'shimmer', name: 'Shimmer', description: 'Clear, energetic' },
];

// VAPI voices (subset of popular ones)
export const VAPI_VOICES = [
  { id: 'Jess', name: 'Jess', provider: 'vapi', description: 'Default VAPI voice' },
  { id: 'mark', name: 'Mark', provider: 'playht', description: 'Natural male' },
  { id: 'jennifer', name: 'Jennifer', provider: 'playht', description: 'Professional female' },
  { id: 'sarah', name: 'Sarah', provider: '11labs', description: 'Warm, friendly' },
  { id: 'adam', name: 'Adam', provider: '11labs', description: 'Clear, professional' },
  { id: 'rachel', name: 'Rachel', provider: '11labs', description: 'Natural, conversational' },
  { id: 'antoni', name: 'Antoni', provider: '11labs', description: 'Youthful, engaging' },
  { id: 'domi', name: 'Domi', provider: '11labs', description: 'Strong, confident' },
  { id: 'elli', name: 'Elli', provider: '11labs', description: 'Soft, pleasant' },
  { id: 'josh', name: 'Josh', provider: '11labs', description: 'Deep, trustworthy' },
];

export async function GET() {
  try {
    // Get current OpenAI TTS settings from gateway config
    const configRes = await fetch(`${GATEWAY_URL}/control/config`, {
      headers: GATEWAY_TOKEN ? { 'Authorization': `Bearer ${GATEWAY_TOKEN}` } : {},
    });
    
    let openaiVoice = 'shimmer';
    let openaiInstructions = '';
    
    if (configRes.ok) {
      const config = await configRes.json();
      openaiVoice = config.tts?.openai?.voice || 'shimmer';
      openaiInstructions = config.tts?.openai?.instructions || '';
    }
    
    // Get VAPI assistant voice
    let vapiVoice = 'Jess';
    let vapiProvider = 'vapi';
    
    if (VAPI_API_KEY) {
      try {
        const vapiRes = await fetch(`https://api.vapi.ai/assistant/${VAPI_ASSISTANT_ID}`, {
          headers: { 'Authorization': `Bearer ${VAPI_API_KEY}` },
        });

        if (vapiRes.ok) {
          const assistant = await vapiRes.json();
          vapiVoice = assistant.voice?.voiceId || 'Jess';
          vapiProvider = assistant.voice?.provider || 'vapi';
        }
      } catch (e) {
        console.error('Failed to fetch VAPI settings:', e);
      }
    }
    
    return NextResponse.json({
      openai: {
        voice: openaiVoice,
        instructions: openaiInstructions,
        availableVoices: OPENAI_VOICES,
      },
      vapi: {
        voice: vapiVoice,
        provider: vapiProvider,
        availableVoices: VAPI_VOICES,
      },
    });
    
  } catch (error) {
    console.error('Settings fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { type, voice, instructions, provider } = await request.json();
    
    if (type === 'openai') {
      // Update OpenClaw config via gateway
      const response = await fetch(`${GATEWAY_URL}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(GATEWAY_TOKEN && { 'Authorization': `Bearer ${GATEWAY_TOKEN}` }),
        },
        body: JSON.stringify({
          model: 'anthropic/claude-sonnet-4-20250514',
          messages: [
            {
              role: 'user',
              content: `Update the OpenClaw TTS configuration. Use the gateway config.patch tool to set:
- tts.openai.voice: "${voice}"
${instructions ? `- tts.openai.instructions: "${instructions}"` : ''}

Confirm when done.`,
            },
          ],
          stream: false,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update OpenAI voice');
      }
      
      return NextResponse.json({ success: true, message: `OpenAI voice updated to ${voice}` });
      
    } else if (type === 'vapi') {
      if (!VAPI_API_KEY) {
        return NextResponse.json({ error: 'VAPI API key is not configured' }, { status: 503 });
      }

      // Update VAPI assistant voice directly
      const voiceConfig: Record<string, unknown> = { voiceId: voice };
      
      // Set provider based on voice selection
      const selectedVoice = VAPI_VOICES.find(v => v.id === voice);
      if (selectedVoice) {
        voiceConfig.provider = provider || selectedVoice.provider;
      }
      
      const vapiRes = await fetch(`https://api.vapi.ai/assistant/${VAPI_ASSISTANT_ID}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${VAPI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ voice: voiceConfig }),
      });
      
      if (!vapiRes.ok) {
        const error = await vapiRes.text();
        throw new Error(`VAPI update failed: ${error}`);
      }
      
      return NextResponse.json({ success: true, message: `VAPI voice updated to ${voice}` });
      
    } else {
      return NextResponse.json({ error: 'Unknown type' }, { status: 400 });
    }
    
  } catch (error) {
    console.error('Settings update error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to update settings' 
    }, { status: 500 });
  }
}
