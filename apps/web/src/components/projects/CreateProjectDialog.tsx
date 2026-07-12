import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocation } from "wouter";
import { X, Loader2 } from "lucide-react";
import { createProjectSchema, type CreateProjectInput } from "@estimatit/shared";
import { createProject } from "../../lib/api/projects";
import { cn } from "../../lib/utils";

interface CreateProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateProjectDialog({ open, onOpenChange }: CreateProjectDialogProps) {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateProjectInput>({
    resolver: zodResolver(createProjectSchema),
    defaultValues: {
      name: "",
      work_order_no: "",
    },
  });

  const mutation = useMutation({
    mutationFn: createProject,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      onOpenChange(false);
      reset();
      setLocation(`/project/${data.id}`);
    },
    onError: (error) => {
      console.error("Failed to create project:", error);
      setErrorMsg(error.message || "Failed to create project. Please try again.");
    },
  });

  const onSubmit = (data: CreateProjectInput) => {
    setErrorMsg(null);
    mutation.mutate(data);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-background/80 backdrop-blur-sm transition-opacity"
        onClick={() => !mutation.isPending && onOpenChange(false)}
      />

      {/* Dialog */}
      <div className="relative z-50 w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-lg sm:mx-4 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            Create New Project
          </h2>
          <button
            onClick={() => onOpenChange(false)}
            disabled={mutation.isPending}
            className="rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
          {errorMsg && (
            <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              {errorMsg}
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-medium text-foreground">
              Project Name <span className="text-destructive">*</span>
            </label>
            <input
              id="name"
              type="text"
              placeholder="e.g., Public Toilet Block 8 Seats, Ward 7"
              {...register("name")}
              disabled={mutation.isPending}
              className={cn(
                "flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
                errors.name ? "border-destructive focus-visible:ring-destructive" : "border-input"
              )}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="work_order_no" className="text-sm font-medium text-foreground">
              Work Order Number <span className="text-muted-foreground font-normal">(Optional)</span>
            </label>
            <input
              id="work_order_no"
              type="text"
              placeholder="e.g., WO/2024-25/1042"
              {...register("work_order_no")}
              disabled={mutation.isPending}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
            {errors.work_order_no && (
              <p className="text-sm text-destructive">{errors.work_order_no.message}</p>
            )}
          </div>

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
              type="submit"
              disabled={mutation.isPending}
              className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50 min-w-[120px]"
            >
              {mutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Project"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
