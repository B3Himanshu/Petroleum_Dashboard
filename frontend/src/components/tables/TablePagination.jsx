// JSX version: no TypeScript interface
export const TablePagination = ({ page, pageSize, total, onPageChange }) => {
  const totalPages = Math.ceil(total / pageSize);
  const canPrev = page > 1;
  const canNext = page < totalPages;

  return (
    <div className="flex items-center justify-between text-sm text-muted-foreground mt-3">
      <span>
        Page {page} of {totalPages || 1}
      </span>
      <div className="flex items-center gap-2">
        <button
          disabled={!canPrev}
          onClick={() => onPageChange?.(page - 1)}
          className="px-3 py-1 rounded-lg border border-border disabled:opacity-50"
        >
          Prev
        </button>
        <button
          disabled={!canNext}
          onClick={() => onPageChange?.(page + 1)}
          className="px-3 py-1 rounded-lg border border-border disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
};


