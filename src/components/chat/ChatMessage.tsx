import ReactMarkdown from 'react-markdown';
import type { Message } from '../../types/chat';

interface ChatMessageProps {
  message: Message;
}

export default function ChatMessage({ message }: ChatMessageProps) {
  if (message.role === 'system') return null;

  return (
    <div
      className={`flex overflow-hidden ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
    >
      <div
        className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 font-semibold text-sm leading-relaxed wrap-anywhere min-w-0 ${
          message.role === 'user'
            ? 'bg-slate-800 text-slate-100 rounded-br-xs border border-slate-700/50'
            : 'bg-transparent text-slate-200 px-0 py-1 text-left'
        }`}
      >
        <div className="prose prose-invert max-w-none text-sm wrap-anywhere">
          <ReactMarkdown>{message.content}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
