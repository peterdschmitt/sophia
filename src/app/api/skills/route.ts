import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface SkillStats {
  downloads: number;
  installs: number;
  stars: number;
}

interface SkillOwner {
  handle: string;
  displayName: string;
  image?: string;
}

interface SkillInfo {
  name: string;
  displayName: string;
  description: string;
  stats: SkillStats;
  owner: SkillOwner;
  version: string;
  updatedAt: string;
  trustScore?: number;
  path?: string;
}

// Calculate trust score based on various factors
function calculateTrustScore(stats: SkillStats, owner: SkillOwner, updatedAt: number): number {
  let score = 50; // Base score
  
  // Downloads factor (max +20)
  if (stats.downloads > 10000) score += 20;
  else if (stats.downloads > 1000) score += 15;
  else if (stats.downloads > 100) score += 10;
  else if (stats.downloads > 10) score += 5;
  
  // Installs factor (max +15)
  if (stats.installs > 500) score += 15;
  else if (stats.installs > 100) score += 10;
  else if (stats.installs > 20) score += 5;
  
  // Stars factor (max +10)
  if (stats.stars > 10) score += 10;
  else if (stats.stars > 3) score += 5;
  else if (stats.stars > 0) score += 2;
  
  // Recency factor (max +5)
  const daysSinceUpdate = (Date.now() - updatedAt) / (1000 * 60 * 60 * 24);
  if (daysSinceUpdate < 30) score += 5;
  else if (daysSinceUpdate < 90) score += 3;
  
  return Math.min(100, score);
}

