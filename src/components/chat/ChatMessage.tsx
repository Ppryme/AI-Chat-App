import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Message } from '../../types/chat';
import {
  MarkdownTable,
  TableHead,
  TableBody,
  TableRow,
  TableHeaderCell,
  TableDataCell,
} from './MarkdownTable';

interface ChatMessageProps {
  message: Message;
}

export default function ChatMessage({ message }: ChatMessageProps) {
  if (message.role === 'system') return null;

  const isUser = message.role === 'user';

  return (
    <div
      className={`flex w-full min-w-0 ${
        isUser ? 'justify-end' : 'justify-start'
      }`}
    >
      <div
        className={`min-w-0 leading-relaxed text-sm ${
          isUser
            ? 'max-w-[85%] sm:max-w-[75%] rounded-2xl rounded-br-xs px-4 py-3 bg-slate-800 text-slate-100 border border-slate-700/50 font-medium wrap-break-words'
            : 'w-full max-w-full text-slate-200 px-0 py-1 text-left font-normal'
        }`}
      >
        <div className="w-full min-w-0 overflow-hidden wrap-break-words ">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              pre: ({ children }) => (
                <pre className="overflow-x-auto p-3.5 my-2.5 rounded-lg bg-slate-950/90 border border-slate-800 text-xs font-mono text-slate-200 max-w-full">
                  {children}
                </pre>
              ),

              code: ({ className, children, ...props }) => {
                const isBlock = className?.includes('language-');

                if (isBlock) {
                  return (
                    <code
                      className={`${className} font-mono`}
                      {...props}
                    >
                      {children}
                    </code>
                  );
                }

                return (
                  <code
                    className="bg-slate-800/80 px-1.5 py-0.5 rounded text-xs font-mono text-blue-300 wrap-anywhere wrap-break-words"
                    {...props}
                  >
                    {children}
                  </code>
                );
              },

              p: ({ children }) => (
                <p className="mb-3 last:mb-0 leading-relaxed wrap-break-words">
                  {children}
                </p>
              ),

              ul: ({ children }) => (
                <ul className="list-disc pl-5 mb-3 space-y-1">
                  {children}
                </ul>
              ),

              ol: ({ children }) => (
                <ol className="list-decimal pl-5 mb-3 space-y-1">
                  {children}
                </ol>
              ),

              li: ({ children }) => (
                <li className="leading-relaxed">
                  {children}
                </li>
              ),

              h1: ({ children }) => (
                <h1 className="text-lg font-bold text-slate-100 mt-4 mb-2 first:mt-0">
                  {children}
                </h1>
              ),

              h2: ({ children }) => (
                <h2 className="text-base font-semibold text-slate-100 mt-3 mb-2 first:mt-0">
                  {children}
                </h2>
              ),

              h3: ({ children }) => (
                <h3 className="text-sm font-semibold text-slate-100 mt-2 mb-1 first:mt-0">
                  {children}
                </h3>
              ),

              blockquote: ({ children }) => (
                <blockquote className="border-l-2 border-slate-700 pl-3 italic text-slate-400 my-2">
                  {children}
                </blockquote>
              ),

              a: ({ href, children }) => (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 underline break-all hover:text-blue-300"
                >
                  {children}
                </a>
              ),

              hr: () => (
                <hr className="my-3 border-slate-800" />
              ),

              /* TABLE */
              table: MarkdownTable,
              thead: TableHead,
              tbody: TableBody,
              tr: TableRow,
              th: TableHeaderCell,
              td: TableDataCell,
            }}
          >
            {message.content}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
}