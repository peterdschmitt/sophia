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

interface Skill {
  name: string;
  displayName: string;
  description: string;
  stats: SkillStats;
  owner: SkillOwner;
  version: string;
  updatedAt: string;
  trustScore: number;
  path?: string;
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

interface VoiceOption {
  id: string;
  name: string;
  description: string;
  provider?: string;
}

interface SettingsData {
  openai: {
    voice: string;
    instructions: string;
    availableVoices: VoiceOption[];
  };
  vapi: {
    voice: string;
    provider: string;
    availableVoices: VoiceOption[];
  };
}

interface DashboardProps {
  onRefresh?: () => void;
}

export default function Dashboard({ onRefresh }: DashboardProps) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [skillsData, setSkillsData] = useState<SkillsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [skillsLoading, setSkillsLoading] = useState(false);
  const [activeSection, setActiveSection] = useState<'projects' | 'updates' | 'memories' | 'ideas' | 'skills' | 'settings'>('projects');
  const [skillAction, setSkillAction] = useState<string | null>(null);
  const [settingsData, setSettingsData] = useState<SettingsData | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [savingVoice, setSavingVoice] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboard();
  }, []);

  useEffect(() => {
    if (activeSection === 'skills' && !skillsData && !skillsLoading) {
      fetchSkills();
    }
    if (activeSection === 'settings' && !settingsData && !settingsLoading) {
      fetchSettings();
    }
  }, [activeSection, skillsData, skillsLoading, settingsData, settingsLoading]);

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

  const getTrustBadge = (score: number) => {
    if (score >= 80) return { label: 'Trusted', bg: 'bg-green-900', text: 'text-green-300', border: 'border-green-700' };
    if (score >= 60) return { label: 'Verified', bg: 'bg-blue-900', text: 'text-blue-300', border: 'border-blue-700' };
    if (score >= 40) return { label: 'Community', bg: 'bg-yellow-900', text: 'text-yellow-300', border: 'border-yellow-700' };
    return { label: 'New', bg: 'bg-gray-800', text: 'text-gray-400', border: 'border-gray-600' };
  };

  const formatNumber = (n: number): string => {
    if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
    return n.toString();
  };

  const fetchSettings = async () => {
    setSettingsLoading(true);
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        setSettingsData(data);
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    } finally {
      setSettingsLoading(false);
    }
  };

  const updateVoice = async (type: 'openai' | 'vapi', voice: string, provider?: string) => {
    setSavingVoice(`${type}-${voice}`);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, voice, provider }),
      });
      
      if (res.ok) {
        const result = await res.json();
        // Update local state
        if (type === 'openai' && settingsData) {
          setSettingsData({
            ...settingsData,
            openai: { ...settingsData.openai, voice }
          });
        } else if (type === 'vapi' && settingsData) {
          setSettingsData({
            ...settingsData,
            vapi: { ...settingsData.vapi, voice, provider: provider || settingsData.vapi.provider }
          });
        }
        alert(result.message || 'Voice updated!');
      } else {
        const error = await res.json();
        alert(error.error || 'Failed to update voice');
      }
    } catch (error) {
      console.error('Voice update failed:', error);
      alert('Failed to update voice');
    } finally {
      setSavingVoice(null);
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
        {(['projects', 'updates', 'memories', 'ideas', 'skills', 'settings'] as const).map((section) => (
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
            {section === 'settings' && '⚙️'}
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
                      {skillsData.installed.map((skill, idx) => {
                        const trust = getTrustBadge(skill.trustScore);
                        return (
                          <div 
                            key={idx}
                            className="bg-gray-800 rounded-lg p-3 border border-gray-700"
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h4 className="font-medium text-white text-sm">{skill.displayName}</h4>
                                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${trust.bg} ${trust.text} border ${trust.border}`}>
                                    {trust.label}
                                  </span>
                                  <span className="text-[10px] text-gray-500">v{skill.version}</span>
                                </div>
                                <p className="text-gray-400 text-xs mt-1 line-clamp-2">{skill.description}</p>
                              </div>
                              <button
                                onClick={() => performSkillAction('update', skill.name)}
                                className="p-1.5 rounded bg-gray-700 hover:bg-gray-600 text-xs ml-2 flex-shrink-0"
                                title="Update"
                              >
                                🔄
                              </button>
                            </div>
                            <div className="flex items-center justify-between text-[10px] text-gray-500">
                              <div className="flex items-center gap-3">
                                <span title="Downloads">⬇️ {formatNumber(skill.stats.downloads)}</span>
                                <span title="Active installs">📦 {formatNumber(skill.stats.installs)}</span>
                                <span title="Stars">⭐ {skill.stats.stars}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                {skill.owner.image && (
                                  <img src={skill.owner.image} alt="" className="w-4 h-4 rounded-full" />
                                )}
                                <span>@{skill.owner.handle}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
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
                      {skillsData.suggested.map((skill, idx) => {
                        const trust = getTrustBadge(skill.trustScore);
                        return (
                          <div 
                            key={idx}
                            className="bg-gray-800 rounded-lg p-3 border border-gray-700"
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h4 className="font-medium text-white text-sm">{skill.displayName}</h4>
                                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${trust.bg} ${trust.text} border ${trust.border}`}>
                                    {trust.label}
                                  </span>
                                </div>
                                <p className="text-gray-400 text-xs mt-1 line-clamp-2">{skill.description}</p>
                              </div>
                              <button
                                onClick={() => performSkillAction('install', skill.name)}
                                className="p-1.5 rounded bg-green-700 hover:bg-green-600 text-xs ml-2 flex-shrink-0"
                                title="Install"
                              >
                                ➕
                              </button>
                            </div>
                            <div className="flex items-center justify-between text-[10px] text-gray-500">
                              <div className="flex items-center gap-3">
                                <span title="Downloads">⬇️ {formatNumber(skill.stats.downloads)}</span>
                                <span title="Stars">⭐ {skill.stats.stars}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                {skill.owner.image && (
                                  <img src={skill.owner.image} alt="" className="w-4 h-4 rounded-full" />
                                )}
                                <span>@{skill.owner.handle}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
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

        {/* Settings Section */}
        {activeSection === 'settings' && (
          <div className="space-y-6">
            {settingsLoading ? (
              <p className="text-gray-400 text-sm animate-pulse">Loading settings...</p>
            ) : settingsData ? (
              <>
                {/* OpenAI TTS Voice */}
                <div>
                  <h3 className="text-sm font-semibold text-white mb-1">🎤 Telegram Voice</h3>
                  <p className="text-xs text-gray-500 mb-3">OpenAI TTS for voice messages</p>
                  <div className="grid grid-cols-2 gap-2">
                    {settingsData.openai.availableVoices.map((voice) => (
                      <button
                        key={voice.id}
                        onClick={() => updateVoice('openai', voice.id)}
                        disabled={savingVoice !== null}
                        className={`p-2 rounded-lg border text-left transition-all ${
                          settingsData.openai.voice === voice.id
                            ? 'bg-blue-900 border-blue-500 text-white'
                            : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-500'
                        } ${savingVoice === `openai-${voice.id}` ? 'animate-pulse' : ''}`}
                      >
                        <div className="font-medium text-sm">{voice.name}</div>
                        <div className="text-[10px] text-gray-400">{voice.description}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* VAPI Phone Voice */}
                <div>
                  <h3 className="text-sm font-semibold text-white mb-1">📞 Phone Voice</h3>
                  <p className="text-xs text-gray-500 mb-3">VAPI for outbound calls</p>
                  <div className="grid grid-cols-2 gap-2">
                    {settingsData.vapi.availableVoices.map((voice) => (
                      <button
                        key={voice.id}
                        onClick={() => updateVoice('vapi', voice.id, voice.provider)}
                        disabled={savingVoice !== null}
                        className={`p-2 rounded-lg border text-left transition-all ${
                          settingsData.vapi.voice === voice.id
                            ? 'bg-blue-900 border-blue-500 text-white'
                            : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-500'
                        } ${savingVoice === `vapi-${voice.id}` ? 'animate-pulse' : ''}`}
                      >
                        <div className="font-medium text-sm">{voice.name}</div>
                        <div className="text-[10px] text-gray-400">
                          {voice.description}
                          {voice.provider && voice.provider !== 'vapi' && (
                            <span className="ml-1 text-gray-500">({voice.provider})</span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Current Settings Summary */}
                <div className="pt-4 border-t border-gray-700">
                  <h3 className="text-xs font-semibold text-gray-400 uppercase mb-2">Current Config</h3>
                  <div className="bg-gray-800 rounded-lg p-3 text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Telegram:</span>
                      <span className="text-white">{settingsData.openai.voice}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Phone:</span>
                      <span className="text-white">{settingsData.vapi.voice} ({settingsData.vapi.provider})</span>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <button
                onClick={fetchSettings}
                className="w-full py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm transition-colors"
              >
                Load Settings
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
