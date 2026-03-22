import { NextResponse } from 'next/server';

const GATEWAY_URL = process.env.GATEWAY_URL || 'https://peters-mac-mini.tail382f8f.ts.net';
const GATEWAY_TOKEN = process.env.GATEWAY_TOKEN;

export async function GET() {
  try {
    // Ask the gateway to generate dashboard content
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
            content: `You are generating dashboard data for the Sophia Workspace app. 
            
Return ONLY valid JSON with this exact structure (no markdown, no explanation):
{
  "projects": [
    {"name": "Project Name", "status": "active|paused|completed|idea", "description": "Brief description", "lastUpdated": "relative time"}
  ],
  "recentUpdates": ["Update 1", "Update 2"],
  "memories": [
    {"content": "What I learned", "date": "Date", "category": "preference|decision|insight|personal"}
  ],
  "ideas": [
    {"title": "Idea title", "description": "How this could help", "category": "productivity|automation|communication|learning"}
  ],
  "lastRefreshed": "current time"
}

Base this on your actual knowledge of Peter and your work together. Include real projects, real memories, and genuine ideas for how to work better together. Be specific and personal, not generic.`
          },
          {
            role: 'user',
            content: 'Generate the dashboard JSON for my workspace. Include our actual projects, recent things we discussed, memories about my preferences, and ideas for working together better. Keep it concise but real.'
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
    
    // Try to parse the JSON from the response
    // The model might wrap it in markdown code blocks
    let jsonStr = content;
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    }
    
    try {
      const dashboardData = JSON.parse(jsonStr.trim());
      return NextResponse.json(dashboardData);
    } catch {
      // Fallback with empty data
      return NextResponse.json({
        projects: [],
        recentUpdates: ["Dashboard is connecting to your workspace..."],
        memories: [],
        ideas: [],
        lastRefreshed: new Date().toLocaleTimeString(),
      });
    }
  } catch (error) {
    console.error('Dashboard error:', error);
    return NextResponse.json({
      projects: [
        { name: "Sophia Workspace", status: "active", description: "Building this voice-enabled workspace", lastUpdated: "just now" }
      ],
      recentUpdates: ["Could not connect to gateway"],
      memories: [],
      ideas: [
        { title: "Check connection", description: "Make sure the gateway is running", category: "productivity" }
      ],
      lastRefreshed: new Date().toLocaleTimeString(),
    });
  }
}
