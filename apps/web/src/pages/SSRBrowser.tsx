import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, BookOpen, Loader2, FileWarning } from "lucide-react";
import { getActiveSSRVersion, getSSRItems } from "../lib/api/ssr";

// Simple debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

export function SSRBrowser() {
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounce(searchTerm, 300);

  // Fetch active SSR Version
  const {
    data: activeVersion,
    isLoading: isVersionLoading,
    error: versionError,
  } = useQuery({
    queryKey: ["ssrVersion", "active"],
    queryFn: getActiveSSRVersion,
  });

  // Fetch SSR Items based on active version and search term
  const {
    data: items,
    isLoading: isItemsLoading,
    error: itemsError,
  } = useQuery({
    queryKey: ["ssrItems", activeVersion?.id, debouncedSearch],
    queryFn: () => getSSRItems(activeVersion!.id, debouncedSearch),
    enabled: !!activeVersion?.id,
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            SSR Browser
          </h1>
          <p className="mt-1 text-sm text-muted-foreground flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            {isVersionLoading ? (
              <span className="animate-pulse bg-muted text-transparent rounded">Loading version...</span>
            ) : activeVersion ? (
              <span>Active Version: {activeVersion.version} ({activeVersion.description})</span>
            ) : (
              <span className="text-destructive">No active SSR version found.</span>
            )}
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search by Item No, Description, or Chapter..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          disabled={!activeVersion}
          className="h-10 w-full rounded-md border border-input bg-background pl-9 pr-4 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>

      {/* Content Area */}
      <div className="rounded-lg border border-border bg-card">
        {versionError || itemsError ? (
          <div className="flex flex-col items-center justify-center py-12 text-center text-destructive">
            <FileWarning className="h-8 w-8 mb-2 opacity-80" />
            <p className="font-medium">Failed to load data.</p>
            <p className="text-sm opacity-80 mt-1">Please check your connection or database setup.</p>
          </div>
        ) : isVersionLoading || isItemsLoading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="mt-4 text-sm text-muted-foreground">Loading SSR data...</p>
          </div>
        ) : !items || items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <BookOpen className="h-12 w-12 text-muted-foreground/50" />
            <p className="mt-4 text-lg font-medium text-foreground">
              No items found
            </p>
            <p className="mt-1 text-sm text-muted-foreground max-w-sm">
              {searchTerm 
                ? `No results matching "${searchTerm}". Try adjusting your search.`
                : "No items exist in the database for the active SSR version."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium whitespace-nowrap">Sr No</th>
                  <th className="px-4 py-3 font-medium whitespace-nowrap">Item No</th>
                  <th className="px-4 py-3 font-medium">Chapter</th>
                  <th className="px-4 py-3 font-medium min-w-[300px]">Description</th>
                  <th className="px-4 py-3 font-medium text-right">Unit</th>
                  <th className="px-4 py-3 font-medium text-right">Rate (₹)</th>
                  <th className="px-4 py-3 font-medium text-right">Labour (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.map((item) => (
                  <tr key={item.id} className="transition-colors hover:bg-muted/50">
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                      {item.sr_no ?? "—"}
                    </td>
                    <td className="px-4 py-3 font-medium text-foreground whitespace-nowrap">
                      {item.item_no}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-accent text-accent-foreground">
                        {item.chapter}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {item.description}
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground">
                      {item.unit}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-foreground">
                      {item.completed_rate_inr != null ? item.completed_rate_inr.toFixed(2) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground">
                      {item.labour_rate_inr != null ? item.labour_rate_inr.toFixed(2) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
