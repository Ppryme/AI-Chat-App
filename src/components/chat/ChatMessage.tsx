import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Message } from '../../types/chat';

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
            ? 'max-w-[85%] sm:max-w-[75%] rounded-2xl rounded-br-xs px-4 py-3 bg-slate-800 text-slate-100 border border-slate-700/50 font-medium break-words'
            : 'w-full max-w-full text-slate-200 px-0 py-1 text-left font-normal'
        }`}
      >
        <div className="w-full min-w-0 overflow-hidden break-words [overflow-wrap:anywhere]">
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
                    className="bg-slate-800/80 px-1.5 py-0.5 rounded text-xs font-mono text-blue-300 break-words"
                    {...props}
                  >
                    {children}
                  </code>
                );
              },

              p: ({ children }) => (
                <p className="mb-3 last:mb-0 leading-relaxed break-words">
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
              table: ({ children }) => (
                <div className="my-4 w-full max-w-full overflow-x-auto rounded-xl border border-slate-800">
                  <table className="w-full min-w-[600px] border-collapse text-left text-sm">
                    {children}
                  </table>
                </div>
              ),

              thead: ({ children }) => (
                <thead className="border-b border-slate-700 bg-slate-900/60">
                  {children}
                </thead>
              ),

              tbody: ({ children }) => (
                <tbody className="divide-y divide-slate-800">
                  {children}
                </tbody>
              ),

              tr: ({ children }) => (
                <tr className="transition-colors hover:bg-slate-800/30">
                  {children}
                </tr>
              ),

              th: ({ children }) => (
                <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold text-slate-300">
                  {children}
                </th>
              ),

              td: ({ children }) => (
                <td className="px-4 py-3 align-top text-sm text-slate-300">
                  {children}
                </td>
              ),
            }}
          >
            {message.content}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
}