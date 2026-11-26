'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { ApiMeta } from '@/lib/types';

/**
 * Build the list of page numbers to render for numbered pagination, inserting
 * 'dots' where the range is collapsed. Always shows the first + last page and
 * a window of `siblings` pages around the current page. Classic 1 2 … n layout.
 */
function getPaginationRange(
  current: number,
  total: number,
  siblings = 1,
): (number | 'dots')[] {
  // first + last + current + 2*siblings + 2 dots slots
  const totalPageNumbers = siblings * 2 + 5;
  if (totalPageNumbers >= total) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const leftSibling = Math.max(current - siblings, 1);
  const rightSibling = Math.min(current + siblings, total);
  const showLeftDots = leftSibling > 2;
  const showRightDots = rightSibling < total - 2;

  if (!showLeftDots && showRightDots) {
    const leftCount = 3 + 2 * siblings;
    return [
      ...Array.from({ length: leftCount }, (_, i) => i + 1),
      'dots',
      total,
    ];
  }
  if (showLeftDots && !showRightDots) {
    const rightCount = 3 + 2 * siblings;
    return [
      1,
      'dots',
      ...Array.from(
        { length: rightCount },
        (_, i) => total - rightCount + 1 + i,
      ),
    ];
  }
  return [
    1,
    'dots',
    ...Array.from(
      { length: rightSibling - leftSibling + 1 },
      (_, i) => leftSibling + i,
    ),
    'dots',
    total,
  ];
}

export interface Column<T> {
  key: string;
  /** String, or any node (e.g. a select-all checkbox) for the header cell. */
  header: React.ReactNode;
  render: (item: T) => React.ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  meta?: ApiMeta | null;
  isLoading?: boolean;
  emptyMessage?: string;
  onPageChange?: (page: number) => void;
  onRowClick?: (item: T) => void;
  currentPage?: number;
}

export function DataTable<T>({
  columns,
  data,
  meta,
  isLoading,
  emptyMessage = 'No data found',
  onPageChange,
  onRowClick,
  currentPage = 1,
}: DataTableProps<T>) {
  if (isLoading) {
    return (
      <div className="card">
        <div className="admin-table-scroll overflow-x-auto overflow-y-visible">
          <table className="w-full min-w-[600px]">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50/50">
                {columns.map((col) => (
                  <th key={col.key} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-gray-100">
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-3">
                      <div className="skeleton h-4 w-24" />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (!data.length) {
    return (
      <div className="card p-12 text-center">
        <div className="text-gray-400 text-sm">{emptyMessage}</div>
      </div>
    );
  }

  const totalPages = meta?.totalPages || 1;

  return (
    <div className="card min-h-[400px]">
      {/* overflow-y-visible is critical here — without it, the implicit
          overflow-y:auto (forced by overflow-x:auto per CSS spec) clips
          row-level kebab dropdowns that drop down past the row box.
          The loading state above already does this; live state was the
          outlier. Affects every admin page that uses DataTable. */}
      <div className="admin-table-scroll overflow-x-auto overflow-y-visible">
        <table className="w-full min-w-[600px]">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50/50">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider ${col.className || ''}`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((item, i) => (
              <tr
                key={i}
                className={`border-b border-gray-100 transition-colors ${
                  onRowClick ? 'hover:bg-gray-50 cursor-pointer' : ''
                }`}
                onClick={() => onRowClick?.(item)}
              >
                {columns.map((col) => (
                  <td key={col.key} className={`px-4 py-3 text-sm text-gray-700 ${col.className || ''}`}>
                    {col.render(item)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {meta && totalPages > 1 && onPageChange && (
        <div className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between border-t border-gray-200 bg-gray-50/30">
          <div className="text-xs text-gray-500">
            Page {currentPage} of {totalPages} · {meta.total} total
          </div>
          <nav className="flex items-center gap-1 flex-wrap" aria-label="Pagination">
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage <= 1}
              aria-label="Previous page"
              className="p-1.5 rounded-md hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {getPaginationRange(currentPage, totalPages).map((p, idx) =>
              p === 'dots' ? (
                <span
                  key={`dots-${idx}`}
                  className="px-1.5 text-gray-400 select-none"
                >
                  …
                </span>
              ) : (
                <button
                  key={p}
                  onClick={() => onPageChange(p)}
                  aria-current={p === currentPage ? 'page' : undefined}
                  className={`min-w-[32px] h-8 px-2 rounded-md text-sm font-medium transition-colors ${
                    p === currentPage
                      ? 'bg-ruby-600 text-white'
                      : 'text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {p}
                </button>
              ),
            )}
            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage >= totalPages}
              aria-label="Next page"
              className="p-1.5 rounded-md hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </nav>
        </div>
      )}
    </div>
  );
}
