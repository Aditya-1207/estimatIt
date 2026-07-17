import { Link } from "wouter";
import { Clock, HardHat, Trash2, FileBadge } from "lucide-react";
import type { Project } from "@estimatit/shared";

interface ProjectCardProps {
  project: Project;
  onDeleteClick: (project: Project) => void;
}

export function ProjectCard({ project, onDeleteClick }: ProjectCardProps) {
  // Format the updated_at date nicely
  const updatedAt = new Date(project.updated_at);
  const now = new Date();
  const diffInHours = Math.floor((now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60));
  
  let timeString = "";
  if (diffInHours < 1) {
    timeString = "Updated just now";
  } else if (diffInHours < 24) {
    timeString = `Updated ${diffInHours} hour${diffInHours === 1 ? "" : "s"} ago`;
  } else {
    timeString = `Updated ${updatedAt.toLocaleDateString()}`;
  }

  return (
    <div className="group relative flex flex-col justify-between rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        {project.is_template ? (
          <Link href={`/project/${project.id}`} className="flex-1 hover:underline group/link">
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-500 transition-colors group-hover/link:bg-indigo-500/20">
                <FileBadge className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold leading-none tracking-tight text-foreground line-clamp-1">
                  {project.name}
                </h3>
                <span className="mt-1 inline-flex items-center rounded-md bg-indigo-500/10 px-2 py-0.5 text-[10px] font-medium text-indigo-500 ring-1 ring-inset ring-indigo-500/20 uppercase tracking-wide">
                  Template
                </span>
              </div>
            </div>
          </Link>
        ) : (
          <Link href={`/project/${project.id}`} className="flex-1 hover:underline group/link">
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover/link:bg-primary/20">
                <HardHat className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold leading-none tracking-tight text-foreground line-clamp-1">
                  {project.name}
                </h3>
                {project.work_order_no ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    WO: {project.work_order_no}
                  </p>
                ) : (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Draft Project
                  </p>
                )}
              </div>
            </div>
          </Link>
        )}

        <button
          onClick={() => onDeleteClick(project)}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-all hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100 focus:opacity-100"
          aria-label="Delete project"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-6 flex items-center justify-between border-t border-border pt-4">
        <div className="flex flex-col gap-1 text-xs font-medium">
          <span className="text-muted-foreground">Estimated Amount</span>
          <span className="text-foreground">—</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          {timeString}
        </div>
      </div>
    </div>
  );
}
