'use client';

import { useState, useEffect } from 'react';

interface Project {
  name: string;
  status: 'active' | 'paused' | 'completed' | 'idea';
  description: string;
  lastUpdated?: string;
}

interface Memory {
  content: string;
  date: string;
  category: 'preference' | 'decision' | 'insight' | 'personal';
}

interface Idea {
  title: string;
  description: string;
  category: 'productivity' | 'automation' | 'communication' | 'learning';
}

interface Skill {
  name: string;
  description: string;
  path?: string;
  hasSkillMd?: boolean;
  clawhubUrl?: string;
}

interface DashboardData {
  projects: Project[];
  recentUpdates: string[];
  memories: Memory[];
  ideas: Idea[];
  lastRefreshed: string;
}

interface SkillsData {
  installed: Skill[];
  suggested: Skill[];
  error?: string;
}

interface DashboardProps {
  onRefresh?: () => void;
}

export default function Dashboard({ onRefresh }: DashboardProps) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [skillsData, setSkillsData] = useState<SkillsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [skillsLoading, setSkillsLoading] = useState(false);
  const [activeSection, setActiveSection] = useState<'projects' | 'updates' | 'memories' | 'ideas' | 'skills'>('projects');
  const [skillAction, setSkillAction] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboard();
  }, []);

  useEffect(() => {
    if (activeSection === 'skills' && !skillsData && !skillsLoading) {
      fetchSkills();
    }
  }, [activeSection, skillsData, skillsLoading]);

  const fetchSkills = async () => {
    setSkillsLoading(true);
    try {
      const res = await fetch('/api/skills');
      if (res.ok) {
        const data = await res.json();
        setSkillsData(data);
      }
    } catch (error) {
      console.error('Failed to fetch skills:', error);
      setSkillsData({ installed: [], suggested: [], error: 'Failed to load skills' });
    } finally {
      setSkillsLoading(false);
    }
  };

  const performSkillAction = async (action: string, skillName: string) => {
    setSkillAction(`${action}ing ${skillName}...`);
    try {
      const res = await fetch('/api/skills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, skillName }),
      });
      if (res.ok) {
        const { result } = await res.json();
        alert(result);
        // Refresh skills list
        setSkillsData(null);
        fetchSkills();
      }
    } catch (error) {
      console.error('Skill action failed:', error);
      alert('Failed to perform action');
    } finally {
      setSkillAction(null);
    }
  };

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 25000);
      
      const res = await fetch('/api/dashboard', { signal: controller.signal });
      clearTimeout(timeoutId);
      
      if (res.ok) {
        const dashboardData = await res.json();
        setData(dashboardData);
      } else {
        throw new Error('Failed to fetch');
      }
    } catch (error) {
      console.error('Failed to fetch dashboard:', error);
      // Set fallback data
      setData({
        projects: [
          { name: "Loading...", status: "active" as const, description: "Dashboard is connecting to your workspace...", lastUpdated: "now" }
        ],
        recentUpdates: ["Connecting to gateway..."],
        memories: [],
        ideas: [],
        lastRefreshed: new Date().toLocaleTimeString(),
      });
    } finally {
      setLoading(false);
    }
  };

  const statusColors = {
    active: 'bg-green-500',
    paused: 'bg-yellow-500',
    completed: 'bg-blue-500',
    idea: 'bg-purple-500',
  };

  const statusLabels = {
    active: 'Active',
    paused: 'Paused',
    completed: 'Done',
    idea: 'Idea',
  };

  const categoryIcons = {
    preference: '⚙️',
    decision: '✓',
    insight: '💡',
    personal: '👤',
    productivity: '⚡',
    automation: '🤖',
    communication: '💬',
    learning: '📚',
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-pulse text-gray-400">Loading dashboard...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-gray-500 p-4">
        <p className="mb-4">Couldn&apos;t load dashboard</p>
        <button 
          onClick={fetchDashboard}
          className="px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-500 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Section Tabs */}
      <div className="flex-shrink-0 flex border-b border-gray-700 bg-gray-800/50 overflow-x-auto">
        {(['projects', 'updates', 'memories', 'ideas', 'skills'] as const).map((section) => (
          <button
            key={section}
            onClick={() => setActiveSection(section)}
            className={`flex-1 min-w-fit py-2 px-2 text-xs font-medium transition-colors whitespace-nowrap ${
              activeSection === section
                ? 'text-blue-400 border-b-2 border-blue-400 bg-gray-800'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            {section === 'projects' && '📁'}
            {section === 'updates' && '🔄'}
            {section === 'memories' && '🧠'}
            {section === 'ideas' && '💡'}
            {section === 'skills' && '🧩'}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {/* Projects Section */}
        {activeSection === 'projects' && (
          <div className="space-y-3">
            {data.projects.length === 0 ? (
              <p className="text-gray-500 italic text-sm">No projects tracked yet</p>
            ) : (
              data.projects.map((project, idx) => (
                <div 
                  key={idx}
                  className="bg-gray-800 rounded-lg p-3 border border-gray-700"
                >
                  <div className="flex items-start justify-between mb-1">
                    <h3 className="font-medium text-white text-sm">{project.name}</h3>
                    <span className={`px-2 py-0.5 rounded text-xs ${statusColors[project.status]} text-white`}>
                      {statusLabels[project.status]}
                    </span>
                  </div>
                  <p className="text-gray-400 text-xs">{project.description}</p>
                  {project.lastUpdated && (
                    <p className="text-gray-500 text-xs mt-2">Updated {project.lastUpdated}</p>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* Updates Section */}
        {activeSection === 'updates' && (
          <div className="space-y-2">
            {data.recentUpdates.length === 0 ? (
              <p className="text-gray-500 italic text-sm">No recent updates</p>
            ) : (
              data.recentUpdates.map((update, idx) => (
                <div 
                  key={idx}
                  className="bg-gray-800 rounded-lg p-3 border border-gray-700"
                >
                  <p className="text-gray-300 text-sm">{update}</p>
                </div>
              ))
            )}
          </div>
        )}

        {/* Memories Section */}
        {activeSection === 'memories' && (
          <div className="space-y-2">
            {data.memories.length === 0 ? (
              <p className="text-gray-500 italic text-sm">No new memories to share</p>
            ) : (
              data.memories.map((memory, idx) => (
                <div 
                  key={idx}
                  className="bg-gray-800 rounded-lg p-3 border border-gray-700"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span>{categoryIcons[memory.category]}</span>
                    <span className="text-xs text-gray-500">{memory.date}</span>
                  </div>
                  <p className="text-gray-300 text-sm">{memory.content}</p>
                </div>
              ))
            )}
          </div>
        )}

        {/* Ideas Section */}
        {activeSection === 'ideas' && (
          <div className="space-y-3">
            {data.ideas.length === 0 ? (
              <p className="text-gray-500 italic text-sm">No new ideas yet</p>
            ) : (
              data.ideas.map((idea, idx) => (
                <div 
                  key={idx}
                  className="bg-gray-800 rounded-lg p-3 border border-gray-700"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span>{categoryIcons[idea.category]}</span>
                    <h3 className="font-medium text-white text-sm">{idea.title}</h3>
                  </div>
                  <p className="text-gray-400 text-xs">{idea.description}</p>
                </div>
              ))
            )}
          </div>
        )}

        {/* Skills Section */}
        {activeSection === 'skills' && (
          <div className="space-y-4">
            {skillAction && (
              <div className="bg-blue-900/50 rounded-lg p-3 border border-blue-700 text-center">
                <p className="text-blue-300 text-sm animate-pulse">{skillAction}</p>
              </div>
            )}

            {skillsLoading ? (
              <p className="text-gray-400 text-sm animate-pulse">Loading skills...</p>
            ) : skillsData ? (
              <>
                {/* Installed Skills */}
                <div>
                  <h3 className="text-xs font-semibold text-gray-400 uppercase mb-2">Installed</h3>
                  {skillsData.installed.length === 0 ? (
                    <p className="text-gray-500 italic text-sm">No skills installed</p>
                  ) : (
                    <div className="space-y-2">
                      {skillsData.installed.map((skill, idx) => (
                        <div 
                          key={idx}
                          className="bg-gray-800 rounded-lg p-3 border border-gray-700"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-medium text-white text-sm">{skill.name}</h4>
                              <p className="text-gray-400 text-xs mt-1">{skill.description}</p>
                            </div>
                            <div className="flex gap-1 ml-2">
                              <button
                                onClick={() => performSkillAction('update', skill.name)}
                                className="p-1 rounded bg-gray-700 hover:bg-gray-600 text-xs"
                                title="Update"
                              >
                                🔄
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* ClawHub Link */}
                <div className="pt-2 border-t border-gray-700">
                  <a 
                    href="https://clawhub.com" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 py-2 px-4 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm transition-colors"
                  >
                    <span>🧩</span>
                    <span>Browse ClawHub</span>
                  </a>
                </div>

                {/* Suggested Skills */}
                {skillsData.suggested.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold text-gray-400 uppercase mb-2">Suggested</h3>
                    <div className="space-y-2">
                      {skillsData.suggested.map((skill, idx) => (
                        <div 
                          key={idx}
                          className="bg-gray-800 rounded-lg p-3 border border-gray-700"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-medium text-white text-sm">{skill.name}</h4>
                              <p className="text-gray-400 text-xs mt-1">{skill.description}</p>
                            </div>
                            <button
                              onClick={() => performSkillAction('install', skill.name)}
                              className="p-1.5 rounded bg-green-700 hover:bg-green-600 text-xs"
                              title="Install"
                            >
                              ➕
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <button
                onClick={fetchSkills}
                className="w-full py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm transition-colors"
              >
                Load Skills
              </button>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 p-3 border-t border-gray-700 bg-gray-800/50">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">
            Last refreshed: {data.lastRefreshed}
          </span>
          <button
            onClick={() => {
              fetchDashboard();
              onRefresh?.();
            }}
            className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>
    </div>
  );
}
