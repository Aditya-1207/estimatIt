import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { FileSpreadsheet, Settings, Download, ChevronRight, Building2, BadgeCheck } from "lucide-react";
import BOQInputForm from "@/components/boq-input-form";
import LivePreviewTable from "@/components/live-preview-table";
import SSRManagementModal from "@/components/ssr-management-modal";
import type { SSRVersion, Project } from "@shared/schema";

export default function Home() {
  const [showSSRModal, setShowSSRModal] = useState(false);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [projectName, setProjectName] = useState("");
  const [workOrderNo, setWorkOrderNo] = useState("");
  const { toast } = useToast();

  const { data: activeSSRVersion } = useQuery<SSRVersion>({
    queryKey: ["/api/ssr-versions/active"],
  });

  const handleCreateProject = () => {
    if (!projectName.trim()) {
      toast({ title: "Please enter a project name", variant: "destructive" });
      return;
    }
    const projectId = `project-${Date.now()}`;
    const newProject: Project = {
      id: projectId,
      name: projectName,
      workOrderNo: workOrderNo || undefined,
      totalAmount: 0,
      itemCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setCurrentProject(newProject);
  };

  const handleExportExcel = async () => {
    if (!currentProject) {
      toast({ title: "Please create a project first", variant: "destructive" });
      return;
    }
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
      toast({ title: "Excel file downloaded", description: `${safeName}_BOQ.xlsx` });
    } catch {
      toast({ title: "Export failed", description: "Could not generate the Excel file.", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-[hsl(210,20%,97%)]">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40 card-shadow">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Brand */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <div className="leading-tight">
                <p className="text-[15px] font-700 text-gray-900 font-bold">Maharashtra PWD</p>
                <p className="text-[11px] text-gray-500 font-medium tracking-wide uppercase">BOQ Estimation Tool</p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={() => setShowSSRModal(true)}
                className="hidden sm:flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              >
                <Settings className="w-4 h-4" />
                <span>SSR Manager</span>
              </button>
              <Button
                onClick={handleExportExcel}
                disabled={!currentProject}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm disabled:opacity-40"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Export Excel</span>
                <span className="sm:hidden">Export</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* SSR Version Banner */}
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
                    · Effective {new Date(activeSSRVersion.effectiveDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
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
          /* Project Creation */
          <div className="flex items-center justify-center min-h-[calc(100vh-180px)]">
            <div className="w-full max-w-lg">
              <div className="text-center mb-8">
                <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <FileSpreadsheet className="w-8 h-8 text-white" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900">Start a New BOQ</h1>
                <p className="text-gray-500 mt-2">Enter your project details to begin building your Bill of Quantities</p>
              </div>

              <div className="bg-white rounded-2xl card-shadow-lg p-8 space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="projectName" className="text-[15px] font-semibold text-gray-800">
                    Project Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="projectName"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleCreateProject()}
                    placeholder="e.g. Road Widening Work, Kalyan"
                    className="h-12 text-base border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="workOrderNo" className="text-[15px] font-semibold text-gray-800">
                    Work Order No. <span className="text-gray-400 font-normal">(Optional)</span>
                  </Label>
                  <Input
                    id="workOrderNo"
                    value={workOrderNo}
                    onChange={(e) => setWorkOrderNo(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleCreateProject()}
                    placeholder="e.g. PWD/2024-25/1234"
                    className="h-12 text-base border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <Button
                  onClick={handleCreateProject}
                  className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white text-base font-semibold rounded-xl shadow-sm flex items-center justify-center gap-2 mt-2"
                >
                  Create Project
                  <ChevronRight className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </div>
        ) : (
          /* BOQ Workspace */
          <div className="space-y-4">
            {/* Project Header */}
            <div className="bg-white rounded-2xl card-shadow px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-blue-600 mb-0.5">Current Project</p>
                <h2 className="text-xl font-bold text-gray-900">{currentProject.name}</h2>
                {currentProject.workOrderNo && (
                  <p className="text-sm text-gray-500 mt-0.5">Work Order: <span className="font-medium text-gray-700">{currentProject.workOrderNo}</span></p>
                )}
              </div>
              <button
                onClick={() => setCurrentProject(null)}
                className="text-sm text-gray-500 hover:text-blue-600 font-medium underline underline-offset-2 self-start sm:self-auto"
              >
                Switch Project
              </button>
            </div>

            {/* Side-by-side panels */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 lg:gap-6">
              <div className="xl:col-span-5">
                <BOQInputForm project={currentProject} onProjectUpdate={setCurrentProject} />
              </div>
              <div className="xl:col-span-7">
                <LivePreviewTable project={currentProject} />
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
