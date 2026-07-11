import { useParams } from "wouter";
import { Ruler, ArrowLeft } from "lucide-react";
import { Link } from "wouter";

export function MeasurementSheet() {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        All Projects
      </Link>

      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Measurement Sheet
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Project ID: {id}
          </p>
        </div>
        <button
          disabled
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground opacity-50 cursor-not-allowed"
        >
          Export to Excel
        </button>
      </div>

      {/* Empty State */}
      <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-card px-6 py-16 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Ruler className="h-8 w-8" />
        </div>
        <h2 className="mt-4 text-lg font-semibold text-foreground">
          No measurements yet
        </h2>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          Add measurement blocks to start building your estimation. Each block
          ties to an SSR item, with major items and dimension rows underneath.
        </p>

        {/* Preview of the measurement structure */}
        <div className="mt-6 w-full max-w-lg rounded-xl border border-border bg-muted/50 p-4 text-left">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Structure Preview
          </p>
          <div className="space-y-1.5 text-sm">
            <div className="font-bold text-primary">
              1. SSR 5.14: Earth work in excavation...
            </div>
            <div className="ml-4 font-semibold text-foreground">
              Gents Toilet
            </div>
            <div className="ml-8 flex items-center justify-between text-muted-foreground">
              <span>Septic Tank</span>
              <span className="font-mono text-xs">
                2 × 3.00 × 2.00 × 1.50 = <strong className="text-foreground">18.00</strong>
              </span>
            </div>
            <div className="ml-8 flex items-center justify-between text-muted-foreground">
              <span>Water Tank</span>
              <span className="font-mono text-xs">
                1 × 2.00 × 1.50 × 1.00 = <strong className="text-foreground">3.00</strong>
              </span>
            </div>
          </div>
        </div>

        <p className="mt-6 rounded-lg bg-muted px-4 py-2 text-xs font-medium text-muted-foreground">
          🚧 Measurement data entry coming in Phase 5
        </p>
      </div>
    </div>
  );
}
