import { cn } from "@/lib/utils";

// JSX version: no TypeScript generics or interfaces
export function DataTable({ columns, data }) {
  return (
    <div className="overflow-auto rounded-2xl border border-border">
      <table className="w-full text-sm">
        <thead className="bg-muted/60">
          <tr>
            {columns.map((col) => (
              <th key={String(col.key)} className={cn("px-4 py-3 text-left font-semibold text-foreground", col.className)}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => (
            <tr key={idx} className="border-t border-border/60 hover:bg-muted/40">
              {columns.map((col) => (
                <td key={String(col.key)} className={cn("px-4 py-3 text-foreground/90", col.className)}>
                  {String(row[col.key])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}


