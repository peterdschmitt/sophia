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

interface DashboardData {
  projects: Project[];
  recentUpdates: string[];
  memories: Memory[];
  ideas: Idea[];
  lastRefreshed: string;
}

interface DashboardProps {
  onRefresh?: () => void;
}

export default function Dashboard({ onRefresh }: DashboardProps) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<'projects' | 'updates' | 'memories' | 'ideas'>('projects');

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/dashboard');
      if (res.ok) {
        const dashboardData = await res.json();
        setData(dashboardData);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard:', error);
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
      <div className="flex-shrink-0 flex border-b border-gray-700 bg-gray-800/50">
        {(['projects', 'updates', 'memories', 'ideas'] as const).map((section) => (
          <button
            key={section}
            onClick={() => setActiveSection(section)}
            className={`flex-1 py-2 text-xs font-medium transition-colors ${
              activeSection === section
                ? 'text-blue-400 border-b-2 border-blue-400 bg-gray-800'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            {section === 'projects' && '📁 Projects'}
            {section === 'updates' && '🔄 Updates'}
            {section === 'memories' && '🧠 Memories'}
            {section === 'ideas' && '💡 Ideas'}
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
