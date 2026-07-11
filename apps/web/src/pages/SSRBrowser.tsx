import { BookOpen, Search } from "lucide-react";

export function SSRBrowser() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          SSR Rates
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Browse Maharashtra PWD State Schedule of Rates
        </p>
      </div>

      {/* SSR Version Banner */}
      <div className="flex items-center gap-3 rounded-xl bg-primary/5 border border-primary/10 px-4 py-3">
        <BookOpen className="h-5 w-5 text-primary" />
        <div>
          <p className="text-sm font-semibold text-primary">
            Maharashtra PWD 2024-25
          </p>
          <p className="text-xs text-muted-foreground">
            State Schedule of Rates — active version
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search by item code or description..."
          disabled
          className="h-11 w-full rounded-lg border border-input bg-background pl-10 pr-4 text-sm placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>

      {/* Table Placeholder */}
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Item Code
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Description
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Unit
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Rate (₹)
              </th>
            </tr>
          </thead>
          <tbody>
            {/* Skeleton rows */}
            {[1, 2, 3, 4, 5].map((i) => (
              <tr key={i} className="border-b border-border last:border-0">
                <td className="px-4 py-3.5">
                  <div className="h-4 w-12 animate-pulse rounded bg-muted" />
                </td>
                <td className="px-4 py-3.5">
                  <div className="h-4 w-64 animate-pulse rounded bg-muted" />
                </td>
                <td className="px-4 py-3.5">
                  <div className="h-4 w-10 animate-pulse rounded bg-muted" />
                </td>
                <td className="px-4 py-3.5 text-right">
                  <div className="ml-auto h-4 w-16 animate-pulse rounded bg-muted" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="rounded-lg bg-muted px-4 py-2 text-center text-xs font-medium text-muted-foreground">
        🚧 SSR data loading coming in Phase 3
      </p>
    </div>
  );
}
