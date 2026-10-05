/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useRef, useEffect } from 'react';
import IconButton from '../ui/IconButton';
import { useChatStore } from '../../stores/chatStore';
import { Square, ArrowUp, Plus } from 'lucide-react';

interface ChatInputProps {
  onSubmit: (e: React.FormEvent) => void;
}

export default function ChatInput({ onSubmit }: ChatInputProps) {
  const input = useChatStore((state) => state.input);
  const setInput = useChatStore((state) => state.setInput);
  const loading = useChatStore((state) => state.loading);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea height as text grows up to a maximum height
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const maxHeight = 208; // 13rem (~8-9 lines)
      const nextHeight = Math.min(textareaRef.current.scrollHeight, maxHeight);
      textareaRef.current.style.height = `${nextHeight}px`;
    }
  }, [input]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!loading && input.trim()) {
        onSubmit(e as any);
      }
    }
  };

  return (
    <div className="p-3 sm:p-4 bg-slate-900 border-t border-slate-800/60 relative">
      <form
        onSubmit={onSubmit}
        className="flex flex-col bg-slate-950 border border-slate-800 rounded-3xl p-3 shadow-inner focus-within:border-slate-600 transition-all"
      >
        {/* Top Textarea Area */}
        <textarea
          ref={textareaRef}
          rows={1}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask anything..."
          className="w-full bg-transparent text-slate-100 placeholder-slate-500 focus:outline-none resize-none px-2 pt-1 text-sm leading-relaxed max-h-52 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700"
        />

        {/* Bottom Actions Row (ChatGPT Style) */}
        <div className="flex items-center justify-between mt-2 pt-1">
          {/* Left Action Buttons */}
          <div className="flex items-center gap-1">
            <IconButton
              type="button"
              icon={<Plus className="w-5 h-5" />}
              title="Add attachment"
              className="text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 p-1.5"
            />
          </div>

          {/* Right Action / Submit Button */}
          <div className="flex items-center gap-2">
            <IconButton
              type="submit"
              disabled={!loading && !input.trim()}
              icon={
                loading ? (
                  <Square className="w-4 h-4 fill-current" />
                ) : (
                  <ArrowUp className="w-4 h-4 stroke-[2.5]" />
                )
              }
              variant="primary"
              title={loading ? 'Stop generating' : 'Send message'}
              className="w-8 h-8 !p-0 rounded-full"
            />
          </div>
        </div>
      </form>
    </div>
  );
}
