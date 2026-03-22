'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface MarkdownRendererProps {
  content: string;
}

export default function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <div className="prose prose-invert prose-sm max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
        code({ className, children, ...props }) {
          const match = /language-(\w+)/.exec(className || '');
          const isInline = !match && !className;
          
          if (isInline) {
            return (
              <code className="bg-gray-700 px-1.5 py-0.5 rounded text-sm" {...props}>
                {children}
              </code>
            );
          }
          
          return (
            <div className="rounded-lg overflow-hidden my-4">
              <div className="bg-gray-700 px-3 py-1 text-xs text-gray-400 flex justify-between items-center">
                <span>{match?.[1] || 'code'}</span>
                <button
                  onClick={() => navigator.clipboard.writeText(String(children).replace(/\n$/, ''))}
                  className="hover:text-white transition-colors"
                  title="Copy code"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>
              </div>
              <SyntaxHighlighter
                style={oneDark}
                language={match?.[1] || 'text'}
                customStyle={{
                  margin: 0,
                  padding: '1rem',
                  fontSize: '0.875rem',
                  borderRadius: 0,
                }}
                wrapLongLines
              >
                {String(children).replace(/\n$/, '')}
              </SyntaxHighlighter>
            </div>
          );
        },
        // Style other elements
        h1: ({ children }) => <h1 className="text-2xl font-bold mb-4 text-white">{children}</h1>,
        h2: ({ children }) => <h2 className="text-xl font-semibold mb-3 mt-6 text-white">{children}</h2>,
        h3: ({ children }) => <h3 className="text-lg font-medium mb-2 mt-4 text-gray-200">{children}</h3>,
        p: ({ children }) => <p className="mb-3 text-gray-300 leading-relaxed">{children}</p>,
        ul: ({ children }) => <ul className="list-disc list-inside mb-3 space-y-1 text-gray-300">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal list-inside mb-3 space-y-1 text-gray-300">{children}</ol>,
        li: ({ children }) => <li className="text-gray-300">{children}</li>,
        blockquote: ({ children }) => (
          <blockquote className="border-l-4 border-blue-500 pl-4 my-4 text-gray-400 italic">
            {children}
          </blockquote>
        ),
        a: ({ href, children }) => (
          <a href={href} className="text-blue-400 hover:underline" target="_blank" rel="noopener noreferrer">
            {children}
          </a>
        ),
        table: ({ children }) => (
          <div className="overflow-x-auto my-4">
            <table className="min-w-full divide-y divide-gray-700">{children}</table>
          </div>
        ),
        th: ({ children }) => (
          <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider bg-gray-800">
            {children}
          </th>
        ),
        td: ({ children }) => (
          <td className="px-3 py-2 text-sm text-gray-300 border-t border-gray-700">{children}</td>
        ),
        hr: () => <hr className="my-6 border-gray-700" />,
        strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
        em: ({ children }) => <em className="italic text-gray-300">{children}</em>,
      }}
    >
      {content}
    </ReactMarkdown>
    </div>
  );
}
