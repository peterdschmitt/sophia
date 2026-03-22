'use client';

import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface CodeBlockProps {
  content: string;
}

// Detect language from file extension or content
function detectLanguage(content: string): string {
  // Check for common patterns
  if (content.includes('import React') || content.includes('from "react"') || content.includes('from \'react\'')) {
    return 'tsx';
  }
  if (content.includes('def ') && content.includes(':')) {
    return 'python';
  }
  if (content.includes('func ') && content.includes('package ')) {
    return 'go';
  }
  if (content.includes('fn ') && content.includes('let ')) {
    return 'rust';
  }
  if (content.includes('function ') || content.includes('const ') || content.includes('let ')) {
    return 'javascript';
  }
  if (content.includes('<html') || content.includes('<!DOCTYPE')) {
    return 'html';
  }
  if (content.includes('{') && content.includes(':') && (content.includes('"') || content.includes("'"))) {
    return 'json';
  }
  if (content.startsWith('#') || content.includes('## ')) {
    return 'markdown';
  }
  return 'text';
}

// Parse content for code blocks
function parseContent(content: string): Array<{ type: 'text' | 'code'; content: string; language?: string }> {
  const blocks: Array<{ type: 'text' | 'code'; content: string; language?: string }> = [];
  
  // Match ```language\n...\n``` blocks
  const codeBlockRegex = /```(\w*)\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;
  
  while ((match = codeBlockRegex.exec(content)) !== null) {
    // Add text before code block
    if (match.index > lastIndex) {
      const textContent = content.slice(lastIndex, match.index).trim();
      if (textContent) {
        blocks.push({ type: 'text', content: textContent });
      }
    }
    
    // Add code block
    const language = match[1] || detectLanguage(match[2]);
    blocks.push({ type: 'code', content: match[2], language });
    
    lastIndex = match.index + match[0].length;
  }
  
  // Add remaining text
  if (lastIndex < content.length) {
    const textContent = content.slice(lastIndex).trim();
    if (textContent) {
      // Check if entire remaining content looks like code
      if (textContent.includes('{') && textContent.includes('}') && 
          (textContent.includes('function') || textContent.includes('const') || textContent.includes('import'))) {
        blocks.push({ type: 'code', content: textContent, language: detectLanguage(textContent) });
      } else {
        blocks.push({ type: 'text', content: textContent });
      }
    }
  }
  
  // If no blocks found, treat entire content as single block
  if (blocks.length === 0) {
    const language = detectLanguage(content);
    if (language !== 'text' && language !== 'markdown') {
      blocks.push({ type: 'code', content, language });
    } else {
      blocks.push({ type: 'text', content });
    }
  }
  
  return blocks;
}

export default function CodeBlock({ content }: CodeBlockProps) {
  const blocks = parseContent(content);
  
  return (
    <div className="space-y-4">
      {blocks.map((block, idx) => (
        <div key={idx}>
          {block.type === 'code' ? (
            <div className="rounded-lg overflow-hidden">
              <div className="bg-gray-700 px-3 py-1 text-xs text-gray-400 flex justify-between items-center">
                <span>{block.language}</span>
                <button
                  onClick={() => navigator.clipboard.writeText(block.content)}
                  className="hover:text-white transition-colors"
                  title="Copy code"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>
              </div>
              <SyntaxHighlighter
                language={block.language}
                style={oneDark}
                customStyle={{
                  margin: 0,
                  padding: '1rem',
                  fontSize: '0.875rem',
                  borderRadius: 0,
                }}
                wrapLongLines
              >
                {block.content}
              </SyntaxHighlighter>
            </div>
          ) : (
            <pre className="whitespace-pre-wrap text-sm text-gray-200">{block.content}</pre>
          )}
        </div>
      ))}
    </div>
  );
}
