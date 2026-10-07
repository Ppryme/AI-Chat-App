import React, { useState } from 'react';
import { useChatStore } from '../../stores/chatStore';
import { renameChat, deleteChat } from '../../services/chatApi';
import { Plus, MessageSquare, Trash2, Edit2, Check, X } from 'lucide-react';

interface SidebarProps {
  onSelectChat: (chatId: string) => void;
  onNewChat: () => void;
}

export default function Sidebar({ onSelectChat, onNewChat }: SidebarProps) {
  const chats = useChatStore((state) => state.chats);
  const currentChatId = useChatStore((state) => state.currentChatId);
  const chatsLoading = useChatStore((state) => state.chatsLoading);
  const sidebarOpen = useChatStore((state) => state.sidebarOpen);
  const setSidebarOpen = useChatStore((state) => state.setSidebarOpen);
  const updateChatTitleInStore = useChatStore((state) => state.updateChatTitleInStore);
  const removeChatFromStore = useChatStore((state) => state.removeChatFromStore);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const handleStartRename = (e: React.MouseEvent, id: string, title: string) => {
    e.stopPropagation();
    setEditingId(id);
    setEditTitle(title);
  };

  const handleSaveRename = async (e: React.FormEvent | React.MouseEvent, id: string) => {
    e.stopPropagation();
    const trimmed = editTitle.trim();
    if (!trimmed) {
      setEditingId(null);
      return;
    }
    try {
      updateChatTitleInStore(id, trimmed);
      setEditingId(null);
      await renameChat(id, trimmed);
    } catch (error) {
      console.error('Failed to rename conversation:', error);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this conversation?')) return;
    try {
      removeChatFromStore(id);
      await deleteChat(id);
    } catch (error) {
      console.error('Failed to delete conversation:', error);
    }
  };

  return (
    <>
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-black/60 z-30 sm:hidden backdrop-blur-xs"
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed sm:static inset-y-0 left-0 z-40 w-64 bg-slate-950 sm:bg-slate-900 border-r border-slate-800 flex flex-col transition-transform duration-200 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full sm:translate-x-0'
        }`}
      >
        {/* Top Header / New Chat Button */}
        <div className="p-3 border-b border-slate-800/80 flex items-center justify-between gap-2">
          <button
            onClick={onNewChat}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition cursor-pointer shadow-sm shadow-blue-900/30"
          >
            <Plus className="w-4 h-4" />
            <span>New Chat</span>
          </button>

          <button
            onClick={() => setSidebarOpen(false)}
            className="sm:hidden p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
            title="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-thin scrollbar-thumb-slate-800">
          <div className="px-2 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Conversations
          </div>

          {chatsLoading && chats.length === 0 && (
            <div className="p-4 text-xs text-slate-500 text-center animate-pulse">
              Loading conversations...
            </div>
          )}

          {!chatsLoading && chats.length === 0 && (
            <div className="p-4 text-xs text-slate-500 text-center">
              No conversations yet.
            </div>
          )}

          {chats.map((chat) => {
            const isActive = chat.id === currentChatId;
            const isEditing = chat.id === editingId;

            return (
              <div
                key={chat.id}
                onClick={() => onSelectChat(chat.id)}
                className={`group flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                  isActive
                    ? 'bg-slate-800 text-white border border-slate-700/60 shadow-xs'
                    : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                }`}
              >
                {isEditing ? (
                  <div className="flex items-center gap-1.5 w-full" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSaveRename(e, chat.id)}
                      autoFocus
                      className="flex-1 bg-slate-900 text-white px-2 py-1 rounded border border-blue-500 outline-none text-xs"
                    />
                    <button
                      onClick={(e) => handleSaveRename(e, chat.id)}
                      className="p-1 hover:text-green-400 text-slate-300"
                      title="Save"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="p-1 hover:text-red-400 text-slate-300"
                      title="Cancel"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-2">
                      <MessageSquare className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-blue-400' : 'text-slate-500'}`} />
                      <span className="truncate">{chat.title}</span>
                    </div>

                    <div className="hidden hover:none lg:group-hover:flex items-center gap-1 shrink-0">
                      <button
                        onClick={(e) => handleStartRename(e, chat.id, chat.title)}
                        className="p-1 text-slate-400 hover:text-white hover:bg-slate-700/60 rounded"
                        title="Rename"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => handleDelete(e, chat.id)}
                        className="p-1 text-slate-400 hover:text-red-400 hover:bg-slate-700/60 rounded"
                        title="Delete"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </aside>
    </>
  );
}
