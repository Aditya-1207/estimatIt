import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocation } from "wouter";
import { X, Loader2, FileBadge, Check } from "lucide-react";
import { createProjectSchema, type CreateProjectInput } from "@estimatit/shared";
import { createProject, listProjects, cloneProject } from "../../lib/api/projects";
import { cn } from "../../lib/utils";

interface CreateProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type TabType = "blank" | "template";

export function CreateProjectDialog({ open, onOpenChange }: CreateProjectDialogProps) {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>("blank");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

  const { data: allProjects = [], isLoading: isLoadingTemplates } = useQuery({
    queryKey: ["projects"],
    queryFn: listProjects,
    enabled: open,
  });

  const templates = allProjects.filter(p => p.is_template);

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

  const cloneMutation = useMutation({
    mutationFn: (data: { sourceId: string; name: string; wo: string }) => 
      cloneProject(data.sourceId, data.name, data.wo),
    onSuccess: (newProjectId) => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      onOpenChange(false);
      reset();
      setLocation(`/project/${newProjectId}`);
    },
    onError: (error) => {
      console.error("Failed to clone template:", error);
      setErrorMsg(error.message || "Failed to clone template. Please try again.");
    }
  });

  const onSubmit = (data: CreateProjectInput) => {
    setErrorMsg(null);
    if (activeTab === "blank") {
      mutation.mutate(data);
    } else {
      if (!selectedTemplateId) {
        setErrorMsg("Please select a template to clone.");
        return;
      }
      cloneMutation.mutate({ 
        sourceId: selectedTemplateId, 
        name: data.name, 
        wo: data.work_order_no || "" 
      });
    }
  };

  const isPending = mutation.isPending || cloneMutation.isPending;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-background/80 backdrop-blur-sm transition-opacity"
        onClick={() => !isPending && onOpenChange(false)}
      />

      {/* Dialog */}
      <div className="relative z-50 w-full max-w-xl overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-lg sm:mx-4 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            Create New Project
          </h2>
          <button
            onClick={() => onOpenChange(false)}
            disabled={isPending}
            className="rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex rounded-lg bg-muted p-1 mb-6">
          <button
            onClick={() => setActiveTab("blank")}
            className={cn(
              "flex-1 rounded-md px-3 py-2 text-sm font-medium transition-all",
              activeTab === "blank" ? "bg-background text-foreground shadow" : "text-muted-foreground hover:text-foreground"
            )}
          >
            Blank Project
          </button>
          <button
            onClick={() => setActiveTab("template")}
            className={cn(
              "flex-1 rounded-md px-3 py-2 text-sm font-medium transition-all",
              activeTab === "template" ? "bg-background text-foreground shadow" : "text-muted-foreground hover:text-foreground"
            )}
          >
            From Template
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {errorMsg && (
            <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              {errorMsg}
            </div>
          )}

          {activeTab === "template" && (
            <div className="space-y-2 mb-6">
              <label className="text-sm font-medium text-foreground">
                Select Template <span className="text-destructive">*</span>
              </label>
              
              {isLoadingTemplates ? (
                <div className="py-4 text-center text-sm text-muted-foreground animate-pulse">
                  Loading templates...
                </div>
              ) : templates.length === 0 ? (
                <div className="rounded-md border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
                  You don't have any templates yet. 
                  <br />Save an existing project as a template first.
                </div>
              ) : (
                <div className="grid gap-2 max-h-48 overflow-y-auto pr-1">
                  {templates.map(template => (
                    <button
                      key={template.id}
                      type="button"
                      onClick={() => setSelectedTemplateId(template.id)}
                      className={cn(
                        "flex items-center justify-between rounded-lg border p-3 text-left transition-colors",
                        selectedTemplateId === template.id 
                          ? "border-indigo-500 bg-indigo-500/5 ring-1 ring-indigo-500/20" 
                          : "border-border hover:border-indigo-500/50 hover:bg-muted/50"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "flex h-8 w-8 items-center justify-center rounded bg-indigo-500/10 text-indigo-500"
                        )}>
                          <FileBadge className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-medium text-sm text-foreground">{template.name}</p>
                          {template.work_order_no && (
                            <p className="text-xs text-muted-foreground mt-0.5">WO: {template.work_order_no}</p>
                          )}
                        </div>
                      </div>
                      {selectedTemplateId === template.id && (
                        <Check className="h-4 w-4 text-indigo-500 mr-1" />
                      )}
                    </button>
                  ))}
                </div>
              )}
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
              disabled={isPending}
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
              disabled={isPending}
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
              disabled={isPending}
              className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending || (activeTab === "template" && !selectedTemplateId && templates.length > 0)}
              className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50 min-w-[120px]"
            >
              {isPending ? (
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
