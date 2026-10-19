import { useChatStore } from '../../stores/chatStore';
import { ArrowDown } from 'lucide-react';


interface ScrollButtonProps {
  onClick: () => void;
}

export default function ScrollButton({ onClick }: ScrollButtonProps) {
  const showScrollButton = useChatStore((state) => state.showScrollButton);
  const hasNoSystemMessages = useChatStore((state) =>
    state.messages.some((m) => m.role !== 'system')
  );

  if (!showScrollButton || !hasNoSystemMessages) return null;

  return (
    <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 z-10">
      <button
        onClick={onClick}
        className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/80 p-2 rounded-full shadow-lg flex items-center justify-center transition-all cursor-pointer hover:scale-105"
        title="Scroll to latest message"
      >
        <ArrowDown className="w-4 h-4" />
      </button>
    </div>
  );
}
