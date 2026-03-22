'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import Dashboard from '@/components/Dashboard';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface PaneWidths {
  left: number;
  middle: number;
  right: number;
}

type MobileTab = 'dialogue' | 'workspace' | 'scratchpad';

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [workspaceContent, setWorkspaceContent] = useState<string>('');
  const [scratchpadContent, setScratchpadContent] = useState<string>('');
  const [paneWidths, setPaneWidths] = useState<PaneWidths>({ left: 40, middle: 30, right: 30 });
  const [textInput, setTextInput] = useState('');
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileTab, setMobileTab] = useState<MobileTab>('dialogue');

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Check gateway connection on mount
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: 'ping' }),
        });
        setIsConnected(res.ok);
      } catch {
        setIsConnected(false);
      }
    };
    checkConnection();
  }, []);

  // Load state from localStorage on mount
  useEffect(() => {
    try {
      const savedMessages = localStorage.getItem('sophia-messages');
      const savedWorkspace = localStorage.getItem('sophia-workspace');
      const savedScratchpad = localStorage.getItem('sophia-scratchpad');
      const savedPaneWidths = localStorage.getItem('sophia-pane-widths');
      const savedVoiceEnabled = localStorage.getItem('sophia-voice-enabled');

      if (savedMessages) {
        const parsed = JSON.parse(savedMessages);
        setMessages(parsed.map((m: Message & { timestamp: string }) => ({
          ...m,
          timestamp: new Date(m.timestamp)
        })));
      }
      if (savedWorkspace) setWorkspaceContent(savedWorkspace);
      if (savedScratchpad) setScratchpadContent(savedScratchpad);
      if (savedPaneWidths) setPaneWidths(JSON.parse(savedPaneWidths));
      if (savedVoiceEnabled !== null) setVoiceEnabled(savedVoiceEnabled === 'true');
    } catch (e) {
      console.error('Error loading saved state:', e);
    }
  }, []);

  // Save state to localStorage on change
  useEffect(() => {
    localStorage.setItem('sophia-messages', JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    localStorage.setItem('sophia-workspace', workspaceContent);
  }, [workspaceContent]);

  useEffect(() => {
    localStorage.setItem('sophia-scratchpad', scratchpadContent);
  }, [scratchpadContent]);

  useEffect(() => {
    localStorage.setItem('sophia-pane-widths', JSON.stringify(paneWidths));
  }, [paneWidths]);

  useEffect(() => {
    localStorage.setItem('sophia-voice-enabled', String(voiceEnabled));
  }, [voiceEnabled]);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const resizingRef = useRef<{ pane: 'left' | 'middle' | null; startX: number; startWidths: PaneWidths } | null>(null);
  const textInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach(track => track.stop());
        await processAudio(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Could not access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const sendMessage = async (userText: string) => {
    if (!userText.trim()) return;
    
    setIsProcessing(true);
    
    try {
      // Add user message
      const userMessage: Message = { role: 'user', content: userText, timestamp: new Date() };
      setMessages(prev => [...prev, userMessage]);

      // Send to gateway
      const chatRes = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userText }),
      });
      
      if (!chatRes.ok) throw new Error('Chat failed');
      const { response, workspace, scratchpad } = await chatRes.json();

      // Add assistant message
      const assistantMessage: Message = { role: 'assistant', content: response, timestamp: new Date() };
      setMessages(prev => [...prev, assistantMessage]);

      // Update panes if content provided
      if (workspace) setWorkspaceContent(workspace);
      if (scratchpad) setScratchpadContent(scratchpad);

      // Convert response to speech if voice is enabled
      if (voiceEnabled) {
        const ttsRes = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: response }),
        });
        
        if (ttsRes.ok) {
          const audioBlob = await ttsRes.blob();
          const audioUrl = URL.createObjectURL(audioBlob);
          
          if (audioRef.current) {
            audioRef.current.src = audioUrl;
            audioRef.current.play();
          }
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Sorry, there was an error processing your message.', 
        timestamp: new Date() 
      }]);
    } finally {
      setIsProcessing(false);
    }
  };

  const processAudio = async (audioBlob: Blob) => {
    setIsProcessing(true);
    
    try {
      // Transcribe with Whisper
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');
      
      const transcribeRes = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
      });
      
      if (!transcribeRes.ok) throw new Error('Transcription failed');
      const { text: userText } = await transcribeRes.json();
      
      if (!userText.trim()) {
        setIsProcessing(false);
        return;
      }

      await sendMessage(userText);
    } catch (error) {
      console.error('Error processing audio:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Sorry, there was an error processing your message.', 
        timestamp: new Date() 
      }]);
      setIsProcessing(false);
    }
  };

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (textInput.trim() && !isProcessing) {
      sendMessage(textInput);
      setTextInput('');
    }
  };

  const handleMouseDown = useCallback((pane: 'left' | 'middle', e: React.MouseEvent) => {
    resizingRef.current = {
      pane,
      startX: e.clientX,
      startWidths: { ...paneWidths },
    };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [paneWidths]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!resizingRef.current) return;
      
      const { pane, startX, startWidths } = resizingRef.current;
      const containerWidth = window.innerWidth;
      const deltaPercent = ((e.clientX - startX) / containerWidth) * 100;
      
      if (pane === 'left') {
        const newLeft = Math.max(15, Math.min(60, startWidths.left + deltaPercent));
        const diff = newLeft - startWidths.left;
        const newMiddle = Math.max(15, startWidths.middle - diff);
        setPaneWidths({ left: newLeft, middle: newMiddle, right: startWidths.right });
      } else if (pane === 'middle') {
        const newMiddle = Math.max(15, Math.min(50, startWidths.middle + deltaPercent));
        const diff = newMiddle - startWidths.middle;
        const newRight = Math.max(20, startWidths.right - diff);
        setPaneWidths({ left: startWidths.left, middle: newMiddle, right: newRight });
      }
    };

    const handleMouseUp = () => {
      resizingRef.current = null;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const clearConversation = () => {
    if (confirm('Clear all messages and pane content?')) {
      setMessages([]);
      setWorkspaceContent('');
      setScratchpadContent('');
    }
  };

  // Mobile Layout
  if (isMobile) {
    return (
      <main className="h-screen w-screen flex flex-col bg-gray-900 text-white overflow-hidden">
        {/* Mobile Header */}
        <header className="flex-shrink-0 h-14 bg-gray-800 border-b border-gray-700 flex items-center justify-between px-4 safe-area-top">
          <div className="flex items-center gap-2">
            <span className="text-xl">🦉</span>
            <h1 className="font-semibold text-white text-lg">Sophia</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className={`w-2 h-2 rounded-full ${
              isConnected === null ? 'bg-yellow-500 animate-pulse' :
              isConnected ? 'bg-green-500' : 'bg-red-500'
            }`} />
            <button
              onClick={clearConversation}
              className="p-2 rounded-lg bg-gray-700 active:bg-gray-600"
              title="Clear"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
            <button
              onClick={() => setVoiceEnabled(!voiceEnabled)}
              className={`p-2 rounded-lg ${voiceEnabled ? 'bg-blue-600' : 'bg-gray-700'}`}
              title={voiceEnabled ? 'Voice on' : 'Voice off'}
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                {voiceEnabled ? (
                  <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
                ) : (
                  <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
                )}
              </svg>
            </button>
          </div>
        </header>

        {/* Mobile Tab Bar */}
        <div className="flex-shrink-0 flex bg-gray-800 border-b border-gray-700">
          <button
            onClick={() => setMobileTab('dialogue')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              mobileTab === 'dialogue' 
                ? 'text-blue-400 border-b-2 border-blue-400' 
                : 'text-gray-400'
            }`}
          >
            💬 Chat
          </button>
          <button
            onClick={() => setMobileTab('scratchpad')}
            className={`flex-1 py-3 text-sm font-medium transition-colors relative ${
              mobileTab === 'scratchpad' 
                ? 'text-blue-400 border-b-2 border-blue-400' 
                : 'text-gray-400'
            }`}
          >
            📁 Our Work
          </button>
          <button
            onClick={() => setMobileTab('workspace')}
            className={`flex-1 py-3 text-sm font-medium transition-colors relative ${
              mobileTab === 'workspace' 
                ? 'text-blue-400 border-b-2 border-blue-400' 
                : 'text-gray-400'
            }`}
          >
            📄 Workspace
            {(workspaceContent || scratchpadContent) && mobileTab !== 'workspace' && (
              <span className="absolute top-2 right-4 w-2 h-2 bg-blue-500 rounded-full" />
            )}
          </button>
        </div>

        {/* Mobile Content */}
        <div className="flex-1 overflow-hidden">
          {/* Dialogue Tab */}
          {mobileTab === 'dialogue' && (
            <div className="h-full flex flex-col">
              <div className="flex-1 overflow-auto p-4 space-y-4">
                {messages.length === 0 && (
                  <p className="text-gray-500 italic text-center mt-8">
                    Tap the mic or type to start...
                  </p>
                )}
                {messages.map((msg, idx) => (
                  <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                      msg.role === 'user' 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-700 text-gray-100'
                    }`}>
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                      <p className="text-xs mt-1 opacity-50">
                        {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Mobile Input */}
              <div className="flex-shrink-0 p-4 border-t border-gray-700 bg-gray-800 safe-area-bottom">
                <form onSubmit={handleTextSubmit} className="flex gap-2 items-center">
                  <button
                    type="button"
                    onClick={isRecording ? stopRecording : startRecording}
                    disabled={isProcessing}
                    className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                      isProcessing 
                        ? 'bg-gray-600' 
                        : isRecording 
                          ? 'bg-red-500 animate-pulse' 
                          : 'bg-blue-500 active:bg-blue-600'
                    }`}
                  >
                    {isProcessing ? (
                      <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    ) : isRecording ? (
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <rect x="6" y="6" width="12" height="12" rx="2" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                        <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
                      </svg>
                    )}
                  </button>
                  <input
                    ref={textInputRef}
                    type="text"
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    placeholder={isRecording ? "Recording..." : "Type a message..."}
                    disabled={isProcessing || isRecording}
                    className="flex-1 px-4 py-3 bg-gray-700 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    disabled={isProcessing || !textInput.trim()}
                    className="flex-shrink-0 w-12 h-12 rounded-full bg-blue-500 active:bg-blue-600 disabled:bg-gray-600 flex items-center justify-center transition-colors"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                    </svg>
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* Workspace Tab */}
          {mobileTab === 'workspace' && (
            <div className="h-full overflow-auto p-4">
              {workspaceContent || scratchpadContent ? (
                <MarkdownRenderer content={workspaceContent || scratchpadContent} />
              ) : (
                <div className="h-full flex items-center justify-center">
                  <p className="text-gray-500 italic text-center">
                    The workspace is empty.<br />
                    What we build together will appear here.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Our Work Tab (Dashboard) */}
          {mobileTab === 'scratchpad' && (
            <div className="h-full overflow-hidden">
              <Dashboard />
            </div>
          )}
        </div>

        <audio ref={audioRef} className="hidden" />
      </main>
    );
  }

  // Desktop Layout
  return (
    <main className="h-screen w-screen flex flex-col bg-gray-900 text-white overflow-hidden">
      {/* Header */}
      <header className="flex-shrink-0 h-12 bg-gray-800 border-b border-gray-700 flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <span className="text-xl">🦉</span>
          <h1 className="font-semibold text-white">Sophia Workspace</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm">
            <span className={`w-2 h-2 rounded-full ${
              isConnected === null ? 'bg-yellow-500 animate-pulse' :
              isConnected ? 'bg-green-500' : 'bg-red-500'
            }`} />
            <span className="text-gray-400">
              {isConnected === null ? 'Connecting...' :
               isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Pane - Our Work Dashboard */}
        <div 
          className="h-full flex flex-col border-r border-gray-700"
          style={{ width: `${paneWidths.left}%` }}
        >
          <div className="p-3 border-b border-gray-700 bg-gray-800">
            <h2 className="text-sm font-semibold text-gray-300">Our Work</h2>
          </div>
          <div className="flex-1 overflow-hidden">
            <Dashboard />
          </div>
        </div>

        {/* Resize Handle */}
        <div 
          className="w-1 bg-gray-700 hover:bg-blue-500 cursor-col-resize transition-colors"
          onMouseDown={(e) => handleMouseDown('left', e)}
        />

        {/* Middle Pane - Active Work */}
        <div 
          className="h-full flex flex-col border-r border-gray-700"
          style={{ width: `${paneWidths.middle}%` }}
        >
          <div className="p-3 border-b border-gray-700 bg-gray-800 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-300">Workspace</h2>
            {(workspaceContent || scratchpadContent) && (
              <div className="flex gap-1">
                <button
                  onClick={() => {
                    // Toggle between workspace and scratchpad
                    const temp = workspaceContent;
                    setWorkspaceContent(scratchpadContent);
                    setScratchpadContent(temp);
                  }}
                  className="p-1 rounded bg-gray-700 hover:bg-gray-600 transition-colors"
                  title="Swap with scratchpad"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                </button>
              </div>
            )}
          </div>
          <div className="flex-1 overflow-auto p-4">
            {workspaceContent ? (
              <MarkdownRenderer content={workspaceContent} />
            ) : scratchpadContent ? (
              <MarkdownRenderer content={scratchpadContent} />
            ) : (
              <p className="text-gray-500 italic">What we&apos;re building together will appear here...</p>
            )}
          </div>
        </div>

        {/* Resize Handle */}
        <div 
          className="w-1 bg-gray-700 hover:bg-blue-500 cursor-col-resize transition-colors"
          onMouseDown={(e) => handleMouseDown('middle', e)}
        />

        {/* Right Pane - Dialogue */}
        <div 
          className="h-full flex flex-col"
          style={{ width: `${paneWidths.right}%` }}
        >
          <div className="p-3 border-b border-gray-700 bg-gray-800 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-300">Dialogue</h2>
            <div className="flex gap-2">
              <button
                onClick={clearConversation}
                className="p-1.5 rounded bg-gray-600 hover:bg-gray-500 transition-colors"
                title="Clear conversation"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
              <button
                onClick={() => setVoiceEnabled(!voiceEnabled)}
                className={`p-1.5 rounded transition-colors ${voiceEnabled ? 'bg-blue-600' : 'bg-gray-600'}`}
                title={voiceEnabled ? 'Voice responses on' : 'Voice responses off'}
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  {voiceEnabled ? (
                    <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
                  ) : (
                    <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
                  )}
                </svg>
              </button>
            </div>
          </div>
          
          {/* Messages */}
          <div className="flex-1 overflow-auto p-4 space-y-4">
            {messages.length === 0 && (
              <p className="text-gray-500 italic text-center mt-8">
                Click the microphone or type to start...
              </p>
            )}
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-lg px-4 py-2 ${
                  msg.role === 'user' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-700 text-gray-100'
                }`}>
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  <p className="text-xs mt-1 opacity-50">
                    {msg.timestamp.toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Controls */}
          <div className="p-4 border-t border-gray-700 bg-gray-800">
            {/* Text Input */}
            <form onSubmit={handleTextSubmit} className="flex gap-2 mb-3">
              <input
                ref={textInputRef}
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Type a message..."
                disabled={isProcessing}
                className="flex-1 px-3 py-2 bg-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={isProcessing || !textInput.trim()}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg text-sm transition-colors"
              >
                Send
              </button>
            </form>

            {/* Voice Button */}
            <div className="flex justify-center">
              <button
                onClick={isRecording ? stopRecording : startRecording}
                disabled={isProcessing}
                className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
                  isProcessing 
                    ? 'bg-gray-600 cursor-not-allowed' 
                    : isRecording 
                      ? 'bg-red-500 hover:bg-red-600 animate-pulse' 
                      : 'bg-blue-500 hover:bg-blue-600'
                }`}
              >
                {isProcessing ? (
                  <svg className="w-6 h-6 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : isRecording ? (
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <rect x="6" y="6" width="12" height="12" rx="2" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                    <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
                  </svg>
                )}
              </button>
            </div>
            <p className="text-center text-xs text-gray-400 mt-2">
              {isProcessing ? 'Processing...' : isRecording ? 'Recording... Click to stop' : 'Click to speak'}
            </p>
          </div>
        </div>

        {/* Hidden audio element for playback */}
        <audio ref={audioRef} className="hidden" />
      </div>
    </main>
  );
}
