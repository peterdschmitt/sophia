'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

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

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [workspaceContent, setWorkspaceContent] = useState<string>('');
  const [scratchpadContent, setScratchpadContent] = useState<string>('');
  const [paneWidths, setPaneWidths] = useState<PaneWidths>({ left: 40, middle: 30, right: 30 });
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const resizingRef = useRef<{ pane: 'left' | 'middle' | null; startX: number; startWidths: PaneWidths } | null>(null);

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

  const processAudio = async (audioBlob: Blob) => {
    setIsProcessing(true);
    
    try {
      // 1. Transcribe with Whisper
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

      // Add user message
      const userMessage: Message = { role: 'user', content: userText, timestamp: new Date() };
      setMessages(prev => [...prev, userMessage]);

      // 2. Send to gateway
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

      // 3. Convert response to speech
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
    } catch (error) {
      console.error('Error processing audio:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Sorry, there was an error processing your message.', 
        timestamp: new Date() 
      }]);
    } finally {
      setIsProcessing(false);
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

  return (
    <main className="h-screen w-screen flex bg-gray-900 text-white overflow-hidden">
      {/* Left Pane - Workspace */}
      <div 
        className="h-full flex flex-col border-r border-gray-700"
        style={{ width: `${paneWidths.left}%` }}
      >
        <div className="p-3 border-b border-gray-700 bg-gray-800">
          <h2 className="text-sm font-semibold text-gray-300">Workspace</h2>
        </div>
        <div className="flex-1 overflow-auto p-4">
          {workspaceContent ? (
            <pre className="whitespace-pre-wrap text-sm font-mono text-gray-200">{workspaceContent}</pre>
          ) : (
            <p className="text-gray-500 italic">The main deliverable will appear here...</p>
          )}
        </div>
      </div>

      {/* Resize Handle */}
      <div 
        className="w-1 bg-gray-700 hover:bg-blue-500 cursor-col-resize transition-colors"
        onMouseDown={(e) => handleMouseDown('left', e)}
      />

      {/* Middle Pane - Scratchpad */}
      <div 
        className="h-full flex flex-col border-r border-gray-700"
        style={{ width: `${paneWidths.middle}%` }}
      >
        <div className="p-3 border-b border-gray-700 bg-gray-800">
          <h2 className="text-sm font-semibold text-gray-300">Scratchpad</h2>
        </div>
        <div className="flex-1 overflow-auto p-4">
          {scratchpadContent ? (
            <pre className="whitespace-pre-wrap text-sm font-mono text-gray-200">{scratchpadContent}</pre>
          ) : (
            <p className="text-gray-500 italic">Research, notes, and context will appear here...</p>
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
        <div className="p-3 border-b border-gray-700 bg-gray-800">
          <h2 className="text-sm font-semibold text-gray-300">Dialogue</h2>
        </div>
        
        {/* Messages */}
        <div className="flex-1 overflow-auto p-4 space-y-4">
          {messages.length === 0 && (
            <p className="text-gray-500 italic text-center mt-8">
              Click the microphone to start talking...
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

        {/* Voice Controls */}
        <div className="p-4 border-t border-gray-700 bg-gray-800">
          <div className="flex justify-center">
            <button
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isProcessing}
              className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${
                isProcessing 
                  ? 'bg-gray-600 cursor-not-allowed' 
                  : isRecording 
                    ? 'bg-red-500 hover:bg-red-600 animate-pulse' 
                    : 'bg-blue-500 hover:bg-blue-600'
              }`}
            >
              {isProcessing ? (
                <svg className="w-8 h-8 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : isRecording ? (
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                  <rect x="6" y="6" width="12" height="12" rx="2" />
                </svg>
              ) : (
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
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
    </main>
  );
}
