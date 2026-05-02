import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  FileSpreadsheet, Settings, Download, ChevronRight,
  Building2, BadgeCheck, Plus, FolderOpen, Calendar,
  Hash, IndianRupee, Loader2
} from "lucide-react";
import BOQInputForm from "@/components/boq-input-form";
import LivePreviewTable from "@/components/live-preview-table";
import SSRManagementModal from "@/components/ssr-management-modal";
import { apiRequest } from "@/lib/queryClient";
import type { SSRVersion, Project, BOQItem } from "@shared/schema";

export default function Home() {
  const [showSSRModal, setShowSSRModal] = useState(false);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [workOrderNo, setWorkOrderNo] = useState("");
  const [editingItem, setEditingItem] = useState<BOQItem | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: activeSSRVersion } = useQuery<SSRVersion>({
    queryKey: ["/api/ssr-versions/active"],
  });

  const { data: projects = [], isLoading: projectsLoading } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const createProjectMutation = useMutation({
    mutationFn: async (data: { id: string; name: string; workOrderNo?: string }) => {
      const res = await apiRequest("POST", "/api/projects", {
        id: data.id,
        name: data.name,
        workOrderNo: data.workOrderNo || null,
        totalAmount: 0,
        itemCount: 0,
      });
      return res.json() as Promise<Project>;
    },
    onSuccess: (project) => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      setCurrentProject(project);
      setShowCreateForm(false);
      setProjectName("");
      setWorkOrderNo("");
    },
    onError: () => {
      toast({ title: "Failed to create project", variant: "destructive" });
    },
  });

  const handleCreateProject = () => {
    if (!projectName.trim()) {
      toast({ title: "Please enter a project name", variant: "destructive" });
      return;
    }
    createProjectMutation.mutate({
      id: `project-${Date.now()}`,
      name: projectName.trim(),
      workOrderNo: workOrderNo.trim() || undefined,
    });
  };

  const handleExportExcel = async () => {
    if (!currentProject) return;
    setIsExporting(true);
    try {
      const response = await fetch(`/api/export/excel/${currentProject.id}`);
      if (!response.ok) throw new Error("Export failed");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const safeName = currentProject.name.replace(/[^a-zA-Z0-9_\- ]/g, "").replace(/\s+/g, "_");
      a.download = `${safeName}_BOQ.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({ title: "Excel downloaded", description: `${safeName}_BOQ.xlsx` });
    } catch {
      toast({ title: "Export failed", description: "Could not generate the Excel file.", variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
  };

  const fmtINR = (v: number) =>
    v.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="min-h-screen bg-[hsl(210,20%,97%)]">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40 card-shadow">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <button
              className="flex items-center gap-3 hover:opacity-80 transition-opacity"
              onClick={() => { setCurrentProject(null); setEditingItem(null); }}
            >
              <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <div className="leading-tight text-left">
                <p className="text-[15px] font-bold text-gray-900">Maharashtra PWD</p>
                <p className="text-[11px] text-gray-500 font-medium tracking-wide uppercase">BOQ Estimation Tool</p>
              </div>
            </button>

            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={() => setShowSSRModal(true)}
                className="hidden sm:flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              >
                <Settings className="w-4 h-4" />
                <span>SSR Manager</span>
              </button>
              {currentProject && (
                <Button
                  onClick={handleExportExcel}
                  disabled={isExporting}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm"
                >
                  {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                  <span className="hidden sm:inline">Export Excel</span>
                  <span className="sm:hidden">Export</span>
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* SSR Banner */}
      <div className="bg-blue-600">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-2.5">
            <div className="flex items-center gap-2">
              <BadgeCheck className="w-4 h-4 text-blue-200 flex-shrink-0" />
              <span className="text-sm text-blue-100">
                Active Schedule:{" "}
                <span className="font-semibold text-white">
                  {activeSSRVersion?.version ?? "Loading…"}
                </span>
                {activeSSRVersion && (
                  <span className="text-blue-200 ml-2 hidden sm:inline">
                    · Effective{" "}
                    {new Date(activeSSRVersion.effectiveDate).toLocaleDateString("en-IN", {
                      day: "numeric", month: "short", year: "numeric",
                    })}
                  </span>
                )}
              </span>
            </div>
            <button
              onClick={() => setShowSSRModal(true)}
              className="text-xs text-blue-200 hover:text-white font-medium flex items-center gap-1 sm:hidden"
            >
              <Settings className="w-3 h-3" /> Manage
            </button>
          </div>
        </div>
      </div>

      {/* Main */}
      <main className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        {!currentProject ? (
          /* ── Project List / Landing ── */
          <div className="max-w-3xl mx-auto space-y-6">
            {/* Header row */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Your Projects</h1>
                <p className="text-gray-500 mt-1 text-sm">Select an existing project or create a new one</p>
              </div>
              <Button
                onClick={() => setShowCreateForm(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-xl flex items-center gap-2 shadow-sm"
              >
                <Plus className="w-4 h-4" />
                New Project
              </Button>
            </div>

            {/* Create form (inline, collapsible) */}
            {showCreateForm && (
              <div className="bg-white rounded-2xl card-shadow-lg p-6 border-2 border-blue-100 space-y-4">
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-blue-600" />
                  New Project Details
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[15px] font-semibold text-gray-800">
                      Project Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      value={projectName}
                      onChange={(e) => setProjectName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleCreateProject()}
                      placeholder="e.g. Road Widening Work, Kalyan"
                      className="h-12 text-base border-gray-200 rounded-xl"
                      autoFocus
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[15px] font-semibold text-gray-800">
                      Work Order No. <span className="text-gray-400 font-normal">(Optional)</span>
                    </Label>
                    <Input
                      value={workOrderNo}
                      onChange={(e) => setWorkOrderNo(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleCreateProject()}
                      placeholder="e.g. PWD/2024-25/1234"
                      className="h-12 text-base border-gray-200 rounded-xl"
                    />
                  </div>
                </div>
                <div className="flex gap-3 pt-1">
                  <Button
                    onClick={handleCreateProject}
                    disabled={createProjectMutation.isPending}
                    className="flex-1 h-12 bg-blue-600 hover:bg-blue-700 text-white text-base font-semibold rounded-xl flex items-center justify-center gap-2"
                  >
                    {createProjectMutation.isPending ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Creating…</>
                    ) : (
                      <><Plus className="w-4 h-4" /> Create Project</>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => { setShowCreateForm(false); setProjectName(""); setWorkOrderNo(""); }}
                    className="h-12 px-5 rounded-xl border-gray-200 text-gray-600"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {/* Project list */}
            {projectsLoading ? (
              <div className="flex flex-col items-center py-16 gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
                <p className="text-sm text-gray-500">Loading projects…</p>
              </div>
            ) : projects.length === 0 ? (
              <div className="flex flex-col items-center py-20 gap-4 text-center">
                <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center">
                  <FolderOpen className="w-8 h-8 text-gray-400" />
                </div>
                <div>
                  <p className="text-lg font-semibold text-gray-700">No projects yet</p>
                  <p className="text-sm text-gray-500 mt-1">Click "New Project" above to get started</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {projects.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setCurrentProject(p)}
                    className="bg-white rounded-2xl card-shadow p-5 text-left hover:shadow-md hover:border-blue-200 border-2 border-transparent transition-all group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-100 transition-colors">
                        <FileSpreadsheet className="w-5 h-5 text-blue-600" />
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-blue-500 mt-1 flex-shrink-0 transition-colors" />
                    </div>
                    <p className="text-base font-bold text-gray-900 mt-3 leading-snug">{p.name}</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                      {p.workOrderNo && (
                        <span className="flex items-center gap-1 text-xs text-gray-500">
                          <Hash className="w-3 h-3" />{p.workOrderNo}
                        </span>
                      )}
                      <span className="flex items-center gap-1 text-xs text-gray-500">
                        <Calendar className="w-3 h-3" />
                        {new Date(p.createdAt!).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                      <span className="text-xs font-medium text-gray-500">{p.itemCount} item{p.itemCount !== 1 ? "s" : ""}</span>
                      <span className="text-sm font-bold text-blue-600">
                        ₹{fmtINR(p.totalAmount)}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* ── BOQ Workspace ── */
          <div className="space-y-4">
            {/* Project header bar */}
            <div className="bg-white rounded-2xl card-shadow px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-blue-600 mb-0.5">Current Project</p>
                <h2 className="text-xl font-bold text-gray-900">{currentProject.name}</h2>
                {currentProject.workOrderNo && (
                  <p className="text-sm text-gray-500 mt-0.5">
                    Work Order: <span className="font-medium text-gray-700">{currentProject.workOrderNo}</span>
                  </p>
                )}
              </div>
              <button
                onClick={() => { setCurrentProject(null); setEditingItem(null); }}
                className="text-sm text-gray-500 hover:text-blue-600 font-medium underline underline-offset-2 self-start sm:self-auto"
              >
                ← All Projects
              </button>
            </div>

            {/* Side-by-side panels */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 lg:gap-6">
              <div className="xl:col-span-5">
                <BOQInputForm
                  project={currentProject}
                  onProjectUpdate={(p) => {
                    setCurrentProject(p);
                    queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
                  }}
                  editingItem={editingItem}
                  onEditDone={() => setEditingItem(null)}
                />
              </div>
              <div className="xl:col-span-7">
                <LivePreviewTable
                  project={currentProject}
                  onEditItem={setEditingItem}
                />
              </div>
            </div>
          </div>
        )}
      </main>

      {showSSRModal && (
        <SSRManagementModal
          isOpen={showSSRModal}
          onClose={() => setShowSSRModal(false)}
          activeVersion={activeSSRVersion}
        />
      )}
    </div>
  );
}
