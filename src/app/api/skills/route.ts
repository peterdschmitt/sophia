import { NextRequest, NextResponse } from 'next/server';

const GATEWAY_URL = process.env.GATEWAY_URL || 'https://peters-mac-mini.tail382f8f.ts.net';
const GATEWAY_TOKEN = process.env.GATEWAY_TOKEN;

export async function GET() {
  try {
    // Ask the gateway to list skills
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
            role: 'system',
            content: `List the skills in the workspace. Run: ls -la /Users/openclaw/.openclaw/workspace/skills/ and for each skill, check if it has a SKILL.md file.

Return ONLY valid JSON with this structure (no markdown):
{
  "installed": [
    {"name": "skill-name", "description": "brief description from SKILL.md", "path": "/path/to/skill", "hasSkillMd": true}
  ],
  "suggested": [
    {"name": "suggested-skill", "description": "why this might help", "clawhubUrl": "https://clawhub.com/skills/..."}
  ]
}`
          },
          {
            role: 'user',
            content: 'List my installed skills and suggest some useful ones from ClawHub.'
          },
        ],
        stream: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '{}';
    
    let jsonStr = content;
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    }
    
    try {
      const skillsData = JSON.parse(jsonStr.trim());
      return NextResponse.json(skillsData);
    } catch {
      return NextResponse.json({
        installed: [],
        suggested: [],
        error: "Could not parse skills list"
      });
    }
  } catch (error) {
    console.error('Skills error:', error);
    return NextResponse.json({
      installed: [],
      suggested: [],
      error: "Failed to fetch skills"
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action, skillName, skillUrl } = await request.json();

    let prompt = '';
    if (action === 'install') {
      prompt = `Install the skill "${skillName}" from ClawHub using: clawhub install ${skillName}. Report the result.`;
    } else if (action === 'update') {
      prompt = `Update the skill "${skillName}" using: clawhub update ${skillName}. Report the result.`;
    } else if (action === 'create') {
      prompt = `Create a new skill called "${skillName}" using the skill-creator skill. Follow the SKILL.md in skills/skill-creator.`;
    } else if (action === 'view') {
      prompt = `Read and summarize the skill at ${skillUrl || skillName}. Show its purpose and key capabilities.`;
    } else {
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }

    const response = await fetch(`${GATEWAY_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(GATEWAY_TOKEN && { 'Authorization': `Bearer ${GATEWAY_TOKEN}` }),
      },
      body: JSON.stringify({
        model: 'anthropic/claude-sonnet-4-20250514',
        messages: [
          { role: 'user', content: prompt },
        ],
        stream: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const result = data.choices?.[0]?.message?.content || 'No response';

    return NextResponse.json({ result });
  } catch (error) {
    console.error('Skill action error:', error);
    return NextResponse.json({ error: 'Failed to perform skill action' }, { status: 500 });
  }
}
