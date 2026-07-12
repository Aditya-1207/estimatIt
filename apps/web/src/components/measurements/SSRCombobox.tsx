import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Loader2 } from "lucide-react";
import type { SSRItem } from "@estimatit/shared";
import { getSSRItems } from "../../lib/api/ssr";


interface SSRComboboxProps {
  versionId: string;
  onSelect: (item: SSRItem | null, isCustom: boolean) => void;
  disabled?: boolean;
}

export function SSRCombobox({ versionId, onSelect, disabled }: SSRComboboxProps) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Debounce the search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const { data: items, isLoading } = useQuery({
    queryKey: ["ssr_items", versionId, debouncedQuery],
    queryFn: () => getSSRItems(versionId, debouncedQuery, 10),
    enabled: !!versionId && isOpen,
  });

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          disabled={disabled}
          placeholder="Search SSR items by code or description..."
          className="h-10 w-full rounded-md border border-input bg-background pl-9 pr-4 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
      </div>

      {isOpen && (
        <div className="absolute top-full z-50 mt-1 max-h-80 w-full overflow-auto rounded-md border border-border bg-card p-1 shadow-lg shadow-black/5 animate-in fade-in zoom-in-95">
          {items && items.length > 0 ? (
            <div className="flex flex-col">
              {items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setQuery("");
                    setIsOpen(false);
                    onSelect(item, false);
                  }}
                  className="flex flex-col items-start justify-start rounded-sm px-3 py-2 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:outline-none"
                >
                  <div className="font-semibold text-foreground">
                    [{item.item_no}] {item.description}
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="rounded-full bg-muted px-1.5 py-0.5">
                      {item.unit}
                    </span>
                    <span className="font-medium text-foreground">
                      ₹{item.completed_rate_inr?.toFixed(2) || "0.00"}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            debouncedQuery && !isLoading && (
              <div className="p-3 text-center text-sm text-muted-foreground">
                No SSR items found for "{debouncedQuery}"
              </div>
            )
          )}
          
          <div className="border-t border-border mt-1 pt-1">
            <button
              onClick={() => {
                setQuery("");
                setIsOpen(false);
                onSelect(null, true);
              }}
              className="w-full rounded-sm px-3 py-2 text-left text-sm text-primary transition-colors hover:bg-primary/10 focus:bg-primary/10 focus:outline-none"
            >
              + Add Custom Item (Not in SSR)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
