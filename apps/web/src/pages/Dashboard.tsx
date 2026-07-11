import { Plus, FolderOpen } from "lucide-react";

export function Dashboard() {
  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Projects
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your estimation projects
          </p>
        </div>
        <button
          disabled
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground opacity-50 cursor-not-allowed"
        >
          <Plus className="h-4 w-4" />
          New Project
        </button>
      </div>

      {/* Empty State */}
      <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-card px-6 py-16 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <FolderOpen className="h-8 w-8" />
        </div>
        <h2 className="mt-4 text-lg font-semibold text-foreground">
          No projects yet
        </h2>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          Create your first estimation project to get started. You'll be able to
          add measurement blocks, SSR items, and export to Excel.
        </p>
        <p className="mt-6 rounded-lg bg-muted px-4 py-2 text-xs font-medium text-muted-foreground">
          🚧 Project creation coming in Phase 4
        </p>
      </div>
    </div>
  );
}
