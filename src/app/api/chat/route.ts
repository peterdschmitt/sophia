import { NextRequest, NextResponse } from 'next/server';

const GATEWAY_URL = process.env.GATEWAY_URL || 'https://peters-mac-mini.tail382f8f.ts.net';
const GATEWAY_TOKEN = process.env.GATEWAY_TOKEN;

export async function POST(request: NextRequest) {
  try {
    const { message } = await request.json();

    if (!message) {
      return NextResponse.json({ error: 'No message provided' }, { status: 400 });
    }

    // Send to OpenClaw gateway
    const response = await fetch(`${GATEWAY_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(GATEWAY_TOKEN && { 'Authorization': `Bearer ${GATEWAY_TOKEN}` }),
      },
      body: JSON.stringify({
        model: 'anthropic/claude-opus-4-5',
        messages: [
          {
            role: 'user',
            content: message,
          },
        ],
        stream: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gateway error:', response.status, errorText);
      throw new Error(`Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const assistantMessage = data.choices?.[0]?.message?.content || 'No response';

    // Parse response for workspace/scratchpad content
    // Look for special markers like [[WORKSPACE]] and [[SCRATCHPAD]]
    let responseText = assistantMessage;
    let workspace = null;
    let scratchpad = null;

    const workspaceMatch = assistantMessage.match(/\[\[WORKSPACE\]\]([\s\S]*?)\[\[\/WORKSPACE\]\]/);
    if (workspaceMatch) {
      workspace = workspaceMatch[1].trim();
      responseText = responseText.replace(workspaceMatch[0], '').trim();
    }

    const scratchpadMatch = assistantMessage.match(/\[\[SCRATCHPAD\]\]([\s\S]*?)\[\[\/SCRATCHPAD\]\]/);
    if (scratchpadMatch) {
      scratchpad = scratchpadMatch[1].trim();
      responseText = responseText.replace(scratchpadMatch[0], '').trim();
    }

    return NextResponse.json({ 
      response: responseText,
      workspace,
      scratchpad,
    });
  } catch (error) {
    console.error('Chat error:', error);
    return NextResponse.json({ error: 'Chat failed' }, { status: 500 });
  }
}
