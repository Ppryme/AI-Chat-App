import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  createContext,
  useContext,
} from 'react';
import { createPortal } from 'react-dom';
import { Maximize2, X, MoveHorizontal } from 'lucide-react';

interface TableContextValue {
  isOverflowing: boolean;
}

const TableContext = createContext<TableContextValue>({ isOverflowing: false });

export function useTableContext() {
  return useContext(TableContext);
}

interface MarkdownTableProps extends React.ComponentPropsWithoutRef<'table'> {
  children?: React.ReactNode;
}

export function MarkdownTable({ children, ...props }: MarkdownTableProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [hasScrolled, setHasScrolled] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const checkOverflow = useCallback(() => {
    if (!containerRef.current) return;
    const { scrollWidth, clientWidth, scrollLeft } = containerRef.current;
    const overflowing = scrollWidth > clientWidth + 2;
    setIsOverflowing(overflowing);
    setCanScrollRight(overflowing && scrollLeft < scrollWidth - clientWidth - 6);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    checkOverflow();

    const ro = new ResizeObserver(() => {
      checkOverflow();
    });
    ro.observe(el);

    return () => ro.disconnect();
  }, [checkOverflow]);

  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = containerRef.current;

    if (scrollLeft > 12 && !hasScrolled) {
      setHasScrolled(true);
    }

    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 6);
  };

  // Close modal on Escape key
  useEffect(() => {
    if (!isExpanded) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsExpanded(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isExpanded]);

  return (
    <TableContext.Provider value={{ isOverflowing }}>
      <div className="my-4 w-full max-w-full rounded-xl border border-slate-800 bg-slate-950/40 overflow-hidden shadow-xs">
        {/* Top toolbar when table is overflowing or has wide content */}
        {isOverflowing && (
          <div className="flex items-center justify-between px-3 py-1.5 bg-slate-900/70 border-b border-slate-800/80 text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <span className="font-medium text-slate-300 text-[11px] uppercase tracking-wider">
                Table
              </span>
              {!hasScrolled && (
                <span className="inline-flex items-center gap-1 text-[11px] text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-full transition-opacity duration-300">
                  <MoveHorizontal className="w-3 h-3 animate-pulse" />
                  <span>Swipe to see more</span>
                </span>
              )}
            </div>

            <button
              onClick={() => setIsExpanded(true)}
              className="flex items-center gap-1.5 px-2 py-1 text-[11px] font-medium text-slate-300 hover:text-white bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 rounded-md transition cursor-pointer"
              title="Expand table to fullscreen"
            >
              <Maximize2 className="w-3 h-3" />
              <span className="hidden sm:inline">Expand</span>
            </button>
          </div>
        )}

        {/* Scrollable table container */}
        <div className="relative w-full">
          {/* Subtle Right Gradient Shadow when more columns exist to the right */}
          {canScrollRight && (
            <div
              className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 sm:w-12 bg-gradient-to-l from-slate-950/90 via-slate-950/40 to-transparent transition-opacity duration-200 z-15"
              aria-hidden="true"
            />
          )}

          <div
            ref={containerRef}
            onScroll={handleScroll}
            className="w-full max-w-full overflow-x-auto scrollbar-thin scrollbar-thumb-slate-800"
          >
            <table
              className="min-w-full w-max border-collapse text-left text-sm"
              {...props}
            >
              {children}
            </table>
          </div>
        </div>
      </div>

      {/* Fullscreen Expansion Modal */}
      {isExpanded &&
        createPortal(
          <div
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-6 animate-in fade-in duration-150"
            onClick={() => setIsExpanded(false)}
          >
            <div
              className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-6xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-950/80 shrink-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-100">
                    Expanded Table View
                  </span>
                  <span className="text-xs text-slate-400 hidden sm:inline">
                    (Press Esc to close)
                  </span>
                </div>
                <button
                  onClick={() => setIsExpanded(false)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
                  title="Close (Esc)"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Table Content */}
              <div className="flex-1 overflow-auto p-3 sm:p-5">
                <div className="min-w-full rounded-xl border border-slate-800 overflow-hidden bg-slate-950/60">
                  <div className="overflow-x-auto">
                    <table
                      className="min-w-full w-max border-collapse text-left text-sm"
                      {...props}
                    >
                      {children}
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </TableContext.Provider>
  );
}

export function TableHead({ children, ...props }: React.ComponentPropsWithoutRef<'thead'>) {
  return (
    <thead className="border-b border-slate-800 bg-slate-900/90" {...props}>
      {children}
    </thead>
  );
}

export function TableBody({ children, ...props }: React.ComponentPropsWithoutRef<'tbody'>) {
  return (
    <tbody className="divide-y divide-slate-800/80" {...props}>
      {children}
    </tbody>
  );
}

export function TableRow({ children, ...props }: React.ComponentPropsWithoutRef<'tr'>) {
  return (
    <tr
      className="group transition-colors hover:bg-slate-800/30"
      {...props}
    >
      {children}
    </tr>
  );
}

export function TableHeaderCell({ children, ...props }: React.ComponentPropsWithoutRef<'th'>) {
  const { isOverflowing } = useTableContext();

  return (
    <th
      className={`px-4 py-3 text-left text-xs font-semibold text-slate-200 border-b border-slate-700/80 bg-slate-900/95 whitespace-nowrap min-w-[100px] ${
        isOverflowing
          ? ' first:left-0 first:z-20 first:bg-slate-900 first:shadow-[2px_0_6px_-1px_rgba(0,0,0,0.5)] first:border-r first:border-slate-800'
          : ''
      }`}
      {...props}
    >
      {children}
    </th>
  );
}

export function TableDataCell({ children, ...props }: React.ComponentPropsWithoutRef<'td'>) {
  const { isOverflowing } = useTableContext();

  return (
    <td
      className={`px-4 py-3 align-top text-sm text-slate-300 leading-relaxed min-w-[120px] max-w-[480px] break-words ${
        isOverflowing
          ? ' first:left-0 first:z-10 first:bg-slate-950 first:group-hover:bg-slate-900/80 first:shadow-[2px_0_6px_-1px_rgba(0,0,0,0.5)] first:border-r first:border-slate-800/80'
          : ''
      }`}
      {...props}
    >
      {children}
    </td>
  );
}