function getTrustLabel(score: number): { label: string; color: string } {
  if (score >= 80) return { label: 'Trusted', color: 'green' };
  if (score >= 60) return { label: 'Verified', color: 'blue' };
  if (score >= 40) return { label: 'Community', color: 'yellow' };
  return { label: 'New', color: 'gray' };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('search');
  
  try {
    if (query) {
      // Search skills
      const { stdout } = await execAsync(`clawhub search "${query}" --no-input 2>/dev/null | head -20`);
      const lines = stdout.trim().split('\n').filter(l => l && !l.startsWith('-'));
      
      const results = await Promise.all(
        lines.slice(0, 5).map(async (line) => {
          const match = line.match(/^(\S+)\s+(.+?)\s+\([\d.]+\)$/);
          if (!match) return null;
          const [, slug] = match;
          
          try {
            const { stdout: inspectOut } = await execAsync(`clawhub inspect "${slug}" --json --no-input 2>/dev/null`);
            const data = JSON.parse(inspectOut.replace(/^- .+\n/, ''));
            
            const trustScore = calculateTrustScore(
              { 
                downloads: data.skill?.stats?.downloads || 0,
                installs: data.skill?.stats?.installsCurrent || 0,
                stars: data.skill?.stats?.stars || 0
              },
              data.owner || { handle: 'unknown', displayName: 'Unknown' },
              data.skill?.updatedAt || Date.now()
            );
            
            return {
              name: data.skill?.slug || slug,
              displayName: data.skill?.displayName || slug,
              description: data.skill?.summary || '',
              stats: {
                downloads: data.skill?.stats?.downloads || 0,
                installs: data.skill?.stats?.installsCurrent || 0,
                stars: data.skill?.stats?.stars || 0,
              },
              owner: {
                handle: data.owner?.handle || 'unknown',
                displayName: data.owner?.displayName || 'Unknown',
                image: data.owner?.image,
              },
              version: data.latestVersion?.version || '0.0.0',
              updatedAt: new Date(data.skill?.updatedAt || Date.now()).toLocaleDateString(),
              trustScore,
              trustLabel: getTrustLabel(trustScore),
            };
          } catch {
            return null;
          }
        })
      );
      
      return NextResponse.json({ results: results.filter(Boolean) });
    }
    
    // List installed skills
    const { stdout: listOut } = await execAsync('clawhub list --no-input 2>/dev/null || echo ""');
    const installedSlugs = listOut.trim().split('\n')
      .filter(l => l && !l.startsWith('-') && !l.includes('No skills'))
      .map(l => l.split(/\s+/)[0])
      .filter(Boolean);
    
    const installed: SkillInfo[] = [];
    
    for (const slug of installedSlugs.slice(0, 10)) {
      try {
        const { stdout: inspectOut } = await execAsync(`clawhub inspect "${slug}" --json --no-input 2>/dev/null`);
        const data = JSON.parse(inspectOut.replace(/^- .+\n/, ''));
        
        const trustScore = calculateTrustScore(
          { 
            downloads: data.skill?.stats?.downloads || 0,
            installs: data.skill?.stats?.installsCurrent || 0,
            stars: data.skill?.stats?.stars || 0
          },
          data.owner || { handle: 'unknown', displayName: 'Unknown' },
          data.skill?.updatedAt || Date.now()
        );
        
        installed.push({
          name: data.skill?.slug || slug,
          displayName: data.skill?.displayName || slug,
          description: data.skill?.summary || '',
          stats: {
            downloads: data.skill?.stats?.downloads || 0,
            installs: data.skill?.stats?.installsCurrent || 0,
            stars: data.skill?.stats?.stars || 0,
          },
          owner: {
            handle: data.owner?.handle || 'unknown',
            displayName: data.owner?.displayName || 'Unknown',
            image: data.owner?.image,
          },
          version: data.latestVersion?.version || '0.0.0',
          updatedAt: new Date(data.skill?.updatedAt || Date.now()).toLocaleDateString(),
          trustScore,
        });
      } catch {
        installed.push({
          name: slug,
          displayName: slug,
          description: 'Unable to fetch details',
          stats: { downloads: 0, installs: 0, stars: 0 },
          owner: { handle: 'unknown', displayName: 'Unknown' },
          version: '?',
          updatedAt: 'unknown',
          trustScore: 30,
        });
      }
    }
    
    // Get some suggested/popular skills
    const { stdout: exploreOut } = await execAsync('clawhub explore --limit 5 --no-input 2>/dev/null || echo ""');
    const suggested: SkillInfo[] = [];
    
    const exploreLines = exploreOut.trim().split('\n').filter(l => l && !l.startsWith('-') && !l.startsWith('Browsing'));
    for (const line of exploreLines.slice(0, 3)) {
      const match = line.match(/^(\S+)/);
      if (!match) continue;
      const slug = match[1];
      
      // Skip if already installed
      if (installedSlugs.includes(slug)) continue;
      
      try {
        const { stdout: inspectOut } = await execAsync(`clawhub inspect "${slug}" --json --no-input 2>/dev/null`);
        const data = JSON.parse(inspectOut.replace(/^- .+\n/, ''));
        
        const trustScore = calculateTrustScore(
          { 
            downloads: data.skill?.stats?.downloads || 0,
            installs: data.skill?.stats?.installsCurrent || 0,
            stars: data.skill?.stats?.stars || 0
          },
          data.owner || { handle: 'unknown', displayName: 'Unknown' },
          data.skill?.updatedAt || Date.now()
        );
        
        suggested.push({
          name: data.skill?.slug || slug,
          displayName: data.skill?.displayName || slug,
          description: data.skill?.summary || '',
          stats: {
            downloads: data.skill?.stats?.downloads || 0,
            installs: data.skill?.stats?.installsCurrent || 0,
            stars: data.skill?.stats?.stars || 0,
          },
          owner: {
            handle: data.owner?.handle || 'unknown',
            displayName: data.owner?.displayName || 'Unknown',
            image: data.owner?.image,
          },
          version: data.latestVersion?.version || '0.0.0',
          updatedAt: new Date(data.skill?.updatedAt || Date.now()).toLocaleDateString(),
          trustScore,
        });
      } catch {
        // Skip on error
      }
    }
    
    return NextResponse.json({ installed, suggested });
    
  } catch (error) {
    console.error('Skills error:', error);
    return NextResponse.json({ 
      installed: [], 
      suggested: [],
      error: 'Failed to fetch skills' 
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action, skillName } = await request.json();
    
    let command = '';
    if (action === 'install') {
      command = `clawhub install "${skillName}" --no-input`;
    } else if (action === 'update') {
      command = `clawhub update "${skillName}" --no-input`;
    } else if (action === 'uninstall') {
      command = `clawhub uninstall "${skillName}" --no-input`;
    } else if (action === 'star') {
      command = `clawhub star "${skillName}" --no-input`;
    } else {
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
    
    const { stdout, stderr } = await execAsync(command + ' 2>&1');
    return NextResponse.json({ result: stdout || stderr || 'Done' });
    
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error('Skill action error:', error);
    return NextResponse.json({ error: err.message || 'Failed to perform action' }, { status: 500 });
  }
}
