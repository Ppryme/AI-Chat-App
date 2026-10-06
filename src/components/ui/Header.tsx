import type { TokenUsage } from '../../types/chat';
import { useChatStore } from '../../stores/chatStore';
import { Menu, RotateCcw } from 'lucide-react';

interface HeaderProps {
  onNewChat: () => void;
  tokenUsage: TokenUsage | null;
}

export default function Header({ onNewChat, tokenUsage }: HeaderProps) {
  const currentChatId = useChatStore((state) => state.currentChatId);
  const chats = useChatStore((state) => state.chats);
  const setSidebarOpen = useChatStore((state) => state.setSidebarOpen);

  const activeChat = chats.find((c) => c.id === currentChatId);
  const title = activeChat ? activeChat.title : 'New Chat';
  const subtitle = activeChat ? 'How can I help you today?' : '';

  return (
    <div className="flex justify-between items-center px-4 sm:px-6 py-3.5 border-b border-slate-800/60 bg-slate-900/50 backdrop-blur ">
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={() => setSidebarOpen((prev) => !prev)}
          className="sm:hidden p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
          title="Toggle conversation list"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="min-w-0">
          <h1 className="text-base font-semibold text-slate-100 truncate">{title}</h1>
          <p className="text-xs text-slate-400 truncate">{subtitle}</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {tokenUsage && (
          <div className="hidden xs:flex px-3 py-1 bg-slate-950/60 border border-slate-800/40 rounded-lg items-center gap-2 text-[11px] text-slate-400">
            <span>
              Tokens: <strong className="text-slate-200">{tokenUsage.total}</strong>
            </span>
          </div>
        )}

        <button
          onClick={onNewChat}
          className="p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition-colors cursor-pointer"
          title="Start New Chat"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}