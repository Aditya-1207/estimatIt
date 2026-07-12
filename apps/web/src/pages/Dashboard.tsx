import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, FolderOpen, Search } from "lucide-react";
import type { Project } from "@estimatit/shared";
import { listProjects } from "../lib/api/projects";
import { ProjectCard } from "../components/projects/ProjectCard";
import { CreateProjectDialog } from "../components/projects/CreateProjectDialog";
import { DeleteProjectDialog } from "../components/projects/DeleteProjectDialog";

export function Dashboard() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);

  const { data: projects, isLoading, error } = useQuery({
    queryKey: ["projects"],
    queryFn: listProjects,
  });

  const filteredProjects = useMemo(() => {
    if (!projects) return [];
    if (!searchQuery.trim()) return projects;
    const query = searchQuery.toLowerCase();
    return projects.filter(
      (p) =>
        p.name.toLowerCase().includes(query) ||
        (p.work_order_no && p.work_order_no.toLowerCase().includes(query))
    );
  }, [projects, searchQuery]);

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
          onClick={() => setIsCreateOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Project
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search projects..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          disabled={!projects || projects.length === 0}
          className="h-10 w-full rounded-md border border-input bg-background pl-9 pr-4 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>

      {/* Content Area */}
      {error ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-destructive/20 bg-destructive/5 px-6 py-16 text-center">
          <p className="font-medium text-destructive">Failed to load projects.</p>
          <p className="text-sm text-destructive/80 mt-1">Please try refreshing the page.</p>
        </div>
      ) : isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 rounded-xl border border-border bg-muted/20 animate-pulse" />
          ))}
        </div>
      ) : !projects || projects.length === 0 ? (
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
          <button
            onClick={() => setIsCreateOpen(true)}
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Create First Project
          </button>
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          No projects matching "{searchQuery}"
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredProjects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onDeleteClick={setProjectToDelete}
            />
          ))}
        </div>
      )}

      {/* Dialogs */}
      <CreateProjectDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />
      
      <DeleteProjectDialog 
        project={projectToDelete} 
        onOpenChange={(open) => !open && setProjectToDelete(null)} 
      />
    </div>
  );
}
