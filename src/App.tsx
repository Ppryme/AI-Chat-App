import Header from './components/ui/Header';
import ChatMessage from './components/chat/ChatMessage';
import ChatInput from './components/chat/ChatInput';
import ScrollButton from './components/chat/ScrollButton';
import Sidebar from './components/chat/Sidebar';
import { useChatStore } from './stores/chatStore';
import { useChat } from './hooks/useChat';
import { motion } from 'framer-motion';

export default function App() {
  const messages = useChatStore((state) => state.messages);
  const loading = useChatStore((state) => state.loading);
  const messagesLoading = useChatStore((state) => state.messagesLoading);
  const currentChatId = useChatStore((state) => state.currentChatId);
  const tokenUsage = useChatStore((state) => state.tokenUsage);

  const {
    chatContainerRef,
    messagesEndRef,
    handleScroll,
    scrollToBottom,
    handleSubmit,
    stopGeneration,
    loadConversation,
    startNewChat,
  } = useChat();

  return (
    <div className="flex h-dvh w-full bg-slate-950 text-slate-100 overflow-hidden font-sans fixed inset-0">
      {/* Sidebar displaying only conversation history */}
      <Sidebar onSelectChat={loadConversation} onNewChat={startNewChat} />

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col h-full min-w-0 bg-slate-900 border-l border-slate-800/80 overflow-hidden relative">
        {/* --- TOP HEADER (Sticky & Permanently Anchored) --- */}
        <Header onNewChat={startNewChat} tokenUsage={tokenUsage} />

        {/* --- CHAT MESSAGES CONTAINER --- */}
        <div
          ref={chatContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 space-y-6 scroll-smooth relative"
        >
          {messagesLoading ? (
            <div className="flex items-center justify-center py-12 text-slate-400 text-xs animate-pulse">
              Loading conversation...
            </div>
          ) : (
            <motion.div
              key={currentChatId}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, ease: 'easeInOut' }}
              className="space-y-6 min-w-0 w-full"
            >
              {messages.map((msg, index) => (
                <ChatMessage key={index} message={msg} />
              ))}
            </motion.div>
          )}

          {/* AI Thinking Bubble (Only during active token generation) */}
          {loading && (
            <div className="flex justify-start">
              <div className="text-slate-400 text-sm py-1 animate-pulse flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-bounce"></span>
                Thinking...
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* --- INPUT SECTION --- */}
        <footer className="relative shrink-0">
          <ScrollButton onClick={() => scrollToBottom('smooth')} />
          <ChatInput onSubmit={loading ? stopGeneration : handleSubmit} />
        </footer>
      </main>
    </div>
  );
}