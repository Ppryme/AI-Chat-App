import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Trash2, AlertTriangle, X, Loader2 } from 'lucide-react';

interface DeleteModalProps {
  isOpen: boolean;
  chatTitle?: string;
  isDeleting?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export default function DeleteModal({
  isOpen,
  chatTitle,
  isDeleting = false,
  onConfirm,
  onClose,
}: DeleteModalProps) {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isDeleting) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isDeleting, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={() => {
        if (!isDeleting) onClose();
      }}
    >
      <div
        className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm sm:max-w-md shadow-2xl p-5 overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header & Icon */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
              <Trash2 className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-100">
                Delete Conversation
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                This action cannot be undone.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isDeleting}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition disabled:opacity-50 cursor-pointer"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="mt-4 p-3 rounded-lg bg-slate-950/60 border border-slate-800/80">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to delete{' '}
              {chatTitle ? (
                <span className="font-semibold text-white">
                  &ldquo;{chatTitle}&rdquo;
                </span>
              ) : (
                'this conversation'
              )}
              ? All messages will be permanently removed.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-5 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-3.5 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 rounded-lg transition disabled:opacity-50 cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="px-4 py-2 text-xs font-medium text-white bg-red-600 hover:bg-red-500 rounded-lg transition shadow-sm shadow-red-900/30 flex items-center gap-1.5 disabled:opacity-60 cursor-pointer"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Deleting...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
