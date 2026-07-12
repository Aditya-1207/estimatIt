import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Loader2, X } from "lucide-react";
import type { Project } from "@estimatit/shared";
import { deleteProject } from "../../lib/api/projects";

interface DeleteProjectDialogProps {
  project: Project | null;
  onOpenChange: (open: boolean) => void;
}

export function DeleteProjectDialog({ project, onOpenChange }: DeleteProjectDialogProps) {
  const queryClient = useQueryClient();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: deleteProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      onOpenChange(false);
    },
    onError: (error) => {
      console.error("Failed to delete project:", error);
      setErrorMsg(error.message || "Failed to delete project. Please try again.");
    },
  });

  if (!project) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-background/80 backdrop-blur-sm transition-opacity"
        onClick={() => !mutation.isPending && onOpenChange(false)}
      />

      {/* Dialog */}
      <div className="relative z-50 w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-lg sm:mx-4 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <h2 className="text-xl font-bold tracking-tight text-foreground">
              Delete Project
            </h2>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            disabled={mutation.isPending}
            className="rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 space-y-3">
          <p className="text-sm text-foreground">
            Are you sure you want to delete <strong>{project.name}</strong>?
          </p>
          <div className="rounded-md border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive/90">
            This will permanently delete all measurement blocks, dimensions, and abstract data associated with this project. This action cannot be undone.
          </div>
        </div>

        {errorMsg && (
          <div className="mt-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
            {errorMsg}
          </div>
        )}

        <div className="mt-6 flex items-center justify-end gap-3 border-t border-border pt-4">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={mutation.isPending}
            className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              setErrorMsg(null);
              mutation.mutate(project.id);
            }}
            disabled={mutation.isPending}
            className="inline-flex items-center justify-center rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground transition-colors hover:bg-destructive/90 disabled:cursor-not-allowed disabled:opacity-50 min-w-[120px]"
          >
            {mutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              "Yes, Delete Project"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
